import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Свой раздел суточной сводки для exchange-check.
 *
 * Сводку по всем трём ботам собирает сервис, а не бот: у каждого своя база и
 * свой формат, и склеивать их в боте значит держать в нём знание о двух чужих
 * бизнесах. Мы присылаем готовые строки про себя — что считать своим объёмом,
 * решает тот, кто его считает.
 *
 * Время: чуть раньше, чем greatbot забирает сводку (23:55), иначе наш раздел
 * не успеет доехать и в отчёте будет «не прислал».
 */
@Injectable()
export class DailySummaryService {
  private readonly logger = new Logger(DailySummaryService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('0 50 23 * * *', { timeZone: 'Europe/Kyiv' })
  async pushDailySlice(): Promise<void> {
    const url = this.configService.get<string>('EXCHANGE_CHECK_URL');
    if (!url) return; // сервис не настроен — сводки нет, это не ошибка бота

    try {
      const slice = await this.buildSlice();
      const res = await fetch(`${url}/report/day`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Secret':
            this.configService.get<string>('EXCHANGE_CHECK_SECRET') || '',
        },
        body: JSON.stringify(slice),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        this.logger.warn(`Раздел сводки не принят: HTTP ${res.status}`);
        return;
      }
      this.logger.log(`Раздел сводки отправлен: ${slice.lines.length} строк`);
    } catch (error) {
      // не доехал — в сводке будет «не прислал»; ронять бота из-за отчёта нельзя
      this.logger.warn(`Раздел сводки не отправлен: ${error}`);
    }
  }

  /** Строки про сегодняшний день: объём, операторы, площадки, незакрытые. */
  async buildSlice(now = new Date()) {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);

    const completed = await this.prismaService.paymentRequests.findMany({
      where: { status: 'COMPLETED', completedAt: { gte: from } },
      select: {
        amount: true,
        closeAccount: true,
        payedByUser: { select: { username: true, telegramId: true } },
      },
    });
    // незакрытые — все, что ещё в работе или ждут: пока список не пуст,
    // день не сходится
    const unclosed = await this.prismaService.paymentRequests.count({
      where: { status: { in: ['PENDING', 'ACCEPTED'] } },
    });

    const total = completed.reduce((sum, r) => sum + (r.amount ?? 0), 0);
    const lines = [
      `💰 Закрыто заявок: ${completed.length} на ${this.money(total)}`,
    ];

    for (const [operator, stat] of this.groupBy(completed, (r) =>
      r.payedByUser?.username
        ? `@${r.payedByUser.username}`
        : String(r.payedByUser?.telegramId ?? 'без оператора'),
    )) {
      lines.push(
        `👤 ${operator} — ${stat.count} заявок, ${this.money(stat.sum)}`,
      );
    }

    for (const [account, stat] of this.groupBy(
      completed,
      (r) => r.closeAccount ?? 'без площадки',
    )) {
      lines.push(
        `🏦 ${account} — ${stat.count} заявок, ${this.money(stat.sum)}`,
      );
    }

    if (unclosed > 0) lines.push(`⚠️ Незакрытых заявок: ${unclosed}`);

    return {
      workspace: 'klim',
      title: 'KlimBot',
      date: '', // день считает сервис — у ботов свои часы и пояса
      at: '',
      lines,
      unclosed,
    };
  }

  /** Суммы заявок в валюте получения — показываем как есть, без конвертаций. */
  private money(value: number): string {
    return value.toFixed(2);
  }

  private groupBy<T extends { amount: number }>(
    rows: T[],
    key: (row: T) => string,
  ): Map<string, { count: number; sum: number }> {
    const out = new Map<string, { count: number; sum: number }>();
    for (const row of rows) {
      const k = key(row);
      const acc = out.get(k) ?? { count: 0, sum: 0 };
      acc.count += 1;
      acc.sum += row.amount ?? 0;
      out.set(k, acc);
    }
    return out;
  }
}
