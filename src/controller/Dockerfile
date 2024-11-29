FROM node:23-slim

RUN apt-get update -y
RUN apt-get install -y openssl
RUN apt-get clean 
RUN rm -rf /var/lib/apt/lists/*


WORKDIR /app
COPY . .

RUN npm ci
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["node","dist/index.js"]