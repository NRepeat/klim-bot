import { Action, Ctx, On, Update } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';
import { UserService } from 'src/modules/user/user.service';
import { RequestService } from 'src/modules/request/request.service';
import { TelegramService } from '../telegram.service';
import { UtilsService } from 'src/modules/utils/utils.service';
import { FullRequestType } from 'src/types/types';

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
  async onCallbackQuery(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery) {
      console.error('No callback query found');
      return;
    } else if ('data' in callbackQuery) {
      console.log('------------------  ');
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
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          request?.paymentMethod?.nameEn === 'CARD' ? 'card' : 'iban',
          'admin',
        );
        const inline_keyboard = Markup.inlineKeyboard([
          [
            { callback_data: '', text: 'Перевел' },
            {
              callback_data: '',
              text: 'Отменить ',
            },
          ],
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
    } else {
      console.error('Unknown callback query data:', callbackQuery);
      await ctx.answerCbQuery('Unknown action');
    }
  }
}
