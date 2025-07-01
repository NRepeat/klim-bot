import { Injectable } from '@nestjs/common';
import { SceneLeave, Wizard, WizardStep } from 'nestjs-telegraf';
import { RequestService } from 'src/modules/request/request.service';
import { CustomSceneContext, FullRequestType } from 'src/types/types';
import { MenuFactory } from '../telegram-keyboards';
import { Markup } from 'telegraf';
import { TelegramService } from '../telegram.service';
import { AccessControlService } from '../access-control/access-control.service';

@Injectable()
@Wizard('accept-request')
export class AcceptRequestScene {
  constructor(
    private readonly requestService: RequestService,
    private readonly telegramService: TelegramService,
    private readonly accessControlService: AccessControlService,
  ) {}

  @WizardStep(0)
  async enter(ctx: CustomSceneContext) {
    const state = ctx.wizard.state as { requestId: string };
    if (!ctx.from) {
      await ctx.reply('Please fill out the form before accepting the request.');
      return;
    }
    const userId = ctx.from.id;
    const chatId = ctx.message?.chat.id;

    try {
      // Проверка прав на принятие заявки через AccessControlService
      const accessCheck = await this.accessControlService.canAcceptRequest(
        state.requestId,
        userId,
      );
      console.log('accessCheck', accessCheck);
      if (!accessCheck.allowed) {
        await ctx.reply(
          accessCheck.message || '❌ Нет прав для принятия заявки',
        );
        await ctx.scene.leave();
        return;
      }

      await this.requestService.acceptRequest(state.requestId, userId, chatId);
      ctx.wizard.selectStep(1);
      await this.notifyUsers(ctx);
      return;
    } catch (error) {
      console.error(error);
      await ctx.reply('An error occurred while accepting the request.');
      await ctx.scene.leave();
    }
  }
  @WizardStep(1)
  async notifyUsers(ctx: CustomSceneContext) {
    console.log('notifyUsers', ctx);
    const state = ctx.wizard.state as { requestId: string };
    const requestId = state.requestId;
    let request;
    try {
      request = await this.requestService.findById(requestId);
    } catch (error) {
      console.error(error);
      await ctx.reply('An error occurred while notifying users.');
    }
    const workerMenu = MenuFactory.createWorkerMenu(
      request as unknown as FullRequestType,
      './src/assets/0056.jpg',
    );
    const newPaymentButton = Markup.button.callback(
      'Перевел',
      'proceeded_payment_' + requestId,
    );
    const newCancelButton = Markup.button.callback(
      'Отмена',
      'cancel_payment_' + requestId,
    );
    const inline_keyboard = Markup.inlineKeyboard([
      [newPaymentButton, newCancelButton],
    ]);
    await this.telegramService.updateAllWorkersMessagesWithRequestsId(
      {
        text: workerMenu.done().caption,
        inline_keyboard: inline_keyboard.reply_markup,
      },
      requestId,
    );

    const adminMenu = MenuFactory.createAdminMenu(
      request as unknown as FullRequestType,
      './src/assets/0056.jpg',
    );
    await this.telegramService.updateAllAdminsMessagesWithRequestsId(
      {
        text: adminMenu.inWork().caption,
        inline_keyboard: adminMenu.inWork(undefined, requestId).markup,
      },
      requestId,
    );
    await ctx.scene.leave();
  }
  @SceneLeave()
  async leave(ctx: CustomSceneContext) {
    const state = ctx.wizard.state as { requestId: string };
    try {
      // await this.requestService.cancelRequest(state.requestId);
    } catch (error) {
      console.error(error);
      await ctx.reply('An error occurred while canceling the request.');
    }
  }
}
