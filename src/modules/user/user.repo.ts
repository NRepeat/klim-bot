import { Injectable } from '@nestjs/common';
import { SerializedUser } from 'src/types/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export default class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserById(userId: string) {
    console.log('prsma', this.prisma);
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async createUser(data: SerializedUser) {
    console.log('prsma', this.prisma);
    return this.prisma.user.create({
      data,
    });
  }

  async updateUser(userId: string, data: SerializedUser) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }
}
