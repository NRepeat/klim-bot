import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { VendorService } from '../vendor/vendor.service';
import { Context, Markup } from 'telegraf';
import {
  FullRequestType,
  MessageAccessType,
  ReplyMessage,
} from 'src/types/types';
import { InlineKeyboardMarkup } from 'telegraf/typings/core/types/typegram';
import * as sharp from 'sharp';
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
  ): ReplyMessage {
    const message = {
      card: this.buildCardRequestMessage(request, accessType),
      iban: this.buildCardRequestMessage(request, accessType),
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
    const acceptedBy = request?.activeUser
      ? 'Принята:@' + request.activeUser.username
      : '';

    let message = '';
    let inline_keyboard: InlineKeyboardMarkup = {
      inline_keyboard: [],
    };
    switch (accessType) {
      case 'public': {
        message =
          `✉️Заявка номер: ${request.id ? request.id : '-'}\n` +
          `🏦Банк: ${bank || '-'}\n` +
          `💵Сумма: ${amount}\n` +
          `💎USDT: ${usdt} \n` +
          `💳Номер карты: ${card}\n` +
          `💱Курс: ${typeof rate === 'number' ? rate.toFixed(2) : '-'}\n`;
        inline_keyboard = Markup.inlineKeyboard([
          [Markup.button.callback('В работе', 'dummy')],
        ]).reply_markup;
        break;
      }
      case 'admin':
        {
          message =
            `✉️Заявка номер: ${request.id ? request.id : '-'}\n` +
            `🏦Банк: ${bank || '-'}\n` +
            `💵Сумма: ${amount}\n` +
            `💎USDT: ${usdt} \n` +
            `💳Номер карты: ${card}\n` +
            `💱Курс: ${typeof rate === 'number' ? rate.toFixed(2) : '-'}\n` +
            acceptedBy +
            (isBlacklisted ? '🚫Карта в чёрном списке: ' + blacklist : '');
        }
        inline_keyboard = Markup.inlineKeyboard([
          [Markup.button.callback('Отказаться', 'cancel_request')],
          [Markup.button.callback('Не в работе', 'dummy')],
        ]).reply_markup;
        break;
      case 'worker': {
        message =
          `✉️Заявка номер: ${request.id ? request.id : '-'}\n` +
          `🏦Банк: ${bank || '-'}\n` +
          `💵Сумма: ${amount}\n` +
          `💎USDT: ${usdt} \n` +
          `💳Номер карты: ${card}\n` +
          `💱Курс: ${typeof rate === 'number' ? rate.toFixed(2) : '-'}\n` +
          (isBlacklisted ? '🚫Карта в чёрном списке: ' + blacklist : '');
        inline_keyboard = Markup.inlineKeyboard([
          [Markup.button.callback('Отказаться', 'cancel_request')],
          [Markup.button.callback('Взять', 'accept_request_' + request.id)],
        ]).reply_markup;
        break;
      }
      default: {
        return {
          text: message,
          inline_keyboard: inline_keyboard,
        };
      }
    }
    return {
      text: message,
      inline_keyboard: inline_keyboard,
    };
  }
  async downloadTelegramPhoto(
    botToken: string,
    fileId: string,
  ): Promise<Buffer> {
    const fileInfo = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`,
    );
    const { result } = await fileInfo.json();
    const url = `https://api.telegram.org/file/bot${botToken}/${result.file_path}`;
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  async mergeImagesHorizontal(images: Buffer[]): Promise<Buffer> {
    const sharpImages = images.map((img) => sharp(img));
    const metadatas = await Promise.all(
      sharpImages.map((img) => img.metadata()),
    );
    // Для горизонтального объединения: суммируем ширины, берём максимальную высоту
    const totalWidth = metadatas.reduce(
      (sum, meta) => sum + (meta.width || 0),
      0,
    );
    const height = Math.max(...metadatas.map((meta) => meta.height || 0));

    // Приводим все изображения к одной высоте
    const resizedBuffers = await Promise.all(
      sharpImages.map((img) => img.resize({ height }).toBuffer()),
    );

    let left = 0;
    const composites = resizedBuffers.map((buffer, i) => {
      const composite = { input: buffer, top: 0, left };
      left += metadatas[i].width || 0;
      return composite;
    });

    return sharp({
      create: {
        width: totalWidth,
        height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      },
    })
      .composite(composites)
      .png()
      .toBuffer();
  }
}
