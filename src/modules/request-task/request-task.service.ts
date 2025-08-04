import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RequestService } from '../request/request.service';
import { TelegramService } from '../telegram/telegram.service';
import { FullRequestType, ReplyPhotoMessage } from 'src/types/types';
import { UserService } from '../user/user.service';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { MenuFactory } from '../telegram/telegram-keyboards';
const photoUrl = './src/assets/0056.jpg';

@Injectable()
export class RequestTaskService {
  private readonly logger = new Logger('RequestTaskService');
  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly requestService: RequestService,
    private readonly telegramService: TelegramService,
    private readonly userService: UserService,
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
      if (requests.length === 0) return;

      for (let i = 0; i < requests.length; i++) {
        await this.telegramService.sendRequestToWorkGroup(requests[i]);
        const adminMenu = MenuFactory.createAdminMenu(
          requests[i] as unknown as FullRequestType,
          photoUrl,
        );
        const adminRequestPhotoMessage: ReplyPhotoMessage = {
          photoUrl: adminMenu.inWork().url,
          text: adminMenu.inWork().caption,
          inline_keyboard: adminMenu.inWork().markup,
        };
        await this.telegramService.sendPhotoMessageToAllAdmins(
          adminRequestPhotoMessage,
          requests[i].id,
        );
        await this.requestService.updateRequestNotificationStatus(
          requests[i].id,
          true,
        );
      }
    } catch (error) {
      this.logger.error('Error while processing requests', error);
    }
  }

  @Cron(CronExpression.EVERY_2_HOURS)
  async sendNotificartion() {
    const requests =
      (await this.requestService.findAllNotProcessedRequests()) as FullRequestType[];
  }
}
