FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm install --legacy-peer-deps && npx prisma generate

COPY . .

RUN npm run build

EXPOSE 5001

CMD ["npm", "start"]