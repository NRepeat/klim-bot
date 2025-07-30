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
    const caption = MESSAGES.SELECT_PAYMENT_METHOD(username || '');
    const markup: InlineKeyboardMarkup = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          BUTTON_TEXTS.CARD,
          BUTTON_CALLBACKS.CARD_REQUEST,
        ),
        Markup.button.callback(
          BUTTON_TEXTS.IBAN,
          BUTTON_CALLBACKS.IBAN_REQUEST,
        ),
        Markup.button.callback(
          BUTTON_TEXTS.CANCEL,
          BUTTON_CALLBACKS.CANCEL_REQUEST,
        ),
      ],
    ]).reply_markup;
    super(caption, markup);
  }
}
abstract class PaymentMenu extends Menu {
  constructor(caption: string, username?: string) {
    const markup = createSingleButtonMarkup(
      BUTTON_TEXTS.BACK,
      BUTTON_CALLBACKS.RETURN_TO_REQUEST_MENU,
    );
    super(caption, markup);
    this.username = username;
  }
}

class CardPaymentMenu extends PaymentMenu {
  constructor(username?: string) {
    const caption = MESSAGES.CARD_PAYMENT_FORM(username || '');
    super(caption, username);
  }
}

class IbanPaymentMenu extends PaymentMenu {
  constructor(username?: string) {
    const caption = MESSAGES.IBAN_PAYMENT_FORM(username || '');
    super(caption, username);
  }
}

abstract class BaseRequestMenu {
  request: FullRequestType;
  url: string;
  source: Buffer<ArrayBufferLike>;

  constructor(
    url: string,
    request: FullRequestType,
    source?: Buffer<ArrayBufferLike>,
  ) {
    const photoUrl = './src/assets/0056.jpg';
    this.request = request;
    this.url = url ? url : photoUrl;
    this.source = source || Buffer.from([]);
  }

  protected abstract getAccessType(): AccessType;

  messageFromRequest(accessType?: AccessType): string {
    if (!this.request) {
      return MESSAGES.NO_DATA;
    }
    const currentAccessType = accessType || this.getAccessType();
    const isCard = this.request.paymentMethod?.nameEn === 'CARD';
    console.log('isCard:', isCard, 'currentAccessType:', currentAccessType);
    if (isCard) {
      const cardMethods = this.request.cardMethods || [];
      console.log('cardMethods', this.request);

      const bank = cardMethods[0]?.bank?.bankName
        ? cardMethods[0]?.bank?.bankName
        : '-';
      const amount = this.request.amount || 0;
      const rateValue = this.request.rates?.rate;
      const rate = rateValue
        ? `💱<b>Курс:</b> <code>${rateValue}</code>\n`
        : '';
      const usdt = rateValue
        ? `💎<b>USDT:</b> <code>${(amount / rateValue).toFixed(2)}</code>\n`
        : '';
      const isBlacklisted =
        cardMethods[0]?.blackList && cardMethods[0]?.blackList.length > 0;
      console.log('isBlacklisted:', isBlacklisted, 'cardMethods:', cardMethods);
      console.log('cardMethods[0].blackList:', cardMethods[0]?.blackList);
      const blacklist = isBlacklisted && '🚫Карта в чёрном списке';

      const acceptedBy = this.request.activeUser
        ? `<b>Принята:</b> @${this.request.activeUser.username}\n`
        : '';
      const card =
        cardMethods.length > 0 && cardMethods[0]?.card
          ? `💳<b>Номер карты:</b> <code>${acceptedBy ? cardMethods[0].card : Array.from(cardMethods[0].card, () => '*').join('')}</code>\n`
          : '';
      const payedBy = this.request.payedByUser?.username
        ? '<b>Оплачено:</b> @' + this.request.payedByUser.username + '\n'
        : '';
      const vendor = this.request.vendor?.title || '-';
      return (
        `✉️<b>Заявка номер:</b> <code>${this.request.id ?? '-'}</code>\n` +
        `🏦<b>Банк:</b> <i>${bank}</i>\n` +
        `💵<b>Сумма:</b> <code>${amount}</code>\n` +
        rate +
        usdt +
        card +
        (currentAccessType === 'ADMIN' || currentAccessType === 'WORKER'
          ? acceptedBy
          : '') +
        (currentAccessType === 'ADMIN' ? payedBy : '') +
        (currentAccessType === 'ADMIN'
          ? `<b>Партнер:</b> <i>${vendor}</i>\n`
          : '') +
        (currentAccessType === 'ADMIN' || currentAccessType === 'WORKER'
          ? blacklist
          : '')
      );
    } else if (this.request.paymentMethod?.nameEn === 'IBAN') {
      const ibanMethods = this.request.ibanMethods || [];
      const name =
        ibanMethods.length > 0 && ibanMethods[0]?.name
          ? `👤<b>Имя:</b> <i>${ibanMethods[0].name}</i>\n`
          : '';
      const iban =
        ibanMethods.length > 0 && ibanMethods[0]?.iban
          ? `🏦<b>IBAN:</b> <code>${ibanMethods[0].iban}</code>\n`
          : '';
      const inn =
        ibanMethods.length > 0 && ibanMethods[0]?.inn
          ? `📋<b>ИНН:</b> <code>${ibanMethods[0].inn}</code>\n`
          : '';
      const comment =
        ibanMethods.length > 0 && ibanMethods[0]?.comment
          ? `💬<b>Комментарий:</b> <i>${ibanMethods[0].comment}</i>\n`
          : '';
      const amount = this.request.amount || 0;
      const rateValue = this.request.rates?.rate;
      const rate = rateValue
        ? `💱<b>Курс:</b> <code>${rateValue}</code>\n`
        : '';
      const usdt = rateValue
        ? `💎<b>USDT:</b> <code>${(amount / rateValue).toFixed(2)}</code>\n`
        : '';
      console.log('this.request.activeUser', this.request.activeUser);
      const acceptedBy = this.request.activeUser
        ? `<b>Принята:</b> @${this.request.activeUser.username}\n`
        : '';
      const payedBy = this.request.payedByUser?.username
        ? '<b>Оплачено:</b> @' + this.request.payedByUser.username + '\n'
        : '';
      const vendor = this.request.vendor?.title || '-';
      return (
        `✉️<b>Заявка номер:</b> <code>${this.request.id ?? '-'}</code>\n` +
        `💵<b>Сумма:</b> <code>${amount}</code>\n` +
        rate +
        usdt +
        name +
        iban +
        inn +
        comment +
        (currentAccessType === 'ADMIN' || currentAccessType === 'WORKER'
          ? acceptedBy
          : '') +
        (currentAccessType === 'ADMIN' ? payedBy : '') +
        (currentAccessType === 'ADMIN'
          ? `<b>Партнер:</b> <i>${vendor}</i>\n`
          : '')
      );
    }

    return `✉️<b>Заявка номер:</b> <code>${this.request.id ?? '-'}</code>\nНеизвестный тип платежа`;
  }

