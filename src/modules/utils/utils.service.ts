import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { VendorService } from '../vendor/vendor.service';
import { Context } from 'telegraf';
import { FullRequestType, MessageAccessType } from 'src/types/types';

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

  buildRequestMessage(
    request: FullRequestType,
    method: 'card' | 'iban',
    accessType: MessageAccessType,
  ) {
    const message = {
      card: this.buildCardRequestMessage(request, accessType),
      iban: 'TODO: Implement IBAN request message',
    };

    return message[method];
  }

  buildCardRequestMessage(
    request: FullRequestType,
    accessType: MessageAccessType,
  ) {
    const cardMethods = request?.cardMethods || [];
    const card = cardMethods.length > 0 ? cardMethods[0]?.card : '-';
    const bank = '-';
    const amount = request.amount || 0;
    const rate = request.rates?.rate || 0;
    const usdt = (amount / rate).toFixed(2);
    const isBlacklisted = (cardMethods[0]?.blackList || []).length > 0;
    const blacklist =
      isBlacklisted && cardMethods[0]?.blackList?.[0]
        ? '🚫Карта в чёрном списке: ' + cardMethods[0].blackList[0].reason
        : '';
    let message = '';
    switch (accessType) {
      case 'public': {
        message =
          `✉️Заявка номер: ${request.id ? request.id : '-'}\n` +
          `🏦Банк: ${bank || '-'}\n` +
          `💵Сумма: ${amount}\n` +
          `💎USDT: ${usdt} \n` +
          `💳Номер карты: ${card}\n` +
          `💱Курс: ${typeof rate === 'number' ? rate.toFixed(2) : '-'}\n`;
        break;
      }
      case 'admin':
      case 'worker': {
        message =
          `✉️Заявка номер: ${request.id ? request.id : '-'}\n` +
          `🏦Банк: ${bank || '-'}\n` +
          `💵Сумма: ${amount}\n` +
          `💎USDT: ${usdt} \n` +
          `💳Номер карты: ${card}\n` +
          `💱Курс: ${typeof rate === 'number' ? rate.toFixed(2) : '-'}\n` +
          (isBlacklisted ? '🚫Карта в чёрном списке: ' + blacklist : '');

        break;
      }
      default: {
        throw new Error(`Unknown access type: ${String(accessType)}`);
      }
    }
    return message;
  }
}
