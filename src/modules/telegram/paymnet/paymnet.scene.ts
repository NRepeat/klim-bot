import { Injectable } from '@nestjs/common';
import {
  Ctx,
  InjectBot,
  On,
  SceneLeave,
  Wizard,
  WizardStep,
} from 'nestjs-telegraf';
import { CustomSceneContext, FullRequestType } from 'src/types/types';
import { Context, Markup, Telegraf } from 'telegraf';
import { TelegramService } from '../telegram.service';
import { UtilsService } from 'src/modules/utils/utils.service';
import { ConfigService } from '@nestjs/config';
import { InlineKeyboardMarkup } from 'telegraf/typings/core/types/typegram';
import { RequestService } from 'src/modules/request/request.service';
import { ExchangeCheckService } from 'src/modules/external-api/exchange-check.service';
import { MenuFactory } from '../telegram-keyboards';

export type PaymentPhoto = {
  file_id: string;
  file_unique_id: string;
  file_size: number;
  width: number;
  height: number;
};

interface PaymentWizardState {
  requestId: string;
  messageId?: number;
  paymentPhoto?: PaymentPhoto;
  paymentPhotos: PaymentPhoto[];
  mediaGroupId?: string;
  // Обязательные шаги закрытия после подтверждения квитанции: площадка →
  // курс/ордер. Пока стадия не пройдена до конца, completedAt не ставится.
  // 'checking' — транзитная стадия на время await verify: отмена и тексты
  // игнорируются, иначе отмена/повторный ввод бегут параллельно со сверкой
  // и заявка закрывается уже после отмены (или finishClose дважды).
  closeStage?: 'account' | 'partner' | 'rate' | 'order' | 'checking';
  closeAccount?: string;
  closePromptId?: number;
}

// Тексты шагов закрытия — как в greatbot, флоу единый для всех ботов.
// Комиссию не спрашиваем: биржа отдаёт её из ордера, остальным — справочник CloseFee.
const ASK_ACCOUNT = '🏦 Где закрыта заявка?';
const ASK_PARTNER = '🤝 Имя партнёра';
const ASK_RATE = '📊 Курс закрытия';

/**
 * Площадки с автосверкой: там спрашиваем ID ордера и берём курс с комиссией из
 * него. Остальные биржи P2P-API нам не дают — они идут ручным курсом бухгалтера.
 */
const AUTO_CHECKED = ['binance', 'bybit'];

/** `binance` → `Binance`: то же имя, что на кнопке. */
const displayAccount = (account: string) =>
  account.charAt(0).toUpperCase() + account.slice(1);

const askOrder = (account: string) =>
  `🧾 ID P2P-ордера ${displayAccount(account)}`;
const checking = (account: string) => `⏳ Сверяю с ${displayAccount(account)}…`;

const CLOSE_TYPE_KB = Markup.inlineKeyboard([
  [
    Markup.button.callback('🏦 Биржи', 'close_exchanges'),
    Markup.button.callback('🤝 Партнёр', 'close_acc_partner'),
  ],
  [Markup.button.callback('❌ Отмена', 'cancel_payment_photo_proceed')],
]).reply_markup;
const CLOSE_EXCHANGES_KB = Markup.inlineKeyboard([
  [
    Markup.button.callback('Binance', 'close_acc_binance'),
    Markup.button.callback('OKX', 'close_acc_okx'),
    Markup.button.callback('HTX', 'close_acc_htx'),
  ],
  [
    Markup.button.callback('Bybit', 'close_acc_bybit'),
    Markup.button.callback('MEXC', 'close_acc_mexc'),
  ],
  [Markup.button.callback('◀ Назад', 'close_back')],
]).reply_markup;
const CLOSE_CANCEL_KB = Markup.inlineKeyboard([
  [Markup.button.callback('❌ Отмена', 'cancel_payment_photo_proceed')],
]).reply_markup;