  inWork(url?: string, requestId?: string): MenuWithMedia {
    const accessType = this.getAccessType();
    let markup: InlineKeyboardMarkup;
    switch (accessType) {
      case 'ADMIN':
        markup = Markup.inlineKeyboard([
          [
            createButton(BUTTON_TEXTS.ADMIN_IN_WORK, BUTTON_CALLBACKS.DUMMY),
            createButton(
              BUTTON_TEXTS.ADMIN_CANCEL_REQUEST,
              BUTTON_CALLBACKS.ADMIN_CANCEL_REQUEST + requestId,
            ),
          ],
        ]).reply_markup;
        break;
      case 'WORKER':
        markup = requestId
          ? Markup.inlineKeyboard([
              [
                createButton(
                  BUTTON_TEXTS.TAKE_REQUEST,
                  BUTTON_CALLBACKS.TAKE_REQUEST + requestId,
                ),
              ],
            ]).reply_markup
          : createSingleButtonMarkup(
              BUTTON_TEXTS.IN_WORK,
              BUTTON_CALLBACKS.IN_WORK,
            );
        break;
      case 'PUBLIC':
      default:
        markup = createSingleButtonMarkup(
          BUTTON_TEXTS.IN_WORK,
          BUTTON_CALLBACKS.IN_WORK,
        );
        break;
    }
    return new MenuWithMedia(
      this.messageFromRequest(),
      markup,
      url || this.url,
    );
  }
  inProcess(url?: string, requestId?: string): Menu {
    const markup = createSingleButtonMarkup(
      BUTTON_TEXTS.IN_WORK,
      BUTTON_CALLBACKS.IN_WORK,
    );
    const newCancelButton = Markup.button.callback(
      'Отмена',
      'cancel_payment_' + requestId,
    );
    const inline_keyboard = requestId
      ? Markup.inlineKeyboard([
          [
            createButton(
              BUTTON_TEXTS.REQUEST_COMPLIED,
              BUTTON_CALLBACKS.REQUEST_COMPLIED + requestId,
            ),
            newCancelButton,
          ],
        ]).reply_markup
      : markup;
    return new Menu(this.messageFromRequest(), inline_keyboard);
  }

