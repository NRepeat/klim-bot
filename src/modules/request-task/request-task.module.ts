import { Module } from '@nestjs/common';
import { RequestTaskService } from './request-task.service';
import { ScheduleModule } from '@nestjs/schedule';
import { RequestModule } from '../request/request.module';
import { UtilsModule } from '../utils/utils.module';
import { UserModule } from '../user/user.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  providers: [RequestTaskService],
  imports: [
    ScheduleModule.forRoot(),
    RequestModule,
    UtilsModule,
    UserModule,
    TelegramModule,
  ],
})
export class RequestTaskModule {}
