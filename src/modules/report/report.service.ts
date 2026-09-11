import * as ExcelJS from 'exceljs';
import { Injectable } from '@nestjs/common';
import { PaymentMethodEnum } from '@prisma/client';
import { FullRequestType } from 'src/types/types';

type MethodReportData = {
  type: string;
  requisites: string;
  bank: string;
  comment: string;
  inn: string;
  clientName: string;
};

export interface Request {
  hexRequestNumber: string;
  amount: number;
  cardNumber: string;
  provider: string;
  rate: number | null;
  acceptedDateTime: Date;
  clientName?: string;
  iban?: string;
  inn?: string;
}

export interface ReportResult {
  buffer: Buffer;
  caption: string;
}

@Injectable()
export default class ReportService {
  /**
   * Отчёт по заявкам.
   *
   * `isForProvider` — внутренняя версия (уходит админам). Партнёрская версия
   * **не должна** содержать ничего про закрытие: по курсу закрытия и курсу
   * клиента считается наш заработок на его же заявке. Там же и наши операторы:
   * кто из наших людей вёл заявку — не его дело.
   */
  async generateReportResult(
    requests: FullRequestType[],
    isForProvider: boolean,
    unclosedRequests: FullRequestType[] = [],
  ): Promise<ReportResult> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Отчет');
    const headerRow = [
      'Номер заявки',
      'Тип заявки',
      'Сумма',
      'Курс',
      'Сумма по USDT',
      'Валюта',
      'Реквизиты',
      'Банк',
      'Поставщик',
      'Время закрытия заявки',
      'ИНН',
      'Имя клиента',
      'Комментарий',
    ];
    if (isForProvider) {
      headerRow.splice(9, 0, 'Пользователь');
      headerRow.push('Площадка', 'Курс закрытия', 'Комиссия биржи', 'Ордер');
    }

