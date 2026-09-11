import { UseGuards } from '@nestjs/common';
import { Command, Ctx, Hears, On, Start, Update } from 'nestjs-telegraf';
import { AdminGuard } from '../admin.guard';
import ReportService from 'src/modules/report/report.service';
import { RequestService } from 'src/modules/request/request.service';
import { UserService } from 'src/modules/user/user.service';
import { UtilsService } from 'src/modules/utils/utils.service';
import { VendorService } from 'src/modules/vendor/vendor.service';
import { CustomSceneContext, FullRequestType } from 'src/types/types';
import { Context, Markup } from 'telegraf';
import { TelegramService } from '../telegram.service';
import { SceneContext } from 'telegraf/typings/scenes';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { WorkGroupService } from '../work-group.service';

/**
 * Клавиатура для ответа на /start.
 *
 * Reply-клавиатура в Telegram висит на чате, а не на пользователе: показанная
 * в группе, она остаётся у каждого её участника. Поэтому админское меню
 * отдаём только в личку — иначе один /start админа в общей группе раздаёт
 * кнопки «Показать пользователей» и «Обновить курсы» всем клиентам разом.
 *
 * Во всех прочих случаях клавиатуру снимаем явно. `reply_markup: undefined`
 * этого не делает — он лишь не задаёт новую, а прилипшая однажды так и висит.
 */
export function startKeyboard(
  isAdmin: boolean,
  chatType?: string,
): ReturnType<typeof Markup.keyboard>['reply_markup'] | { remove_keyboard: true } {
  if (isAdmin && chatType === 'private') {
    return Markup.keyboard([
      [{ text: 'Показать пользователей' }, { text: 'Показать поставщиков' }],
      [{ text: 'Черный список' }, { text: 'Обновить курсы' }],
    ]).resize().reply_markup;
  }

  return Markup.removeKeyboard().reply_markup;
}

@Update()
export class MenuActions {
  constructor(
    private readonly userService: UserService,
    private readonly vendorService: VendorService,
    private readonly utilsService: UtilsService,
    private readonly reportService: ReportService,
    private readonly requestService: RequestService,
    private readonly telegramService: TelegramService,
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly workGroupService: WorkGroupService,
  ) {}

  async isBotPaused(ctx: Context): Promise<boolean> {
    const settings = await this.prismaService.settings.findUnique({
      where: { name: 'default' },
    });
    return settings?.onPause || false;
  }
  @Start()
  async start(@Ctx() ctx: Context) {
    const isAdmin = await this.userService.isAdminChat(ctx);

    await ctx.reply('Welcome', {
      reply_markup: startKeyboard(isAdmin, ctx.chat?.type),
    });

    if (!isAdmin) {
      await this.userService.createUser(ctx);
      console.log(
        `New user created: ${ctx.from?.username} with ID: ${ctx.from?.id}`,
      );
    }
  }
  @Command('chatid')
  async getChatId(@Ctx() ctx: Context) {
    await ctx.reply(`Chat ID: ${ctx.chat?.id}`);
  }
  /**
   * `/register_main` — сделать текущий чат общей группой приёма заявок.
   *
   * Только владельцам (`OWNER_TG_IDS`): команда уводит весь поток заявок в
   * другой чат, ошибиться чатом здесь дороже, чем не иметь команды вовсе.
   * Не путать с `/start_work_group` — та задаёт личную рабочую группу
   * оператора, куда уезжает уже взятая им заявка.
   */
  @Command('register_main')
  async registerMainGroup(@Ctx() ctx: Context) {
    if (!this.workGroupService.isOwner(ctx.from?.id)) {
      // молча игнорировать нельзя: владелец решит, что бот сломался
      await ctx.reply('⛔ Команда доступна только владельцам.');
      return;
    }
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    await this.workGroupService.setChatId(chatId);
    await ctx.reply(
      `✅ Общая группа заявок — этот чат.\nchat_id: ${chatId}\n\n` +
        'Новые заявки будут приходить сюда. Рабочие группы операторов не менялись.',
    );
  }

