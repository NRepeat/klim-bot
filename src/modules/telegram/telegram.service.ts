import { Injectable, Logger } from '@nestjs/common';
import { Context, Markup } from 'telegraf';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { UserService } from '../user/user.service';
import { createReadStream, ReadStream } from 'fs';

import {
  FullRequestType,
  ReplyPhotoMessage,
  SerializedMessage,
} from 'src/types/types';
import { RequestService } from '../request/request.service';
import { UtilsService } from '../utils/utils.service';
import { InlineKeyboardMarkup } from 'telegraf/typings/core/types/typegram';
import { MenuFactory } from './telegram-keyboards';
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

  async sendMessageToUser(
    message: ReplyPhotoMessage,
    chatId: number,
    requestId: string,
    userId?: string,
  ) {
    try {
      const inline_keyboard = message.inline_keyboard;

      const photoMsg = await this.bot.telegram.sendPhoto(
        chatId,
        {
          source: createReadStream(
            message.photoUrl ? message.photoUrl : './src/assets/0056.jpg',
          ),
        },
        {
          reply_markup: inline_keyboard,
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
        paymentRequestId: requestId,
      };

      if (photoMsg) {
        await this.userService.saveWorkerRequestPhotoMessage(
          messageToSave,
          requestId,
          userId ? userId : '',
        );
      }
    } catch (error) {
      this.logger.error('Error sending message to user', error);
      throw error;
    }
  }

  async updateAllPublicMessagesWithRequestsId(
    newMessage: ReplyPhotoMessage,
    requestId?: string,
  ) {
    try {
      if (!requestId) {
        this.logger.warn('No request ID provided for updating public messages');
        return;
      }
      const messages =
        await this.requestService.getAllPublicMessagesWithRequestsId(requestId);
      if (!messages || messages.length === 0) {
        this.logger.warn('No public messages found for the given request ID');
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
        await new Promise((res) => setTimeout(res, 300));
      }
    } catch (error) {
      this.logger.error('Error updating public messages', error);
    }
  }
  async sendPhotoMessageToAllWorkers(
    message: ReplyPhotoMessage,
    requestId?: string,
  ) {
    try {
      const workers = await this.userService.getAllActiveWorkers();
      const inline_keyboard = message.inline_keyboard;

      if (!workers || workers.length === 0) {
        this.logger.warn('No active workers found');
        return [];
      }

      const processedRequestsId: {
        requestId: string;
        username: string;
        proceeded: boolean;
      }[] = [];

      if (!requestId) {
        processedRequestsId.push({
          requestId: 'No Request ID',
          username: 'No Request ID provided',
          proceeded: false,
        });
        return processedRequestsId;
      }

      let foundWorker: (typeof workers)[0] | null = null;
      let attempts = 0;

      while (!foundWorker && attempts < workers.length) {
        this.lastWorkerIndex = (this.lastWorkerIndex + 1) % workers.length;
        const currentWorker = workers[this.lastWorkerIndex];

        const notDoneActiveRequests = currentWorker.paymentRequests.filter(
          (request) =>
            request.status !== 'COMPLETED' && request.status !== 'FAILED',
        );

        console.log(
          `Worker ${currentWorker.username} has ${notDoneActiveRequests.length} active requests`,
        );

        if (notDoneActiveRequests.length <= 5) {
          foundWorker = currentWorker;
        }

        attempts++;
      }

      if (foundWorker) {
        await this.userService.appendRequestToUser(foundWorker.id, requestId);
        if (foundWorker.telegramId) {
          const chatId = Number(foundWorker.telegramId);
          const photoMsg = await this.bot.telegram.sendPhoto(
            chatId,
            {
              source: createReadStream(
                message.photoUrl ? message.photoUrl : './src/assets/0056.jpg',
              ),
            },
            {
              reply_markup: inline_keyboard,
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
            paymentRequestId: requestId,
          };
          processedRequestsId.push({
            requestId: requestId,
            username: foundWorker.username ? foundWorker.username : 'Unknown',
            proceeded: true,
          });
          if (photoMsg) {
            await this.userService.saveWorkerRequestPhotoMessage(
              messageToSave,
              requestId,
              foundWorker.id,
            );
          }
        }
      } else {
        processedRequestsId.push({
          requestId: requestId,
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
            if (!request) {
              this.logger.warn(`Request with ID ${requestId} not found`);
              continue;
            }
            const messageE = MenuFactory.createAdminMenu(
              request as unknown as FullRequestType,
              message.photoUrl ? message.photoUrl : './src/assets/0056.jpg',
            );
            const photoMsg = await this.bot.telegram.sendPhoto(
              chatId,
              {
                source: messageE.inWork().source,
              },
              {
                caption: messageE.inWork().caption,
                reply_markup: messageE.inWork(undefined, request.id).markup,
              },
            );
            const messageToSave: SerializedMessage = {
              chatId: BigInt(chatId),
              photoUrl: message.photoUrl ? message.photoUrl : '',
              messageId: BigInt(photoMsg.message_id),
              text: message.text || '',
              requestId: requestId,
              accessType: 'ADMIN',
              paymentRequestId: requestId,
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
        await this.userService.getAlWorkerMessagesWithRequestsId(requestId);
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
        await this.updateAdminMessage(
          Number(message.chatId),
          Number(message.messageId),
          newMessage.text,
          newMessage.photoUrl ? newMessage.photoUrl : undefined,
          newMessage.source,
          newMessage.inline_keyboard,
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
    source?: Buffer<ArrayBufferLike>,
    markup?: InlineKeyboardMarkup,
  ) {
    try {
      console.log(
        `Updating admin message for chatId: ${chatId}, messageId: ${messageId}, text: ${text}, imageUrl: ${imageUrl}, source: `,
      );
      if (imageUrl) {
        await this.updateTelegramMessage(
          chatId,
          messageId,
          text,
          imageUrl,
          source,
          markup,
        );
      } else if (source) {
        await this.updateTelegramMessage(
          chatId,
          messageId,
          text,
          undefined,
          source,
          markup,
        );
      } else {
        console.log(
          `Updating admin message for chatId: ${chatId}, messageId: ${messageId}, text: ${text}`,
        );
        await this.bot.telegram.editMessageCaption(
          chatId,
          messageId,
          undefined,
          text ? text : '',
          { reply_markup: markup ?? undefined },
        );
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
    source?: Buffer<ArrayBufferLike>,
    markup?: InlineKeyboardMarkup,
  ) {
    try {
      if (imageUrl) {
        await this.bot.telegram.editMessageMedia(
          chatId,
          messageId,
          undefined,
          {
            type: 'photo',
            media: imageUrl,
            caption: text,
          },
          { reply_markup: markup ?? undefined },
        );
      } else if (source) {
        await this.bot.telegram.editMessageMedia(
          chatId,
          messageId,
          undefined,
          {
            type: 'photo',
            media: { source: source },
            caption: text,
          },
          { reply_markup: markup ?? undefined },
        );
      } else {
        await this.bot.telegram.editMessageText(
          chatId,
          messageId,
          undefined,
          text ? text : 'asdasdasd',
          { reply_markup: markup ?? undefined },
        );
      }
    } catch (error) {
      this.logger.error('Error updating message', error);
    }
  }

  async sendDocumentToAllUsers(
    source: Buffer<ArrayBufferLike>,
    fileName: string,
    caption?: string,
  ) {
    try {
      const users = await this.userService.getAllUsers();
      if (!users || users.length === 0) {
        this.logger.warn('No active admins found');
        return;
      }
      for (const user of users) {
        if (user.telegramId) {
          const chatId = Number(user.telegramId);
          await this.bot.telegram.sendDocument(
            chatId,
            {
              source: source,
              filename: fileName,
            },
            { caption: caption || '' },
          );
        }
      }
    } catch (error) {
      this.logger.error('Error sending document to users', error);
    }
  }
  async deleteAllTelegramMessages(
    messageIds: number[] | undefined,
    chatId: number | undefined,
    msgIdToPass?: number[],
  ) {
    try {
      if (!messageIds || messageIds.length === 0) {
        this.logger.warn('No message IDs provided for deletion');
        return;
      }
      if (!chatId) {
        return this.logger.warn('No chat ID provided for deletion');
      }
      for (const messageId of messageIds) {
        if (msgIdToPass?.includes(messageId)) {
          continue;
        }
        await this.bot.telegram.deleteMessage(chatId, messageId);
      }
    } catch (error) {
      this.logger.error('Error deleting messages', error);
    }
  }
}
