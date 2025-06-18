import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';
import UserRepository from './user.repo';
import { UserRole } from 'src/types/types';

@Injectable()
export class UserService {
  // private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly userRepository: UserRepository) {}

  async createUser(ctx: Context, role: UserRole): Promise<void> {
    const userId = ctx.from?.id;
    const username = ctx.from?.username;

    if (userId && username) {
      await this.userRepository.create({
        username: username,
        onPause: true,
        roleId: role,
        telegramId: userId,
      });
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
    if (!chatId) {
      return false;
    }

    return admins.some((admin) => admin.telegramId === chatId);
  }
}
