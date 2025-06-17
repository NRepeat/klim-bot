import { Injectable } from '@nestjs/common';
import { Repository, SerializedUser } from 'src/types/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export default class UserRepository implements Repository<SerializedUser> {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async create(data: SerializedUser) {
    return this.prisma.user.create({
      data,
    });
  }

  async update(userId: string, data: SerializedUser) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }
}
