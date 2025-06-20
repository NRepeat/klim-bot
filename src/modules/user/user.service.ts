import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';
import UserRepository from './user.repo';

import { User } from 'generated/prisma';
import { SerializedMessage, UserRole } from 'src/types/types';

@Injectable()
export class UserService {
  // private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly userRepository: UserRepository) {}

  async getAllAdminsWithRequestsId(requestId: string) {
    const admins =
      await this.userRepository.findAllAdminMessagesWithRequestsId(requestId);
    console.log('Admins with requests:', admins);
    return admins;
  }

  async getAllActiveWorkers() {
    const workers = await this.userRepository.getAllActiveWorkers();
    console.log('Active workers:', workers);
    return workers;
  }
  async getAllActiveAdmins(): Promise<User[]> {
    const admins = await this.userRepository.getAllActiveAdmins();
    console.log('Active admins:', admins);
    return admins;
  }

  async createUser(ctx: Context): Promise<void> {
    const userId = ctx.from?.id;
    const username = ctx.from?.username;

    if (userId && username) {
      await this.userRepository.create(
        {
          username: username,
          onPause: true,
          telegramId: BigInt(userId),
        },
        UserRole.GEEST,
      );
      console.log(`User created: ${username} with ID: ${userId}`);
    } else {
      console.error('User information is incomplete');
    }
  }

  async getAdmins() {
    const admins = await this.userRepository.getAllAdmins();
    return admins;
  }
  async isAdminChat(ctx: Context): Promise<boolean> {
    const chatId = ctx.chat?.id;
    const admins = await this.getAdmins();
    if (!chatId || !admins) {
      return false;
    }

    return admins?.users.some(
      (admin) => Number(admin.telegramId) === Number(chatId),
    );
  }
  async appendRequestToUser(userId: string, requestId: string): Promise<void> {
    return this.userRepository.appendRequestToUser(userId, requestId);
  }

  async saveRequestPhotoMessage(
    message: SerializedMessage,
    requestId: string,
    userId: string,
  ) {
    return this.userRepository.saveRequestPhotoMessage(
      message,
      requestId,
      userId,
    );
  }
}
