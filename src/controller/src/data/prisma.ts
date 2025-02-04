import { PrismaClient } from "@prisma/client";

export default class PrismaInstance {
  private static instance: PrismaInstance;
  private prismaClient: PrismaClient | null = null;

  private constructor() {}

  static getInstance(): PrismaInstance {
    if (!PrismaInstance.instance) {
      PrismaInstance.instance = new PrismaInstance();
    }
    return PrismaInstance.instance;
  }

  initialize(connectionString?: string): void {
    if (this.prismaClient) {
      return;
    }

    this.prismaClient = new PrismaClient({
      datasources: {
        db: {
          url: connectionString,
        },
      },
    });
  }

  get client(): PrismaClient {
    if (!this.prismaClient) {
      throw new Error('Prisma client not initialized. Call initialize() first.');
    }
    return this.prismaClient;
  }
}


export function getPrisma(): PrismaClient {
  return PrismaInstance.getInstance().client;
}