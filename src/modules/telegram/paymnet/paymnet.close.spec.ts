import PaymentWizard, { isBookkeeperId, parseCloseNum } from './paymnet.scene';

/** Деньги: запятая оператора не должна валить шаг, мусор не должен пройти. */
describe('parseCloseNum', () => {
  it('нормализует ввод оператора', () => {
    expect(parseCloseNum(' 41,25 ')).toBe('41.25');
    expect(parseCloseNum('41.25')).toBe('41.25');
  });

  it('ноль и мусор — не курс', () => {
    expect(parseCloseNum('0')).toBeNull();
    expect(parseCloseNum('-1')).toBeNull();
    expect(parseCloseNum('41.2.5')).toBeNull();
    expect(parseCloseNum('сорок')).toBeNull();
    expect(parseCloseNum('')).toBeNull();
  });
});

/**
 * Деньги: во время await verify стадия должна быть транзитной ('checking'),
 * иначе отмена/повторный ввод бегут параллельно со сверкой и заявка
 * закрывается уже после отмены.
 */
describe('closeStage во время сверки', () => {
  it('checking блокирует отмену, неуспех возвращает order', async () => {
    let resolveVerify!: (v: unknown) => void;
    const verify = jest.fn(() => new Promise((res) => (resolveVerify = res)));
    const requestService = {
      findById: jest.fn(async () => ({ id: 'r1', amount: 1000, rate: 40 })),
    };
    const bot = { telegram: { editMessageText: jest.fn(async () => ({})) } };
    const wizard = new PaymentWizard(
      {} as never,
      {} as never,
      bot as never,
      {} as never,
      requestService as never,
      { verify } as never,
    );

    const state = {
      requestId: 'r1',
      paymentPhotos: [],
      closeStage: 'order',
      closeAccount: 'binance',
      closePromptId: 10,
    };
    const baseCtx = {
      wizard: { state },
      session: { messagesToDelete: [], requestMenuMessageId: [] },
      chat: { id: 1 },
      from: { id: 777 },
      answerCbQuery: jest.fn(),
      scene: { leave: jest.fn() },
      reply: jest.fn(async () => ({ message_id: 2 })),
    };

    // оператор шлёт ID ордера — визард уходит в await verify
    const orderCtx = {
      ...baseCtx,
      message: { text: '1234567', message_id: 1 },
    };
    const inFlight = wizard.proceedFinalStep(orderCtx as never);
    while (verify.mock.calls.length === 0) await Promise.resolve();
    expect(state.closeStage).toBe('checking');
    // сверка идёт по площадке и по тому, кто закрывает: чужими ключами
    // ордер либо не найдётся, либо найдётся чужой
    expect(verify).toHaveBeenCalledWith(
      'r1',
      '1234567',
      expect.any(String),
      'binance',
      777,
    );

    // отмена во время сверки — «подождите», сцена жива, карточка не трогается
    const cancelCtx = {
      ...baseCtx,
      message: undefined,
      callbackQuery: { data: 'cancel_payment_photo_proceed' },
    };
    await wizard.proceedFinalStep(cancelCtx as never);
    expect(cancelCtx.answerCbQuery).toHaveBeenCalledWith(
      expect.stringContaining('сверка'),
    );
    expect(cancelCtx.scene.leave).not.toHaveBeenCalled();

    // сверка не прошла — возвращаемся к вводу ордера
    resolveVerify({ ok: false, message: 'не сходится' });
    await inFlight;
    expect(state.closeStage).toBe('order');
  });
});

/** Деньги: ручной курс минует сверку — вводить может только бухгалтер из env. */
describe('гард бухгалтера', () => {
  it('пускает только id из BOOKKEEPER_TG_IDS, пустой env — никого', () => {
    expect(isBookkeeperId(111, '111,222')).toBe(true);
    expect(isBookkeeperId(222, ' 111 , 222 ')).toBe(true);
    expect(isBookkeeperId(999, '111,222')).toBe(false);
    expect(isBookkeeperId(111, '')).toBe(false);
    expect(isBookkeeperId(111, undefined)).toBe(false);
    expect(isBookkeeperId(undefined, '111')).toBe(false);
    // "11" не должен проходить как префикс "111"
    expect(isBookkeeperId(11, '111')).toBe(false);
  });

  const makeCtx = (state: Record<string, unknown>, text: string) => ({
    wizard: { state },
    from: { id: 999 }, // не бухгалтер
    chat: { id: 1 },
    session: { messagesToDelete: [], requestMenuMessageId: [] },
    message: { text, message_id: 1 },
    reply: jest.fn(() => Promise.resolve({ message_id: 2 })),
    scene: { leave: jest.fn() },
  });

  it('не-бухгалтер: курс для OKX и «курс N» у Binance блокируются, шаг не меняется', async () => {
    const closeFeeFor = jest.fn();
    const verify = jest.fn();
    const wizard = new PaymentWizard(
      {} as never,
      {} as never,
      {} as never,
      { get: jest.fn(() => '111,222') } as never,
      { closeFeeFor } as never,
      { verify } as never,
    );

    const rateState = {
      requestId: 'r1',
      paymentPhotos: [],
      closeStage: 'rate',
      closeAccount: 'okx',
    };
    const rateCtx = makeCtx(rateState, '41.25');
    await wizard.proceedFinalStep(rateCtx as never);
    expect(rateState.closeStage).toBe('rate');
    expect(closeFeeFor).not.toHaveBeenCalled();
    expect(rateCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('бухгалтер'),
    );

    const orderState = {
      requestId: 'r1',
      paymentPhotos: [],
      closeStage: 'order',
      closeAccount: 'binance',
    };
    const orderCtx = makeCtx(orderState, 'курс 41.25');
    await wizard.proceedFinalStep(orderCtx as never);
    expect(orderState.closeStage).toBe('order');
    expect(verify).not.toHaveBeenCalled();
    expect(closeFeeFor).not.toHaveBeenCalled();
    expect(orderCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('бухгалтер'),
    );
  });
});
