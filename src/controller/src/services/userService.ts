import { FastifyInstance } from 'fastify';
import prisma from '../data/prisma';
import bcrypt from 'bcrypt';
import {v4 as uuidv4} from 'uuid';

export class UserService {
  static async getAllUsers() {
    return prisma.users.findMany();
  }

  static async createUser(userId: string, name: string, password: string) {
    return prisma.users.create({
      data: {
        userId,
        name,
        password,
       },
    });
  }

  static async login(userId: string, password: string, fastify: FastifyInstance) {
    const user = await prisma.users.findUnique({ where: { userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new Error('Invalid password');
    }

    const token = fastify.jwt.sign({ id: user.userId });//
    return { token };
  }

  static async signUp(name: string, username: string, password: string, fastify: FastifyInstance){
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

  static async getUserById(userId: string) {
    return prisma.users.findUnique({
      where: { userId },
    });
  }


  static async updateUserProfile(userId: string, data: { name?: string; password?: string }, fastify: FastifyInstance) {

    const user = await prisma.users.findUnique({ where: { userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const token = fastify.jwt.sign({ id: user.userId }); //
    const decoded = fastify.jwt.verify<{ id: string }>(token);//

    if (decoded.id !== userId) {//
      throw new Error('Unauthorized');
    }

    const updateData: { name?: string; password?: string } = {};
    if (data.name) updateData.name = data.name;
    if (data.password) updateData.password = await bcrypt.hash(data.password, 10);

    return prisma.users.update({
      where: { userId },
      data: updateData,
    });
  }

  static async deleteUser(userId: string) {
    return prisma.users.delete({
      where: { userId },
    });
  }
}