import { Injectable } from '@nestjs/common';
import { Scene, SceneEnter, Ctx, On, SceneLeave } from 'nestjs-telegraf';
import { RatesService } from 'src/modules/rates/rates.service';
import { CustomSceneContext } from 'src/types/types';
import { Markup } from 'telegraf';

@Injectable()
@Scene('create-rates')
export class CreateRatesScene {
  constructor(private readonly ratesService: RatesService) {}

  @On('callback_query')
  async onCallbackQuery(@Ctx() ctx: CustomSceneContext) {
    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery) {
      console.error('No callback query found');
      return;
    } else if ('data' in callbackQuery) {
      if (callbackQuery.data === 'cancel_update_all_rates') {
        console.log(callbackQuery.data);
        await this.cancel(ctx);
      }
    } else {
      console.error('Unknown callback query data:', callbackQuery);
      await ctx.answerCbQuery('Unknown action');
    }
  }
  async cancel(ctx: CustomSceneContext) {
    ctx.session.messagesToDelete = ctx.session.messagesToDelete || [];
    const messagesToDelete = ctx.session.messagesToDelete;
    if (messagesToDelete.length > 0) {
      for (const messageId of messagesToDelete) {
        try {
          await ctx.deleteMessage(messageId);
        } catch (error) {
          console.error('Failed to delete message:', error);
        }
      }
    }
    ctx.session.messagesToDelete = [];
    await ctx.reply('Exited rate creation.');
    ctx.session.customState = 'cancelled';
    await ctx.scene.leave();
  }

  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: CustomSceneContext) {
    console.log('Session', ctx.session);

    const markup = await this.ratesService.getAllRatesMarkupMessage();
    const inline_keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('Cancel', 'cancel_update_all_rates'),
        // Markup.button.callback('Done', 'done'),
      ],
    ]);
    const msg = await ctx.reply(
      'Send new rates in the same format:\n\n' + markup,
      inline_keyboard,
    );
    ctx.session.messagesToDelete?.push(msg.message_id);
  }

  @On('text')
  async onText(@Ctx() ctx: CustomSceneContext) {
    const message = ctx.text;
    if (!message) {
      const msg = await ctx.reply('Please send text with rates.');
      ctx.session.messagesToDelete?.push(msg.message_id);
      return;
    }
    try {
      const updated = await this.ratesService.createRates(ctx);
      if (!updated) {
        const msg = await ctx.reply(
          'Failed to create rates. Please check the format and try again.',
        );
        ctx.session.messagesToDelete?.push(msg.message_id);
        return;
      }
      const msg = await ctx.reply('Rates received! (processing logic here)');
      ctx.session.messagesToDelete?.push(msg.message_id);
      ctx.session.customState = 'updated';
      await ctx.scene.leave();
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error creating rates:', error.message);
        const msg = await ctx.reply(`Error: ${error.message}`);
        ctx.session.messagesToDelete?.push(msg.message_id);
      }
    }
  }

  @SceneLeave()
  async onSceneLeave(@Ctx() ctx: CustomSceneContext) {
    const messagesToDelete = ctx.session.messagesToDelete || [];
    if (ctx.session.customState === 'updated') {
      await this.ratesService.sendAllRatesToAllVendors(ctx);
    }
    if (messagesToDelete.length > 0) {
      for (const messageId of messagesToDelete) {
        try {
          await ctx.deleteMessage(messageId);
        } catch (error) {
          console.error('Failed to delete message:', error);
        }
      }
    }
    // await ctx.reply('Exited rate creation.');
  }
}
