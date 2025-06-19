import { Injectable } from '@nestjs/common';
import { Wizard, WizardStep, Ctx, SceneLeave, On } from 'nestjs-telegraf';
import { RatesService } from 'src/modules/rates/rates.service';
import { CustomSceneContext } from 'src/types/types';
import { Markup } from 'telegraf';

@Injectable()
@Wizard('create-request')
export class CreateRequestWizard {
  constructor(private readonly ratesService: RatesService) {}

  @WizardStep(0)
  async selectMethod(@Ctx() ctx: CustomSceneContext) {
    const inline_keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('Cancel', 'cancel_request'),
        Markup.button.callback('Card', 'card_request'),
        Markup.button.callback('Iban', 'iban_request'),
      ],
    ]);
    const msg = await ctx.reply('Оберіть метод заявки\n\n', inline_keyboard);
    ctx.session.messagesToDelete = ctx.session.messagesToDelete || [];
    ctx.session.messagesToDelete.push(msg.message_id);
  }

  @On('callback_query')
  async onCallbackQuery(@Ctx() ctx: CustomSceneContext) {
    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) {
      await ctx.answerCbQuery('Unknown action');
      return;
    }
    if (callbackQuery.data === 'cancel_request') {
      await this.cancel(ctx);
    } else if (callbackQuery.data === 'card_request') {
      ctx.session.requestType = 'card';
      await ctx.reply('You selected Card request. Please provide the details.');
      ctx.session.customState = 'card_request';
      await ctx.wizard.next();
    } else if (callbackQuery.data === 'iban_request') {
      ctx.session.requestType = 'iban';
      await ctx.reply('You selected IBAN request. Please provide the details.');
      ctx.session.customState = 'iban_request';
      await ctx.wizard.selectStep(2);
    }
  }

  @WizardStep(1)
  async cardStep(@Ctx() ctx: CustomSceneContext) {
    // Here you can handle card details input
    // For demo, just go to finish
    await ctx.reply('Card details step. (Demo: send any text to finish)');
    await ctx.wizard.next();
  }

  @WizardStep(2)
  async ibanStep(@Ctx() ctx: CustomSceneContext) {
    // Here you can handle IBAN details input
    // For demo, just go to finish
    await ctx.reply('IBAN details step. (Demo: send any text to finish)');
    await ctx.wizard.next();
  }

  @WizardStep(3)
  async finishStep(@Ctx() ctx: CustomSceneContext) {
    await ctx.reply('Request creation finished.');
    ctx.session.customState = 'finished';
    await ctx.scene.leave();
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
  }
}