// Ручной курс минует биржевую сверку и напрямую двигает деньги, поэтому
// закрыт гардом бухгалтера. Закрытие по ID ордера остаётся доступным всем.
const MANUAL_RATE_DENIED =
  '⛔ Ручной курс может вводить только бухгалтер. Закройте по ID ордера или позовите бухгалтера.';

/**
 * Гард бухгалтера: env BOOKKEEPER_TG_IDS — telegram id через запятую, как в
 * остальных ботах. Ролей в БД нет намеренно: список короткий и меняется
 * деплоем, а не миграцией. Пустой/не заданный env — ручной курс никому:
 * безопасный дефолт для денег.
 */
export function isBookkeeperId(
  userId: number | undefined,
  csv: string | undefined,
): boolean {
  if (!userId || !csv) return false;
  return csv.split(',').some((s) => s.trim() === String(userId));
}

/**
 * Число из ввода оператора: запятая — тоже точка, хвостовые пробелы — не
 * ошибка. Возвращает нормализованную строку («41,25 » → "41.25") — в БД
 * уходит ровно то, что распарсилось, без float-округления.
 */
export function parseCloseNum(s: string): string | null {
  const norm = s.trim().replace(',', '.');
  const v = Number(norm);
  // курс нулевым не бывает — ноль здесь всегда опечатка
  return Number.isFinite(v) && v > 0 && norm !== '' ? norm : null;
}

// Таймер дебаунса media_group живёт вне scene state: telegraf-session-local
// сериализует state целиком, а Timeout циклический — JSON.stringify падал и
// ронял запись sessions.json сразу для всех чатов.
const collectTimers = new Map<string, ReturnType<typeof setTimeout>>();

