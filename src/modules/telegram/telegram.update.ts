// import { Update, Ctx, Start, Help, On, Hears } from 'nestjs-telegraf';
// import { Context, Markup } from 'telegraf';
// import { TelegramService } from './telegram.service';

// @Update()
// export class TelegramUpdate {
//   constructor(private readonly telegramService: TelegramService) {}
//   @Start()
//   async start(@Ctx() ctx: Context) {
//     const inline_keyboard = Markup.keyboard([
//       [{ text: 'Place order' }],
//     ]).resize();
//     await ctx.reply('Welcome', { reply_markup: inline_keyboard.reply_markup });
//   }

//   @Help()
//   async help(@Ctx() ctx: Context) {
//     await ctx.reply('Send me a sticker');
//   }
//   @Hears('Place order')
//   onCallbackQuery(@Ctx() ctx: Context) {
//     console.log('Callback query received:', ctx);

//     // const callbackQuery = ctx.callbackQuery;
//     // if (callbackQuery.data === 'place_order') {
//     //   await ctx.answerCbQuery('Order placed successfully!');
//     //   await ctx.reply('Your order has been placed.');
//     // } else {
//     //   await ctx.answerCbQuery('Unknown action');
//     // }
//   }

//   @On('sticker')
//   async on(@Ctx() ctx: Context) {
//     await ctx.reply('👍');
//   }

//   @Hears('hi')
//   async hears(@Ctx() ctx: Context) {
//     await ctx.reply('Message sent!');
//   }
// }
