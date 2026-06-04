FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json tsconfig.json .dockerignore .env.local .nvmrc ./

RUN npm install --legacy-peer-deps

COPY src/worker/ ./src/worker/

RUN npm run build