@Injectable()
@Wizard('payment_photo_proceed')
export default class PaymentWizard {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly utilsService: UtilsService,
    @InjectBot() private bot: Telegraf<Context>,
    private readonly configService: ConfigService,
    private readonly requestService: RequestService,
    private readonly exchangeCheckService: ExchangeCheckService,
  ) {}

  private async getPhotoUrlFromDatabase(requestId: string): Promise<string> {
    try {
      const messages = await this.requestService.getAllPublicMessagesWithRequestsId(requestId);
      if (messages && messages.length > 0) {
        const messageWithPhoto = messages.find(msg => msg.photoUrl && msg.photoUrl !== '');
        if (messageWithPhoto && messageWithPhoto.photoUrl) {
          if (messageWithPhoto.photoUrl.startsWith('https://api.telegram.org/file/bot')) {
            console.warn('Found old Telegram CDN URL in database, using default image');
            return './src/assets/0056.jpg';
          }
          return messageWithPhoto.photoUrl;
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve photo from database, using default:', error);
    }
    return './src/assets/0056.jpg';
  }

  private async deletePhotoFileIfExists(photoUrl: string): Promise<void> {
    try {
      if (photoUrl &&
          photoUrl !== './src/assets/0056.jpg' &&
          !photoUrl.startsWith('http') &&
          photoUrl.startsWith('./storage/request-photos/')) {

        const fs = require('fs').promises;
        try {
          await fs.unlink(photoUrl);
          console.log(`[PaymentWizard] Successfully deleted photo file: ${photoUrl}`);
        } catch (fileError: any) {
          if (fileError.code === 'ENOENT') {
            console.log(`[PaymentWizard] Photo file already deleted or doesn't exist: ${photoUrl}`);
          } else {
            console.error(`[PaymentWizard] Error deleting photo file: ${photoUrl}`, fileError);
          }
        }
      } else {
        console.log(`[PaymentWizard] Skipping deletion of non-local photo: ${photoUrl}`);
      }
    } catch (error) {
      console.error('[PaymentWizard] Error in deletePhotoFileIfExists:', error);
    }
  }

  @WizardStep(0)
  async proceedFirstStep(@Ctx() ctx: CustomSceneContext) {
    const inline_keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('Отмена', 'cancel_payment_photo_proceed')],
    ]);
    const msg = await ctx.reply('Пожалуйста прикрепите квитанцию', {
      reply_markup: inline_keyboard.reply_markup,
    });
    ctx.session.messagesToDelete = ctx.session.messagesToDelete || [];
    ctx.session.requestMenuMessageId = ctx.session.requestMenuMessageId || [];
    ctx.session.requestMenuMessageId.push(msg.message_id);
    ctx.wizard.next();
  }

  @WizardStep(1)
  async proceedFinalStep(@Ctx() ctx: CustomSceneContext) {
    const state = ctx.wizard.state as PaymentWizardState;
    if (!state.paymentPhotos) state.paymentPhotos = [];
    const message = ctx.message as {
      photo?: PaymentPhoto[];
      media_group_id?: string;
      text?: string;
    };

    // Текст оператора на шагах закрытия: имя партнёра, курс или ID ордера
    if (state.closeStage && message && typeof message.text === 'string') {
      ctx.session.messagesToDelete?.push(ctx.message?.message_id || 0);
      await this.onCloseText(ctx, state, message.text.trim());
      return;
    }

    // Handle photo message (пока не начались шаги закрытия — набор квитанций уже подтверждён)
    if (message && Array.isArray(message.photo) && !state.closeStage) {
      ctx.session.messagesToDelete?.push(ctx.message?.message_id || 0);

      const photo = message.photo[message.photo.length - 1];
      state.paymentPhotos.push(photo);
      // Keep backward compat
      state.paymentPhoto = photo;

      // If part of media group, debounce confirm prompt
      if (message.media_group_id) {
        state.mediaGroupId = message.media_group_id;
        // Clear previous timer if exists
        const timerKey = `${ctx.chat?.id}:${ctx.from?.id}`;
        const pending = collectTimers.get(timerKey);
        if (pending) clearTimeout(pending);
        collectTimers.set(
          timerKey,
          setTimeout(async () => {
            collectTimers.delete(timerKey);
            await this.showConfirmPrompt(ctx, state);
          }, 1500),
        );
        return;
      }

      // Single photo — show confirm immediately
      await this.showConfirmPrompt(ctx, state);
      return;
    }

    // Handle callbacks
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      const data = ctx.callbackQuery.data;

      if (data === 'confirm_receipt') {
        const photos = state.paymentPhotos?.length ? state.paymentPhotos : (state.paymentPhoto ? [state.paymentPhoto] : []);
        if (photos.length === 0) {
          await ctx.answerCbQuery('Фото не найдено');
          return;
        }
        if (state.closeStage) {
          // повторный тык по старой кнопке — шаги закрытия уже идут
          await ctx.answerCbQuery();
          return;
        }
        // Квитанция есть — дальше обязательные шаги закрытия: без площадки и
        // курса заявка не закрывается, обходной кнопки нет.
        state.closeStage = 'account';
        await ctx.answerCbQuery();
        const msg = await ctx.reply(ASK_ACCOUNT, { reply_markup: CLOSE_TYPE_KB });
        state.closePromptId = msg.message_id;
        ctx.session.requestMenuMessageId?.push(msg.message_id);
        return;
      }

      // [Биржи] ⇄ [◀ Назад] — листание экранов выбора площадки
      if (data === 'close_exchanges' && state.closeStage === 'account') {
        await ctx.answerCbQuery();
        await ctx.editMessageReplyMarkup(CLOSE_EXCHANGES_KB).catch(() => {});
        return;
      }
      if (data === 'close_back' && state.closeStage === 'account') {
        await ctx.answerCbQuery();
        await ctx.editMessageReplyMarkup(CLOSE_TYPE_KB).catch(() => {});
        return;
      }

      // Кнопка площадки: где есть автосверка — по ID ордера, партнёр — сначала
      // имя, остальные биржи — сразу курс.
      if (data.startsWith('close_acc_') && state.closeStage === 'account') {
        const account = data.substring('close_acc_'.length);
        await ctx.answerCbQuery();
        if (account === 'partner') {
          state.closeStage = 'partner';
          await this.editClosePrompt(ctx, state, ASK_PARTNER, CLOSE_CANCEL_KB);
        } else if (AUTO_CHECKED.includes(account)) {
          state.closeAccount = account;
          state.closeStage = 'order';
          await this.editClosePrompt(
            ctx,
            state,
            askOrder(account),
            CLOSE_CANCEL_KB,
          );
        } else {
          state.closeAccount = account;
          state.closeStage = 'rate';
          await this.editClosePrompt(ctx, state, ASK_RATE, CLOSE_CANCEL_KB);
        }
        return;
      }

      if (data === 'retry_receipt') {
        if (state.closeStage) {
          // квитанция уже подтверждена, идут шаги закрытия — переснимать поздно
          await ctx.answerCbQuery();
          return;
        }
        state.paymentPhoto = undefined;
        state.paymentPhotos = [];
        state.mediaGroupId = undefined;
        await ctx.answerCbQuery('Отправьте новую квитанцию');
        const msg = await ctx.reply('Пожалуйста прикрепите квитанцию', {
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('Отмена', 'cancel_payment_photo_proceed')],
          ]).reply_markup,
        });
        ctx.session.requestMenuMessageId?.push(msg.message_id);
        return;
      }

      if (data === 'cancel_payment_photo_proceed') {
        if (state.closeStage === 'checking') {
          // сверка уже ушла на биржу — отменять поздно, дождёмся вердикта
          await ctx.answerCbQuery('⏳ Идёт сверка, подождите…');
          return;
        }
        const requestId = state.requestId;
        const messageId = state.messageId;
        const request = await this.requestService.findById(requestId);
        if (!request) {
          await ctx.scene.leave();
          throw new Error('Request not found');
        }
        const photoUrl = await this.getPhotoUrlFromDatabase(requestId);

        const workerMenu = MenuFactory.createWorkerMenu(
          request as unknown as FullRequestType,
          photoUrl,
          undefined,
          true,
          false,
        );
        await this.bot.telegram.editMessageMedia(
          ctx.chat?.id!,
          messageId!,
          undefined,
          {
            media: {
              source: photoUrl,
            },
            type: 'photo',
            caption: workerMenu.inProcess(undefined, request.id).caption,
            parse_mode: 'HTML',
          },
          {
            reply_markup: workerMenu.inProcess(undefined, request.id).markup,
          },
        );
        await ctx.scene.leave();
        return;
      }

      if (data.includes('accept_request')) {
        console.error('Unknown callback query data:', ctx.callbackQuery);
        const requestId = state.requestId;
        const request = await this.requestService.findById(requestId);
        if (!request) {
          await ctx.scene.leave();
          throw new Error('Request not found');
        }
        const photoUrl = await this.getPhotoUrlFromDatabase(requestId);

        const workerMenu = MenuFactory.createWorkerMenu(
          request as unknown as FullRequestType,
          photoUrl,
        );
        await this.telegramService.updateAllWorkersMessagesWithRequestsId(
          {
            text: workerMenu.inWork().caption,
            inline_keyboard: workerMenu.inProcess(undefined, request.id)
              .markup,
          },
          requestId,
        );
        await ctx.scene.leave();
        return;
      }

      console.error('Unknown callback query data:', ctx.callbackQuery);
      await ctx.answerCbQuery('Unknown action');
      return;
    }

    // мусорный апдейт посреди шагов закрытия не должен ронять визард
    if (state.closeStage) {
      return;
    }
    await ctx.scene.leave();
  }

  /** Проверяем id отправителя текста — не чата: гард именно на человека. */
  private isBookkeeper(ctx: CustomSceneContext): boolean {
    return isBookkeeperId(
      ctx.from?.id,
      this.configService.get<string>('BOOKKEEPER_TG_IDS'),
    );
  }

  /**
   * Текст оператора на шагах закрытия. Любая невалидность — переспросить и
   * остаться на шаге: без полного набора полей заявка не закрывается.
   */
  private async onCloseText(
    ctx: CustomSceneContext,
    state: PaymentWizardState,
    text: string,
  ) {
    if (state.closeStage === 'partner') {
      if (!text) return;
      state.closeAccount = `partner:${text}`;
      state.closeStage = 'rate';
      await this.editClosePrompt(ctx, state, ASK_RATE, CLOSE_CANCEL_KB);
      return;
    }

    if (state.closeStage === 'rate') {
      // Курс для OKX/HTX/Bybit/MEXC и партнёров вводится руками — только
      // бухгалтер: сверить его не с чем. Остаёмся на шаге, не роняя визард.
      if (!this.isBookkeeper(ctx)) {
        await this.replyCloseError(ctx, MANUAL_RATE_DENIED);
        return;
      }
      const rate = parseCloseNum(text);
      if (!rate) {
        await this.replyCloseError(ctx, ASK_RATE);
        return;
      }
      // комиссия — из справочника по площадке, оператора не спрашиваем
      const fee = await this.requestService.closeFeeFor(state.closeAccount!);
      await this.finishClose(ctx, state, { rate, fee, orderId: null });
      return;
    }

    if (state.closeStage === 'order') {
      // «курс 41.25» — ручной обход: API недоступен или ордер не с нашего
      // аккаунта. Комиссия тогда из справочника, ордер не сохраняем.
      const manual = /^курс\s+(.+)$/iu.exec(text);
      if (manual) {
        // Обход сверки — тоже только бухгалтер; всем прочим
        // остаётся честный путь через ID ордера.
        if (!this.isBookkeeper(ctx)) {
          await this.replyCloseError(ctx, MANUAL_RATE_DENIED);
          return;
        }
        const rate = parseCloseNum(manual[1]);
        if (!rate) {
          await this.replyCloseError(ctx, ASK_RATE);
          return;
        }
        const fee = await this.requestService.closeFeeFor(state.closeAccount!);
        await this.finishClose(ctx, state, { rate, fee, orderId: null });
        return;
      }

      // Голое короткое число («44.12») — это ручной курс, а не ID:
      // тот же путь и тот же гард, что у «курс N».
      if (!/^\d{5,}$/.test(text)) {
        const bareRate = parseCloseNum(text);
        if (bareRate) {
          if (!this.isBookkeeper(ctx)) {
            await this.replyCloseError(ctx, MANUAL_RATE_DENIED);
            return;
          }
          const fee = await this.requestService.closeFeeFor(state.closeAccount!);
          await this.finishClose(ctx, state, { rate: bareRate, fee, orderId: null });
          return;
        }
        await this.replyCloseError(
          ctx,
          `ID ордера — число из ордера ${displayAccount(state.closeAccount!)}.`,
        );
        return;
      }

      const request = await this.requestService.findById(state.requestId);
      if (!request) {
        await ctx.scene.leave();
        throw new Error('Request not found');
      }
      // Сервису нужна крипто-сумма заявки: фиат / курс заявки.
      const requestRate = Number(request.rates?.rate ?? request.rate);
      const usdtAmount =
        Number.isFinite(requestRate) && requestRate > 0
          ? request.amount / requestRate
          : 0;
      if (!(usdtAmount > 0)) {
        await this.editClosePrompt(
          ctx,
          state,
          '⚠️ У заявки нет курса — сверка невозможна. Закройте вручную: «курс 41.25».',
          CLOSE_CANCEL_KB,
        );
        return;
      }

      // Транзитная стадия на время сверки: onCloseText её не знает (тексты
      // игнорируются), cancel отвечает «подождите». verify не бросает —
      // при любом неуспехе вернёмся в 'order'.
      state.closeStage = 'checking';
      // поиск в истории биржи занимает секунды — показываем, что не зависли
      await this.editClosePrompt(ctx, state, checking(state.closeAccount!));
      // сверяем ключами того, кто закрывает: ордер лежит в истории его
      // биржевого аккаунта, чужим ключом он не найдётся
      const verdict = await this.exchangeCheckService.verify(
        state.requestId,
        text,
        usdtAmount.toFixed(8),
        state.closeAccount!,
        ctx.from?.id ?? 0,
      );
      if (!verdict.ok) {
        state.closeStage = 'order';
        await this.editClosePrompt(
          ctx,
          state,
          `${verdict.message}\n\n${askOrder(state.closeAccount!)}`,
          CLOSE_CANCEL_KB,
        );
        return;
      }
      await this.finishClose(ctx, state, {
        rate: verdict.rate,
        fee: verdict.fee,
        orderId: text,
      });
    }
  }

  /**
   * Финал закрытия: все обязательные поля собраны — одним update ставим
   * COMPLETED вместе с площадкой/курсом/комиссией, дальше прежний путь
   * рассылки квитанции по карточкам.
   */
  private async finishClose(
    ctx: CustomSceneContext,
    state: PaymentWizardState,
    close: { rate: string; fee: string; orderId: string | null },
  ) {
    const photos = state.paymentPhotos?.length
      ? state.paymentPhotos
      : state.paymentPhoto
        ? [state.paymentPhoto]
        : [];
    const requestId = state.requestId;
    // Одна квитанция уже лежит у Telegram — обновляем карточки её file_id,
    // без скачивания и повторной заливки. Склейку нескольких фото залить
    // всё же придётся, но ровно один раз: file_id вернётся из ответа.
    const singleFileId = photos.length === 1 ? photos[0].file_id : undefined;
    let buffer: Buffer | undefined;
    if (!singleFileId) {
      const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN')!;
      const buffers = await Promise.all(
        photos.map((p) =>
          this.utilsService.downloadTelegramPhoto(token, p.file_id),
        ),
      );
      buffer = await this.utilsService.mergeImagesGrid(buffers);
    }

    const userId = ctx.from?.id;
    if (!userId) {
      throw new Error('User ID not found in context');
    }
    const request = await this.requestService.findById(requestId);
    if (!request) {
      await ctx.scene.leave();
      throw new Error('Request not found');
    }
    await this.requestService.completeRequestWithClose(requestId, userId, {
      account: state.closeAccount!,
      rate: close.rate,
      fee: close.fee,
      orderId: close.orderId,
    });
    await this.telegramService.deleteReminderMessagesForRequest(requestId);

    const publicMenu = MenuFactory.createPublicMenu(
      request as unknown as FullRequestType,
      '',
      buffer,
    );
    const workerMenu = MenuFactory.createWorkerMenu(
      request as unknown as FullRequestType,
      '',
      buffer,
    );
    const adminMenu = MenuFactory.createAdminMenu(
      request as unknown as FullRequestType,
      '',
      buffer,
    );
    // Первая рассылка отдаёт file_id залитой квитанции — им же кроем
    // остальные каналы, чтобы во всех карточках висела одна картинка.
    let fileId = singleFileId;
    fileId =
      (await this.telegramService.updateAllWorkersMessagesWithRequestsId(
        {
          fileId,
          source: fileId ? undefined : buffer,
          text: workerMenu.done(undefined, requestId).caption,
          inline_keyboard: workerMenu.done(undefined, requestId).markup,
        },
        requestId,
      )) ?? fileId;
    fileId =
      (await this.telegramService.updateAllAdminsMessagesWithRequestsId(
        {
          fileId,
          source: fileId ? undefined : buffer,
          text: adminMenu.done().caption,
          inline_keyboard: adminMenu.done().markup,
        },
        requestId,
      )) ?? fileId;
    fileId =
      (await this.telegramService.updateAllPublicMessagesWithRequestsId(
        {
          fileId,
          source: fileId ? undefined : buffer,
          text: publicMenu.done().caption,
          inline_keyboard: publicMenu.done().markup,
        },
        requestId,
      )) ?? fileId;

    const photoUrl = await this.getPhotoUrlFromDatabase(requestId);
    if (fileId) {
      // Дальше карточки правятся по photoUrl из базы: держим там квитанцию,
      // иначе следующая же правка вернёт заглушку.
      await this.requestService.setMessagesPhoto(requestId, fileId);
    }
    await this.deletePhotoFileIfExists(photoUrl);

    await ctx.scene.leave();
  }

  /** Подсказка текущего шага закрытия: правим одно сообщение, переписка не растёт. */
  private async editClosePrompt(
    ctx: CustomSceneContext,
    state: PaymentWizardState,
    text: string,
    markup?: InlineKeyboardMarkup,
  ) {
    try {
      await this.bot.telegram.editMessageText(
        ctx.chat!.id,
        state.closePromptId!,
        undefined,
        text,
        { reply_markup: markup },
      );
    } catch {
      // «not modified» или прибитая подсказка — показать новой
      try {
        const msg = await ctx.reply(text, { reply_markup: markup });
        state.closePromptId = msg.message_id;
        ctx.session.requestMenuMessageId?.push(msg.message_id);
      } catch (error) {
        console.error('Failed to show close prompt:', error);
      }
    }
  }

  /** Ошибка ввода на шаге закрытия — коротким сообщением, уберём при выходе из сцены. */
  private async replyCloseError(ctx: CustomSceneContext, text: string) {
    const msg = await ctx.reply(text);
    ctx.session.messagesToDelete?.push(msg.message_id);
  }

  private async showConfirmPrompt(ctx: CustomSceneContext, state: PaymentWizardState) {
    const count = state.paymentPhotos?.length || 1;
    const caption = count > 1
      ? `Получено ${count} фото. Подтвердите квитанцию (будут объединены в одно изображение)`
      : 'Подтвердите квитанцию';

    const lastPhoto = state.paymentPhotos?.[state.paymentPhotos.length - 1] || state.paymentPhoto;
    if (!lastPhoto) return;

    const confirmMsg = await ctx.replyWithPhoto(lastPhoto.file_id, {
      caption,
      reply_markup: Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Подтвердить', 'confirm_receipt'),
          Markup.button.callback('🔄 Переснять', 'retry_receipt'),
        ],
        [Markup.button.callback('❌ Отмена', 'cancel_payment_photo_proceed')],
      ]).reply_markup,
    });
    ctx.session.requestMenuMessageId?.push(confirmMsg.message_id);
  }

  @SceneLeave()
  async onSceneLeave(@Ctx() ctx: CustomSceneContext) {
    await this.deleteSceneMessages(ctx);
    await this.deleteSceneMenuMessages(ctx);
    ctx.session.messagesToDelete = [];
    ctx.session.customState = '';
    ctx.session.requestMenuMessageId = undefined;
  }
  async deleteSceneMessages(ctx: CustomSceneContext, msgIdToPass?: number[]) {
    try {
      await this.telegramService.deleteAllTelegramMessages(
        ctx.session.messagesToDelete,
        ctx.chat?.id,
        msgIdToPass,
      );
      ctx.session.messagesToDelete = [];
    } catch (error) {
      console.error('Failed to delete scene messages:', error);
    }
  }
  async deleteSceneMenuMessages(ctx: CustomSceneContext) {
    try {
      await ctx.deleteMessages(ctx.session.requestMenuMessageId || []);
      ctx.session.requestMenuMessageId = [];
    } catch (error) {
      console.error('Failed to delete scene messages:', error);
    }
  }
  async updateSceneMenuMessage(
    ctx: CustomSceneContext,
    text: string,
    markup?: InlineKeyboardMarkup,
  ) {
    try {
      await ctx.editMessageText(text, {
        reply_markup: markup ?? undefined,
      });
    } catch (error) {
      console.error('Failed to update scene menu message:', error);
    }
  }
}
