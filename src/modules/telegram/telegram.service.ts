import { Injectable, Logger } from '@nestjs/common';
import { Context, Markup } from 'telegraf';
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
  async sendPhotoMessageToAllWorkers(
    message: {
      source: string;
      caption?: string;
    },
    requestId?: string,
  ) {
    try {
      const workers = await this.userService.getAllActiveWorkers();
      const inline_keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('Отказаться', 'cancel_request'),
          Markup.button.callback('Взять', 'card_request'),
        ],
      ]);
      if (!workers || workers.length === 0) {
        this.logger.warn('No active workers found');
        return;
      }
      for (const worker of workers) {
        const activeRequests = worker.paymentRequests.length;
        console.log(
          `Worker ${worker.username} has ${activeRequests} active requests`,
        );
        // If worker has no
        if (activeRequests <= 1 && requestId) {
          await this.userService.appendRequestToUser(worker.id, requestId);
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
                reply_markup: inline_keyboard.reply_markup,
                caption: message.caption || '',
              },
            );
          }
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
      const inline_keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('Отказаться', 'cancel_request')],
        [Markup.button.callback('Не в работе', 'dummy')],
      ]);
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
              reply_markup: inline_keyboard.reply_markup,
            },
          );
        }
      }
    } catch (error) {
      this.logger.error('Error sending message to admins', error);
    }
  }
}
