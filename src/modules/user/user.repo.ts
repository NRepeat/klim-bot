import { Injectable } from '@nestjs/common';
import {
  Repository,
  SerializedMessage,
  SerializedUser,
  UserRole,
} from 'src/types/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export default class UserRepository implements Repository<SerializedUser> {
  constructor(private readonly prisma: PrismaService) {}
  async findAllWorkers() {
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
  async findByTelegramId(id: number) {
    return this.prisma.user.findUnique({
      where: {
        telegramId: id,
      },
    });
  }
  async findAll() {
    return this.prisma.user.findMany({
      include: {
        Role: true,
        paymentRequests: true,
      },
    });
  }
  async findAllWorkerMessagesWithRequestsId(requestId: string) {
    const allMessages = await this.prisma.message.findMany({
      where: {
        requestId: requestId,
        accessType: 'WORKER',
      },
      include: {
        paymentRequests: true,
      },
    });

    return allMessages;
  }
  async findAllAdminMessagesWithRequestsId(requestId: string) {
    const allMessages = await this.prisma.message.findMany({
      where: {
        requestId: requestId,
        accessType: 'ADMIN',
      },
      include: {
        paymentRequests: true,
      },
    });
    console.log(`Fetching all admin messages with request ID ${requestId}`);
    return allMessages;
  }
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

  async create(data: SerializedUser, roleId: string = UserRole.GEEST) {
    return this.prisma.user.create({
      data: {
        ...data,
        Role: {
          connect: {
            id: roleId,
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
  async saveWorkerRequestPhotoMessage(
    message: SerializedMessage,
    requestId: string,
    userId: string,
  ) {
    console.log(
      `Saving photo message for user ${userId} with request ID ${requestId}`,
    );

    return this.prisma.workerRequestPhotoMessage.create({
      data: {
        userId: userId,
        requestId: requestId,
        message: {
          create: {
            accessType: 'WORKER',
            chatId: message.chatId,
            messageId: message.messageId,
            text: message.text,
            requestId: requestId,
            photoUrl: message.photoUrl ? message.photoUrl : '',
          },
        },
      },
    });
  }
  async saveRequestPhotoMessage(
    message: SerializedMessage,
    requestId: string,
    userId: string,
  ) {
    console.log(
      `Saving photo message for user ${userId} with request ID ${requestId}`,
    );

    return this.prisma.paymentRequests.update({
      where: { id: requestId },
      data: {
        message: {
          create: {
            chatId: message.chatId,
            messageId: message.messageId,
            text: message.text,
            accessType: message.accessType,
            photoUrl: message.photoUrl ? message.photoUrl : '',
          },
        },
      },
    });
    // return this.prisma.message.create({
    //   data: {

    //   },
    // });
  }
}
