import { Injectable } from '@nestjs/common';
import { Ctx, On, SceneLeave, Wizard, WizardStep } from 'nestjs-telegraf';
import { RatesService } from 'src/modules/rates/rates.service';
import { CustomSceneContext } from 'src/types/types';
import { Markup } from 'telegraf';

@Injectable()
@Wizard('create-rates')
export class CreateRatesScene {
  constructor(private readonly ratesService: RatesService) {}

  @On('callback_query')
  async onCallbackQuery(@Ctx() ctx: CustomSceneContext) {
    console.log('@Scene(create-rates) callBack');
    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery) {
      console.error('No callback query found');
      return;
    } else if ('data' in callbackQuery) {
      if (callbackQuery.data === 'cancel_update_all_rates') {
        await this.cancel(ctx);
      }
    } else {
      console.error('Unknown callback query data:', callbackQuery);
      await ctx.answerCbQuery('Unknown action');
    }
  }
  async cancel(ctx: CustomSceneContext) {
    await ctx.scene.leave();
  }

  @WizardStep(0)
  async onSceneEnter(@Ctx() ctx: CustomSceneContext) {
    const markup = await this.ratesService.getAllRatesMarkupMessage();
    const inline_keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('Cancel', 'cancel_update_all_rates')],
    ]);
    const msgRe = await ctx.reply('Send new rates in the same format:');
    const msg = await ctx.reply(
      markup || 'No rates available',
      inline_keyboard,
    );
    ctx.wizard.next();
    ctx.session.messagesToDelete?.push(msg.message_id);
    ctx.session.messagesToDelete?.push(msgRe.message_id);
  }

  @WizardStep(1)
  async onText(@Ctx() ctx: CustomSceneContext) {
    const message = ctx.text;
    ctx.session.messagesToDelete?.push(ctx.message?.message_id || 0);
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
        ctx.wizard.selectStep(1);
      }
      const allRates = await this.ratesService.getAllRatesMarkupMessage();
      await ctx.reply('Rates updated successfully:\n\n' + allRates);
      ctx.session.customState = 'updated';
      await ctx.scene.leave();
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error creating rates:', error.message);
        await ctx.reply('Somthing went wrong');
        await ctx.scene.leave();
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
    ctx.session.customState = '';
    ctx.session.messagesToDelete = [];
    // await ctx.reply('Exited rate creation.');
  }
}
