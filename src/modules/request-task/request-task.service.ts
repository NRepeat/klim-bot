import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RequestService } from '../request/request.service';
import { TelegramService } from '../telegram/telegram.service';
import { UtilsService } from '../utils/utils.service';
import { FullRequestType } from 'src/types/types';
import { UserService } from '../user/user.service';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { createReadStream } from 'fs';

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
      const requests = await this.requestService.findAllNotProcessedRequests();
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

  private async processRequest(request: any) {
    try {
      const workerCaption = this.utilsService.buildRequestMessage(
        request as unknown as FullRequestType,
        'card',
        'admin',
      );
      const adminRequestPhotoMessage = {
        source: '/home/nikita/Code/klim-bot/src/assets/0056.jpg',
        caption: workerCaption,
      };
      console.log(
        `Processing request ${request.id} with caption: ${workerCaption}`,
      );
      const processedMessages =
        await this.telegramService.sendPhotoMessageToAllWorkers(
          adminRequestPhotoMessage,
          request.id,
        );
      console.log(
        `Processed messages for request ${request.id}: ${processedMessages}`,
      );
      if (!processedMessages || processedMessages.length === 0) {
        this.logger.warn(`No workers available for request ${request.id}`);
        return;
      }

      for (const message of processedMessages) {
        const processedRequestId = message.requestId;
        const allAdminsRequestMessages =
          await this.userService.getAllAdminsWithRequestsId(processedRequestId);
        console.log(
          `Found ${allAdminsRequestMessages.length} admins for request ${processedRequestId}`,
        );
        if (
          !allAdminsRequestMessages ||
          allAdminsRequestMessages.length === 0
        ) {
          this.logger.warn(`No admins found for request ${processedRequestId}`);
          continue;
        }

        await this.updateAdminMessages(
          allAdminsRequestMessages,
          processedRequestId,
          '/home/nikita/Code/klim-bot/src/assets/placeholder.jpg',
        );
      }
    } catch (error) {
      this.logger.error('Error creating card request:', error);
    }
  }

  private async updateAdminMessages(
    adminMessages: any[],
    processedRequestId: string,
    adminRequestPhotoMessage: any,
  ) {
    console.log(`Updating admin messages for request ${processedRequestId}`);
    const request = await this.requestService.findById(processedRequestId);
    if (!request) {
      this.logger.warn(`Request with ID ${processedRequestId} not found`);
      return;
    }
    console.log(
      `Request found for ID ${processedRequestId}: ${JSON.stringify(request)}`,
    );
    console.log(`Admin messages to update: ${JSON.stringify(adminMessages)}`);
    for (const adminMessage of adminMessages) {
      console.log(`Found ${adminMessage} admins for request ${request.id}`);
      //   const adminMessageId = adminMessage.message[0]?.messageId;
      //   const adminChatId = adminMessage.message[0]?.chatId;
      //   if (!adminMessageId || !adminChatId) {
      //     this.logger.warn(
      //       `Admin message or chat ID not found for request ${request.id}`,
      //     );
      //     continue;
      //   }
      //   const adminMessageCaption = this.utilsService.buildRequestMessage(
      //     request as unknown as FullRequestType,
      //     'card',
      //     'admin',
      //   );
      //   await this.bot.telegram.editMessageMedia(
      //     Number(adminChatId),
      //     Number(adminMessageId),
      //     undefined,
      //     {
      //       type: 'photo',
      //       media: {
      //         source: createReadStream(adminRequestPhotoMessage),
      //       },
      //       caption: adminMessageCaption + '\n' + worker.username,
      //     },
      //   );
      //   this.logger.log(
      //     `Updated admin message for request ${request.id} with worker ${worker.username}`,
      //   );
    }
  }
}
