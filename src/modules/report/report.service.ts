import * as ExcelJS from 'exceljs';
import { Injectable } from '@nestjs/common';
import { FullRequestType } from 'src/types/types';

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
  async generateReportResult(
    requests: FullRequestType[],
    isForProvider: boolean,
  ): Promise<ReportResult> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Отчет');
    const headerRow = [
      'Номер заявки',
      'Сумма',
      'Номер карты',
      'Банк',
      'Поставщик',
      'Курс',
      'Время закрытия заявки',
      'ИНН',
      'Имя клиента',
      'IBAN',
      'Валюта',
    ];
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
    let totalCurrency = 0;
    let totalRate = 0;
    let rateCount = 0;
    for (const request of requests) {
      const rate = request.rates?.rate ?? '';
      const amount = request.amount ?? 0;
      const cardNumber = request.cardMethods?.[0]?.card ?? '';
      const bank = this.getBankNameByCardNumber(cardNumber);
      const provider = request.vendor?.title ?? '';
      const acceptedDateTime = request.updatedAt ?? '';
      const inn = '';
      const clientName = request.user?.username ?? '';
      const iban = '';
      const currency = request?.currency?.nameEn ?? '';
      let result = 0;
      if (rate && typeof rate === 'number' && rate !== 0) {
        result = amount / rate;
      }
      const row = [
        request.id ?? '',
        amount,
        cardNumber,
        bank,
        provider,
        rate !== '' ? Number(Number(rate).toFixed(2)) : '',
        acceptedDateTime instanceof Date
          ? acceptedDateTime
          : acceptedDateTime
            ? new Date(acceptedDateTime)
            : '',
        inn,
        clientName,
        iban,
        result || '',
      ];
      sheet.addRow(row);
      totalAmount += amount;
      totalCurrency += result;
      if (typeof rate === 'number') {
        totalRate += rate;
        rateCount++;
      }
    }
    // Autosize columns
    sheet.columns.forEach((col) => {
      let max = 10;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        max = Math.max(max, cell.value ? cell.value.toString().length : 0);
      });
      col.width = max + 2;
    });
    // Add totals row
    const averageRate = rateCount ? totalRate / rateCount : 0;
    const totalRow = [
      'Итого:',
      totalAmount,
      '',
      '',
      '',
      averageRate,
      '',
      '',
      '',
      '',
      totalCurrency,
    ];
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
    // Caption
    const now = new Date();
    const caption = `Количество заявок: ${requests.length}, \n Итого UAH : ${totalAmount.toFixed(2)}, \n Итого USD: ${totalCurrency.toFixed(2)}, \n Время: ${now.toLocaleString('sv-SE', { hour12: false })}`;
    // Buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer: Buffer.from(buffer), caption };
  }

  getBankNameByCardNumber(cardNumber: string): string {
    // Dummy implementation, replace with real logic
    if (!cardNumber) return '';
    if (cardNumber.startsWith('4')) return 'Visa Bank';
    if (cardNumber.startsWith('5')) return 'Mastercard Bank';
    return 'Unknown Bank';
  }
}
