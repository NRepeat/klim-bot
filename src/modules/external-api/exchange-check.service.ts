import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ExchangeVerifyResult =
  | { ok: true; rate: string; fee: string }
  | { ok: false; message: string };

export const VERIFY_UNAVAILABLE =
  '⚠️ Сервис сверки недоступен, попробуйте ещё раз или «курс N».';

/**
 * Ответ /verify → поля закрытия заявки (closeRate/closeFee).
 * Вынесено из сервиса, чтобы юнит-тест обходился без сети.
 */
export function mapVerifyResponse(v: unknown): ExchangeVerifyResult {
  const data = v as
    | { ok?: boolean; rate?: string; fee?: string; message?: string }
    | null;
  if (!data || typeof data !== 'object') {
    return { ok: false, message: VERIFY_UNAVAILABLE };
  }
  if (data.ok !== true) {
    // сервис отдаёт готовый русский текст отказа — показываем как есть
    return { ok: false, message: data.message || '❌ Сверка не прошла.' };
  }
  const rate = (data.rate ?? '').trim();
  if (!rate) {
    // ok без rate — сломанный ответ, закрывать с пустым курсом нельзя
    return { ok: false, message: VERIFY_UNAVAILABLE };
  }
  // комиссия бывает пустой строкой — в БД должна уйти явным нулём
  const fee = (data.fee ?? '').trim();
  return { ok: true, rate, fee: fee || '0' };
}

/**
 * Клиент сервиса exchange-check: сверяет P2P-ордер биржи с заявкой и атомарно
 * резервирует ордер за парой (workspace, request_id) во всех ботах — один ордер
 * закрывает ровно одну заявку. Ключи сервис берёт по Telegram id закрывающего:
 * у каждого сотрудника свой биржевой аккаунт.
 */
@Injectable()
export class ExchangeCheckService {
  private readonly logger = new Logger(ExchangeCheckService.name);
  private readonly url: string;
  private readonly secret: string;

  constructor(configService: ConfigService) {
    this.url =
      configService.get<string>('EXCHANGE_CHECK_URL') ||
      'http://localhost:8090';
    this.secret = configService.get<string>('EXCHANGE_CHECK_SECRET') || '';
  }

  async verify(
    requestId: string,
    orderId: string,
    expectedAmount: string,
    exchange: string,
    operatorId: number,
  ): Promise<ExchangeVerifyResult> {
    try {
      const res = await fetch(`${this.url}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Secret': this.secret },
        body: JSON.stringify({
          workspace: 'klim',
          request_id: requestId,
          exchange,
          order_id: orderId,
          expected_amount: expectedAmount,
          expected_asset: 'USDT',
          // ключи берутся по закрывающему: у каждого сотрудника свой аккаунт
          operator_id: operatorId,
        }),
        // сервис сам листает историю биржи — даём ему больше времени, чем себе
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        // 401 — неверный EXCHANGE_CHECK_SECRET; оператору это не починить
        this.logger.warn(`exchange-check ${orderId}: HTTP ${res.status}`);
        return { ok: false, message: VERIFY_UNAVAILABLE };
      }
      return mapVerifyResponse(await res.json());
    } catch (e) {
      this.logger.warn(`exchange-check ${orderId}: ${e}`);
      return { ok: false, message: VERIFY_UNAVAILABLE };
    }
  }
}
