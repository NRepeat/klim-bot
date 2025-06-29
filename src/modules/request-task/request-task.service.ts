import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RequestService } from '../request/request.service';
import { TelegramService } from '../telegram/telegram.service';
import { UtilsService } from '../utils/utils.service';
import { FullRequestType, ReplyPhotoMessage } from 'src/types/types';
import { UserService } from '../user/user.service';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { MenuFactory } from '../telegram/telegram-keyboards';

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
        (await this.requestService.findAllNotProcessedRequests()) as FullRequestType[];
      const workers = await this.userService.getAllActiveWorkers();
      this.logger.log(
        `Found ${requests.length} not processed requests and ${workers.length} workers at ${new Date().toISOString()}`,
      );
      if (requests.length === 0 || workers.length === 0) return;

      // Round-robin: каждому работнику по одному запросу
      for (let i = 0; i < requests.length; i++) {
        const worker = workers[i % workers.length];
        await this.processRequestForWorker(requests[i], worker);
      }
    } catch (error) {
      this.logger.error('Error while processing requests', error);
    }
  }

  private async processRequest(request: FullRequestType) {
    try {
      const photoUrl = '/home/nikita/Code/klim-bot/src/assets/0056.jpg';

      const workerMenu = MenuFactory.createWorkerMenu(
        request as unknown as FullRequestType,
        photoUrl,
      );

      const workerNotifications =
        await this.telegramService.sendPhotoMessageToAllWorkers(
          {
            text: workerMenu.inWork().caption,
            photoUrl: workerMenu.inWork().url,
            inline_keyboard: workerMenu.inWork(undefined, request.id).markup,
          },
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

      const adminMenu = MenuFactory.createAdminMenu(
        request as unknown as FullRequestType,
        photoUrl,
      );
      const adminRequestPhotoMessage: ReplyPhotoMessage = {
        photoUrl: adminMenu.inWork().url,
        text: adminMenu.inWork().caption,
        inline_keyboard: adminMenu.inWork().markup,
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
          await this.updateAdminMessages(request.id, worker.username);
        }
      }
    } catch (error) {
      this.logger.error('Error creating card request:', error);
    }
  }

  private async processRequestForWorker(
    request: FullRequestType,
    worker: {
      id: string;
      telegramId: string | bigint;
      username?: string | null;
      paymentRequests?: { status?: string }[];
    },
  ) {
    try {
      const activeRequests =
        worker.paymentRequests?.filter(
          (r) => r && r.status !== 'COMPLETED' && r.status !== 'FAILED',
        ) || [];
      if (activeRequests.length >= 5) {
        this.logger.log(
          `Worker ${worker.username ?? ''} has max active requests (${activeRequests.length}), skipping request ${request.id}`,
        );
        return;
      }
      const photoUrl = '/home/nikita/Code/klim-bot/src/assets/0056.jpg';
      const workerMenu = MenuFactory.createWorkerMenu(request, photoUrl);

      await this.telegramService.sendPhotoMessageToWorker(
        {
          text: workerMenu.inWork().caption,
          photoUrl: workerMenu.inWork().url,
          inline_keyboard: workerMenu.inWork(undefined, request.id).markup,
        },
        request.id,
        {
          ...worker,
          telegramId: String(worker.telegramId),
          username: worker.username ?? undefined,
        },
      );

      const adminMenu = MenuFactory.createAdminMenu(
        request as unknown as FullRequestType,
        photoUrl,
      );
      const adminRequestPhotoMessage: ReplyPhotoMessage = {
        photoUrl: adminMenu.inWork().url,
        text: adminMenu.inWork().caption,
        inline_keyboard: adminMenu.inWork().markup,
      };

      const hasA = !!request.message?.find((msg) => msg.accessType === 'ADMIN');
      console.log('Has admin messages:', hasA);
      if (!hasA) {
        console.log(`Request ${request.id} has admin messages: ${hasA}`);
        await this.telegramService.sendPhotoMessageToAllAdmins(
          adminRequestPhotoMessage,
          request.id,
        );
      }
      // Обновление сообщений админов, если нужно
      if (hasA) {
        await this.updateAdminMessages(
          request.id,
          worker.username ?? undefined,
        );
      }
    } catch (error) {
      this.logger.error('Error creating card request:', error);
    }
  }

  private async updateAdminMessages(req: string, newWorker?: string) {
    const photoUrl = '/home/nikita/Code/klim-bot/src/assets/0056.jpg';
    const request = await this.requestService.findById(req);
    if (!request) {
      this.logger.warn(`Request with ID ${req} not found, skipping update`);
      return;
    }
    const adminMenu = MenuFactory.createAdminMenu(
      req as unknown as FullRequestType,
      photoUrl,
    );

    const adminMessages =
      request.message?.filter((r) => r.accessType === 'ADMIN') || [];
    console.log(`------- ${adminMessages.length}`);
    if (adminMessages.length === 0) {
      this.logger.warn(
        `No admin messages found for request ${request.id}, skipping update`,
      );
      return;
    }

    for (const adminMessage of adminMessages) {
      try {
        console.log(
          `Updating admin message for request ${request.id} with caption: ${adminMessage.text}`,
        );
        const chatId = Number(adminMessage.chatId);
        const messageId = Number(adminMessage.messageId);
        if (!chatId || !messageId) {
          this.logger.warn(
            `Invalid chatId or messageId for request ${request.id}, skipping update`,
          );
          continue;
        }

        const inWorkMenu = adminMenu.inWork();
        const caption = newWorker
          ? `${inWorkMenu.caption}\nПринята: @${newWorker}`
          : inWorkMenu.caption;

        await this.bot.telegram.editMessageCaption(
          chatId,
          messageId,
          undefined,
          caption,
          {
            parse_mode: 'HTML',
            reply_markup: inWorkMenu.markup,
          },
        );
        this.logger.log(
          `Admin message for request ${request.id} updated successfully`,
        );
      } catch (error) {
        this.logger.error(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          `Error updating admin message for request ${request.id}: ${error.message}`,
        );
      }
    }
  }
}
