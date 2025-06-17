import { Ctx, Hears, InjectBot, On, Start, Update } from 'nestjs-telegraf';
import { Context, Markup, Telegraf } from 'telegraf';

@Update()
export class TelegramController {
  constructor(@InjectBot() private readonly bot: Telegraf<Context>) {}

  @Start()
  async start(@Ctx() ctx: Context) {
    const inline_keyboard = Markup.keyboard([[{ text: 'Menu' }]]).resize();
    await ctx.reply('Welcome', { reply_markup: inline_keyboard.reply_markup });
  }
  @Hears('Menu')
  async onMenu(@Ctx() ctx: Context) {
    const newButtonCallback = Markup.button.callback('New user', 'new_user');
    console.log('New Button Callback:', newButtonCallback);
    const inline_keyboard = Markup.inlineKeyboard([[newButtonCallback]]);
    await ctx.reply('Please choose an option:', {
      reply_markup: inline_keyboard.reply_markup,
    });
  }
  @On('callback_query')
  async onCallbackQuery(@Ctx() ctx: Context) {
    const callbackQuery = ctx.callbackQuery;

    console.log('Callback Query:', callbackQuery);
    if (callbackQuery) {
      const inline_keyboard = Markup.inlineKeyboard([
        Markup.button.callback('Hi', 'hi'),
        Markup.button.callback('Bye', 'bye'),
      ]);
      await ctx.reply('Please choose an option:', {
        reply_markup: inline_keyboard.reply_markup,
      });
    }
  }
  @Hears('hi')
  async onHi(ctx: Context) {
    await ctx.reply('Hello there!');
  }
}
