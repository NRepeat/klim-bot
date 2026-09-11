import { mapVerifyResponse, VERIFY_UNAVAILABLE } from './exchange-check.service';

describe('mapVerifyResponse', () => {
  it('ok: rate и fee ложатся в поля закрытия как есть', () => {
    const result = mapVerifyResponse({
      ok: true,
      rate: '45.08',
      fee: '0.32',
      order: { order_number: '123456789', status: 'COMPLETED' },
    });
    expect(result).toEqual({ ok: true, rate: '45.08', fee: '0.32' });
  });

  it('ok без fee: комиссия — явный ноль, не пустая строка', () => {
    expect(mapVerifyResponse({ ok: true, rate: '41.25', fee: '' })).toEqual({
      ok: true,
      rate: '41.25',
      fee: '0',
    });
    expect(mapVerifyResponse({ ok: true, rate: '41.25' })).toEqual({
      ok: true,
      rate: '41.25',
      fee: '0',
    });
  });

  it('ok без rate — сломанный ответ, закрытие с пустым курсом не проходит', () => {
    const result = mapVerifyResponse({ ok: true, rate: '', fee: '0.1' });
    expect(result).toEqual({ ok: false, message: VERIFY_UNAVAILABLE });
  });

  it('ok:false — готовый текст сервиса отдаётся оператору', () => {
    const message = '❌ Не сходится: в ордере 643.34 USDT, в заявке 408.16 USDT.';
    expect(mapVerifyResponse({ ok: false, reason: 'amount_mismatch', message })).toEqual({
      ok: false,
      message,
    });
  });

  it('ok:false без message — дефолтный отказ, не пустая строка', () => {
    expect(mapVerifyResponse({ ok: false })).toEqual({
      ok: false,
      message: '❌ Сверка не прошла.',
    });
  });

  it('мусор вместо объекта — «сервис недоступен»', () => {
    expect(mapVerifyResponse(null)).toEqual({ ok: false, message: VERIFY_UNAVAILABLE });
    expect(mapVerifyResponse('oops')).toEqual({ ok: false, message: VERIFY_UNAVAILABLE });
  });
});
