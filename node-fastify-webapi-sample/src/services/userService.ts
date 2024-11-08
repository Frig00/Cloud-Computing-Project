import { FastifyInstance } from 'fastify';
import prisma from '../data/prisma';
import bcrypt from 'bcrypt';
import {v4 as uuidv4} from 'uuid';

export class UserService {
  static async getAllUsers() {
    return prisma.users.findMany();
  }

  static async createUser(name: string, email: string) {
    return prisma.users.create({
      data: {
        id: "",
        name: "Test",
        password: "password",
        username: "username"
       },
    });
  }


  static async login(username: string, password: string, fastify: FastifyInstance){
    const user = await prisma.users.findUnique({ where: {username}});
    if (!user) {
        throw new Error('User not found');
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        throw new Error('Invalid password');
    }

    const token = fastify.jwt.sign({ id: user.id });
    return { token };
  }

  static async signUp(username: string, password: string, fastify: FastifyInstance){
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.users.create({
      data: {
        username,
        password: hashedPassword,
        name: username,
        id: uuidv4(),
      },
    });

    return user;
  }
}