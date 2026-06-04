import autocannon from 'autocannon';
import crypto from 'crypto';
import { BASE_URL } from './vite.config';

let counter = 0;
async function executeFlashSaleStressTest() {
  // Create a dummy item first
  const dummyQuantity = 50_000;
  const itemResponse = await fetch(`${BASE_URL}/api/item`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `dummyItem_${crypto.randomBytes(16).toString('hex')}`,
      quantity: dummyQuantity,
      price: 20_000,
      discount: 50,
      startFlashAt: new Date(Date.now() + 1000).toISOString(),
      endFlashAt: new Date(Date.now() + 86_400_000).toISOString(),
    }),
  });

  const itemResp = await itemResponse.json();
  const dummyItemId = (itemResp as any).data.id;

  // Delay for 3 seconds to wait for the flash sale to start
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Start the stress test for 10 seconds with 800 connections
  const result = await autocannon({
    url: BASE_URL,
    connections: 800,
    duration: 10,
    pipelining: 1,
    requests: [
      {
        method: 'POST',
        path: '/api/user/purchase',
        headers: {
          'content-type': 'application/json',
        },
        setupRequest: (req) => {
          counter++;
          req.body = JSON.stringify({
            email: `dummy_${crypto.randomBytes(16).toString('hex')}@gmail.com`,
            username: `dummy_${crypto.randomBytes(16).toString('hex')}`,
            itemId: dummyItemId,
            quantity: 1,
            isFlashSale: true,
          });
          return req;
        },
      },
    ],
  });

  console.log('\n================ STRESS TEST RESULTS ================\n');
  console.log(`Counter                  : ${counter}`);
  console.log(`Total Available Items    : ${dummyQuantity}`);
  console.log(`Total Requests           : ${result.requests.total}`);
  console.log(`Average Throughput       : ${result.requests.average} req/sec`);
  console.log(`Average Latency          : ${result.latency.average} ms`);
  console.log(`Max Latency              : ${result.latency.max} ms`);
  console.log(`Total HTTP 2xx Successes : ${result['2xx']}`);
  console.log(`Total Non-2xx Failures   : ${result.non2xx}`);
  console.log(
    `Success Rate             : ${(result['2xx'] / result.requests.total) * 100}%`,
  );
  console.log(
    `Fail Rate                : ${(result.non2xx / result.requests.total) * 100}%`,
  );
  console.log('\n=====================================================');
}

executeFlashSaleStressTest();
