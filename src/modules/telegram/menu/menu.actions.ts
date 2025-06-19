import { Command, Ctx, Hears, Start, Update } from 'nestjs-telegraf';
import { UserService } from 'src/modules/user/user.service';
import { UtilsService } from 'src/modules/utils/utils.service';
import { VendorService } from 'src/modules/vendor/vendor.service';
import { Context, Markup } from 'telegraf';

@Update()
export class MenuActions {
  constructor(
    private readonly userService: UserService,
    private readonly vendorService: VendorService,
    private readonly utilsService: UtilsService, // Assuming UtilsService is similar to UserService
  ) {}
  @Start()
  async start(@Ctx() ctx: Context) {
    if (await this.userService.isAdminChat(ctx)) {
      const inline_keyboard = Markup.keyboard([
        [{ text: 'Menu' }],
        [{ text: 'Обновить курсы' }],
      ]).resize();
      await ctx.reply('Welcome', {
        reply_markup: inline_keyboard.reply_markup,
      });
    } else {
      await ctx.reply('Welcome');
      const inline_keyboard = Markup.keyboard([[{ text: 'Menu' }]]).resize();
      await ctx.reply('Welcome', {
        reply_markup: inline_keyboard.reply_markup,
      });
      console.log(
        `New user created: ${ctx.from?.username} with ID: ${ctx.from?.id}`,
      );
    }
  }

  @Command('registration')
  async registration(@Ctx() ctx: Context) {
    console.log('Registration,', ctx.chat);
    if (await this.utilsService.isChatRegistrated(ctx)) {
      await ctx.reply('You are already registered');
      return;
    }
    await this.vendorService.createVendor(ctx);
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