    sheet.addRow(headerRow);
    // Style header
    sheet.getRow(1).eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      };
      cell.font = { bold: true };
    });
    let totalAmount = 0;
    let totalConverted = 0;
    let totalRate = 0;
    let rateCount = 0;
    for (const request of requests) {
      const amount = this.toNumber(request.amount) ?? 0;
      const rateValue = this.toNumber(request.rates?.rate ?? request.rate);
      const convertedAmount =
        rateValue && rateValue !== 0 ? amount / rateValue : null;
      const provider = request.vendor?.title ?? '';
      const worker = request.payedByUser?.username ?? '';
      const currency = request.currency?.code ?? request.currency?.nameEn ?? '';
      const methodData = this.resolveMethodReportData(request);
      const closeRate = this.toNumber(request.closeRate);
      const closeFee = this.toNumber(request.closeFee);
      const row = [
        request.id ?? '',
        methodData.type,
        this.roundNumber(amount),
        rateValue !== null ? this.roundNumber(rateValue) : '',
        convertedAmount !== null ? this.roundNumber(convertedAmount) : '',
        currency,
        methodData.requisites,
        methodData.bank,
        provider,
        this.formatDateTime(request.completedAt),
        methodData.inn,
        methodData.clientName,
        methodData.comment,
      ];
      if (isForProvider) {
        row.splice(9, 0, worker);
        row.push(
          request.closeAccount ?? '',
          closeRate !== null ? closeRate : '',
          closeFee !== null ? closeFee : '',
          request.closeOrderId ?? '',
        );
      }

      sheet.addRow(row);
      totalAmount += amount;
      if (convertedAmount !== null) {
        totalConverted += convertedAmount;
      }
      if (rateValue !== null) {
        totalRate += rateValue;
        rateCount++;
      }
    }
    sheet.columns.forEach((col) => {
      let max = 10;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        max = Math.max(max, cell.value ? cell.value.toString().length : 0);
      });
      col.width = max + 2;
    });
    // Add totals row
    const averageRate = rateCount ? totalRate / rateCount : null;
    const totalRow = [
      'Итого:',
      '',
      '',
      averageRate !== null ? this.roundNumber(averageRate) : '',
      rateCount > 0 ? this.roundNumber(totalConverted) : '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ];
    if (isForProvider) {
      totalRow.splice(9, 0, '');
    }

    const totalRowRef = sheet.addRow(totalRow);
    totalRowRef.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      };
      cell.font = { bold: true };
    });
    // Add count row
    const countRow = ['Общее количество заявок:', requests.length];
    const countRowRef = sheet.addRow(countRow);
    countRowRef.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      };
      cell.font = { bold: true };
    });
    // Разрез «закрыто по площадкам» — внутренний: показывает, где и почём мы
    // закрываемся. В партнёрскую версию не попадает.
    if (isForProvider) {
      this.addPlatformSheet(workbook, requests);
    }

    // Незакрытые заявки — все, что ещё не закрыты. Партнёру показываем без
    // имени оператора: кто из наших ведёт заявку — не его дело.
    this.addUnclosedSheet(workbook, unclosedRequests, isForProvider);

    // Caption
    const now = new Date();
    const captionParts = [
      `Количество заявок: ${requests.length}`,
    ];
    if (totalConverted > 0) {
      captionParts.push(`Сумма USDT: ${this.roundNumber(totalConverted)}`);
    }
    captionParts.push(
      `Время: ${now.toLocaleString('sv-SE', { hour12: false })}`,
    );
    const caption = captionParts.join(',\n');
    // Buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer: Buffer.from(buffer), caption };
  }

  private addPlatformSheet(
    workbook: ExcelJS.Workbook,
    requests: FullRequestType[],
  ) {
    const platformSheet = workbook.addWorksheet('Площадки');
    this.styleHeaderRow(
      platformSheet.addRow(['Площадка', 'Количество', 'Объём USDT', 'Комиссии']),
    );
    const byPlatform = new Map<
      string,
      { count: number; volume: number; fees: number }
    >();
    for (const request of requests) {
      const key = request.closeAccount ?? 'не указано';
      const amount = this.toNumber(request.amount) ?? 0;
      const rateValue = this.toNumber(request.rates?.rate ?? request.rate);
      const volume = rateValue && rateValue !== 0 ? amount / rateValue : 0;
      const fee = this.toNumber(request.closeFee) ?? 0;
      const acc = byPlatform.get(key) ?? { count: 0, volume: 0, fees: 0 };
      acc.count += 1;
      acc.volume += volume;
      acc.fees += fee;
      byPlatform.set(key, acc);
    }
    for (const [platform, acc] of byPlatform) {
      platformSheet.addRow([
        platform,
        acc.count,
        this.roundNumber(acc.volume),
        this.roundNumber(acc.fees, 8),
      ]);
    }
    this.autoWidth(platformSheet);
  }

  private addUnclosedSheet(
    workbook: ExcelJS.Workbook,
    unclosedRequests: FullRequestType[],
    isForProvider: boolean,
  ) {
    const unclosedSheet = workbook.addWorksheet('Незакрытые');
    const header = ['Номер заявки', 'Сумма', 'Валюта', 'Статус', 'Создана'];
    if (isForProvider) {
      header.splice(4, 0, 'Оператор');
    }
    this.styleHeaderRow(unclosedSheet.addRow(header));
    for (const request of unclosedRequests) {
      const row: (string | number)[] = [
        request.id ?? '',
        this.roundNumber(this.toNumber(request.amount) ?? 0),
        request.currency?.code ?? request.currency?.nameEn ?? '',
        request.status ?? '',
        this.formatDateTime(request.createdAt),
      ];
      if (isForProvider) {
        row.splice(
          4,
          0,
          request.activeUser?.username ?? request.payedByUser?.username ?? '',
        );
      }
      unclosedSheet.addRow(row);
    }
    this.autoWidth(unclosedSheet);
  }

  private resolveMethodReportData(request: FullRequestType): MethodReportData {
    const defaultData: MethodReportData = {
      type: 'UNKNOWN',
      requisites: '',
      bank: '',
      comment: '',
      inn: '',
      clientName: '',
    };

    const methods = request.methods ?? [];
    if (!methods.length) {
      return defaultData;
    }

    const preferred = request.paymentMethod?.nameEn;
    const method =
      (preferred && methods.find((item) => item.method === preferred)) ??
      methods[0];

    switch (method.method) {
      case PaymentMethodEnum.CARD: {
        const details = method.cardDetails;
        const cardNumber = details?.card ?? '';
        return {
          type: PaymentMethodEnum.CARD,
          requisites: cardNumber,
          bank:
            details?.bank?.bankName ?? this.getBankNameByCardNumber(cardNumber),
          comment: details?.comment ?? '',
          inn: '',
          clientName: '',
        };
      }
      case PaymentMethodEnum.IBAN:
      case PaymentMethodEnum.IBAN_PERSONAL:
      case PaymentMethodEnum.IBAN_COMPANY: {
        const details = method.ibanDetails;
        return {
          type: method.method,
          requisites: details?.iban ?? '',
          bank: '',
          comment: details?.comment ?? '',
          inn: details?.inn ?? '',
          clientName: details?.name ?? '',
        };
      }
      case PaymentMethodEnum.WISE: {
        const details = method.wiseDetails;
        return {
          type: PaymentMethodEnum.WISE,
          requisites: details?.email ?? '',
          bank: '',
          comment: details?.comment ?? '',
          inn: '',
          clientName: details?.fullName ?? '',
        };
      }
      case PaymentMethodEnum.PHONE: {
        const details = method.phoneDetails;
        return {
          type: PaymentMethodEnum.PHONE,
          requisites: details?.phoneNumber ?? '',
          bank: '',
          comment: details?.comment ?? '',
          inn: '',
          clientName: details?.holderName ?? '',
        };
      }
      case PaymentMethodEnum.SKRILL: {
        const details = method.skrillDetails;
        return {
          type: PaymentMethodEnum.SKRILL,
          requisites: details?.email ?? '',
          bank: '',
          comment: details?.comment ?? '',
          inn: '',
          clientName: '',
        };
      }
      case PaymentMethodEnum.PAYONEER: {
        const details = method.payoneerDetails;
        return {
          type: PaymentMethodEnum.PAYONEER,
          requisites: details?.email ?? '',
          bank: '',
          comment: details?.comment ?? '',
          inn: '',
          clientName: '',
        };
      }
      case PaymentMethodEnum.QR: {
        const details = method.qrDetails;
        return {
          type: PaymentMethodEnum.QR,
          requisites: details?.identifier ?? '',
          bank: '',
          comment: details?.comment ?? '',
          inn: '',
          clientName: '',
        };
      }
      case PaymentMethodEnum.KZT_KASPI_BANK: {
        const details = method.cardDetails;
        const cardNumber = details?.card ?? '';
        return {
          type: 'Kaspi Bank',
          requisites: cardNumber,
          bank: 'Kaspi Bank',
          comment: details?.comment ?? '',
          inn: '',
          clientName: details?.holder ?? '',
        };
      }
      case PaymentMethodEnum.KZT_OTHER_BANKS: {
        const details = method.cardDetails;
        const cardNumber = details?.card ?? '';
        return {
          type: 'Остальные банки',
          requisites: cardNumber,
          bank: 'Другие банки KZT',
          comment: details?.comment ?? '',
          inn: '',
          clientName: details?.holder ?? '',
        };
      }
      case PaymentMethodEnum.CNY_ALIPAY: {
        const details = method.qrDetails;
        return {
          type: 'Alipay',
          requisites: details?.identifier ?? '',
          bank: 'Alipay',
          comment: details?.comment ?? '',
          inn: '',
          clientName: '',
        };
      }
      case PaymentMethodEnum.CNY_WECHAT: {
        const details = method.qrDetails;
        return {
          type: 'WeChat Pay',
          requisites: details?.identifier ?? '',
          bank: 'WeChat Pay',
          comment: details?.comment ?? '',
          inn: '',
          clientName: '',
        };
      }
      case PaymentMethodEnum.CNY_CARD: {
        const details = method.cardDetails;
        const cardNumber = details?.card ?? '';
        return {
          type: 'CNY Карта',
          requisites: cardNumber,
          bank: 'Китайский банк',
          comment: details?.comment ?? '',
          inn: '',
          clientName: details?.holder ?? '',
        };
      }
      default:
        return {
          ...defaultData,
          type: method.method ?? defaultData.type,
        };
    }
  }

  private styleHeaderRow(row: ExcelJS.Row) {
    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      };
      cell.font = { bold: true };
    });
  }

  private autoWidth(sheet: ExcelJS.Worksheet) {
    sheet.columns.forEach((col) => {
      let max = 10;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        max = Math.max(max, cell.value ? cell.value.toString().length : 0);
      });
      col.width = max + 2;
    });
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value.replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : null;
    }
    // Prisma Decimal (closeRate/closeFee) приходит объектом — парсим строку
    if (value != null && typeof value === 'object') {
      const parsed = Number(String(value));
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private roundNumber(value: number, fractionDigits = 2): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    const factor = 10 ** fractionDigits;
    return Math.round(value * factor) / factor;
  }

  private formatDateTime(date: Date | string | null | undefined): string {
    if (!date) {
      return '';
    }
    const dateTime = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(dateTime.getTime())) {
      return '';
    }
    return dateTime.toLocaleString('ru-RU', { hour12: false });
  }

  getBankNameByCardNumber(cardNumber: string): string {
    // Dummy implementation, replace with real logic
    if (!cardNumber) return '';
    if (cardNumber.startsWith('4')) return 'Visa Bank';
    if (cardNumber.startsWith('5')) return 'Mastercard Bank';
    return 'Unknown Bank';
  }
}
