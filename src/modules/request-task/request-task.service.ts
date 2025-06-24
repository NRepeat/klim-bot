import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RequestService } from '../request/request.service';
import { TelegramService } from '../telegram/telegram.service';
import { UtilsService } from '../utils/utils.service';
import { FullRequestType, ReplyPhotoMessage } from 'src/types/types';
import { UserService } from '../user/user.service';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Markup, Telegraf } from 'telegraf';

@Injectable()
export class RequestTaskService {
  private readonly logger = new Logger('RequestTaskService');
  constructor(
    private readonly requestService: RequestService, // Assuming you have a request service to inject
    private readonly telegramService: TelegramService, // Assuming you have a telegram service to inject
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly utilsService: UtilsService, // Assuming you have a utils service to inject
    private readonly userService: UserService, // Assuming you have a user service to inject
  ) {}
  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleRequests() {
    try {
      const requests =
        (await this.requestService.findAllNotProcessedRequests()) as any as FullRequestType[];
      this.logger.log(
        `Found ${requests.length} not processed requests at ${new Date().toISOString()}`,
      );
      if (requests.length === 0) return;

      for (const request of requests) {
        await this.processRequest(request);
      }
    } catch (error) {
      this.logger.error('Error while processing requests', error);
    }
  }

  private async processRequest(request: FullRequestType) {
    try {
      const workerCaption = this.utilsService.buildRequestMessage(
        request as unknown as FullRequestType,
        request.paymentMethod?.nameEn === 'IBAN' ? 'iban' : 'card',
        'worker',
      );
      const workerRequestPhotoMessage: ReplyPhotoMessage = {
        photoUrl: '/home/nikita/Code/klim-bot/src/assets/0056.jpg',
        text: workerCaption.text,
      };
      const workerNotifications =
        await this.telegramService.sendPhotoMessageToAllWorkers(
          workerRequestPhotoMessage,
          request.id,
        );
      let username = '';
      if (workerNotifications.length === 0) {
        username = 'No workers available';
      } else {
        const worker = workerNotifications[0];
        username = worker.username || 'Unknown Worker';
        this.logger.log(
          `Request ${request.id} sent to worker ${username} (${worker.requestId})`,
        );
      }
      const inline_keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('Отменить', 'dummy')],
        [Markup.button.callback('Не в работе', 'dummy')],
      ]);
      const adminRequestPhotoMessage: ReplyPhotoMessage = {
        photoUrl: '/home/nikita/Code/klim-bot/src/assets/0056.jpg',
        text: workerCaption.text,
        inline_keyboard: inline_keyboard.reply_markup,
      };
      const hasA = !!request.message?.find((msg) => msg.accessType === 'ADMIN');
      if (!hasA) {
        console.log(`Request ${request.id} has admin messages: ${hasA}`);
        await this.telegramService.sendPhotoMessageToAllAdmins(
          adminRequestPhotoMessage,
          request.id,
        );
      }
      for (const worker of workerNotifications) {
        if (hasA && worker.proceeded) {
          console.log(worker, 'worker');
          await this.updateAdminMessages(request, worker.username);
        }
      }
    } catch (error) {
      this.logger.error('Error creating card request:', error);
    }
  }

  private async updateAdminMessages(req: FullRequestType, newWorker?: string) {
    const adminCaption = this.utilsService.buildRequestMessage(
      req as unknown as FullRequestType,
      'card',
      'admin',
    );

    const adminMessages =
      req.message?.filter((r) => r.accessType === 'ADMIN') || [];
    console.log(`------- ${adminMessages.length}`);
    if (adminMessages.length === 0) {
      this.logger.warn(
        `No admin messages found for request ${req.id}, skipping update`,
      );
      return;
    }
    for (const adminMessage of adminMessages) {
      try {
        console.log(
          `Updating admin message for request ${req.id} with caption: ${adminMessage.text}`,
        );
        const chatId = Number(adminMessage.chatId);
        const messageId = Number(adminMessage.messageId);
        if (!chatId || !messageId) {
          this.logger.warn(
            `Invalid chatId or messageId for request ${req.id}, skipping update`,
          );
          continue;
        }
        const inline_keyboard = Markup.inlineKeyboard([
          [Markup.button.callback('Отменить', 'dummy')],
          [Markup.button.callback('В работе', 'dummy')],
        ]);
        await this.bot.telegram.editMessageMedia(
          chatId,
          messageId,
          undefined,
          {
            type: 'photo',
            media:
              'https://lh3.googleusercontent.com/oeqS763H5PDQ7RL3gUnJlvDgZx6MYr5VE7bV7MBanuv7hgB-98wF1JYy-KI-Zxurxc5trLpksuPNUcY=w544-h544-l90-rj',
            caption: adminCaption.text + ' @' + (newWorker || ''),
          },
          { reply_markup: inline_keyboard.reply_markup },
        );
        this.logger.log(
          `Admin message for request ${req.id} updated successfully`,
        );
      } catch (error) {
        this.logger.error(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          `Error updating admin message for request ${req.id}: ${error.message}`,
        );
      }
    }
  }
}
