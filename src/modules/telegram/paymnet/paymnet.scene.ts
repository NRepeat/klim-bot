import { Injectable } from '@nestjs/common';
import { Ctx, SceneLeave, Wizard, WizardStep } from 'nestjs-telegraf';
import { CustomSceneContext } from 'src/types/types';
import { Markup } from 'telegraf';
import { TelegramService } from '../telegram.service';
import { UtilsService } from 'src/modules/utils/utils.service';
import { ConfigService } from '@nestjs/config';
import { InlineKeyboardMarkup } from 'telegraf/typings/core/types/typegram';
import { RequestService } from 'src/modules/request/request.service';

export type PaymentPhoto = {
  file_id: string;
  file_unique_id: string;
  file_size: number;
  width: number;
  height: number;
};

@Injectable()
@Wizard('payment_photo_proceed')
export default class PaymentWizard {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly utilsService: UtilsService,
    private readonly configService: ConfigService,
    private readonly requestService: RequestService,
  ) {}
  paymentPhotos: PaymentPhoto[] = [];

  //   @On('callback_query')
  //   async onCallBackQuery(@Context() ctx: CustomSceneContext) {
  //     const callbackQuery = ctx.callbackQuery;
  //     if (!callbackQuery) {
  //       console.error('No callback query found');
  //       return;
  //     } else if ('data' in callbackQuery) {
  //       if (callbackQuery.data.includes('proceeded_payment_')) {
  //         console.log(callbackQuery.data);
  //         await this.cancel(ctx);
  //       }
  //     } else {
  //       console.error('Unknown callback query data:', callbackQuery);
  //       await ctx.answerCbQuery('Unknown action');
  //     }
  //   }
  @WizardStep(0)
  async proceedFirstStep(@Ctx() ctx: CustomSceneContext) {
    const inline_keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('Отмена', 'cancel_payment_photo_proceed')],
    ]);
    const msg = await ctx.reply('Send photo message', {
      reply_markup: inline_keyboard.reply_markup,
    });
    ctx.session.messagesToDelete = ctx.session.messagesToDelete || [];
    ctx.session.requestMenuMessageId = ctx.session.requestMenuMessageId || [];
    // ctx.session.messagesToDelete.push(msg.message_id);
    ctx.session.requestMenuMessageId.push(msg.message_id);
    ctx.wizard.next();
  }

  @WizardStep(1)
  async proceedFinalStep(@Ctx() ctx: CustomSceneContext) {
    const message = ctx.message as { photo?: PaymentPhoto[] };
    if (message && Array.isArray(message.photo)) {
      this.paymentPhotos.push(message.photo[message.photo.length - 1]);
      if (Array.isArray(this.paymentPhotos)) {
        const state = ctx.wizard.state as { requestId: string };
        const requestId = state.requestId;
        const buffers = await Promise.all(
          this.paymentPhotos.map((photo) => {
            return this.utilsService.downloadTelegramPhoto(
              this.configService.get<string>('TELEGRAM_BOT_TOKEN')!,
              photo.file_id,
            );
          }),
        );
        const mergedImageBuffer =
          await this.utilsService.mergeImagesHorizontal(buffers);
        await this.telegramService.updateAllWorkersMessagesWithRequestsId(
          {
            source: mergedImageBuffer,
            text: 'Пользователь отправил фото подтверждения оплаты',
          },
          requestId,
        );
        await this.telegramService.updateAllAdminsMessagesWithRequestsId(
          {
            source: mergedImageBuffer,
            text: 'Пользователь отправил фото подтверждения оплаты',
          },
          requestId,
        );
        const userId = ctx.from?.id;
        if (!userId) {
          throw new Error('User ID not found in context');
        }
        await this.requestService.updateRequestStatus(
          requestId,
          'COMPLETED',
          userId,
        );
      }

      await ctx.scene.leave();

      this.paymentPhotos = [];
    } else {
      await ctx.scene.leave();
    }
  }
  @SceneLeave()
  async onSceneLeave(@Ctx() ctx: CustomSceneContext) {
    await this.deleteSceneMessages(ctx);
    await this.deleteSceneMenuMessages(ctx);
    ctx.session.messagesToDelete = [];
    ctx.session.customState = '';
    ctx.session.requestMenuMessageId = undefined;
  }
  async deleteSceneMessages(ctx: CustomSceneContext, msgIdToPass?: number[]) {
    try {
      await this.telegramService.deleteAllTelegramMessages(
        ctx.session.messagesToDelete,
        ctx.chat?.id,
        msgIdToPass,
      );
      ctx.session.messagesToDelete = [];
    } catch (error) {
      console.error('Failed to delete scene messages:', error);
    }
  }
  async deleteSceneMenuMessages(ctx: CustomSceneContext) {
    try {
      await this.telegramService.deleteAllTelegramMessages(
        ctx.session.requestMenuMessageId,
        ctx.chat?.id,
      );
      ctx.session.requestMenuMessageId = [];
    } catch (error) {
      console.error('Failed to delete scene messages:', error);
    }
  }
  async updateSceneMenuMessage(
    ctx: CustomSceneContext,
    text: string,
    markup?: InlineKeyboardMarkup,
  ) {
    try {
      await ctx.editMessageText(text, {
        reply_markup: markup ?? undefined,
      });
    } catch (error) {
      console.error('Failed to update scene menu message:', error);
    }
  }
  // @WizardStep(2)
  // async proceedPaymentStep(@Ctx() ctx: CustomSceneContext) {
  //   console.log('proceedPaymentStep');
  //   try {
  //     const message = ctx.message as { photo?: PaymentPhoto[] };
  //     if (message && Array.isArray(message.photo)) {
  //       // Сохраняем все фото в массив
  //       this.paymentPhotos = message.photo.map((p) => ({ ...p }));
  //       await ctx.reply('Фото(ы) сохранены!');
  //       // await ctx.scene.leave();
  //       const state = ctx.wizard.state as { requestId: string };
  //       console.log('State:', ctx.wizard.state);
  //       const requestId = state.requestId;
  //       const buffers = await Promise.all(
  //         this.paymentPhotos.map((photo) =>
  //           this.utilsService.downloadTelegramPhoto('asd', photo.file_id),
  //         ),
  //       );

  //       const mergedImageBuffer =
  //         await this.utilsService.mergeImagesVertically(buffers);

  //       await this.telegramService.updateAllWorkersMessagesWithRequestsId(
  //         {
  //           source: mergedImageBuffer,
  //           text: 'Пользователь отправил фото подтверждения оплаты',
  //         },
  //         requestId,
  //       );
  //       ctx.wizard.selectStep(2);
  //     }
  //   } catch (error) {
  //     // await ctx.scene.leave();
  //     throw new Error('Error enter scene');
  //   }
  // }
}
