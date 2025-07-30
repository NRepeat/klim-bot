import { Command, Ctx, Hears, On, Start, Update } from 'nestjs-telegraf';
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
  ) {}

  async isBotPaused(ctx: Context): Promise<boolean> {
    const settings = await this.prismaService.settings.findUnique({
      where: { name: 'default' },
    });
    return settings?.onPause || false;
  }
  @Start()
  async start(@Ctx() ctx: Context) {
    const groupChat = this.configService.get<number>('WORK_GROUP_CHAT');
    console.log(
      'groupChat !== ctx.chat?.id',
      groupChat,
      ctx.chat?.id,
      groupChat !== ctx.chat?.id,
    );
    if (
      (await this.userService.isAdminChat(ctx)) &&
      Number(groupChat) !== Number(ctx.chat?.id)
    ) {
      const inline_keyboard = Markup.keyboard([
        [{ text: 'Показать пользователей' }, { text: 'Показать поставщиков' }],
        [{ text: 'Черный список' }, { text: 'Обновить курсы' }],
      ]).resize();
      await ctx.reply('Welcome', {
        reply_markup: inline_keyboard.reply_markup,
      });
    } else {
      await ctx.reply('Welcome', {
        reply_markup: undefined,
      });
    }
  }

  @On('my_chat_member')
  async onMyChatMember(@Ctx() ctx: Context) {
    console.log('Chat member updated:', ctx.myChatMember);
    const chatId = ctx.myChatMember?.chat?.id;
    if (!chatId) return;
    if (ctx.myChatMember.new_chat_member.status === 'kicked') {
      console.log('Bot has been kicked from the chat:', chatId);
      return;
    }
    // Register commands for this chat when bot is added
    await ctx.telegram.setMyCommands(
      [
        { command: 'start', description: 'Начать работу с ботом' },
        { command: 'report', description: 'Отправить отчет' },
        { command: 'pay', description: 'Создать заказ' },
        { command: 'all_rates', description: 'Показать все курсы' },
      ],
      { scope: { type: 'chat', chat_id: chatId } },
    );
    console.log('Commands registered for chat:', chatId);
  }
  @Command('report')
  async reportVendor(@Ctx() ctx: Context) {
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
    const requests =
      await this.requestService.getRequestsForVendorSinceLastReport(
        vendor.id,
        lastReportedAt,
      );
    if (!requests.length) return;
    if (requests.length === 0) return ctx.reply('No requests to report');
    const report = await this.reportService.generateReportResult(
      requests as any as FullRequestType[],
      true,
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
        lastReportedAt: new Date(),
      });
    } catch (e) {
      await ctx.reply(
        `Ошибка отправки отчета для вендора ${vendor.title}: ${e}`,
      );
    }
    await this.telegramService.sendDocumentToAllUsers(
      report.buffer,
      fileName,
      report.caption,
    );
  }
  @Command('report_all')
  async reportAll(@Ctx() ctx: Context) {
    const isAdmin = await this.userService.isAdminChat(ctx);
    if (!isAdmin) {
      await ctx.reply('You are not allowed to use this command');
      return;
    }
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
        // console.log(`Vendor ${vendor.title} is on pause, skipping...`);
        continue;
      }
      if (!chatId) continue;
      const lastReportedAt = vendor.lastReportedAt || new Date(0);
      const requests =
        await this.requestService.getRequestsForVendorSinceLastReport(
          vendor.id,
          lastReportedAt,
        );
      if (!requests.length) continue;
      if (requests.length === 0) continue;
      const report = await this.reportService.generateReportResult(
        requests as any as FullRequestType[],
        true,
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
          report: report.buffer,
          filename: fileName,
          caption: report.caption,
        });
        // console.log(`Report sent to vendor ${vendor.title}`);
        await this.vendorService.updateVendor({
          ...vendor,
          lastReportedAt: new Date(),
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
  async registration(@Ctx() ctx: Context) {
    const chatId = ctx.chat?.id;
    const isAdmin = await this.userService.isAdminChat(ctx);
    // console.log(`Chat ID: ${chatId}, isAdmin: ${isAdmin}`);
    if (!chatId) {
      await ctx.reply('Chat ID not found');
      return;
    }
    if (isAdmin) {
      if (await this.utilsService.isChatRegistrated(ctx)) {
        await ctx.reply('You are already registered');
        return;
      }
      await this.vendorService.createVendor(ctx);
    }
  }

  @Hears('Menu')
  async onMenu(@Ctx() ctx: Context) {
    const newButtonCallback = Markup.button.callback('New user', 'new_user');
    const inline_keyboard = Markup.inlineKeyboard([[newButtonCallback]]);
    await ctx.reply('Please choose an option:', {
      reply_markup: inline_keyboard.reply_markup,
    });
  }
  @Hears('Показать пользователей')
  async onUsersShow(@Ctx() ctx: Context) {
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
  async pause(@Ctx() ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('User ID not found');
      return;
    }
    const isAdmin = await this.userService.isAdminChat(ctx);
    if (!isAdmin) {
      await ctx.reply('You are not allowed to use this command');
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
  async blacklist(@Ctx() ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('User ID not found');
      return;
    }
    const isAdmin = await this.userService.isAdminChat(ctx);
    if (!isAdmin) {
      await ctx.reply('You are not allowed to use this command');
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
  async removeBlacklist(@Ctx() ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('User ID not found');
      return;
    }
    const isAdmin = await this.userService.isAdminChat(ctx);
    if (!isAdmin) {
      await ctx.reply('You are not allowed to use this command');
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
  async resume(@Ctx() ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('User ID not found');
      return;
    }
    const isAdmin = await this.userService.isAdminChat(ctx);
    if (!isAdmin) {
      await ctx.reply('You are not allowed to use this command');
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
  async on(@Ctx() ctx: Context) {
    await this.prismaService.settings.update({
      where: { name: 'default' },
      data: { onPause: false },
    });
    await ctx.reply('Bot is now active');
  }
  @Command('off')
  async off(@Ctx() ctx: Context) {
    await this.prismaService.settings.update({
      where: { name: 'default' },
      data: { onPause: true },
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
    await ctx.reply(allRates, { parse_mode: 'HTML' });
  }
  @Hears('Показать поставщиков')
  async onVendorShow(@Ctx() ctx: SceneContext) {
    const isAdmin = await this.userService.isAdminChat(ctx);
    if (!isAdmin) {
      return;
    }
    await ctx.scene.enter('user-vendor-wizard');
  }

  @Hears('Черный список')
  async onBlackList(@Ctx() ctx: Context) {
    const isAdmin = await this.userService.isAdminChat(ctx);
    if (!isAdmin) {
      await ctx.reply('You are not allowed to use this command');
      return;
    }
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
    if (await this.isBotPaused(ctx)) {
      return;
    }
    const workGroup = this.configService.get<number>('WORK_GROUP_CHAT');
    if (workGroup === ctx.chat?.id) {
      return;
    }
    if (!ctx.chat || !ctx.chat.id) {
      console.error('Chat ID is not available in the context');
      return;
    }

    const vendor = await this.vendorService.getVendorByChatId(ctx.chat?.id);
    if (!vendor) {
      console.error('Vendor not found for the current chat');
      return;
    }

    if (!vendor.work) {
      // await ctx.reply('You are not allowed to create requests. Chat on pause');
      return;
    }
    await ctx.scene.enter('create-request');
  }
}
