import { createReadStream, ReadStream } from 'fs';
import { AccessType } from 'generated/prisma';
import { FullRequestType } from 'src/types/types';
import { Markup } from 'telegraf';
import { InlineKeyboardMarkup } from 'telegraf/typings/core/types/typegram';

interface IMenu {
  caption: string;
  markup: InlineKeyboardMarkup;
  username?: string;
  request?: FullRequestType;
}

interface IMenuWithMedia extends IMenu {
  url: string;
  source?: Buffer<ArrayBufferLike> | ReadStream;
}

class Menu implements IMenu {
  caption: string;
  markup: InlineKeyboardMarkup;
  username?: string;
  request?: FullRequestType;
  constructor(
    caption: string,
    markup: InlineKeyboardMarkup,
    request?: FullRequestType,
  ) {
    this.caption = caption;
    this.markup = markup;
    this.request = request;
  }
}
class MenuWithMedia extends Menu implements IMenuWithMedia {
  url: string;
  source: Buffer<ArrayBufferLike>;
  constructor(
    caption: string,
    markup: InlineKeyboardMarkup,
    url: string,
    request?: FullRequestType,
    source?: Buffer<ArrayBufferLike>,
  ) {
    super(caption, markup, request);
    this.url = url;
    this.source = source
      ? source
      : (createReadStream(url) as any as Buffer<ArrayBufferLike>);
  }
}

class SelectPaymentMethodMenu extends Menu {
  constructor(username?: string) {
    const caption = `@${username} Выберите метод перевода`;
    const markup: InlineKeyboardMarkup = Markup.inlineKeyboard([
      [
        Markup.button.callback('CARD', 'card_request'),
        Markup.button.callback('IBAN', 'iban_request'),
        Markup.button.callback('Отменить', 'cancel_request'),
      ],
    ]).reply_markup;
    super(caption, markup);
  }
}
class PaymentMenu extends Menu {
  constructor(caption: string, username?: string) {
    const markup: InlineKeyboardMarkup = Markup.inlineKeyboard([
      [Markup.button.callback('Назад', 'return_to_request_menu')],
    ]).reply_markup;
    super(caption, markup);
    this.username = username;
  }
}
class CardPaymentMenu extends PaymentMenu {
  constructor(username?: string) {
    const caption = `@${username} отправьте, пожалуйста, заявку в форме:\n\n Карта сумма (5168745632147896 1000)`;
    super(caption, username);
  }
}

class IbanPaymentMenu extends PaymentMenu {
  constructor(username?: string) {
    const caption = `$@${username} отправьте, пожалуйста, заявку в форме:\n\nИмя\nIBAN\nИНН\nСумма\nКомментарий (если нужно)`;
    super(caption, username);
  }
}

class PublicMenu {
  request: FullRequestType;
  url: string;
  source: Buffer<ArrayBufferLike>;
  constructor(
    url: string,
    request: FullRequestType,
    source?: Buffer<ArrayBufferLike>,
  ) {
    this.request = request;
    this.url = url;
    this.source = source || Buffer.from([]);
  }
  messageFromRequest(accessType: AccessType): string {
    if (!this.request) {
      return 'Нет данных для отображения';
    }
    const cardMethods = this.request.cardMethods || [];
    const card =
      cardMethods.length > 0 && cardMethods[0]?.card
        ? `💳Номер карты: ${cardMethods[0].card}\n`
        : '';
    const bank = '-';
    const amount = this.request.amount || 0;
    const rateValue = this.request.rates?.rate;
    const rate = rateValue ? `💱Курс: ${rateValue}\n` : '';
    const usdt = rateValue
      ? `💎USDT: ${(amount / rateValue).toFixed(2)}\n`
      : '';
    const isBlacklisted =
      cardMethods[0]?.blackList && cardMethods[0].blackList.length > 0;
    const blacklist =
      isBlacklisted && cardMethods[0]?.blackList?.[0]
        ? `🚫Карта в чёрном списке: ${cardMethods[0].blackList[0].reason}\n`
        : '';
    const acceptedBy = this.request.activeUser
      ? `Принята: @${this.request.activeUser.username}\n`
      : '';

    return (
      `✉️Заявка номер: ${this.request.id ?? '-'}\n` +
      `🏦Банк: ${bank}\n` +
      `💵Сумма: ${amount}\n` +
      rate +
      usdt +
      card +
      (accessType === 'ADMIN' ? acceptedBy : '') +
      (accessType === 'ADMIN' || accessType === 'WORKER' ? blacklist : '')
    );
  }
  inWork(url?: string): MenuWithMedia {
    const markup = Markup.inlineKeyboard([
      [Markup.button.callback('В работе', 'in_work')],
    ]).reply_markup;

    return new MenuWithMedia(
      this.messageFromRequest('PUBLIC'),
      markup,
      url || this.url,
    );
  }

  done(url?: string): MenuWithMedia {
    const markup = Markup.inlineKeyboard([
      [Markup.button.callback('Выполнено', 'done')],
    ]).reply_markup;
    return new MenuWithMedia(
      this.messageFromRequest('PUBLIC'),
      markup,
      url || this.url,
      undefined,
      this.source,
    );
  }

  rejected(url?: string): MenuWithMedia {
    const markup = Markup.inlineKeyboard([
      [Markup.button.callback('Отклонено', 'rejected')],
    ]).reply_markup;
    return new MenuWithMedia(
      this.messageFromRequest('PUBLIC'),
      markup,
      url || this.url,
    );
  }
}

export class MenuFactory {
  static createMenu(caption: string, markup: InlineKeyboardMarkup): Menu {
    return new Menu(caption, markup);
  }

  static createPublicMenu(
    request: FullRequestType,
    url: string,
    source?: Buffer<ArrayBufferLike>,
  ): PublicMenu {
    return new PublicMenu(url, request, source);
  }
  static createSelectPaymentMethodMenu(
    username: string,
  ): SelectPaymentMethodMenu {
    return new SelectPaymentMethodMenu(username);
  }
  static createCardPaymentMenu(username?: string): CardPaymentMenu {
    return new CardPaymentMenu(username);
  }
  static createIbanPaymentMenu(username?: string): IbanPaymentMenu {
    return new IbanPaymentMenu(username);
  }
  static createMenuWithMedia(
    caption: string,
    markup: InlineKeyboardMarkup,
    media: string,
  ): MenuWithMedia {
    return new MenuWithMedia(caption, markup, media);
  }
}
