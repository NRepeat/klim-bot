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
import { RequestModule } from '../request/request.module';
import { CreateRequestWizard } from './request/request.scene';
import { RequestActions } from './request/request.actions';
import PaymentWizard from './paymnet/paymnet.scene';

@Module({
  imports: [
    UserModule,
    PrismaModule,
    RatesModule,
    VendorModule,
    UtilsModule,
    RequestModule,
  ],
  controllers: [],
  exports: [TelegramService],
  providers: [
    TelegramService,
    CreateRatesScene,
    CreateRequestWizard,
    PaymentWizard,
    RequestActions,
    MenuActions,
    RatesActions,
    UserActions,
  ],
})
export class TelegramModule {}
