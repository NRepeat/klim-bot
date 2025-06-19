import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { VendorService } from '../vendor/vendor.service';
import { Context } from 'telegraf';
import { FullRequestType } from 'src/types/types';

@Injectable()
export class UtilsService {
  constructor(
    private readonly userService: UserService,
    private readonly vendorService: VendorService,
  ) {}
  async isChatRegistrated(ctx: Context) {
    if (
      (await this.userService.isAdminChat(ctx)) ||
      (await this.vendorService.isVendorChat(ctx))
    ) {
      return true;
    }
    return false;
  }
  buildCardRequestMessage(request: FullRequestType) {
    const card = request?.cardMethods ? request?.cardMethods[0]?.card : '-';
    const bank = '-';
    const amount = request.amount || 0;
    const rate = request.rates?.rate || 0;
    const usdt = (amount / rate).toFixed(2);
    return (
      `✉️Заявка номер: ${request.id ? request.id : '-'}\n` +
      `🏦Банк: ${bank || '-'}\n` +
      `💵Сумма: ${amount}\n` +
      `💎USDT: ${usdt} \n` +
      `💳Номер карты: ${card}\n` +
      `💱Курс: ${typeof rate === 'number' ? rate.toFixed(2) : '-'}\n`
    );
  }
}
