import { Injectable } from '@nestjs/common';

import {
  CurrencyEnum,
  ParsedMessageRates,
  PaymentMethodEnum,
  SerializedRate,
} from 'src/types/types';
import RateRepository from './rates.repo';
import { Context } from 'telegraf';
import Rate from 'src/model/Rate';
import { VendorService } from '../vendor/vendor.service';

@Injectable()
export class RatesService {
  // private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly rateRepository: RateRepository,
    private readonly vendorService: VendorService,
  ) {}
  async getAllRates() {
    return this.rateRepository.getAll();
  }

  async getAllRatesMarkupMessage() {
    const allRates = await this.getAllRates();
    const grouped: Record<
      string,
      { minAmount: number; maxAmount: number | null; rate: number }[]
    > = {};
    for (const rate of allRates) {
      const header = `${rate.currency.nameEn}:${rate.paymentMethod.nameEn}`;
      if (!grouped[header]) grouped[header] = [];
      grouped[header].push({
        minAmount: rate.minAmount,
        maxAmount: rate.maxAmount,
        rate: rate.rate,
      });
    }
    // Сортируем header: Card всегда первым, остальные по алфавиту
    const headers = Object.keys(grouped).sort((a, b) => {
      if (a.toLowerCase().includes('card') && !b.toLowerCase().includes('card'))
        return -1;
      if (!a.toLowerCase().includes('card') && b.toLowerCase().includes('card'))
        return 1;
      return a.localeCompare(b);
    });
    const message: string[] = [];
    for (const header of headers) {
      grouped[header].sort((a, b) => {
        if (a.maxAmount === null && b.maxAmount !== null) return 1;
        if (a.maxAmount !== null && b.maxAmount === null) return -1;
        return a.minAmount - b.minAmount;
      });
      grouped[header].reverse();
      message.push(header);
      for (const r of grouped[header]) {
        const amount =
          r.maxAmount !== null && r.maxAmount > 0
            ? `${r.minAmount}-${r.maxAmount}`
            : `${r.minAmount}+`;
        message.push(`${amount} ${r.rate}`);
      }
    }
    return message.join('\n');
  }
  async getAllPublicRatesMarkupMessage() {
    const allRates = await this.getAllRates();
    if (!allRates.length) return 'Нет доступных курсов.';
    // Сортируем: сначала Card, затем остальные, внутри Card — сначала + (maxAmount === null/0), потом по minAmount по убыванию
    type Rate = (typeof allRates)[number];
    function plusFirstSort(a: Rate, b: Rate) {
      const aPlus = !a.maxAmount || a.maxAmount === 0;
      const bPlus = !b.maxAmount || b.maxAmount === 0;
      if (aPlus && !bPlus) return -1;
      if (!aPlus && bPlus) return 1;
      return (b.minAmount ?? 0) - (a.minAmount ?? 0);
    }
    const cardRates = allRates
      .filter((r) => r.paymentMethod.nameEn.toLowerCase() === 'card')
      .sort(plusFirstSort);
    const otherRates = allRates
      .filter((r) => r.paymentMethod.nameEn.toLowerCase() !== 'card')
      .sort(plusFirstSort);
    const sortedRates = [...cardRates, ...otherRates];
    // Группируем по валюте и методу оплаты
    const grouped: Record<string, string[]> = {};
    for (const rate of sortedRates) {
      const header = `💱 <b>${rate.currency.name}</b> — <i>${rate.paymentMethod.nameEn}</i>`;
      const line = `▫️ <b>${rate.minAmount}${
        rate.maxAmount !== null && rate.maxAmount > 0
          ? ' - ' + rate.maxAmount
          : '+'
      }</b> — <b>${rate.rate}</b>`;
      if (!grouped[header]) grouped[header] = [];
      grouped[header].push(line);
    }
    const message: string[] = ['<b>Актуальные курсы:</b>\n'];
    for (const header in grouped) {
      message.push(header);
      message.push(...grouped[header]);
      message.push('');
    }
    return message.join('\n');
  }
  parseAllRatesMarkupMessage(message: string) {
    try {
      const lines = message.split('\n').filter((line) => line.trim() !== '');
      const rates: ParsedMessageRates[] = [];
      let currentHeader = '';

      for (const line of lines) {
        if (line.includes(':')) {
          currentHeader = line;
          console.log(currentHeader, 'currentHeader');
          rates.push({ header: currentHeader, lines: [] });
        } else if (currentHeader) {
          rates[rates.length - 1].lines.push(line);
        }
      }
      console.log(rates, 'rates');
      return rates;
    } catch (error) {
      console.error('Error parsing rates markup message:', error);
      return [];
    }
  }

  async createRates(ctx: Context) {
    const message = ctx.text;
    if (!message) {
      console.error('No message text found in context');
      throw new Error('No message text found');
    }

    const parsedRates = this.parseAllRatesMarkupMessage(message);

    const newRates: {
      existRate: SerializedRate | null;
      newRate: SerializedRate;
    }[] = [];
    const allRates = await this.getAllRates();

    for (const parsedRate of parsedRates) {
      const method = parsedRate.header.split(':')[1].trim();
      const paymentMethodId =
        PaymentMethodEnum[method as keyof typeof PaymentMethodEnum];
      const currencyName = parsedRate.header.split(':')[0].trim();
      const currencyId =
        CurrencyEnum[currencyName as keyof typeof CurrencyEnum];
      for (let i = 0; i < parsedRate.lines.length; i++) {
        const line = parsedRate.lines[i];
        const existRate = allRates[i];
        let minAmount = 0;
        let maxAmount: number | null = null;
        let rate = 0;
        if (typeof line !== 'string') continue;
        const [amountPartRaw, ratePartRaw] = line.split(' ');
        const amountPart = amountPartRaw?.trim() ?? '';
        const ratePart = ratePartRaw?.trim() ?? '';
        rate = Number(ratePart);
        if (amountPart.includes('+')) {
          minAmount = Number(amountPart.replace('+', ''));
          maxAmount = null;
        } else if (amountPart.includes('-')) {
          const [min, max] = amountPart.split('-');
          minAmount = Number(min);
          maxAmount = Number(max);
        }
        const newRate = new Rate(
          rate,
          minAmount,
          maxAmount ?? 0,
          currencyId,
          paymentMethodId,
        );
        if (existRate) {
          newRates.push({ existRate, newRate });
        } else if (!existRate) {
          newRates.push({ existRate: null, newRate });
        }
        console.log(newRate, 'newRate');
      }

      if (newRates.length === 0) {
        console.error('No valid rates found to create');
        throw new Error('No valid rates found');
      }
      console.log('New rates:', newRates.length);
      if (allRates.length > 0) {
        for (const rates of newRates) {
          if (!rates.newRate) {
            continue;
          }
          if (!rates.existRate) {
            await this.rateRepository.create({
              rate: rates.newRate.rate,
              minAmount: rates.newRate.minAmount,
              maxAmount: rates.newRate.maxAmount,
              currencyId: rates.newRate.currencyId,
              paymentMethodId: rates.newRate.paymentMethodId,
            });
          } else if (rates.existRate) {
            const existRate = rates.existRate as any as {
              maxAmount: number;
              minAmount: number;
              rate: number;
              id: string;
            };
            const updatedRate = rates.newRate as any as {
              maxAmount: number;
              minAmount: number;
              rate: number;
              currencyId: number;
              paymentMethodId: number;
            };

            await this.rateRepository.updateRates({
              where: existRate,
              data: {
                rate: updatedRate.rate,
                minAmount: updatedRate.minAmount,
                maxAmount: updatedRate.maxAmount,
                currencyId: updatedRate.currencyId,
                paymentMethodId: updatedRate.paymentMethodId,
              },
            });
          }

          try {
            // await Promise.all(createRatePromises);
            // return true;
          } catch (error) {
            throw new Error(
              `Failed to create rates: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        }
        return true;
      }
    }
  }
  async sendAllRatesToAllVendors(ctx: Context) {
    const allRates = await this.getAllPublicRatesMarkupMessage();
    const allVendors = await this.vendorService.getAllActiveVendors();
    if (allVendors.length === 0) {
      return;
    }
    for (const vendor of allVendors) {
      try {
        if (!vendor.work) {
          console.log(`Vendor ${vendor.id} is on pause, skipping...`);
          continue;
        }
        if (vendor.lastAllRateMessageId == null) {
          const msg = await ctx.telegram.sendMessage(
            Number(vendor.chatId),
            allRates,
            { parse_mode: 'HTML' },
          );
          await this.vendorService.updateAllRatesLastMessageId(
            vendor.id,
            msg.message_id,
          );
        } else {
          try {
            await ctx.telegram.deleteMessage(
              Number(vendor.chatId),
              Number(vendor.lastAllRateMessageId),
            );
            const msg = await ctx.telegram.sendMessage(
              Number(vendor.chatId),
              allRates,
              { parse_mode: 'HTML' },
            );
            await this.vendorService.updateAllRatesLastMessageId(
              vendor.id,
              msg.message_id,
            );
          } catch (error) {
            console.error(
              `Failed to edit message for vendor ${vendor.id}:`,
              error,
            );
            const msg = await ctx.telegram.sendMessage(
              Number(vendor.chatId),
              allRates,
              { parse_mode: 'HTML' },
            );
            await this.vendorService.updateAllRatesLastMessageId(
              vendor.id,
              msg.message_id,
            );
          }
        }
      } catch (error) {
        console.error(`Failed to send rates to vendor ${vendor.id}:`, error);
      }
    }
  }
}
