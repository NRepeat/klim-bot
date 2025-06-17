import { Injectable } from '@nestjs/common';
import { Scene, SceneEnter, Ctx, On, SceneLeave } from 'nestjs-telegraf';
import { RatesService } from 'src/modules/rates/rates.service';
import { CustomSceneContext } from 'src/types/types';

@Injectable()
@Scene('create-rates')
export class CreateRatesScene {
  constructor(private readonly ratesService: RatesService) {}

  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: CustomSceneContext) {
    console.log('Session', ctx.session);

    const markup = await this.ratesService.getAllRatesMarkupMessage();
    const msg = await ctx.reply(
      'Current rates:\n' + markup + '\n\nSend new rates in the same format:',
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
    // You can parse and save rates here
    // For example:
    // await this.ratesService.createRates(ctx, ...);
    const msg = await ctx.reply('Rates received! (processing logic here)');
    ctx.session.messagesToDelete?.push(msg.message_id);
    await ctx.scene.leave();
  }

  @SceneLeave()
  async onSceneLeave(@Ctx() ctx: CustomSceneContext) {
    const messagesToDelete = ctx.session.messagesToDelete || [];
    console.log('Messages to delete:', messagesToDelete);
    if (messagesToDelete.length > 0) {
      for (const messageId of messagesToDelete) {
        try {
          await ctx.deleteMessage(messageId);
        } catch (error) {
          console.error('Failed to delete message:', error);
        }
      }
    }
    await ctx.reply('Exited rate creation.');
  }
}
