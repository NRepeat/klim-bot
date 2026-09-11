import { PaymentMethodEnum } from '@prisma/client';
import { FullRequestType } from 'src/types/types';
import { RequestMessageFactory } from './request-message.factory';

/**
 * Курс закрытия — наша маржа. Партнёр видит карточку своей заявки (PUBLIC) и
 * знать из неё, почём и где мы закрылись, не должен: по курсу закрытия и курсу
 * клиента считается наш заработок на его же заявке.
 *
 * Тест держит границу: даже когда поля закрытия на заявке заполнены, в
 * карточке их нет — ни у партнёра, ни у оператора, ни у админа (операторам
 * закрытие показывается отдельной подписью, а не в теле заявки).
 */

/** Закрытая заявка: клиентский курс 44.6, закрыта по 45.2 на Binance. */
function closedRequest(): FullRequestType {
  return {
    id: 'cmtlluvfm002ppa01fvlylm0d',
    amount: 44676,
    rate: '44.6',
    currency: { nameEn: 'UAH', name: 'UAH' },
    vendor: { title: 'Партнёр' },
    closeAccount: 'binance',
    closeRate: '45.2',
    closeFee: '0.32',
    closeOrderId: '22794613456789012345',
  } as unknown as FullRequestType;
}

const cardMethod = {
  method: PaymentMethodEnum.CARD,
  cardDetails: {
    card: '5375411112229447',
    bank: { bankName: 'Монобанк' },
  },
} as never;

const SECRETS = ['45.2', 'binance', '22794613456789012345', '0.32'];

describe('карточка заявки не раскрывает закрытие', () => {
  it.each(['PUBLIC', 'WORKER', 'ADMIN'] as const)(
    'в карточке %s нет ни курса закрытия, ни площадки, ни ордера',
    (access) => {
      const text =
        RequestMessageFactory.create(access, closedRequest(), cardMethod)
          ?.text ?? '';

      expect(text).not.toBe('');
      for (const secret of SECRETS) {
        expect(text).not.toContain(secret);
      }
      // клиентский курс остаётся — его партнёр и так знает
      expect(text).toContain('44.6');
    },
  );
});
