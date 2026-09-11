import * as ExcelJS from 'exceljs';
import { FullRequestType } from 'src/types/types';
import ReportService from './report.service';

/**
 * Партнёрский xlsx не должен раскрывать закрытие: по курсу закрытия и курсу
 * клиента считается наш заработок на его же заявке. Там же наши операторы —
 * кто из наших вёл заявку, партнёра не касается.
 *
 * Читаем реальный файл обратно через exceljs: проверять надо то, что уедет в
 * чат, а не то, что мы думаем, будто туда положили.
 */

const CLOSE_RATE = 45.2;
const CLOSE_ORDER = '22794613456789012345';

function closedRequest(): FullRequestType {
  return {
    id: 'req-1',
    amount: 44676,
    rate: '44.6',
    currency: { code: 'UAH', nameEn: 'UAH' },
    vendor: { title: 'Партнёр' },
    payedByUser: { username: 'artem' },
    completedAt: new Date('2026-09-11T10:00:00Z'),
    closeAccount: 'binance',
    closeRate: CLOSE_RATE,
    closeFee: 0.32,
    closeOrderId: CLOSE_ORDER,
    methods: [],
  } as unknown as FullRequestType;
}

function unclosedRequest(): FullRequestType {
  return {
    id: 'req-2',
    amount: 1000,
    status: 'PENDING',
    currency: { code: 'UAH', nameEn: 'UAH' },
    activeUser: { username: 'alina' },
    createdAt: new Date('2026-09-11T09:00:00Z'),
    methods: [],
  } as unknown as FullRequestType;
}

async function render(isForProvider: boolean) {
  const service = new ReportService();
  const { buffer } = await service.generateReportResult(
    [closedRequest()],
    isForProvider,
    [unclosedRequest()],
  );
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);
  const sheets = workbook.worksheets.map((s) => s.name);
  const text = workbook.worksheets
    .flatMap((sheet) => {
      const rows: string[] = [];
      sheet.eachRow((row) => rows.push(row.values?.toString() ?? ''));
      return rows;
    })
    .join('\n');
  return { sheets, text };
}

describe('партнёрский отчёт не раскрывает внутреннее', () => {
  it('в партнёрской версии нет закрытия, площадок и операторов', async () => {
    const { sheets, text } = await render(false);

    expect(text).not.toContain('Курс закрытия');
    expect(text).not.toContain('Комиссия биржи');
    expect(text).not.toContain('Ордер');
    expect(text).not.toContain(String(CLOSE_RATE));
    expect(text).not.toContain(CLOSE_ORDER);
    expect(text).not.toContain('binance');
    expect(sheets).not.toContain('Площадки');
    // операторов тоже не показываем — ни в основном листе, ни в незакрытых
    expect(text).not.toContain('artem');
    expect(text).not.toContain('alina');
    expect(text).not.toContain('Оператор');

    // то, за чем партнёр и приходит, на месте
    expect(text).toContain('req-1');
    expect(text).toContain('44.6');
    expect(sheets).toContain('Незакрытые');
    expect(text).toContain('req-2');
  });

  it('во внутренней версии закрытие и операторы есть', async () => {
    const { sheets, text } = await render(true);

    expect(text).toContain('Курс закрытия');
    expect(text).toContain(String(CLOSE_RATE));
    expect(text).toContain(CLOSE_ORDER);
    expect(text).toContain('binance');
    expect(sheets).toContain('Площадки');
    expect(text).toContain('artem');
    expect(text).toContain('alina');
  });
});
