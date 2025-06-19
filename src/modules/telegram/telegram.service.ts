import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { UserService } from '../user/user.service';
import { createReadStream } from 'fs';
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    @InjectBot() private bot: Telegraf<Context>,
    private readonly userService: UserService,
  ) {}
  async sendPhotoMessageToAllWorkers(message: {
    source: string;
    caption?: string;
  }) {
    try {
      const workers = await this.userService.getAllActiveWorkers();
      if (!workers || workers.length === 0) {
        this.logger.warn('No active workers found');
        return;
      }
      for (const worker of workers) {
        if (worker.telegramId) {
          const chatId = Number(worker.telegramId);
          this.logger.log(
            `Sending message to worker ${worker.username} (${chatId})`,
          );
          await this.bot.telegram.sendPhoto(
            chatId,
            {
              source: createReadStream(message.source),
            },
            {
              caption: message.caption || '',
            },
          );
        }
      }
    } catch (error) {
      this.logger.error('Error sending message to workers', error);
    }
  }
  async sendPhotoMessageToAllAdmins(message: {
    source: string;
    caption?: string;
  }) {
    try {
      const admins = await this.userService.getAllActiveAdmins();
      if (!admins || admins.length === 0) {
        this.logger.warn('No active admins found');
        return;
      }
      for (const admin of admins) {
        if (admin.telegramId) {
          const chatId = Number(admin.telegramId);
          this.logger.log(
            `Sending message to admin ${admin.username} (${chatId})`,
          );
          await this.bot.telegram.sendPhoto(
            chatId,
            {
              source: createReadStream(message.source),
            },
            {
              caption: message.caption || '',
            },
          );
        }
      }
    } catch (error) {
      this.logger.error('Error sending message to admins', error);
    }
  }
}
