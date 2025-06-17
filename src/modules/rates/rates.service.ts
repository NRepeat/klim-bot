import { Injectable } from '@nestjs/common';

import {
  Currency,
  ParsedMessageRates,
  PaymentMethod,
  SerializedRate,
} from 'src/types/types';
import RateRepository from './rates.repo';
import { Context } from 'telegraf';
import Rate from 'src/model/Rate';

@Injectable()
export class RatesService {
  // private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly rateRepository: RateRepository) {}
  async getAllRates() {
    return this.rateRepository.getAll();
  }
  async getAllRatesMarkupMessage() {
    const allRates = await this.getAllRates();
    const grouped: Record<string, string[]> = {};

    for (const rate of allRates) {
      const header = `${rate.currency.nameEn}:${rate.paymentMethod.nameEn}`;
      const line = `${rate.minAmount}-${rate.maxAmount} ${rate.rate}`;
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
    console.log('Generated Rates Message:', message);
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

  async createRates(ctx: Context, currency: Currency) {
    const userId = ctx.from?.id;
    const username = ctx.from?.username;
    const allRatesMarkupMessage = await this.getAllRatesMarkupMessage();
    const parsedRates = this.parseAllRatesMarkupMessage(allRatesMarkupMessage);

    console.log('Parsed Rates:', parsedRates);
    await ctx.reply(allRatesMarkupMessage);
    console.log(ctx.text, 'Message from user:', ctx.from);
    const message = ctx.text;
    if (!message) {
      console.error('No message text found in context');
      return;
    }
    if (parsedRates.length === 0) {
      return;
    }
    const newRates: SerializedRate[] = [];
    for (const parsedRate of parsedRates) {
      const method = parsedRate.header.split(':')[1].trim();
      const paymentMethodId =
        PaymentMethod[method as keyof typeof PaymentMethod];
      const currencyName = parsedRate.header.split(':')[0].trim();
      const currencyId = Currency[currencyName as keyof typeof Currency];
      for (const line of parsedRate.lines) {
        const min = Number(line.split('-')[0]);
        const max = Number(line.split('-')[1].split(' ')[0]);
        const rate = Number(line.split(' ')[1]);
        const newRate = new Rate(rate, min, max, currencyId, paymentMethodId);
        newRates.push(newRate);
        console.log(`Creating rate: ${JSON.stringify(newRate)}`);
      }
    }
    if (newRates.length === 0) {
      console.error('No valid rates found to create');
      return;
    }
    const isRateDeleted = await this.rateRepository.deleteAll();
    if (!isRateDeleted) {
      console.error('Failed to delete existing rates before creating new ones');
      return;
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
      const createdRates = await Promise.all(createRatePromises);
      console.log('Created Rates:', createdRates);
    } catch (error) {
      console.error('Error creating rates:', error);
    }

    console.log(`User created: ${username} with ID: ${userId}`);
  }
}
