import { DailySummaryService } from './daily-summary.service';

/**
 * Раздел сводки — то, по чему считают день. Проверяем, что суммы и разрезы
 * не врут и что незакрытые видно.
 */
describe('DailySummaryService.buildSlice', () => {
  const make = (completed: unknown[], unclosed: number) => {
    const prisma = {
      paymentRequests: {
        findMany: jest.fn(async () => completed),
        count: jest.fn(async () => unclosed),
      },
    };
    const config = { get: () => undefined };
    return new DailySummaryService(prisma as never, config as never);
  };

  it('считает объём, операторов и площадки', async () => {
    const service = make(
      [
        {
          amount: 1000,
          closeAccount: 'binance',
          payedByUser: { username: 'artem', telegramId: 1 },
        },
        {
          amount: 500.5,
          closeAccount: 'binance',
          payedByUser: { username: 'artem', telegramId: 1 },
        },
        {
          amount: 250,
          closeAccount: 'bybit',
          payedByUser: { username: null, telegramId: 42 },
        },
      ],
      2,
    );
    const slice = await service.buildSlice();

    expect(slice.workspace).toBe('klim');
    expect(slice.unclosed).toBe(2);
    expect(slice.lines[0]).toBe('💰 Закрыто заявок: 3 на 1750.50');
    expect(slice.lines).toContain('👤 @artem — 2 заявок, 1500.50');
    // без username показываем telegram id, а не пустоту
    expect(slice.lines).toContain('👤 42 — 1 заявок, 250.00');
    expect(slice.lines).toContain('🏦 binance — 2 заявок, 1500.50');
    expect(slice.lines).toContain('🏦 bybit — 1 заявок, 250.00');
    expect(slice.lines).toContain('⚠️ Незакрытых заявок: 2');
  });

  it('пустой день — строка есть, незакрытых нет', async () => {
    const slice = await make([], 0).buildSlice();
    expect(slice.lines).toEqual(['💰 Закрыто заявок: 0 на 0.00']);
    expect(slice.unclosed).toBe(0);
  });

  it('заявка без площадки не теряется в разрезе', async () => {
    const slice = await make(
      [{ amount: 10, closeAccount: null, payedByUser: null }],
      0,
    ).buildSlice();
    expect(slice.lines).toContain('🏦 без площадки — 1 заявок, 10.00');
    expect(slice.lines).toContain('👤 без оператора — 1 заявок, 10.00');
  });
});
