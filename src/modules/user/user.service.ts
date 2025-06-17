import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import UserRepository from './user.repo';
import { UserRole } from 'src/types/types';



@Injectable()
export class UserService {
  // private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly userRepository: UserRepository,
  ) {}


  async createUser(ctx: Context,role:UserRole): Promise<void> {
    // Implement user creation logic here
    // For example, you can access user information from ctx and save it to a database
    const userId = ctx.from?.id;
    const username = ctx.from?.username;

    if (userId && username) {
      // Logic to save user to the database
     this.userRepository.createUser({
        username: username,
        onPause: true,
        roleId: UserRole[role],
        telegramId:userId,
      });
      console.log(`User created: ${username} with ID: ${userId}`);
    } else {
      console.error('User information is incomplete');
    }
  }

}
