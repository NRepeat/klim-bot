import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';
import UserRepository from './user.repo';

import { RoleEnum, User } from '@prisma/client';
import { SerializedMessage, SerializedUser } from 'src/types/types';

@Injectable()
export class UserService {
  // private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly userRepository: UserRepository) {}

  async getAllUsers() {
    const users = await this.userRepository.findAll();
    return users;
  }
  async findAllWorkers() {
    const workers = await this.userRepository.findAllWorkers();
    return workers;
  }
  async findByTelegramId(id: number) {
    const user = await this.userRepository.findByTelegramId(id);
    return user;
  }
  async getAlWorkerMessagesWithRequestsId(requestId: string) {
    const admins =
      await this.userRepository.findAllWorkerMessagesWithRequestsId(requestId);
    return admins;
  }
  async getAllAdminsMessagesWithRequestsId(requestId: string) {
    const admins =
      await this.userRepository.findAllAdminMessagesWithRequestsId(requestId);
    return admins;
  }

  async getAllActiveWorkers() {
    const workers = await this.userRepository.getAllActiveWorkers();
    return workers;
  }
  async getAllActiveAdmins(): Promise<User[]> {
    const admins = await this.userRepository.getAllActiveAdmins();
    return admins;
  }

  async createUser(ctx: Context): Promise<void> {
    const userId = ctx.from?.id;
    const username = ctx.from?.username;

    if (userId && username) {
      const existUser = await this.userRepository.findByTelegramId(userId);
      console.log('Ex', existUser);
      if (existUser) {
        console.log('User already exist');
        return;
      }
      await this.userRepository.create(
        {
          username: username,
          onPause: true,
          telegramId: BigInt(userId),
        },
        RoleEnum.WORKER,
      );
    } else {
      console.error('User information is incomplete');
    }
  }

  async getAdmins() {
    const admins = await this.userRepository.getAllAdmins();
    return admins;
  }
  async isAdminChat(ctx: Context): Promise<boolean> {
    const userId = ctx.from?.id;
    const admins = await this.getAdmins();
    if (!userId || !admins) {
      return false;
    }

    return admins?.users.some((user) => {
      return Number(user.telegramId) === Number(userId);
    });
  }
  async appendRequestToUser(userId: string, requestId: string): Promise<void> {
    return this.userRepository.appendRequestToUser(userId, requestId);
  }
  async saveMessage(message: SerializedMessage) {
    try {
      await this.userRepository.saveMessage({
        chatId: message.chatId,
        accessType: message.accessType,
        messageId: message.messageId,
        requestId: message.requestId,
        photoUrl: message.photoUrl ? message.photoUrl : '',
        text: message.text ? message.text : '',
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
    return this.userRepository.saveWorkerRequestPhotoMessage(
      message,
      requestId,
      userId,
    );
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
  async updateUser(user: Partial<SerializedUser>, id: number) {
    const updatedUser = await this.userRepository.updateUser(user, id);
    return updatedUser;
  }
}
