import { Injectable } from '@nestjs/common';
import { Repository, SerializedMessage, SerializedUser } from 'src/types/types';
import { PrismaService } from '../prisma/prisma.service';
import { RoleEnum } from '@prisma/client';

@Injectable()
export default class UserRepository implements Repository<SerializedUser> {
  constructor(private readonly prisma: PrismaService) {}

  async updateUser(
    user: Partial<SerializedUser>,
    id: number,
  ): Promise<SerializedUser> {
    const updatedUser = await this.prisma.user.update({
      where: { telegramId: BigInt(id) },
      data: user,
    });
    return updatedUser;
  }

  async findAllWorkers() {
    return this.prisma.user.findMany({
      where: {
        onPause: false,
        Role: {
          some: {
            name: RoleEnum.WORKER,
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
      include: {
        Role: true,
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
            name: RoleEnum.WORKER,
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
        // onPause: false,
        Role: {
          some: {
            name: RoleEnum.ADMIN,
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

  async create(data: SerializedUser, roleId: RoleEnum = RoleEnum.GUEST) {
    return this.prisma.user.create({
      data: {
        ...data,
        Role: {
          connectOrCreate: {
            where: {
              name: roleId,
            },
            create: {
              name: 'WORKER',
            },
          },
        },
      },
    });
  }
  async getAllAdmins() {
    return this.prisma.role.findFirst({
      where: {
        name: 'ADMIN',
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
  async saveMessage(message: SerializedMessage) {
    try {
      await this.prisma.message.create({
        data: {
          chatId: message.chatId,
          accessType: message.accessType,
          messageId: message.messageId,
          requestId: message.requestId,
          photoUrl: message.photoUrl ? message.photoUrl : '',
          text: message.text ? message.text : '',
        },
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  }
  async saveWorkerRequestPhotoMessage(
    message: SerializedMessage,
    requestId: string,
    userId: string,
  ) {
    // return this.prisma.workerRequestPhotoMessage.create({
    //   data: {
    //     userId: userId,
    //     requestId: requestId,
    //     message: {
    //       create: {
    //         accessType: 'WORKER',
    //         chatId: message.chatId,
    //         messageId: message.messageId,
    //         text: message.text,
    //         requestId: requestId,
    //         photoUrl: message.photoUrl ? message.photoUrl : '',
    //       },
    //     },
    //   },
    // });
  }
  async saveRequestPhotoMessage(
    message: SerializedMessage,
    requestId: string,
    userId: string,
  ) {
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
  }
}
