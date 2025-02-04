import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import PrismaInstance, { getPrisma } from "../data/prisma";

export class UserService {
  // Get all users from the database
  static async getAllUsers() {
    return getPrisma().users.findMany();
  }

  // Create a new user in the database
  static async createUser(userId: string, name: string, password: string) {
    return getPrisma().users.create({
      data: {
        userId,
        name,
        password,
      },
    });
  }

  // Login a user and return a JWT token
  static async login(userId: string, password: string, fastify: FastifyInstance) {
    const user = await getPrisma().users.findUnique({ where: { userId }, include: { githubUsers: true } });
    if (!user) throw new Error("User not found");

    if (user.githubUsers) throw new Error("User has a GitHub account linked");

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) throw new Error("Invalid password");

    return { jwt: fastify.jwt.sign({ id: user.userId }), user };
  }

  // Sign up a new user with hashed password
  static async signUp(name: string, username: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await getPrisma().users.create({
      data: {
        userId: username,
        name,
        password: hashedPassword,
      },
    });

    return user;
  }

  // Get a user by their ID
  static async getUserById(userId: string) {
    return getPrisma().users.findUnique({
      where: { userId },
    });
  }

  // Update user profile (name and/or password)
  static async updateUserProfile(userId: string, data: { name?: string; password?: string }, fastify: FastifyInstance) {
    const user = await getPrisma().users.findUnique({ where: { userId } });
    if (!user) throw new Error("User not found");

    const token = fastify.jwt.sign({ id: user.userId });
    const decoded = fastify.jwt.verify<{ id: string }>(token);

    if (decoded.id !== userId) throw new Error("Unauthorized");

    const updateData: { name?: string; password?: string } = {};
    if (data.name) updateData.name = data.name;
    if (data.password) updateData.password = await bcrypt.hash(data.password, 10);

    return getPrisma().users.update({
      where: { userId },
      data: updateData,
    });
  }

  // Delete a user by their ID
  static async deleteUser(userId: string) {
    return getPrisma().users.delete({
      where: { userId },
    });
  }


  
  static async subscribe(subscriberId: string, subscribedToId: string, isUserSubscribed: boolean) {
    try {
      if (isUserSubscribed) {
        await getPrisma().subscriptions.upsert({
          where: {
            subscriberId_subscribedToId: {
              subscriberId,
              subscribedToId,
            },
          },
          create: {
            subscriberId,
            subscribedToId,
          },
          update: {},
        });
      } else {
        await getPrisma().subscriptions.delete({
          where: {
            subscriberId_subscribedToId: {
              subscriberId,
              subscribedToId,
            },
          },
        });
      }
      return isUserSubscribed;
    } catch (error) {
      console.error("Database query error:", error);
      throw new Error("Database query failed");
    }
  }


  static async isUserSubscribed(selfUserId: string, userId: string) {
    const subscription = await getPrisma().subscriptions.findUnique({
      where: {
        subscriberId_subscribedToId: {
          subscriberId: selfUserId,
          subscribedToId: userId,
        },
      },
    });

    return !!subscription;
  }
}