  @Command('start_work_group')
  async startWorkGroup(@Ctx() ctx: Context) {
    const userId = ctx.from?.id;
    const user = await this.userService.findByTelegramId(userId as number);
    if (!user) {
      await ctx.reply('User not found');
      return;
    }
    await this.prismaService.user.update({
      where: { id: user.id },
      data: { workGroupChatId: BigInt(ctx.chat?.id as number) },
    });
    await ctx.reply('Work group chat set');
  }
  @Command('report')
  async reportVendor(@Ctx() ctx: Context) {
    const msId = ctx.message?.message_id;
    await ctx.deleteMessage(msId);
    const chatId = ctx.chat?.id;
    if (!chatId) {
      return;
    }
    const vendor = await this.vendorService.getVendorByChatId(chatId);
    if (!vendor) {
      return;
    }
    if (await this.isBotPaused(ctx)) {
      return;
    }
    const lastReportedAt = vendor.lastReportedAt || new Date(0);
    const reportedUpTo = new Date();
    const requests =
      await this.requestService.getRequestsForVendorSinceLastReport(
        vendor.id,
        lastReportedAt,
        reportedUpTo,
      );
    if (!requests.length) return;
    if (requests.length === 0) return ctx.reply('No requests to report');
    // лист «Незакрытые»: все висящие заявки вендора, не только за окно отчёта
    const unclosed = (await this.requestService.getUnclosedRequestsForVendor(
      vendor.id,
    )) as any as FullRequestType[];
    const report = await this.reportService.generateReportResult(
      requests as any as FullRequestType[],
      false,
      unclosed,
    );
    const adminReport = await this.reportService.generateReportResult(
      requests as any as FullRequestType[],
      true,
      unclosed,
    );
    const fileName = `${vendor.title}-report_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.xlsx`;
    try {
      await ctx.telegram.sendDocument(
        chatId,
        {
          source: report.buffer,
          filename: fileName,
        },
        { caption: report.caption },
      );

      // console.log(`Report sent to vendor ${vendor.title}`);
      await this.vendorService.updateVendor({
        ...vendor,
        lastReportedAt: reportedUpTo,
      });
    } catch (e) {
      await ctx.reply(
        `Ошибка отправки отчета для вендора ${vendor.title}: ${e}`,
      );
    }
    await this.telegramService.sendDocumentToAllUsers(
      adminReport.buffer,
      fileName,
      adminReport.caption,
    );
  }
  @Command('report_all')
  @UseGuards(AdminGuard)
  async reportAll(@Ctx() ctx: Context) {
    const msId = ctx.message?.message_id;
    await ctx.deleteMessage(msId);
    const vendors = await this.vendorService.getAllVendors();
    let sentCount = 0;
    const allReports: {
      report: Buffer<ArrayBufferLike>;
      filename: string;
      caption: string;
    }[] = [];
    for (const vendor of vendors) {
      const chatId = vendor.chatId?.toString();
      if (!vendor.work) {
        continue;
      }
      if (!chatId) continue;
      const lastReportedAt = vendor.lastReportedAt || new Date(0);
      const reportedUpTo = new Date();
      const requests =
        await this.requestService.getRequestsForVendorSinceLastReport(
          vendor.id,
          lastReportedAt,
          reportedUpTo,
        );
      if (!requests.length) continue;
      if (requests.length === 0) continue;
      const unclosed = (await this.requestService.getUnclosedRequestsForVendor(
        vendor.id,
      )) as any as FullRequestType[];
      const report = await this.reportService.generateReportResult(
        requests as any as FullRequestType[],
        false,
        unclosed,
      );
      const adminReport = await this.reportService.generateReportResult(
        requests as any as FullRequestType[],
        true,
        unclosed,
      );
      const fileName = `${vendor.title}-report_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.xlsx`;
      try {
        await ctx.telegram.sendDocument(
          chatId,
          {
            source: report.buffer,
            filename: fileName,
          },
          { caption: report.caption },
        );
        allReports.push({
          report: adminReport.buffer,
          filename: fileName,
          caption: adminReport.caption,
        });
        await this.vendorService.updateVendor({
          ...vendor,
          lastReportedAt: reportedUpTo,
        });
        sentCount++;
      } catch (e) {
        await ctx.reply(
          `Ошибка отправки отчета для вендора ${vendor.title}: ${e}`,
        );
      }
    }
    if (allReports.length > 0) {
      for (const report of allReports) {
        await this.telegramService.sendDocumentToAllUsers(
          report.report,
          report.filename,
          report.caption,
        );
      }
    }
    await ctx.reply(`Отчеты отправлены ${sentCount} вендорам.`);
  }
  @Command('reg')
  @UseGuards(AdminGuard)
  async registration(@Ctx() ctx: Context) {
    const msId = ctx.message?.message_id;
    // bot may lack delete rights in the group — never abort registration over cleanup
    await ctx.deleteMessage(msId).catch(() => {});
    const chatId = ctx.chat?.id;
    if (!chatId) {
      await ctx.reply('Chat ID not found');
      return;
    }
    if (await this.utilsService.isChatRegistrated(ctx)) {
      await ctx.reply('You are already registered');
      return;
    }
    await this.vendorService.createVendor(ctx);
  }

