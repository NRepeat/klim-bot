import { Injectable } from '@nestjs/common';
import { SceneLeave, Wizard, WizardStep } from 'nestjs-telegraf';
import { RequestService } from 'src/modules/request/request.service';
import { CustomSceneContext, FullRequestType } from 'src/types/types';
import { MenuFactory } from '../telegram-keyboards';
import { Markup } from 'telegraf';
import { BUTTON_CALLBACKS, BUTTON_TEXTS } from '../telegram.constants';
import { TelegramService } from '../telegram.service';
import { AccessControlService } from '../access-control/access-control.service';
import { UserService } from 'src/modules/user/user.service';

@Injectable()
@Wizard('accept-request')
export class AcceptRequestScene {
  constructor(
    private readonly requestService: RequestService,
    private readonly telegramService: TelegramService,
    private readonly accessControlService: AccessControlService,
    private readonly userService: UserService,
  ) {}

  private async getPhotoUrlFromDatabase(requestId: string): Promise<string> {
    try {
      const messages = await this.requestService.getAllPublicMessagesWithRequestsId(requestId);
      if (messages && messages.length > 0) {
        const messageWithPhoto = messages.find(msg => msg.photoUrl && msg.photoUrl !== '');
        if (messageWithPhoto && messageWithPhoto.photoUrl) {
          // Check if it's a Telegram CDN URL (old format) and fall back to default
          if (messageWithPhoto.photoUrl.startsWith('https://api.telegram.org/file/bot')) {
            console.warn('Found old Telegram CDN URL in database, using default image');
            return './src/assets/0056.jpg';
          }
          return messageWithPhoto.photoUrl;
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve photo from database, using default:', error);
    }
    return './src/assets/0056.jpg'; // default fallback
  }

  @WizardStep(0)
  async enter(ctx: CustomSceneContext) {
    const state = ctx.wizard.state as { requestId: string; msId?: number };
    if (!ctx.from) {
      await ctx.reply('Please fill out the form before accepting the request.');
      return;
    }
    const userId = ctx.from.id;
    try {
      const accessCheck = await this.accessControlService.canAcceptRequest(
        state.requestId,
        userId,
      );
      if (!accessCheck.allowed) {
        await ctx.reply(
          accessCheck.message || '❌ Нет прав для принятия заявки',
        );
        await ctx.scene.leave();
        return;
      }
      const user = await this.userService.findByTelegramId(userId);
      if (!user) {
        await ctx.scene.leave();
        return;
      }
      const workGroupChatId = user.workGroupChatId;
      if (!workGroupChatId) {
        await ctx.reply(
          '⚠️ У вас не настроена рабочая группа. Попросите администратора привязать её (Меню → Пользователи), без неё заявку взять нельзя.',
        );
        await ctx.scene.leave();
        return;
      }
      const accepted = await this.requestService.acceptRequest(state.requestId, userId, userId);
      if (!accepted) {
        await ctx.reply('❌ Заявка уже принята другим пользователем');
        await ctx.scene.leave();
        return;
      }
      const request = (await this.requestService.findById(
        state.requestId,
      )) as FullRequestType;
      const photoUrl = await this.getPhotoUrlFromDatabase(state.requestId);
      const workerMenu = MenuFactory.createWorkerMenu(
        request,
        photoUrl,
        undefined,
        true,
      );
      let message;
      try {
        message = await this.telegramService.sendMessageToUser(
          {
            text: workerMenu.inProcess(undefined, state.requestId).caption,
            inline_keyboard: workerMenu.inProcess(undefined, state.requestId)
              .markup,
            photoUrl: photoUrl,
          },
          Number(workGroupChatId),
          state.requestId,
          String(userId),
        );
        if (!message) {
          throw new Error('Failed to send message to user');
        }
      } catch (sendError) {
        // Лимит Telegram сюда уже не доходит: очередь в installTelegramThrottle
        // выдерживает паузу между сообщениями и повторяет 429 по retry_after.
        // Значит остались настоящие отказы — их откатываем, чтобы заявка
        // вернулась в общий список, а не зависла за оператором без карточки.
        console.error('Failed to send accept message, rolling back:', sendError);
        await this.requestService.unlinkUser(state.requestId);
        await ctx.reply(
          '❌ Рабочая группа не приняла сообщение. Заявка снова в общем списке — попробуйте ещё раз.',
        );
        await ctx.scene.leave();
        return;
      }
      (ctx.wizard.state as { requestId: string; msId?: number }).msId =
        message.message_id;

      await this.notifyUsers(ctx);
      await ctx.scene.leave();
      // ctx.wizard.selectStep(1);
    } catch (error) {
      console.error(error);
      await ctx.reply('An error occurred while accepting the request.');
      await ctx.scene.leave();
    }
  }
  async notifyUsers(ctx: CustomSceneContext) {
    const state = ctx.wizard.state as { requestId: string; msId: number };
    console.log('Notify users with state:', state);
    const requestId = state.requestId;
    let request;
    try {
      request = await this.requestService.findById(requestId);
    } catch (error) {
      console.error(error);
      await ctx.reply('An error occurred while notifying users.');
    }
    const photoUrl = await this.getPhotoUrlFromDatabase(requestId);
    const workerMenu = MenuFactory.createWorkerMenu(
      request as unknown as FullRequestType,
      photoUrl,
      undefined,
      false,
      true,
    );
    // В чужих группах заявка уже занята: оставляем плашку статуса на DUMMY,
    // как в остальных «отменена»/«не в работе». Прежняя кнопка висела на
    // колбэке `in_work_`, которого в боте нет, — нажатие просто молчало, а
    // «Взять заявку» здесь показывать нельзя: заявка не свободна.
    const statusOnly = Markup.inlineKeyboard([
      [Markup.button.callback(BUTTON_TEXTS.IN_WORK, BUTTON_CALLBACKS.DUMMY)],
    ]).reply_markup;
    await this.telegramService.updateAllWorkersMessagesWithRequestsId(
      {
        text: workerMenu.inWork(undefined, requestId).caption,
        inline_keyboard: statusOnly,
      },
      requestId,
      [state.msId],
    );

    const adminMenu = MenuFactory.createAdminMenu(
      request as unknown as FullRequestType,
      photoUrl,
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
  async leave(ctx: CustomSceneContext) {}
}
