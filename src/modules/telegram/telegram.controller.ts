import { Action, Ctx, Hears, InjectBot, Start, Update } from 'nestjs-telegraf';
import { Context, Markup, Telegraf } from 'telegraf';
import { UserService } from '../user/user.service';
import { UserRole } from 'src/types/types';

@Update()
export class TelegramController {
  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly userService: UserService,
  ) {}

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
  @Action('new_user')
  async onNewUser(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();

    await this.userService.createUser(ctx, UserRole.WORKER);

    await ctx.reply('You pressed the "New user" button!');
  }
  @Hears('hi')
  async onHi(ctx: Context) {
    await ctx.reply('Hello there!');
  }
}
