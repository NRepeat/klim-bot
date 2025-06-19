import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { UserModule } from '../user/user.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MenuActions } from './menu/menu.actions';
import { RatesActions } from './rates/rates.actions';
import { RatesModule } from '../rates/rates.module';
import { UserActions } from './user/user.actions';
import { CreateRatesScene } from './rates/rates.scene';
import { VendorModule } from '../vendor/vendor.module';
import { UtilsModule } from '../utils/utils.module';

@Module({
  imports: [UserModule, PrismaModule, RatesModule, VendorModule, UtilsModule],
  controllers: [],
  providers: [
    TelegramService,
    CreateRatesScene,
    MenuActions,
    RatesActions,
    UserActions,
  ],
})
export class TelegramModule {}
