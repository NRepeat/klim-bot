import { Injectable } from '@nestjs/common';
import { Repository, SerializedUser, UserRole } from 'src/types/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export default class UserRepository implements Repository<SerializedUser> {
  constructor(private readonly prisma: PrismaService) {}

  async appendRequestToUser(userId: string, requestId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (user) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          paymentRequests: {
            connect: { id: requestId },
          },
        },
      });
      console.log(`Request ${requestId} added to user ${userId}`);
    } else {
      console.error(`User with ID ${userId} not found`);
    }
  }

  async getAllActiveWorkers() {
    return this.prisma.user.findMany({
      where: {
        onPause: false,
        Role: {
          some: {
            id: UserRole.WORKER,
          },
        },
      },
      include: {
        Role: true,
        paymentRequests: true,
      },
    });
  }

  async getAllActiveAdmins() {
    return this.prisma.user.findMany({
      where: {
        onPause: false,
        Role: {
          some: {
            id: UserRole.ADMIN,
          },
        },
      },
      include: {
        Role: true,
      },
    });
  }

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
