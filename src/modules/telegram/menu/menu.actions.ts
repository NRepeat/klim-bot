import { Command, Ctx, Hears, Start, Update } from 'nestjs-telegraf';
import ReportService from 'src/modules/report/report.service';
import { RequestService } from 'src/modules/request/request.service';
import { UserService } from 'src/modules/user/user.service';
import { UtilsService } from 'src/modules/utils/utils.service';
import { VendorService } from 'src/modules/vendor/vendor.service';
import { FullRequestType } from 'src/types/types';
import { Context, Markup } from 'telegraf';
import { TelegramService } from '../telegram.service';

@Update()
export class MenuActions {
  constructor(
    private readonly userService: UserService,
    private readonly vendorService: VendorService,
    private readonly utilsService: UtilsService,
    private readonly reportService: ReportService,
    private readonly requestService: RequestService,
    private readonly telegramService: TelegramService,
  ) {}
  @Start()
  async start(@Ctx() ctx: Context) {
    if (await this.userService.isAdminChat(ctx)) {
      const inline_keyboard = Markup.keyboard([
        [{ text: 'Menu' }],
        [{ text: 'Обновить курсы' }],
      ]).resize();
      await ctx.reply('Welcome', {
        reply_markup: inline_keyboard.reply_markup,
      });
    } else {
      await ctx.reply('Welcome');
      const inline_keyboard = Markup.keyboard([[{ text: 'Menu' }]]).resize();
      await ctx.reply('Welcome', {
        reply_markup: inline_keyboard.reply_markup,
      });
      console.log(
        `New user created: ${ctx.from?.username} with ID: ${ctx.from?.id}`,
      );
    }
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

      console.log(`Report sent to vendor ${vendor.title}`);
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
    const vendors = await this.vendorService.getAllVendors();
    let sentCount = 0;
    const allReports: {
      report: Buffer<ArrayBufferLike>;
      filename: string;
      caption: string;
    }[] = [];
    for (const vendor of vendors) {
      const chatId = vendor.chatId?.toString();
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
        console.log(`Report sent to vendor ${vendor.title}`);
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
  @Command('registration')
  async registration(@Ctx() ctx: Context) {
    if (await this.utilsService.isChatRegistrated(ctx)) {
      await ctx.reply('You are already registered');
      return;
    }
    await this.vendorService.createVendor(ctx);
  }

  @Hears('Menu')
  async onMenu(@Ctx() ctx: Context) {
    const newButtonCallback = Markup.button.callback('New user', 'new_user');
    const inline_keyboard = Markup.inlineKeyboard([[newButtonCallback]]);
    await ctx.reply('Please choose an option:', {
      reply_markup: inline_keyboard.reply_markup,
    });
  }

  @Hears('hi')
  async onHi(@Ctx() ctx: Context) {
    await ctx.reply('Hello there!');
  }
}
