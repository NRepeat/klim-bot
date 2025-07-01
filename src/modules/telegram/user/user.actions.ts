import { Action, Ctx, On, Update } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';
import { UserService } from 'src/modules/user/user.service';
import { RequestService } from 'src/modules/request/request.service';
import { TelegramService } from '../telegram.service';
import { FullRequestType } from 'src/types/types';
import { SceneContext } from 'telegraf/typings/scenes';
import { MenuFactory } from '../telegram-keyboards';
import { User } from 'generated/prisma';
import { AccessControlService } from '../access-control/access-control.service';

@Update()
export class UserActions {
  constructor(
    private readonly userService: UserService,
    private readonly requestService: RequestService,
    private readonly telegramService: TelegramService,
    private readonly accessControlService: AccessControlService,
  ) {}

  @Action('new_user')
  async onNewUser(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await this.userService.createUser(ctx);
    await ctx.reply('You pressed the "New user" button!');
  }

  @On('callback_query')
  async onCallbackQuery(@Ctx() ctx: SceneContext) {
    await ctx.answerCbQuery();
    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery) {
      console.error('No callback query found');
      return;
    } else if ('data' in callbackQuery) {
      const currentUserId = callbackQuery.from.id;
      if (callbackQuery.data.includes('admin_cancel_request')) {
        const requestId = callbackQuery.data.split('_')[3];

        const adminCheck =
          await this.accessControlService.canCancelRequestAsAdmin(
            requestId,
            currentUserId,
          );
        if (!adminCheck.allowed) {
          await ctx.answerCbQuery(adminCheck.message);
          return;
        }

        const request = await this.requestService.findById(requestId);
        if (!request) {
          throw new Error('Request not found');
        }
        await this.requestService.updateRequestStatus(
          requestId,
          'FAILED',
          callbackQuery.from.id,
        );
        const workerMenu = MenuFactory.createWorkerMenu(
          request as unknown as FullRequestType,
          './src/assets/0056.jpg',
        );

        const adminMenu = MenuFactory.createAdminMenu(
          request as unknown as FullRequestType,
          './src/assets/0056.jpg',
        );
        await this.telegramService.updateAllWorkersMessagesWithRequestsId(
          {
            text: workerMenu.canceled().caption + '\n' + 'Заявка отменена',
            inline_keyboard: adminMenu.canceled(undefined, requestId).markup,
          },
          requestId,
        );
        await this.telegramService.updateAllAdminsMessagesWithRequestsId(
          {
            text: adminMenu.canceled().caption + '\n' + 'Заявка отменена',
            inline_keyboard: adminMenu.canceled(undefined, requestId).markup,
          },
          requestId,
        );
        await this.telegramService.updateAllPublicMessagesWithRequestsId(
          {
            text: workerMenu.canceled().caption + '\n' + 'Заявка отменена',
            inline_keyboard: adminMenu.canceled(undefined, requestId).markup,
          },
          requestId,
        );
      }
      if (callbackQuery.data.includes('cancel_payment_')) {
        const requestId = callbackQuery.data.split('_')[2];

        // Проверка прав на управление заявкой
        const accessCheck = await this.accessControlService.canManageRequest(
          requestId,
          currentUserId,
        );
        if (!accessCheck.allowed) {
          await ctx.answerCbQuery(accessCheck.message);
          return;
        }

        const request = await this.requestService.findById(requestId);
        if (!request) {
          throw new Error('Request not found');
        }
        const workerMenu = MenuFactory.createWorkerMenu(
          request as unknown as FullRequestType,
          './src/assets/0056.jpg',
        );
        await ctx.editMessageCaption(
          workerMenu.canceled().caption + '\n' + 'Заявка отменена',
          {
            reply_markup: workerMenu.canceled(undefined, requestId).markup,
            parse_mode: 'HTML',
          },
        );
      }
      if (callbackQuery.data.includes('accept_request_')) {
        const requestId = callbackQuery.data.split('_')[2];
        console.log('Accepting request with ID:', requestId);
        // Проверка прав на принятие заявки
        const acceptCheck = await this.accessControlService.canAcceptRequest(
          requestId,
          currentUserId,
        );
        console.log('acceptCheck', acceptCheck);
        if (!acceptCheck.allowed) {
          await ctx.answerCbQuery(acceptCheck.message);
          return;
        }
        try {
          await ctx.scene.enter('accept-request', { requestId });
          await ctx.answerCbQuery('Request accepted');
          return;
        } catch (error) {
          console.error('Error accepting request:', error);
          return;
        }
      }
      if (callbackQuery.data.includes('cancel_worker_request_')) {
        const requestId = callbackQuery.data.split('_')[3];

        const accessCheck = await this.accessControlService.canManageRequest(
          requestId,
          currentUserId,
        );
        if (!accessCheck.allowed) {
          await ctx.answerCbQuery(accessCheck.message);
          return;
        }

        const request = await this.requestService.findById(requestId);
        if (!request) {
          throw new Error('Request not found');
        }
        const photoUrl = './src/assets/0056.jpg';

        const workerMenu = MenuFactory.createWorkerMenu(
          request as unknown as FullRequestType,
          photoUrl,
        );

        await this.telegramService.updateAllWorkersMessagesWithRequestsId(
          {
            text: workerMenu.canceled().caption,
            inline_keyboard: workerMenu.canceled(undefined, requestId).markup,
          },
          requestId,
        );
      } else if (callbackQuery.data.includes('give_next_')) {
        const requestId = callbackQuery.data.split('_')[2];

        // Проверка прав на управление заявкой
        const accessCheck = await this.accessControlService.canManageRequest(
          requestId,
          currentUserId,
        );
        if (!accessCheck.allowed) {
          await ctx.answerCbQuery(accessCheck.message);
          return;
        }

        const request = await this.requestService.findById(requestId);
        if (!request) {
          throw new Error('Request not found');
        }
        const users = await this.userService.findAllWorkers();
        const workerMenu = MenuFactory.createWorkerMenu(
          request as unknown as FullRequestType,
          '',
        );
        let newWorker: User | undefined;
        for (const user of users) {
          if (request?.user?.id !== user.id) {
            await this.requestService.acceptRequest(
              requestId,
              Number(user.telegramId),
              Number(user.telegramId),
            );
            newWorker = user;
            // console.log('New worker found:', newWorker);
            break;
          } else {
            newWorker = undefined;
          }
        }
        if (!newWorker) {
          await ctx.answerCbQuery('No available workers found');
          await ctx.editMessageCaption(
            workerMenu.inWork().caption + '\n' + 'Нут доступных пользователей',
            {
              parse_mode: 'HTML',
              reply_markup: workerMenu.inWork(undefined, requestId).markup,
            },
          );
          return;
        }

        await this.requestService.findAndDeleteRequestMessageByRequestId(
          requestId,
          callbackQuery.message!.message_id,
        );
        await ctx.deleteMessage(callbackQuery.message?.message_id);
        await this.telegramService.sendMessageToUser(
          {
            text: workerMenu.inWork().caption,
            photoUrl: workerMenu.inWork().url,
            inline_keyboard: workerMenu.inWork(undefined, requestId).markup,
          },
          Number(newWorker?.telegramId),
          requestId,
          newWorker?.id,
        );
        const adminMenu = MenuFactory.createAdminMenu(
          request as unknown as FullRequestType,
          '',
        );
        await this.telegramService.updateAllAdminsMessagesWithRequestsId(
          {
            text: adminMenu.inWork().caption,
            inline_keyboard: adminMenu.inWork(undefined, requestId).markup,
          },
          requestId,
        );
      } else if (callbackQuery.data.includes('valut_card_')) {
        const requestId = callbackQuery.data.split('_')[2];

        // Проверка прав на управление заявкой
        const accessCheck = await this.accessControlService.canManageRequest(
          requestId,
          currentUserId,
        );
        if (!accessCheck.allowed) {
          await ctx.answerCbQuery(accessCheck.message);
          return;
        }

        const request = await this.requestService.findById(requestId);
        if (!request) {
          throw new Error('Request not found');
        }
        const workerMenu = MenuFactory.createWorkerMenu(
          request as unknown as FullRequestType,
          '',
        );
        const adminMenu = MenuFactory.createAdminMenu(
          request as unknown as FullRequestType,
          '',
        );
        const markup = Markup.inlineKeyboard([
          Markup.button.callback('Влютная карта', 'афлют'),
        ]);
        await ctx.editMessageCaption(
          workerMenu.inWork().caption + '\n' + 'Заявка отменина',
          {
            reply_markup: markup.reply_markup,
            parse_mode: 'HTML',
          },
        );
        await this.telegramService.updateAllAdminsMessagesWithRequestsId(
          {
            text: adminMenu.inWork().caption + '\n' + 'Заявка отменина',
            inline_keyboard: markup.reply_markup,
          },
          request.id,
        );
        const userId = ctx.from?.id;
        if (!userId) {
          return;
        }
        await this.requestService.updateRequestStatus(
          request.id,
          'FAILED',
          Number(userId),
        );
      } else if (callbackQuery.data.includes('back_to_take_request_')) {
        const requestId = callbackQuery.data.split('_')[4];

        // Проверка прав на управление заявкой
        const accessCheck = await this.accessControlService.canManageRequest(
          requestId,
          currentUserId,
        );
        if (!accessCheck.allowed) {
          await ctx.answerCbQuery(accessCheck.message);
          return;
        }

        const request = await this.requestService.findById(requestId);
        if (!request) {
          throw new Error('Request not found');
        }
        try {
          console.log('request', request);
          await this.requestService.unlinkUser(request.id);
          await this.telegramService.updateAdminMessages(request.id);
        } catch (error) {
          console.error(error);
          await ctx.answerCbQuery('Ошибка при отмене заявки');
          return;
        }
        const workerMenu = MenuFactory.createWorkerMenu(
          request as unknown as FullRequestType,
          '',
        );
        await ctx.editMessageCaption(workerMenu.inWork().caption, {
          reply_markup: workerMenu.inWork(undefined, requestId).markup,
          parse_mode: 'HTML',
        });
      }

      if (callbackQuery.data.includes('proceeded_payment_')) {
        const requestId = callbackQuery.data.split('_')[2];

        // Проверка прав на управление заявкой
        const accessCheck = await this.accessControlService.canManageRequest(
          requestId,
          currentUserId,
        );
        if (!accessCheck.allowed) {
          await ctx.answerCbQuery(accessCheck.message);
          return;
        }

        const request = await this.requestService.findById(requestId);
        if (!request) {
          throw new Error('Request not found');
        }
        const workerMenu = MenuFactory.createWorkerMenu(
          request as unknown as FullRequestType,
          './src/assets/0056.jpg',
        );
        const button = Markup.button.callback(
          'Отменить',
          'accept_request_' + requestId,
        );
        const inline_keyboard = Markup.inlineKeyboard([[button]]);
        await this.telegramService.updateAllWorkersMessagesWithRequestsId(
          {
            text: workerMenu.inWork().caption,
            inline_keyboard: inline_keyboard.reply_markup,
          },
          requestId,
        );
        await ctx.scene.enter('payment_photo_proceed', { requestId });
      }
    } else {
      console.error('Unknown callback query data:', callbackQuery);
      await ctx.answerCbQuery('Unknown action');
    }
  }
}
