import { startKeyboard } from './menu.actions';

const ADMIN_BUTTONS = [
  'Показать пользователей',
  'Показать поставщиков',
  'Черный список',
  'Обновить курсы',
];

function buttonTexts(markup: unknown): string[] {
  const rows = (markup as { keyboard?: { text: string }[][] }).keyboard ?? [];
  return rows.flat().map((b) => b.text);
}

describe('startKeyboard', () => {
  it('админ в личке получает меню', () => {
    const markup = startKeyboard(true, 'private');
    expect(buttonTexts(markup)).toEqual(ADMIN_BUTTONS);
  });

  it('клиент не видит меню, и прилипшее снимается', () => {
    const markup = startKeyboard(false, 'private');
    expect(markup).toEqual({ remove_keyboard: true });
  });

  it('в группе меню не показываем даже админу: клавиатура там общая на всех', () => {
    for (const chatType of ['group', 'supergroup', 'channel']) {
      expect(startKeyboard(true, chatType)).toEqual({ remove_keyboard: true });
    }
  });

  it('без типа чата меню не отдаём — молча показать его всем хуже, чем не показать', () => {
    expect(startKeyboard(true, undefined)).toEqual({ remove_keyboard: true });
  });
});
