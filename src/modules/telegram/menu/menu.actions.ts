import { Ctx, Hears, Start, Update } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';

@Update()
export class MenuActions {
  @Start()
  async start(@Ctx() ctx: Context) {
    const inline_keyboard = Markup.keyboard([
      [{ text: 'Menu' }],
      [{ text: 'Обновить курсы' }],
    ]).resize();
    await ctx.reply('Welcome', { reply_markup: inline_keyboard.reply_markup });
  }

  @Hears('Menu')
  async onMenu(@Ctx() ctx: Context) {
    const newButtonCallback = Markup.button.callback('New user', 'new_user');
    const inline_keyboard = Markup.inlineKeyboard([[newButtonCallback]]);
    await ctx.reply('Please choose an option:', {
      reply_markup: inline_keyboard.reply_markup,
    });
  }

  @Hears('hi')
  async onHi(@Ctx() ctx: Context) {
    await ctx.reply('Hello there!');
  }
}