  @Hears('Menu')
  @UseGuards(AdminGuard)
  async onMenu(@Ctx() ctx: Context) {
    const newButtonCallback = Markup.button.callback('New user', 'new_user');
    const inline_keyboard = Markup.inlineKeyboard([[newButtonCallback]]);
    await ctx.reply('Please choose an option:', {
      reply_markup: inline_keyboard.reply_markup,
    });
  }
  @Hears('Показать пользователей')
  @UseGuards(AdminGuard)
  async onUsersShow(@Ctx() ctx: Context) {
    const msId = ctx.message?.message_id;
    await ctx.deleteMessage(msId);
    const users = await this.userService.getAllUsers();
    if (users.length === 0) {
      await ctx.reply('No users found');
      return;
    }
    const userList = users
      .map((user) => {
        const username = user.username
          ? user.username[0] === '@'
            ? user.username
            : `@${user.username}`
          : '@unknown';
        const paddedUsername = username.padEnd(20, ' ');
        const pauseStatus = user.onPause ? '🔴' : '🟢';
        const pauseText = user.onPause ? 'на паузе' : 'активен ';
        return `<code>${paddedUsername}</code> ${pauseStatus} <i>${pauseText}</i>`;
      })
      .join('\n');

    const message = `<b>📋 Список пользователей</b>\n\n${userList}\n`;

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [] },
    });
    // console.log(`Users: ${userList}`);
  }
  @Command('pause')
  @UseGuards(AdminGuard)
  async pause(@Ctx() ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('User ID not found');
      return;
    }
    await this.userService.updateUser(
      {
        onPause: true,
      },
      userId,
    );
    await ctx.reply('You are now on pause');
  }
  @Command('blacklist')
  @UseGuards(AdminGuard)
  async blacklist(@Ctx() ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('User ID not found');
      return;
    }
    const card = ctx.text?.split(' ')[1]?.trim();
    if (!card) {
      await ctx.reply('Please provide a card number to blacklist');
      return;
    }
    const isBlacklisted = await this.requestService.isInBlackList(card);
    if (isBlacklisted) {
      await ctx.reply('This card is already blacklisted');
      return;
    }
    const reason =
      ctx.text?.split(' ').slice(2).join(' ') || 'No reason provided';
    await this.requestService.addToBlackList(card, reason);
    await ctx.reply(`Card ${card} has been blacklisted`);
  }
  @Command('remove_blacklist')
  @UseGuards(AdminGuard)
  async removeBlacklist(@Ctx() ctx: Context) {
    const msId = ctx.message?.message_id;
    await ctx.deleteMessage(msId);
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('User ID not found');
      return;
    }
    const card = ctx.text?.split(' ')[1]?.trim();
    if (!card) {
      await ctx.reply('Please provide a card number to remove from blacklist');
      return;
    }
    const isBlacklisted = await this.requestService.isInBlackList(card);
    if (!isBlacklisted) {
      await ctx.reply('This card is not in the blacklist');
      return;
    }
    const blacklistedCard =
      await this.requestService.findBlackListCardByCardNumber(card);
    if (!blacklistedCard) {
      await ctx.reply('This card is not in the blacklist');
      return;
    }
    // console.log(blacklistedCard, 'blacklistedCard.id');
    await this.requestService.removeFromBlackList(blacklistedCard.id);
    await ctx.reply(`Card ${card} has been removed from the blacklist`);
  }
  @Command('resume')
  @UseGuards(AdminGuard)
  async resume(@Ctx() ctx: Context) {
    const msId = ctx.message?.message_id;
    await ctx.deleteMessage(msId);
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('User ID not found');
      return;
    }
    await this.userService.updateUser(
      {
        onPause: false,
      },
      userId,
    );
    await ctx.reply('You are now on work');
  }
  @Command('on')
  @UseGuards(AdminGuard)
  async on(@Ctx() ctx: Context) {
    const msId = ctx.message?.message_id;
    await ctx.deleteMessage(msId);
    await this.prismaService.settings.upsert({
      where: {
        name: 'default',
      },
      update: {
        onPause: false,
      },
      create: {
        name: 'default',
        onPause: false,
      },
    });
    await ctx.reply('Bot is now active');
  }
  @Command('off')
  @UseGuards(AdminGuard)
  async off(@Ctx() ctx: Context) {
    const msId = ctx.message?.message_id;
    await ctx.deleteMessage(msId);
    await this.prismaService.settings.upsert({
      where: {
        name: 'default',
      },
      update: {
        onPause: true,
      },
      create: {
        name: 'default',
        onPause: true,
      },
    });
    await ctx.reply('Bot is now paused');
  }
  @Command('all_rates')
  async allRates(@Ctx() ctx: Context) {
    if (await this.isBotPaused(ctx)) {
      return;
    }
    const allRates = await this.utilsService.getAllPublicRatesMarkupMessage();

    if (!allRates) {
      await ctx.reply('No rates available');
      return;
    }
    const lastAllRateMessageId = await this.prismaService.vendors.findUnique({
      where: {
        chatId: ctx.chat?.id,
      },
    });
    console.log(lastAllRateMessageId, 'lastAllRateMessageId');
    const msg = await ctx.reply(allRates, { parse_mode: 'HTML' });

    if (lastAllRateMessageId && lastAllRateMessageId.lastAllRateMessageId !== undefined) {
      try {
        await ctx.telegram.deleteMessage(
          ctx.chat?.id as number,
          lastAllRateMessageId.lastAllRateMessageId as number
        );
      } catch (error) {
        console.error('Error deleting message:', error);
        await this.prismaService.vendors.update({
          where: {
            chatId: ctx.chat?.id,
          },
          data: {
            lastAllRateMessageId: msg.message_id,
          },
        });
      }
    }

    await this.prismaService.vendors.update({
      where: {
      chatId: ctx.chat?.id,
    },
    data: {
      lastAllRateMessageId: msg.message_id,
    },
   });
   
    const msId = ctx.message?.message_id;
    await ctx.deleteMessage(msId);
  }
  @Hears('Показать поставщиков')
  @UseGuards(AdminGuard)
  async onVendorShow(@Ctx() ctx: SceneContext) {
    const msId = ctx.message?.message_id;
    await ctx.deleteMessage(msId);
    await ctx.scene.enter('user-vendor-wizard');
  }

  @Hears('Черный список')
  @UseGuards(AdminGuard)
  async onBlackList(@Ctx() ctx: Context) {
    const msId = ctx.message?.message_id;
    await ctx.deleteMessage(msId);
    const blackList = await this.requestService.getBlackList();
    if (blackList.length === 0) {
      await ctx.reply('Черный список пуст');
      return;
    }
    const message = [
      '<b>🛑 Черный список карт</b>\n',
      ...blackList.map((item, idx) => {
        const date = item.createdAt
          ? new Date(item.createdAt).toLocaleString('ru-RU', {
              dateStyle: 'short',
              timeStyle: 'short',
            })
          : '-';
        return `<code>${item.card}</code>\n<i>Причина:</i> ${item.comment || '-'}\n<i>Добавлено:</i> ${date}\n`;
      }),
    ].join('\n');
    await ctx.reply(message, { parse_mode: 'HTML' });
  }
  @Command('pay')
  async onPayCommand(@Ctx() ctx: CustomSceneContext) {
    const msId = ctx.message?.message_id;
    await ctx.deleteMessage(msId);
    console.log(`[/pay] chatId: ${ctx.chat?.id}`);
    if (await this.isBotPaused(ctx)) {
      console.log('[/pay] bot paused, skip');
      return;
    }
    const workGroup = await this.workGroupService.chatId();
    if (workGroup === ctx.chat?.id) {
      console.log('[/pay] workGroup chat, skip');
      return;
    }
    if (!ctx.chat || !ctx.chat.id) {
      console.error('[/pay] Chat ID is not available in the context');
      return;
    }

    const vendor = await this.vendorService.getVendorByChatId(ctx.chat?.id);
    console.log(`[/pay] vendor lookup result:`, vendor ? `${vendor.title}, work=${vendor.work}` : 'null');
    if (!vendor) {
      console.error('[/pay] Vendor not found for the current chat');
      return;
    }

    if (!vendor.work) {
      console.log('[/pay] vendor.work=false, skip');
      return;
    }

    await ctx.scene.enter('create-request');
  }
}
