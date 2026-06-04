# ⚡ Flash Sale System

A high-performance, event-driven flash sale platform designed to handle tens of thousands of concurrent purchase attempts without overselling.

Built with **Fastify**, **Redis**, **RabbitMQ**, **PostgreSQL**, and a **React** frontend.

---

## Table of Contents

- [Architecture \& Design](#architecture--design)
  - [System Diagram](#system-diagram)
  - [Design Decisions \& Trade-offs](#design-decisions--trade-offs)
- [Setup Instructions](#setup-instructions)
  - [Prerequisites](#prerequisites)
  - [Running the Full Stack (Docker)](#running-the-full-stack-docker)
  - [Running Tests](#running-tests)
- [Stress Testing](#stress-testing)
  - [Running the Stress Test](#running-the-stress-test)
  - [Expected Outcomes](#expected-outcomes)
- [Stop & Cleanup](#stop-cleanup)


---

## Architecture & Design

### System Diagram

![Flash Sale System Diagram](./svg/flash-sale-system-diagram.svg)

#### Purchase flow in brief

0. Before the purchase flow begins, the flash sale item is created via the API. The API then runs a function to pre-allocate slots in Redis based on the item's `quantity` parameter.
1. The user clicks **Buy** on the React frontend. The request is sent through the load balancer (Caddy).
2. Caddy routes the request to one of the three API instances.
3. The API instance checks whether the sale is still active and whether the user has already claimed a slot, using an **atomic Redis Lua script** that, in a single command, validates flash sale time window, rejects duplicate attempts, and pops a slot from the pre-allocated pool.
4. If the claim succeeds, Redis returns a confirmation to the API instance, which then responds with a `202` status code to the user.
5. At the same time, the API instance publishes two messages to **RabbitMQ queues** asynchronously.
6. RabbitMQ delivers the messages to a **Claim Worker** queue and a **Payment Worker** queue.
7. The **Claim Worker** inserts a new purchase record into PostgreSQL with a default status of `PROCESSING`, while the **Payment Worker** simulates payment processing (with a mock delay and random outcomes) and updates the purchase status to either `SUCCESS` or `DECLINED`.

### Design Decisions & Trade-offs

#### Preventing Overselling by Pre-allocating Slots in Redis

The core challenge of a flash sale is preventing overselling under extreme concurrency. The usual approach of "read quantity, check, then decrement" creates a classic race condition.

My solution is to pre-allocate a Redis List with one entry per available unit. When a user attempts to claim a slot, a Lua script atomically:
1. Checks if the user's email has already claimed an item, and rejects the request if so.
2. Pops an entry from the slot list.
3. Adds the user's email to the claimed set.

Because Lua scripts execute atomically in Redis (single-threaded), no two requests can pop the same slot.
**Overselling is structurally impossible**, even under thousands of concurrent requests. This eliminates the need for distributed locks or database-level pessimistic locking.

The trade-off is that the slot is claimed in Redis before the purchase is actually persisted. If a worker crashes between claiming in Redis and writing to the database, the slot is consumed but the purchase may not exist in PostgreSQL. In production, this would need a reconciliation job to handle the discrepancy. For this project, the simplicity and throughput gains are worth it.

#### RabbitMQ for Async Processing into Database and Mock Payment Simulation

The purchase API needs to respond quickly, especially under sudden heavy load. That's why Redis sits at the front of the system. By offloading the slower work, such as database persistence, payment processing (with its simulated delay and random outcomes), and other heavy tasks, we keep the API fast and able to handle high throughput.

RabbitMQ's durable queues with manual acknowledgment guarantee that messages survive restarts and aren't lost if a worker crashes mid-processing. The worker calls `ack` only after successful database persistence, and `nack` (with requeue) on failure.

The trade-off is that the user sees "Item claimed successfully" before payment is actually processed. The system is **eventually consistent**, meaning the purchase may later be declined by the payment worker. This is acceptable for a flash sale where speed of claiming matters most.

#### Implementing API Replicas Behind Caddy

Caddy load-balances across three API instances using round-robin. Since the hot path (slot claiming during purchase API calls) is handled by Redis, horizontal scaling is straightforward. Adding more replicas linearly increases the number of concurrent connections the system can serve without any shared state issues.

The trade-off is that this is a development-oriented setup. In production, you'd want a proper orchestrator like Kubernetes and a more sophisticated health-checking strategy instead of relying on Caddy's `lb_try_duration`.

#### Decoupled Claim Worker & Payment Worker

The claim and payment steps are decoupled into separate workers and queues to isolate failure domains. A payment service outage won't block inventory claiming, payment processing can be scaled independently (it's slower due to the simulated delay, mimicking a third-party provider), and different retry strategies can be applied to payment failures without affecting the claim pipeline.

#### Frontend Architecture

The React frontend is intentionally simple, without any state management library or complex data layer. It uses native `fetch` for API calls and `react-router-dom` for routing. A custom `useCountdown` hook handles both ISO dates and Unix timestamps, automatically switching between "starts in" and "ends in" displays. `react-hot-toast` provides user feedback.

This keeps the frontend lightweight and focused on its job: displaying items and facilitating purchases.

---

## Setup Instructions

### Prerequisites
Make sure you have the following installed:
- **Node.js** v20+ (see `.nvmrc`)
- **Docker**, **Docker Compose v2**, and **Docker Desktop**

### Running the Full Stack (Docker)

This is the recommended way to run the project. It starts all services (PostgreSQL, Redis, RabbitMQ, API instances, workers, Caddy) and runs database migrations automatically.

**1. Build the frontend:**

```sh
cd src/web
npm install
npm run build
```

**2. Start all services:**

```sh
docker compose build --no-cache && docker compose up -d
```

**3. Access the application:**
The application (both frontend and API) is available at: `http://localhost:5000`

> All requests to `/api/*` are load-balanced across three API replicas. Everything else serves the React static build.

### Running Tests

Tests use [Vitest](https://vitest.dev/) and **require the full Docker stack to be running first** due to the integration tests making real HTTP requests to the API.

**Wait for all services to be healthy, then run:**

```sh
npm run test
```

This runs all unit and integration tests in `test/unit/` and `test/integration/`.

## Stress Testing

### Running the Stress Test

The stress test simulates a real flash sale scenario to validate the system's throughput and correctness under heavy load.

**Make sure the full Docker stack is running.** Then wait around 15 seconds for all services (especially RabbitMQ) to become healthy.

**Run the stress test:**

```sh
npm run stress-test
```

### What Happens

The stress test (`test/stress-test.ts`) performs the following:

1. **Creates a flash sale item** with **50,000 available units**, 50% discount, starting in 1 second, ending in 24 hours.
2. **Waits 3 seconds** for the sale to become active and for Redis slots to be pre-allocated.
3. **Fires 800 concurrent connections** at `POST /api/user/purchase` for **10 seconds** using [Autocannon](https://github.com/mcollina/autocannon). Each request uses a randomly generated unique email and username to simulate real users.

### Expected Outcomes

After the test completes, a results summary is printed. Here's an example of one of the stress test run results:

```
================ STRESS TEST RESULTS ================

Total Available Items    : 50000
Total Requests           : 29587
Average Throughput       : 2958.8 req/sec
Average Latency          : 252.95 ms
Max Latency              : 5930 ms
Total HTTP 2xx Successes : 29587
Total Non-2xx Failures   : 0
Success Rate             : 100%
Fail Rate                : 0%

=====================================================
```

**Key things to verify:**

| Metric               | What it tells you                                                                 |
|----------------------|-----------------------------------------------------------------------------------|
| **Success Rate: 100%** | All requests received a valid HTTP response (no server errors or crashes).          |
| **Fail Rate: 0%** | The API handled all concurrent requests without returning 5xx errors.           |
| **Average Throughput**         | Thousands of purchases per second. The Redis Lua atomic operations keep the hot path fast. |


## Stop & Cleanup

To remove all containers and volumes (including database data), run:
```sh
docker compose down -v 
```