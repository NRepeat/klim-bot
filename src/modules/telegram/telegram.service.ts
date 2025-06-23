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
import { UtilsService } from '../utils/utils.service';
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    @InjectBot() private bot: Telegraf<Context>,
    private readonly userService: UserService,
    private readonly requestService: RequestService,
    private readonly utilsService: UtilsService,
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
          Markup.button.callback('Взять', 'accept_request_' + requestId),
        ],
      ]);
      if (!workers || workers.length === 0) {
        this.logger.warn('No active workers found');
        return [];
      }
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
              source: createReadStream(
                message.photoUrl ? message.photoUrl : './src/assets/0056.jpg',
              ),
            },
            {
              reply_markup: inline_keyboard.reply_markup,
              caption: message.text || '',
            },
          );
          const messageToSave: SerializedMessage = {
            chatId: BigInt(chatId),
            photoUrl: message.photoUrl ? message.photoUrl : '',
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

            const user = request?.user ? request?.user : '';
            const photoMsg = await this.bot.telegram.sendPhoto(
              chatId,
              {
                source: message.photoUrl
                  ? createReadStream(message.photoUrl)
                  : createReadStream('./src/assets/0056.jpg'),
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
              photoUrl: message.photoUrl ? message.photoUrl : '',
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
  async updateAllWorkersMessagesWithRequestsId(
    newMessage: ReplyPhotoMessage,
    requestId?: string,
  ) {
    try {
      if (!requestId) {
        this.logger.warn('No request ID provided for updating admin messages');
        return;
      }
      const messages =
        await this.userService.getAllAdminsMessagesWithRequestsId(requestId);
      if (!messages || messages.length === 0) {
        this.logger.warn('No active admins found');
        return;
      }
      for (const message of messages) {
        const chatId = Number(message.chatId);
        const messageId = Number(message.messageId);
        const newCaption = newMessage.text ? newMessage.text : message.text;
        if (chatId && messageId) {
          if (newMessage.source) {
            await this.bot.telegram.editMessageMedia(
              chatId,
              messageId,
              undefined,
              {
                caption: newCaption || '',
                type: 'photo',
                media: { source: newMessage.source },
              },
              { reply_markup: newMessage.inline_keyboard },
            );
          } else {
            await this.bot.telegram.editMessageCaption(
              chatId,
              messageId,
              undefined,
              newCaption || '',
              { reply_markup: newMessage.inline_keyboard },
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Error updating admin messages', error);
    }
  }
  async updateAllAdminsMessagesWithRequestsId(
    newMessage: ReplyMessage,
    requestId?: string,
  ) {
    try {
      if (!requestId) {
        this.logger.warn('No request ID provided for updating admin messages');
        return;
      }
      const messages =
        await this.userService.getAllAdminsMessagesWithRequestsId(requestId);
      if (!messages || messages.length === 0) {
        this.logger.warn('No active admins found');
        return;
      }
      for (const message of messages) {
        await this.updateAdminMessage(
          Number(message.chatId),
          Number(message.messageId),
          newMessage.text,
        );
      }
    } catch (error) {
      this.logger.error('Error updating admin messages', error);
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
    text?: string,
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
          text ? text : 'asdasdasd',
        );
      }
    } catch (error) {
      this.logger.error('Error updating message', error);
    }
  }
}