  done(url?: string): MenuWithMedia {
    const markup = createSingleButtonMarkup(
      BUTTON_TEXTS.DONE,
      BUTTON_CALLBACKS.DONE,
    );
    console.log('Creating done menu with request:', this.messageFromRequest());
    return new MenuWithMedia(
      this.messageFromRequest(),
      markup,
      url || this.url,
      undefined,
      this.source,
    );
  }
  canceled(url?: string, requestId?: string) {
    const accessType = this.getAccessType();
    if (accessType === 'WORKER' && requestId) {
      const markup = Markup.inlineKeyboard([
        [
          createButton(
            BUTTON_TEXTS.VALUT_CARD,
            BUTTON_CALLBACKS.VALUT_CARD + requestId,
          ),
        ],
        [
          createButton(
            BUTTON_TEXTS.BACK_TO_TAKE_REQUEST,
            BUTTON_CALLBACKS.BACK_TO_TAKE_REQUEST + requestId,
          ),
        ],
      ]).reply_markup;
      return new MenuWithMedia(
        this.messageFromRequest(),
        markup,
        url || this.url,
      );
    } else if (accessType === 'ADMIN' && requestId) {
      const markup = Markup.inlineKeyboard([
        [
          createButton(
            BUTTON_TEXTS.REJECTED_BY_ADMIN,
            BUTTON_CALLBACKS.REJECTED_BY_ADMIN,
          ),
        ],
      ]).reply_markup;
      return new MenuWithMedia(
        this.messageFromRequest(),
        markup,
        url || this.url,
      );
    } else {
      return new MenuWithMedia(
        this.messageFromRequest(),
        createSingleButtonMarkup(
          BUTTON_TEXTS.BACK,
          BUTTON_CALLBACKS.RETURN_TO_REQUEST_MENU,
        ),
        url || this.url,
      );
    }
  }
  rejected(url?: string): MenuWithMedia {
    const markup = createSingleButtonMarkup(
      BUTTON_TEXTS.REJECTED,
      BUTTON_CALLBACKS.REJECTED,
    );

    return new MenuWithMedia(
      this.messageFromRequest(),
      markup,
      url || this.url,
    );
  }
}

class PublicMenu extends BaseRequestMenu {
  protected getAccessType(): AccessType {
    return 'PUBLIC';
  }
}

class WorkMenu extends BaseRequestMenu {
  protected getAccessType(): AccessType {
    return 'WORKER';
  }
}

class AdminMenu extends BaseRequestMenu {
  protected getAccessType(): AccessType {
    return 'ADMIN';
  }
}
export class MenuFactory {
  static createMenu(caption: string, markup: InlineKeyboardMarkup): Menu {
    return new Menu(caption, markup);
  }
  static createWorkerMenu(
    request: FullRequestType,
    url: string,
    source?: Buffer<ArrayBufferLike>,
  ): WorkMenu {
    return new WorkMenu(url, request, source);
  }
  static createAdminMenu(
    request: FullRequestType,
    url: string,
    source?: Buffer<ArrayBufferLike>,
  ): AdminMenu {
    return new AdminMenu(url, request, source);
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

// Константы для кнопок и сообщений
const BUTTON_TEXTS = {
  IN_WORK: 'В работе',
  DONE: 'Выполнено',
  REJECTED: 'Отклонено',
  BACK: 'Назад',
  CARD: 'CARD',
  IBAN: 'IBAN',
  CANCEL: 'Отменить',
  TAKE_REQUEST: 'Взять заявку',
  WORKER_CANCEL_REQUEST: 'Отказаться',
  ADMIN_CANCEL_REQUEST: 'Отменить заявку',
  ADMIN_IN_WORK: 'В работе',
  REQUEST_COMPLIED: 'Перевел',
  GIVE_NEXT: 'Передать другому',
  VALUT_CARD: 'Валютная карта',
  BACK_TO_TAKE_REQUEST: 'Отказаться от заявки',
  REJECTED_BY_ADMIN: 'Отклонено админом',
} as const;

const BUTTON_CALLBACKS = {
  REJECTED_BY_ADMIN: 'rejected_by_admin_',
  GIVE_NEXT: 'give_next_',
  VALUT_CARD: 'valut_card_',
  BACK_TO_TAKE_REQUEST: 'back_to_take_request_',
  WORKER_CANCEL_REQUEST: 'worker_cancel_request_',
  REQUEST_COMPLIED: 'proceeded_payment_',
  IN_WORK: 'in_work',
  DONE: 'done',
  REJECTED: 'rejected',
  RETURN_TO_REQUEST_MENU: 'return_to_request_menu',
  CARD_REQUEST: 'card_request',
  IBAN_REQUEST: 'iban_request',
  CANCEL_REQUEST: 'cancel_request',
  TAKE_REQUEST: 'accept_request_',
  CANCEL_WORKER_REQUEST: 'cancel_worker_request_',
  DUMMY: 'dummy',
  ADMIN_CANCEL_REQUEST: 'admin_cancel_request_',
} as const;

const MESSAGES = {
  SELECT_PAYMENT_METHOD: (username: string) =>
    `@${username} Выберите метод перевода`,
  CARD_PAYMENT_FORM: (username: string) =>
    `@${username} отправьте, пожалуйста, заявку в форме:\n\n Карта сумма (5168745632147896 1000)`,
  IBAN_PAYMENT_FORM: (username: string) =>
    `@${username} отправьте, пожалуйста, заявку в форме:\nИмя\nIBAN\nИНН\nСумма\nКомментарий (если нужно)`,
  NO_DATA: 'Нет данных для отображения',
} as const;

// Вспомогательные функции для создания кнопок
const createButton = (text: string, callback: string) =>
  Markup.button.callback(text, callback);

const createSingleButtonMarkup = (text: string, callback: string) =>
  Markup.inlineKeyboard([[createButton(text, callback)]]).reply_markup;
