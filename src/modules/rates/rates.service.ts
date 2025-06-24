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
    const grouped: Record<string, string[]> = {};

    for (const rate of allRates) {
      const header = `${rate.currency.nameEn}:${rate.paymentMethod.nameEn}`;
      const line = `${rate.minAmount}${rate.maxAmount !== null && rate.maxAmount > 0 ? '-' + rate.maxAmount : '+'} ${rate.rate}`;
      if (!grouped[header]) {
        grouped[header] = [];
      }
      grouped[header].push(line);
    }

    const message: string[] = [];
    for (const header in grouped) {
      message.push(header);
      message.push(...grouped[header]);
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
          rates.push({ header: currentHeader, lines: [] });
        } else if (currentHeader) {
          rates[rates.length - 1].lines.push(line);
        }
      }

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

    const newRates: SerializedRate[] = [];
    for (const parsedRate of parsedRates) {
      const method = parsedRate.header.split(':')[1].trim();
      const paymentMethodId =
        PaymentMethodEnum[method as keyof typeof PaymentMethodEnum];
      const currencyName = parsedRate.header.split(':')[0].trim();
      const currencyId =
        CurrencyEnum[currencyName as keyof typeof CurrencyEnum];
      for (const line of parsedRate.lines) {
        let minAmount = 0;
        let maxAmount: number | null = null;
        let rate = 0;
        const [amountPart, ratePart] = line.split(' ');
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
        newRates.push(newRate);
      }
    }
    if (newRates.length === 0) {
      console.error('No valid rates found to create');
      throw new Error('No valid rates found');
    }
    const existingRates = await this.getAllRates();
    if (existingRates.length > 0) {
      const isRateDeleted = await this.rateRepository.deleteAll();
      if (!isRateDeleted) {
        console.error(
          'Failed to delete existing rates before creating new ones',
        );
        throw new Error('Failed to delete existing rates');
      }
      const createRatePromises = newRates.map((rate) =>
        this.rateRepository.create({
          rate: rate.rate,
          minAmount: rate.minAmount,
          maxAmount: rate.maxAmount,
          currencyId: rate.currencyId,
          paymentMethodId: rate.paymentMethodId,
        }),
      );
      try {
        await Promise.all(createRatePromises);

        return true;
      } catch (error) {
        throw new Error(
          `Failed to create rates: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    } else {
      const createRatePromises = newRates.map((rate) =>
        this.rateRepository.create({
          rate: rate.rate,
          minAmount: rate.minAmount,
          maxAmount: rate.maxAmount,
          currencyId: rate.currencyId,
          paymentMethodId: rate.paymentMethodId,
        }),
      );
      try {
        await Promise.all(createRatePromises);

        return true;
      } catch (error) {
        throw new Error(
          `Failed to create rates: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  }
  async sendAllRatesToAllVendors(ctx: Context) {
    const allRates = await this.getAllRatesMarkupMessage();
    const allVendors = await this.vendorService.getAllActiveVendors();
    if (allVendors.length === 0) {
      return;
    }
    for (const vendor of allVendors) {
      try {
        if (vendor.lastAllRateMessageId == null) {
          const msg = await ctx.telegram.sendMessage(
            Number(vendor.chatId),
            allRates,
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
            );
            await this.vendorService.updateAllRatesLastMessageId(
              vendor.id,
              msg.message_id,
            );
          }
        }
        console.log(`Sent rates to vendor ${vendor.id}`);
      } catch (error) {
        console.error(`Failed to send rates to vendor ${vendor.id}:`, error);
      }
    }
  }
}
