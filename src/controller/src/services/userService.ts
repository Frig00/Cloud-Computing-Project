import { FastifyInstance } from "fastify";
import prisma from "../data/prisma";
import bcrypt from "bcrypt";

export class UserService {
  // Get all users from the database
  static async getAllUsers() {
    return prisma.users.findMany();
  }

  // Create a new user in the database
  static async createUser(userId: string, name: string, password: string) {
    return prisma.users.create({
      data: {
        userId,
        name,
        password,
      },
    });
  }

  // Login a user and return a JWT token
  static async login(userId: string, password: string, fastify: FastifyInstance) {
    const user = await prisma.users.findUnique({ where: { userId }, include: { githubUsers: true } });
    if (!user) throw new Error("User not found");

    if (user.githubUsers) throw new Error("User has a GitHub account linked");

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) throw new Error("Invalid password");

    return { jwt: fastify.jwt.sign({ id: user.userId }), user };
  }

  // Sign up a new user with hashed password
  static async signUp(name: string, username: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.users.create({
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
    return prisma.users.findUnique({
      where: { userId },
    });
  }

  // Update user profile (name and/or password)
  static async updateUserProfile(userId: string, data: { name?: string; password?: string }, fastify: FastifyInstance) {
    const user = await prisma.users.findUnique({ where: { userId } });
    if (!user) throw new Error("User not found");

    const token = fastify.jwt.sign({ id: user.userId });
    const decoded = fastify.jwt.verify<{ id: string }>(token);

    if (decoded.id !== userId) throw new Error("Unauthorized");

    const updateData: { name?: string; password?: string } = {};
    if (data.name) updateData.name = data.name;
    if (data.password) updateData.password = await bcrypt.hash(data.password, 10);

    return prisma.users.update({
      where: { userId },
      data: updateData,
    });
  }

  // Delete a user by their ID
  static async deleteUser(userId: string) {
    return prisma.users.delete({
      where: { userId },
    });
  }
}