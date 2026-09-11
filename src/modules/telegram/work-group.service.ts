import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Общая группа приёма заявок.
 *
 * Источник истины — строка Settings в базе: её ставит команда `/register_main`
 * прямо в нужной группе. Env `WORK_GROUP_CHAT` остаётся запасным вариантом,
 * пока команду не выполнили ни разу, — иначе после выката бот на минуту забыл
 * бы, куда постить заявки.
 *
 * Владельцы — единственные, кому команда доступна: сменить группу приёма
 * заявок значит увести весь поток в другой чат, это не операторское действие.
 * Список в env `OWNER_TG_IDS`, пустой env = никому.
 */
@Injectable()
export class WorkGroupService {
  private readonly logger = new Logger(WorkGroupService.name);
  /** Кэш на процесс: id читается на каждую заявку, база тут ни при чём. */
  private cached?: number | null;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  ownerIds(): ReadonlySet<number> {
    const raw = this.configService.get<string>('OWNER_TG_IDS') ?? '';
    return new Set(
      raw
        .split(',')
        .map((part) => Number(part.trim()))
        .filter((id) => Number.isInteger(id) && id !== 0),
    );
  }

  isOwner(telegramId?: number): boolean {
    return telegramId !== undefined && this.ownerIds().has(telegramId);
  }

  /** id общей группы: база, иначе env. null — не настроена нигде. */
  async chatId(): Promise<number | null> {
    if (this.cached !== undefined) return this.cached;
    try {
      const settings = await this.prismaService.settings.findUnique({
        where: { name: 'default' },
        select: { workGroupChatId: true },
      });
      if (settings?.workGroupChatId) {
        this.cached = Number(settings.workGroupChatId);
        return this.cached;
      }
    } catch (error) {
      // база недоступна — не роняем отправку заявки, идём в env
      this.logger.warn(`Не прочитал группу из базы: ${error}`);
    }
    const fromEnv = Number(this.configService.get<string>('WORK_GROUP_CHAT'));
    this.cached = Number.isInteger(fromEnv) && fromEnv !== 0 ? fromEnv : null;
    return this.cached;
  }

  /** Зарегистрировать текущий чат общей группой. */
  async setChatId(chatId: number): Promise<void> {
    await this.prismaService.settings.upsert({
      where: { name: 'default' },
      update: { workGroupChatId: BigInt(chatId) },
      create: { name: 'default', workGroupChatId: BigInt(chatId) },
    });
    this.cached = chatId;
    this.logger.log(`Общая группа заявок: ${chatId}`);
  }
}
