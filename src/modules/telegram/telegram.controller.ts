import { Hears, InjectBot, Start, Update } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';

@Update()
export class TelegramController {
  constructor(@InjectBot() private readonly bot: Telegraf<Context>) {}

  @Start()
  async onStart(ctx: Context) {
    await ctx.reply('Welcome to the bot!');
  }

  @Hears('hi')
  async onHi(ctx: Context) {
    await ctx.reply('Hello there!');
  }
}
