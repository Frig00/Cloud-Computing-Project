import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DB_CONNECTION,
    },
  },
});

export default prisma;
