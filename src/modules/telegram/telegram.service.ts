import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { UserService } from '../user/user.service';
import { createReadStream } from 'fs';

import {
  FullRequestType,
  ReplyPhotoMessage,
  SerializedMessage,
} from 'src/types/types';
import { RequestService } from '../request/request.service';
import { InlineKeyboardMarkup } from 'telegraf/typings/core/types/typegram';
import { MenuFactory } from './telegram-keyboards';
import { ConfigService } from '@nestjs/config';

const photoUrl = './src/assets/0056.jpg';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    @InjectBot() private bot: Telegraf<Context>,
    private readonly userService: UserService,
    private readonly requestService: RequestService,
    private readonly configService: ConfigService,
  ) {}

  private lastWorkerIndex = -1;
  async updateWorkerMessages(requestId: string) {
    try {
      const request = await this.requestService.findById(requestId);
      if (!request) throw new Error('Request not found');
      const messages = request.message.filter((m) => m.accessType === 'WORKER');
      if (messages.length === 0) return;
      for (const message of messages) {
        const adminMenu = MenuFactory.createWorkerMenu(
          request as unknown as FullRequestType,
          './src/assets/0056.jpg',
        );
        console.log('adminMenu', adminMenu.inWork().caption);
        await this.bot.telegram.editMessageCaption(
          Number(message.chatId),
          Number(message.messageId),
          undefined,
          adminMenu.inWork().caption,
          {
            parse_mode: 'HTML',
            reply_markup: adminMenu.inWork(undefined, requestId).markup,
          },
        );
      }
      this.logger.log(
        `Admin message for request ${request.id} updated successfully`,
      );
    } catch (error) {
      this.logger.error(`Error updating worker messages: ${error.message}`);
    }
  }
  async updateAdminMessages(requestId: string) {
    try {
      const request = await this.requestService.findById(requestId);
      if (!request) throw new Error('Request not found');
      const messages = request.message.filter((m) => m.accessType === 'ADMIN');
      if (messages.length === 0) return;
      const requests = messages.map((m) => {
        const adminMenu = MenuFactory.createAdminMenu(
          request as unknown as FullRequestType,
          './src/assets/0056.jpg',
        );
        return this.bot.telegram.editMessageCaption(
          Number(m.chatId),
          Number(m.messageId),
          undefined,
          adminMenu.inWork(undefined, m.requestId).caption,
          {
            parse_mode: 'HTML',
            reply_markup: adminMenu.inWork(undefined,requestId).markup,
          },
        );
      });
      await Promise.all(requests);
      this.logger.log(
        `Admin message for request ${request.id} updated successfully`,
      );
    } catch (err) {
      console.error(err);
      throw new Error('Failed to send request to work group');
    }
  }

  async sendRequestToWorkGroup(request: FullRequestType) {
    try {
      const workerMenu = MenuFactory.createWorkerMenu(request, photoUrl);
      const chatId = this.configService.get<number>('WORK_GROUP_CHAT');
      if (!chatId) {
        throw new Error('Work group chat not found');
      }
      const message = await this.bot.telegram.sendPhoto(
        chatId,
        {
          source: workerMenu.inWork().source,
        },
        {
          parse_mode: 'HTML',
          reply_markup: workerMenu.inWork(undefined, request.id).markup,
          caption: workerMenu.inWork().caption,
        },
      );

      await this.userService.saveMessage({
        accessType: 'WORKER',
        chatId: BigInt(chatId),
        messageId: BigInt(message.message_id),
        photoUrl: photoUrl,
        text: workerMenu.inWork().caption,
        requestId: request.id,
      });
    } catch (err) {
      console.error(err);
      throw new Error('Failed to send request to work group');
    }
  }
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
          parse_mode: 'HTML',
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
            if (!message.paymentRequests?.vendor.showReceipt) {
              await this.bot.telegram.editMessageMedia(
                chatId,
                messageId,
                undefined,
                {
                  parse_mode: 'HTML',
                  caption: newCaption || '',
                  type: 'photo',
                  media: { source: createReadStream('./src/assets/0056.jpg') },
                },
                { reply_markup: newMessage.inline_keyboard },
              );
            } else {
              await this.bot.telegram.editMessageMedia(
                chatId,
                messageId,
                undefined,
                {
                  parse_mode: 'HTML',
                  caption: newCaption || '',
                  type: 'photo',
                  media: { source: newMessage.source },
                },
                { reply_markup: newMessage.inline_keyboard },
              );
            }
          } else {
            await this.bot.telegram.editMessageCaption(
              chatId,
              messageId,
              undefined,
              newCaption || '',
              { reply_markup: newMessage.inline_keyboard, parse_mode: 'HTML' },
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

        // console.log(
        //   `Worker ${currentWorker.username} has ${notDoneActiveRequests.length} active requests`,
        // );

        if (notDoneActiveRequests.length <= 1) {
          foundWorker = currentWorker;
        }

        attempts++;
      }

      if (foundWorker) {
        if (foundWorker.telegramId) {
          await this.userService.appendRequestToUser(foundWorker.id, requestId);

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
              parse_mode: 'HTML',
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
      console.log('Admins:', admins);
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
            // console.log(messageE.inWork().caption);
            const photoMsg = await this.bot.telegram.sendPhoto(
              chatId,
              {
                source: messageE.inWork().source,
              },
              {
                parse_mode: 'HTML',
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
      console.log('Messages:', messages);
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
                parse_mode: 'HTML',
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
              { reply_markup: newMessage.inline_keyboard, parse_mode: 'HTML' },
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
        await this.bot.telegram.editMessageCaption(
          chatId,
          messageId,
          undefined,
          text ? text : '',
          { reply_markup: markup ?? undefined, parse_mode: 'HTML' },
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
            parse_mode: 'HTML',
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
            parse_mode: 'HTML',
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
          { reply_markup: markup ?? undefined, parse_mode: 'HTML' },
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
            { parse_mode: 'HTML', caption: caption || '' },
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

  // Новый метод для отправки сообщения только одному работнику
  async sendPhotoMessageToWorker(
    message: ReplyPhotoMessage,
    requestId: string,
    worker: { id: string; telegramId: string; username?: string },
  ) {
    try {
      if (!worker || !worker.telegramId) return;
      await this.userService.appendRequestToUser(worker.id, requestId);
      const chatId = Number(worker.telegramId);
      const photoMsg = await this.bot.telegram.sendPhoto(
        chatId,
        {
          source: createReadStream(
            message.photoUrl ? message.photoUrl : './src/assets/0056.jpg',
          ),
        },
        {
          parse_mode: 'HTML',
          reply_markup: message.inline_keyboard,
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
      if (photoMsg) {
        await this.userService.saveWorkerRequestPhotoMessage(
          messageToSave,
          requestId,
          worker.id,
        );
      }
    } catch (e) {
      this.logger.error('Error in sendPhotoMessageToWorker', e);
      throw e;
    }
  }
}
