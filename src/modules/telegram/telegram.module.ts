import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { UserModule } from '../user/user.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MenuActions } from './menu/menu.actions';
import { RatesActions } from './rates/rates.actions';
import { RatesModule } from '../rates/rates.module';
import { UserActions } from './user/user.actions';
import { CreateRatesScene } from './rates/rates.scene';

@Module({
  imports: [UserModule, PrismaModule, RatesModule],
  controllers: [],
  providers: [
    TelegramService,
    CreateRatesScene, // Ensure this scene is imported from the correct path
    // TelegramController,
    MenuActions,
    RatesActions,
    UserActions,
  ],
})
export class TelegramModule {}
