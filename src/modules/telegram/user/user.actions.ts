import { Action, Ctx, On, Update } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';
import { UserService } from 'src/modules/user/user.service';
import { RequestService } from 'src/modules/request/request.service';
import { TelegramService } from '../telegram.service';
import { UtilsService } from 'src/modules/utils/utils.service';
import { FullRequestType } from 'src/types/types';
import { SceneContext } from 'telegraf/typings/scenes';

@Update()
export class UserActions {
  constructor(
    private readonly userService: UserService,
    private readonly requestService: RequestService,
    private readonly telegramService: TelegramService,
    private readonly utilsService: UtilsService,
  ) {}

  @Action('new_user')
  async onNewUser(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await this.userService.createUser(ctx);
    await ctx.reply('You pressed the "New user" button!');
  }

  @On('callback_query')
  async onCallbackQuery(@Ctx() ctx: SceneContext) {
    await ctx.answerCbQuery();
    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery) {
      console.error('No callback query found');
      return;
    } else if ('data' in callbackQuery) {
      console.log(callbackQuery);
      if (callbackQuery.data.includes('accept_request_')) {
        console.log(callbackQuery.data);
        const requestId = callbackQuery.data.split('_')[2];
        const userId = callbackQuery.from.id;
        const chatId = callbackQuery.message?.chat.id;
        // await this.cancel(ctx);
        try {
          await this.requestService.acceptRequest(requestId, userId, chatId);
        } catch (error) {}
        const request = await this.requestService.findById(requestId);
        const message = this.utilsService.buildRequestMessage(
          request as any as FullRequestType,
          request?.paymentMethod?.nameEn === 'CARD' ? 'card' : 'iban',
          'admin',
        );

        const newPaymentButton = Markup.button.callback(
          'Перевел',
          'proceeded_payment_' + requestId,
        );
        const newCancelButton = Markup.button.callback(
          'Отмена',
          'cancel_payment_' + requestId,
        );
        const inline_keyboard = Markup.inlineKeyboard([
          [newPaymentButton, newCancelButton],
        ]);
        await this.telegramService.updateAllWorkersMessagesWithRequestsId(
          {
            text: message.text,
            inline_keyboard: inline_keyboard.reply_markup,
          },
          requestId,
        );
        await this.telegramService.updateAllAdminsMessagesWithRequestsId(
          message,
          requestId,
        );
        await ctx.answerCbQuery('Request accepted');
      }

      if (callbackQuery.data.includes('proceeded_payment_')) {
        console.log(callbackQuery.data);
        const requestId = callbackQuery.data.split('_')[2];
        console.log(requestId, 'requestId');
        const request = await this.requestService.findById(requestId);
        if (!request) {
          throw new Error('Request not found');
        }
        const paymentMethod = request.paymentMethod;
        const newMessage = this.utilsService.buildRequestMessage(
          request as any as FullRequestType,
          paymentMethod?.nameEn === 'CARD' ? 'card' : 'iban',
          'worker',
        );
        const button = Markup.button.callback(
          'Отменить',
          'cancel_payment_photo_proceed',
        );
        const inline_keyboard = Markup.inlineKeyboard([[button]]);
        await this.telegramService.updateAllWorkersMessagesWithRequestsId(
          {
            text: newMessage.text,
            inline_keyboard: inline_keyboard.reply_markup,
          },
          requestId,
        );
        console.log('ctx.scene.current.id ', ctx);
        // if (
        //   !ctx.scene?.current ||
        //   ctx.scene.current.id !== 'payment_photo_proceed'
        // ) {
        await ctx.scene.enter('payment_photo_proceed', { requestId });
        // }
      }
    } else {
      console.error('Unknown callback query data:', callbackQuery);
      await ctx.answerCbQuery('Unknown action');
    }
  }
}
