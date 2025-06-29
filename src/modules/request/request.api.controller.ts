import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
  Param,
} from '@nestjs/common';
import { ApiTokenGuard } from './api-token.guard';
import { RequestService } from './request.service';
import { RatesService } from '../rates/rates.service';
import { CardRequestType, IbanRequestType } from 'src/types/types';
import { VendorService } from '../vendor/vendor.service';
import { ApiToken } from './api-token.decorator';

// Utility to convert BigInt to string in all responses
function replacerBigInt(key: string, value: any) {
  return typeof value === 'bigint' ? value.toString() : value;
}
function toJSONSafe(obj: any) {
  return JSON.parse(JSON.stringify(obj, replacerBigInt));
}

@Controller('api/request')
@UseGuards(ApiTokenGuard)
export class RequestApiController {
  constructor(
    private readonly requestService: RequestService,
    private readonly ratesService: RatesService,
    private readonly vendorService: VendorService, // Assuming you have a VendorService
  ) {}

  @Post('add_lead')
  async addLead(
    @Body() requests: CardRequestType[],
    @ApiToken() apiToken: string,
  ) {
    // console.log('Received requests:', requests);
    const responses: any[] = [];
    for (const req of requests) {
      const result: Record<string, any> = {
        amount: req.amount,
        cardNumber: req.card?.card,
      };
      // Card number validation (16 digits, Luhn)
      const cardNumber = req.card?.card?.replace(/\s/g, '');
      // console.log(`Validating card number: ${cardNumber}`);
      // Check if card number is valid: 16 digits and Luhn algorithm
      if (
        !cardNumber ||
        !/^\d{16}$/.test(cardNumber)
        // !this.isValidLuhn(cardNumber)
      ) {
        result.error =
          'Некорректный номер карты (ожидается 16 цифр и валидность по Luhn)';
        result.status = 2215;
        responses.push(result);
        continue;
      }
      // Rate lookup
      const allRates = await this.ratesService.getAllRates();
      const amount = req.amount;
      let rate: number | null = null;
      for (const r of allRates) {
        if (r.paymentMethod.nameEn.toLowerCase() === 'card') {
          const min = r.minAmount;
          const max = r.maxAmount;
          const greaterOrEqualMin = amount >= min;
          const lessOrEqualMax =
            max === null || max === 0 ? true : amount <= max;
          if (greaterOrEqualMin && lessOrEqualMax) {
            rate = r.rate;
            break;
          }
        }
      }
      if (!rate || rate === 0) {
        result.status = 2215;
        result.error = 'Нет подходящего курса для суммы или курс равен 0';
        responses.push(result);
        continue;
      }
      const foundRate = allRates.find(
        (r) =>
          r.rate === rate && r.paymentMethod.nameEn.toLowerCase() === 'card',
      );
      req.rateId = foundRate?.id || '';
      result.rate = rate;
      // Save request
      try {
        const vendor = await this.vendorService.getVendorByToken(apiToken);
        // console.log(`Creating request for vendor: ${vendor?.title}`);
        if (!vendor) {
          result.status = 2215;
          result.error = 'Неверный API токен или вендор не найден';
          responses.push(result);
          continue;
        }
        req.vendorId = vendor.id;
        req.currencyId = foundRate?.currency.id || '';
        const created = await this.requestService.createCardRequest(req);
        result.status = 2200;
        result.hexRequestNumber = created.id;
      } catch (e) {
        // console.error('Error creating request:', e);
        result.status = 2215;
        result.error = 'Ошибка при создании заявки';
      }
      responses.push(result);
    }
    return toJSONSafe(responses);
  }

  @Post('add_iban_lead')
  async addIbanLead(
    @Body() requests: IbanRequestType[],
    @ApiToken() apiToken: string,
  ) {
    const responses: any[] = [];
    for (let i = 0; i < requests.length; i++) {
      const req = requests[i];
      const result: Record<string, any> = {
        amount: req.amount,
        iban: req.iban?.iban,
        inn: req.iban?.inn,
        client_name: req.iban?.name,
        comment: req.iban?.comment,
      };
      // IBAN validation
      if (!req.iban?.iban || req.iban.iban.length !== 29) {
        result.error = `IBAN должен быть ровно 29 символов (элемент ${i + 1})`;
        result.status = 2215;
        responses.push(result);
        continue;
      }
      if (
        !req.iban?.inn ||
        req.iban.inn.length < 8 ||
        req.iban.inn.length > 10
      ) {
        result.error = `ИНН должен быть от 8 до 10 символов (элемент ${i + 1})`;
        result.status = 2215;
        responses.push(result);
        continue;
      }
      // Rate lookup
      const allRates = await this.ratesService.getAllRates();
      const amount = req.amount;
      let rate: number | null = null;
      for (const r of allRates) {
        if (r.paymentMethod.nameEn.toLowerCase() === 'iban') {
          const min = r.minAmount;
          const max = r.maxAmount;
          const greaterOrEqualMin = amount >= min;
          const lessOrEqualMax =
            max === null || max === 0 ? true : amount <= max;
          if (greaterOrEqualMin && lessOrEqualMax) {
            rate = r.rate;
            break;
          }
        }
      }
      if (!rate || rate === 0) {
        result.status = 2215;
        result.error = 'Нет подходящего курса для суммы или курс равен 0';
        responses.push(result);
        continue;
      }
      const foundRate = allRates.find(
        (r) =>
          r.rate === rate && r.paymentMethod.nameEn.toLowerCase() === 'iban',
      );
      req.rateId = foundRate?.id || '';
      result.rate = rate;
      // Save request
      try {
        const vendor = await this.vendorService.getVendorByToken(apiToken);
        // console.log(`Creating request for vendor: ${vendor?.title}`);
        if (!vendor) {
          result.status = 2215;
          result.error = 'Неверный API токен или вендор не найден';
          responses.push(result);
          continue;
        }
        req.vendorId = vendor.id;
        req.currencyId = foundRate?.currency.id || '';
        const created = await this.requestService.createIbanRequest(req);
        result.status = 2200;
        result.hexRequestNumber = created.id;
      } catch (e) {
        result.status = 2215;
        result.error = 'Ошибка при создании заявки';
      }
      responses.push(result);
    }
    return toJSONSafe(responses);
  }

