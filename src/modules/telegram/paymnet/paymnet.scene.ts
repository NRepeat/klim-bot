import { Injectable } from '@nestjs/common';
import { Ctx, On, SceneLeave, Wizard, WizardStep } from 'nestjs-telegraf';
import { CustomSceneContext, FullRequestType } from 'src/types/types';
import { Markup } from 'telegraf';
import { TelegramService } from '../telegram.service';
import { UtilsService } from 'src/modules/utils/utils.service';
import { ConfigService } from '@nestjs/config';
import { InlineKeyboardMarkup } from 'telegraf/typings/core/types/typegram';
import { RequestService } from 'src/modules/request/request.service';
import { MenuFactory } from '../telegram-keyboards';

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

  @WizardStep(0)
  async proceedFirstStep(@Ctx() ctx: CustomSceneContext) {
    const inline_keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('Отмена', 'cancel_payment_photo_proceed')],
    ]);
    const msg = await ctx.reply('Пожалуйста прикрепите квитанцию', {
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
    ctx.session.messagesToDelete?.push(ctx.message?.message_id || 0);
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
        const userId = ctx.from?.id;
        if (!userId) {
          throw new Error('User ID not found in context');
        }
        await this.requestService.updateRequestStatus(
          requestId,
          'COMPLETED',
          userId,
        );
        const request = await this.requestService.findById(requestId);
        if (!request) {
          await ctx.scene.leave();
          throw new Error('Request not found');
        }
        const publicMenu = MenuFactory.createPublicMenu(
          request as unknown as FullRequestType,
          '',
          mergedImageBuffer,
        );
        const workerMenu = MenuFactory.createWorkerMenu(
          request as unknown as FullRequestType,
          '',
          mergedImageBuffer,
        );
        const adminMenu = MenuFactory.createAdminMenu(
          request as unknown as FullRequestType,
          '',
          mergedImageBuffer,
        );
        await this.telegramService.updateAllWorkersMessagesWithRequestsId(
          {
            source: workerMenu.done().source,
            text: workerMenu.done().caption,
            inline_keyboard: workerMenu.done().markup,
          },
          requestId,
        );
        await this.telegramService.updateAllAdminsMessagesWithRequestsId(
          {
            source: adminMenu.done().source,
            text: adminMenu.done().caption,
            inline_keyboard: adminMenu.done().markup,
          },
          requestId,
        );

        await this.telegramService.updateAllPublicMessagesWithRequestsId(
          {
            text: publicMenu.done().caption,
            inline_keyboard: publicMenu.done().markup,
            source: publicMenu.done().source,
          },
          requestId,
        );
      }

      await ctx.scene.leave();

      this.paymentPhotos = [];
    } else {
      console.error('No photos found in the message');
      console.log(ctx.callbackQuery);
      if (ctx.callbackQuery) {
        if (
          'data' in ctx.callbackQuery &&
          ctx.callbackQuery.data === 'cancel_payment_photo_proceed'
        ) {
          const state = ctx.wizard.state as { requestId: string };
          const requestId = state.requestId;
          const request = await this.requestService.findById(requestId);
          if (!request) {
            await ctx.scene.leave();
            throw new Error('Request not found');
          }
          const photoUrl = '/home/nikita/Code/klim-bot/src/assets/0056.jpg';

          const workerMenu = MenuFactory.createWorkerMenu(
            request as unknown as FullRequestType,
            photoUrl,
          );
          await this.telegramService.updateAllWorkersMessagesWithRequestsId(
            {
              text: workerMenu.inWork().caption,
              inline_keyboard: workerMenu.inProcess(undefined, request.id)
                .markup,
            },
            requestId,
          );

          await ctx.deleteMessage();
        }
      }
      await ctx.scene.leave();
    }
  }
  // @On('callback_query')
  // async onCallbackQuery(@Ctx() ctx: CustomSceneContext) {
  //   console.log('Callback query data:', ctx.callbackQuery);
  //   const callbackQuery = ctx.callbackQuery;
  //   if (!callbackQuery) {
  //     console.error('No callback query found');
  //     return;
  //   } else if ('data' in callbackQuery) {
  //     if (callbackQuery.data === 'cancel_payment_photo_proceed') {
  //       const state = ctx.wizard.state as { requestId: string };
  //       const requestId = state.requestId;
  //       const request = await this.requestService.findById(requestId);
  //       if (!request) {
  //         await ctx.scene.leave();
  //         throw new Error('Request not found');
  //       }
  //       const photoUrl = '/home/nikita/Code/klim-bot/src/assets/0056.jpg';

  //       const workerMenu = MenuFactory.createWorkerMenu(
  //         request as unknown as FullRequestType,
  //         photoUrl,
  //       );
  //       await this.telegramService.updateAllWorkersMessagesWithRequestsId(
  //         {
  //           text: workerMenu.inWork().caption,
  //           inline_keyboard: workerMenu.inWork().markup,
  //         },
  //         requestId,
  //       );

  //       await ctx.deleteMessage();
  //     } else {
  //       console.error('Unknown callback query data:', callbackQuery);
  //       await ctx.answerCbQuery('Unknown action');
  //       // await ctx.scene.leave();
  //       return;
  //     }
  //   }
  // }
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
      await ctx.deleteMessages(ctx.session.requestMenuMessageId || []);
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
}
