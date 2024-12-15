FROM node:23-slim

RUN apt-get update -y
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 5173

CMD ["npm", "run", "dev"]