  @Get('get_leads')
  async getLeads(
    @Query('id') id?: string,
    @Query('ids') ids?: string[],
    @Query('status') status?: string,
  ) {
    // For demo: just return all requests, optionally filter by id/ids/status
    let requests = await this.requestService.getAllRequests();
    if (id) {
      requests = requests.filter((r) => r.id === id);
    } else if (ids && ids.length > 0) {
      requests = requests.filter((r) => ids.includes(r.id));
    } else if (status !== undefined) {
      requests = requests.filter((r) => String(r.status) === status);
    }
    return toJSONSafe(requests);
  }

  @Get(':id/status')
  async getRequestStatus(@Param('id') id: string) {
    const request = await this.requestService.findById(id);
    if (!request) {
      return {
        statusCode: 2204,
        status: 'not_found',
        error: `Заявка с ID ${id} не найдена`,
      };
    }
    // Map status to response
    // Use user/activeUser for accepted/success
    if (request.activeUser && Number(request.status) === 1) {
      return toJSONSafe({
        status: 2201,
        message: `Ваш статус заявки: Завершена пользователем @${request.activeUser.username}`,
        username: request.activeUser.username,
        stage: 'Завершена',
        datetime: request.updatedAt || null,
      });
    } else if (request.activeUser) {
      return toJSONSafe({
        status: 2211,
        message: `Ваш статус заявки: Принята пользователем @${request.activeUser.username}`,
        username: request.activeUser.username,
        stage: 'Принята',
        datetime: null,
      });
    } else if (Number(request.status) === 5) {
      return toJSONSafe({
        status: 2205,
        message: `Ваш статус заявки: Ошибка - ${request.error || 'Заявка не принята'}`,
        username: null,
        stage: 'Ошибка',
        datetime: null,
      });
    } else {
      return toJSONSafe({
        status: 2200,
        message: 'Ваш статус заявки: Ожидание',
        username: null,
        stage: 'Ожидание',
        datetime: null,
      });
    }
  }

  @Get('status-by-date')
  async getStatusByDate(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    // For demo: just return all requests in date range
    const from = new Date(startDate);
    const to = new Date(endDate);
    const requests = await this.requestService.getAllRequests();
    const filtered = requests.filter((r) => {
      const created = new Date(r.createdAt);
      return created >= from && created <= to;
    });
    return toJSONSafe(
      filtered.map((request) => ({
        hexRequestNumber: request.id,
        amount: request.amount,
        cardNumber: request.cardMethods?.[0]?.card,
        iban: request.ibanMethods?.[0]?.iban,
        clientName: request.ibanMethods?.[0]?.name,
        inn: request.ibanMethods?.[0]?.inn,
        comment: request.ibanMethods?.[0]?.comment,
        rate: request.rates?.rate,
        datetime: request.updatedAt || null,
        status: request.status,
      })),
    );
  }

  @Get('rates')
  async getRates() {
    const allRates = await this.ratesService.getAllRates();
    // Group by card/iban
    const cardRates = allRates.filter(
      (r) => r.paymentMethod.nameEn.toLowerCase() === 'card',
    );
    const ibanRates = allRates.filter(
      (r) => r.paymentMethod.nameEn.toLowerCase() === 'iban',
    );
    return toJSONSafe({
      cardRates,
      ibanRates,
    });
  }

  // Luhn validation
  private isValidLuhn(cardNumber: string): boolean {
    const digits = cardNumber.replace(/\s/g, '');
    let sum = 0;
    let alternate = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let n = parseInt(digits[i], 10);
      if (alternate) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alternate = !alternate;
    }
    return sum % 10 === 0;
  }
}
