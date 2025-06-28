import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { TelegramModule } from './modules/telegram/telegram.module';
import * as LocalSession from 'telegraf-session-local';
import { RequestTaskModule } from './modules/request-task/request-task.module';
import { UserService } from './modules/user/user.service';
import { UserModule } from './modules/user/user.module';

const session = new LocalSession({});

@Module({
  imports: [
    RequestTaskModule,
    TelegramModule,
    UserModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        middlewares: [session.middleware()],
        token: configService.get<string>('TELEGRAM_BOT_TOKEN') || '',
        launchOptions: {
          allowedUpdates: [
            'message',
            'edited_message',
            'channel_post',
            'edited_channel_post',
            'callback_query',
            'inline_query',
          ],
          // webhook: {
          //   path: '/telegram/webhook',
          //   domain: configService.get<string>('WEBHOOK_DOMAIN') || '',
          // },
        },
      }),

      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {}

  async onModuleInit() {
    const { Telegraf } = await import('telegraf');
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
    if (!botToken) return;
    const bot = new Telegraf(botToken);
    await bot.telegram.setMyCommands(
      [
        { command: 'start', description: 'Начать работу с ботом' },
        { command: 'report', description: 'Отправить отчет' },
        { command: 'pay', description: 'Создать заказ' },
        { command: 'all_rates', description: 'Показать все курсы' },
      ],
      { scope: { type: 'default' } },
    );

    // Команды только для приватных чатов
    await bot.telegram.setMyCommands(
      [
        { command: 'start', description: 'Начать работу с ботом' },
        { command: 'report', description: 'Отправить отчет' },
        { command: 'pay', description: 'Создать заказ' },
        { command: 'all_rates', description: 'Показать все курсы' },
      ],
      { scope: { type: 'all_private_chats' } },
    );

    // Команды только для групп
    await bot.telegram.setMyCommands(
      [
        { command: 'report', description: 'Отправить отчет' },
        { command: 'pay', description: 'Создать заказ' },
        { command: 'all_rates', description: 'Показать все курсы' },
      ],
      { scope: { type: 'all_group_chats' } },
    );

    const admin = await this.userService.getAdmins();
    if (!admin || !admin.users || admin.users.length === 0) {
      console.warn('No admins found, skipping admin command registration');
      return;
    }
    for (const user of admin.users) {
      if (user.telegramId) {
        try {
          await bot.telegram.setMyCommands(
            [
              {
                command: 'report_all',
                description: 'Отправить отчет всем',
              },
              { command: 'all_rates', description: 'Показать все курсы' },
              { command: 'pause', description: 'Остановить работу' },
              { command: 'resume', description: 'Запустить работу' },
            ],
            { scope: { type: 'chat', chat_id: Number(user.telegramId) } },
          );
        } catch (error) {
          console.error(
            `Error setting commands for user ${user.telegramId}:`,
            error,
          );
          continue;
        }
      }
    }
  }
}
