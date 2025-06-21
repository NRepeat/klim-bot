import { Injectable, Logger } from '@nestjs/common';
import { Context, Markup } from 'telegraf';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { UserService } from '../user/user.service';
import { createReadStream } from 'fs';

import {
  ReplyMessage,
  ReplyPhotoMessage,
  SerializedMessage,
} from 'src/types/types';
import { RequestService } from '../request/request.service';
import { InlineKeyboardMarkup } from 'telegraf/typings/core/types/typegram';
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    @InjectBot() private bot: Telegraf<Context>,
    private readonly userService: UserService,
    private readonly requestService: RequestService,
  ) {}

  private lastWorkerIndex = -1;

  async sendPhotoMessageToAllWorkers(
    message: ReplyPhotoMessage,
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
        return [];
      }
      // --- Очередь через переменную ---
      this.lastWorkerIndex = (this.lastWorkerIndex + 1) % workers.length;
      const worker = workers[this.lastWorkerIndex];
      const processedRequestsId: {
        requestId: string;
        username: string;
        proceeded: boolean;
      }[] = [];
      const notDoneActiveRequests = worker.paymentRequests.filter(
        (request) =>
          request.status !== 'COMPLETED' && request.status !== 'FAILED',
      );
      console.log(
        `Worker ${worker.username} has ${notDoneActiveRequests.length} active requests`,
      );
      if (notDoneActiveRequests.length <= 1 && requestId) {
        await this.userService.appendRequestToUser(worker.id, requestId);
        if (worker.telegramId) {
          const chatId = Number(worker.telegramId);
          const photoMsg = await this.bot.telegram.sendPhoto(
            chatId,
            {
              source: createReadStream(message.source),
            },
            {
              reply_markup: inline_keyboard.reply_markup,
              caption: message.text || '',
            },
          );
          const messageToSave: SerializedMessage = {
            chatId: BigInt(chatId),
            photoUrl: message.source,
            messageId: BigInt(photoMsg.message_id),
            text: message.text || '',
            requestId: requestId,
            accessType: 'WORKER',
          };
          processedRequestsId.push({
            requestId: requestId,
            username: worker.username ? worker.username : 'Unknown',
            proceeded: true,
          });
          if (photoMsg) {
            await this.userService.saveWorkerRequestPhotoMessage(
              messageToSave,
              requestId,
              worker.id,
            );
          }
        }
      } else {
        processedRequestsId.push({
          requestId: requestId ? requestId : 'No Request ID',
          username: 'All Workers busy',
          proceeded: false,
        });
      }
      return processedRequestsId;
    } catch (e) {
      this.logger.error('Error in sendPhotoMessageToAllWorkers', e);
      throw e;
    }
  }
  async sendPhotoMessageToAllAdmins(
    message: ReplyPhotoMessage,
    requestId?: string,
  ) {
    try {
      const admins = await this.userService.getAllActiveAdmins();

      if (!admins || admins.length === 0) {
        this.logger.warn('No active admins found');
        return;
      }
      const processedAdmins = new Set<string>();
      for (const admin of admins) {
        if (admin.telegramId) {
          const chatId = Number(admin.telegramId);
          this.logger.log(
            `Sending message to admin ${admin.username} (${chatId})`,
          );
          if (requestId) {
            const request = await this.requestService.findById(requestId);
            console.log(
              `Request found for ID ${requestId}: ${JSON.stringify(request?.user)}`,
            );
            const user = request?.user;
            const photoMsg = await this.bot.telegram.sendPhoto(
              chatId,
              {
                source: createReadStream(message.source),
              },
              {
                caption:
                  message.text + (user ? `\nUser: ${user.username}` : ''),
                reply_markup: message.inline_keyboard,
              },
            );
            console.log(photoMsg ? photoMsg.message_id : 'No message ID');
            const messageToSave: SerializedMessage = {
              chatId: BigInt(chatId),
              photoUrl: message.source,
              messageId: BigInt(photoMsg.message_id),
              text: message.text || '',
              requestId: requestId,
              accessType: 'ADMIN',
            };
            if (photoMsg.message_id) {
              await this.userService.saveRequestPhotoMessage(
                messageToSave,
                requestId,
                admin.id,
              );
              processedAdmins.add(admin.id);
            }
          }
        }
      }
      return processedAdmins;
    } catch (error) {
      this.logger.error('Error sending message to admins', error);
    }
  }

  async updateAdminMessage(
    chatId: number,
    messageId: number,
    text: string,
    imageUrl?: string,
  ) {
    try {
      if (imageUrl) {
        await this.updateTelegramMessage(chatId, messageId, text, imageUrl);
      }
    } catch (error) {
      this.logger.error('Error updating admin message', error);
    }
  }

  async updateTelegramMessage(
    chatId: number,
    messageId: number,
    text: string,
    imageUrl?: string,
  ) {
    try {
      if (imageUrl) {
        await this.bot.telegram.editMessageMedia(chatId, messageId, undefined, {
          type: 'photo',
          media: imageUrl,
          caption: text,
        });
      } else {
        await this.bot.telegram.editMessageText(
          chatId,
          messageId,
          undefined,
          text,
        );
      }
    } catch (error) {
      this.logger.error('Error updating message', error);
    }
  }
}
