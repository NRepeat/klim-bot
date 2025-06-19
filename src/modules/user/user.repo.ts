import { Injectable } from '@nestjs/common';
import { Repository, SerializedUser, UserRole } from 'src/types/types';
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
      data: {
        ...data,
        Role: {
          connect: {
            id: data.role,
          },
        },
      },
    });
  }
  async getAllAdmins(where: { roleId: string } = { roleId: '1' }) {
    return this.prisma.role.findFirst({
      where: {
        id: where.roleId,
      },
      include: {
        users: true,
      },
    });
  }
  async update(userId: string, data: SerializedUser) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }
}
