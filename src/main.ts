import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { getBotToken } from 'nestjs-telegraf';
import { Telegraf, session } from 'telegraf';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);

  const bot = app.get<Telegraf>(getBotToken());
  app.use(bot.webhookCallback('/telegram/webhook'));

  app.enableCors();

  await app.listen(3000);
  // console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
