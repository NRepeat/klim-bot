import { Injectable } from '@nestjs/common';
import { createReadStream } from 'fs';
import { Wizard, WizardStep, Ctx, SceneLeave, On } from 'nestjs-telegraf';
import { RatesService } from 'src/modules/rates/rates.service';
import { RequestService } from 'src/modules/request/request.service';
import { UserService } from 'src/modules/user/user.service';
import { UtilsService } from 'src/modules/utils/utils.service';
import { VendorService } from 'src/modules/vendor/vendor.service';
import {
  CardRequestType,
  CustomSceneContext,
  FullRequestType,
  IbanRequestType,
  SerializedMessage,
} from 'src/types/types';
import { Markup } from 'telegraf';
import { TelegramService } from '../telegram.service';
import { InlineKeyboardMarkup } from 'telegraf/typings/core/types/typegram';

@Injectable()
@Wizard('create-request')
export class CreateRequestWizard {
  private requestMenuKeyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('CARD', 'card_request'),
      Markup.button.callback('IBAN', 'iban_request'),
      Markup.button.callback('Cancel', 'cancel_request'),
    ],
  ]);
  private cardFormKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Назад', 'return_to_request_menu')],
  ]);
  constructor(
    private readonly requestService: RequestService,
    private readonly ratesService: RatesService,
    private readonly vendorService: VendorService,
    private readonly utilsService: UtilsService,
    private readonly telegramService: TelegramService,
  ) {}

  @WizardStep(0)
  async selectMethod(@Ctx() ctx: CustomSceneContext) {
    console.log('@WizardStep selectMethod');
    const username = ctx.from?.username || 'Unknown User';
    const inline_keyboard = this.requestMenuKeyboard;
    ctx.session.messagesToDelete = ctx.session.messagesToDelete || [];
    ctx.session.requestMenuMessageId = ctx.session.requestMenuMessageId || [];
    console.log(ctx.session.customState);
    if (ctx.session.customState !== 'select_method') {
      const msg = await ctx.reply(
        '@' + username + ' ' + 'Выберите метод перевода\n\n',
        inline_keyboard,
      );
      ctx.session.customState = 'select_method';
      ctx.session.requestMenuMessageId?.push(msg.message_id);
      console.log(ctx.session, 'requestMenuMessageId');
    } else {
      const msg = await ctx.reply(
        '@' + username + ' ' + 'Выберите метод перевода\n\n',
        inline_keyboard,
      );
      console.log('Updating request menu message');
      await this.deleteSceneMessages(ctx);
      await this.deleteSceneMenuMessages(ctx);
      ctx.session.requestMenuMessageId?.push(msg.message_id);
    }
  }

  @On('callback_query')
  async onCallbackQuery(@Ctx() ctx: CustomSceneContext) {
    console.log('@WizardStep callBack');
    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) {
      await ctx.answerCbQuery('Unknown action');
      return;
    }
    const username = ctx.from?.username || 'Unknown User';
    console.log('Callback data:', callbackQuery.data);
    switch (callbackQuery.data) {
      case 'return_to_request_menu': {
        await this.updateSceneMenuMessage(
          ctx,
          '@' + username + ' ' + 'Выберите метод перевода\n\n',
          this.requestMenuKeyboard.reply_markup,
        );
        ctx.session.customState = 'select_method';
        await this.deleteSceneMessages(ctx);
        ctx.wizard.selectStep(0);
        break;
      }
      case 'cancel_request': {
        await ctx.answerCbQuery('Request creation cancelled');
        await this.deleteSceneMessages(ctx);
        ctx.session.customState = '';
        await this.cancel(ctx);
        break;
      }
      case 'card_request': {
        ctx.session.requestType = 'card';
        const cardRequestMenuMessage =
          '@' +
          username +
          ' ' +
          'отправьте, пожалуйста, заявку в форме:\n\n Карта сумма (5168745632147896 1000)';
        await this.updateSceneMenuMessage(
          ctx,
          cardRequestMenuMessage,
          this.cardFormKeyboard.reply_markup,
        );
        ctx.session.customState = 'card_request';
        ctx.wizard.selectStep(1);
        break;
      }
      case 'iban_request': {
        ctx.session.requestType = 'iban';
        const ibanRequestMenuMessage =
          '@' +
          username +
          ' ' +
          'отправьте, пожалуйста, заявку в форме:\n\nИмя\nIBAN\nИНН\nСумма\nКомментарий (если нужно)';
        await this.updateSceneMenuMessage(
          ctx,
          ibanRequestMenuMessage,
          this.cardFormKeyboard.reply_markup,
        );
        ctx.session.customState = 'iban_request';
        ctx.wizard.selectStep(2);
        break;
      }
    }
  }

  @WizardStep(1)
  async cardStep(@Ctx() ctx: CustomSceneContext) {
    const message = ctx.text;
    const chatId = ctx.chat?.id;
    if (!chatId) {
      await ctx.reply('Chat ID not found. Please try again.');
      return;
    }
    if (!message || message.trim().length === 0) {
      await ctx.reply('Please provide card details.');
      return;
    }
    const lines = message
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const cardRegex =
      /^(?:4[0-9]{12}(?:[0-9]{3})?|[25][1-7][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})$/;
    const amountRegex = /^\d+(\.\d{1,2})?$/;
    const cardDetails: { cardNumber: string; amount: number }[] = [];

    for (const line of lines) {
      if (line.split(' ').length < 2) {
        const msg = await ctx.reply(
          '❌ Неверный формат ввода! Используйте фомат "карта сумма"',
        );
        ctx.session.messagesToDelete?.push(msg.message_id);
        ctx.wizard.selectStep(1);
        continue;
      }
      if (
        !cardRegex.test(line.split(' ')[0]) ||
        !amountRegex.test(line.split(' ')[1] || '0')
      ) {
        const msg = await ctx.reply(
          '❌ Неверный номер карты!\nИспользуйте фомат "карта сумма"',
        );
        ctx.session.messagesToDelete?.push(msg.message_id);
        ctx.wizard.selectStep(1);
        continue;
      }
      cardDetails.push({
        cardNumber: line.split(' ')[0],
        amount: parseFloat(line.split(' ')[1] || '0'),
      });
    }
    if (cardDetails.length !== 0) {
      for (const [index, cardDetail] of cardDetails.entries()) {
        const rates = await this.ratesService.getAllRates();
        if (!rates || rates.length === 0) {
          const msg = await ctx.reply('Нед доступного курса для данной суммы.');
          ctx.session.messagesToDelete?.push(msg.message_id);
          ctx.wizard.selectStep(1);
          return;
        }
        const foundRate = rates.find((rate) => {
          if (
            rate.paymentMethod.nameEn === 'CARD' &&
            rate.currency.nameEn === 'UAH'
          ) {
            return (
              cardDetail.amount >= rate.minAmount &&
              (rate.maxAmount === 0 || cardDetail.amount <= rate.maxAmount)
            );
          }
        });
        const vendor = await this.vendorService.getVendorByChatId(chatId);
        if (!vendor) {
          const msg = await ctx.reply(
            'Пользователь не найден в базе данных. Пожалуйста, свяжитесь с администратором.',
          );
          ctx.session.messagesToDelete?.push(msg.message_id);
          ctx.wizard.selectStep(1);
          return;
        }
        if (!foundRate) {
          const msg = await ctx.reply('Нед доступного курса для данной суммы.');
          ctx.session.messagesToDelete?.push(msg.message_id);
          ctx.wizard.selectStep(1);
          return;
        }
        console.log(cardDetail, 'cardDetail');
        const requestExists =
          cardDetails.findIndex(
            (detail, idx) =>
              detail.cardNumber === cardDetail.cardNumber &&
              detail.amount === cardDetail.amount &&
              idx !== index,
          ) !== -1;

        if (requestExists) {
          const msg = await ctx.reply(
            `Заявка для карты ${cardDetail.cardNumber} с  ${cardDetail.amount} уже существует.`,
          );
          ctx.session.messagesToDelete?.push(msg.message_id);
          ctx.wizard.selectStep(1);
          return;
        }

        const cardRequest: CardRequestType = {
          amount: cardDetail.amount,
          currencyId: foundRate.currencyId,
          notificationSent: false,
          status: 'PENDING',
          vendorId: vendor?.id,
          rateId: foundRate.id,
          card: {
            card: cardDetail.cardNumber,
            comment: 'Card request created via bot',
          },
        };
        try {
          const request =
            await this.requestService.createCardRequest(cardRequest);

          const publicCaption = this.utilsService.buildRequestMessage(
            request as unknown as FullRequestType,
            'card',
            'public',
          );
          const vendorRequestPhotoMessage = {
            photoUrl: '/home/nikita/Code/klim-bot/src/assets/0056.jpg',
            caption: publicCaption,
          };
          const requestMessage = await ctx.replyWithPhoto(
            {
              source: createReadStream(vendorRequestPhotoMessage.photoUrl),
            },
            {
              caption: publicCaption.text,
              reply_markup: publicCaption.inline_keyboard,
            },
          );
          if (!requestMessage || !request) {
            return;
          }
          const messageToSave: SerializedMessage = {
            photoUrl: vendorRequestPhotoMessage.photoUrl,
            text: publicCaption.text,
            chatId: BigInt(ctx.chat?.id || 0),
            messageId: BigInt(requestMessage.message_id),
            requestId: request.id,
            accessType: 'PUBLIC',
          };
          await this.requestService.insertCardRequestMessage(
            request.id,
            messageToSave,
          );
        } catch (error) {
          console.error('Error creating card request:', error);
          await this.cancel(ctx);
          return;
        }
      }
      await this.cancel(ctx);
    }
    // await ctx.scene.leave();
  }

  @WizardStep(2)
  async ibanStep(@Ctx() ctx: CustomSceneContext) {
    // Here you can handle IBAN details input
    // For demo, just go to finish
    const input = ctx.text;
    if (!input) {
      await ctx.reply(
        'Пожалуйста, введите данные в формате: Имя\\nIBAN\\nИНН\\nСумма\\nКомментарий (если нужно)',
      );

      ctx.wizard.selectStep(2);
      return;
    }
    const chatId = ctx.chat?.id;
    if (!chatId) {
      return;
    }
    const ibanRawData = this.parseIbanRequest(input);
    const rates = await this.ratesService.getAllRates();
    if (!rates || rates.length === 0) {
      const msg = await ctx.reply('Нед доступного курса для данной суммы.');
      ctx.session.messagesToDelete?.push(msg.message_id);
      ctx.wizard.selectStep(1);
      return;
    }
    const foundRate = rates.find((rate) => {
      if (
        rate.paymentMethod.nameEn === 'IBAN' &&
        rate.currency.nameEn === 'UAH'
      ) {
        return (
          ibanRawData.amount >= rate.minAmount &&
          (rate.maxAmount === 0 || ibanRawData.amount <= rate.maxAmount)
        );
      }
    });
    const vendor = await this.vendorService.getVendorByChatId(chatId);
    if (!vendor) {
      const msg = await ctx.reply(
        'Пользователь не найден в базе данных. Пожалуйста, свяжитесь с администратором.',
      );
      ctx.session.messagesToDelete?.push(msg.message_id);
      ctx.wizard.selectStep(2);
      return;
    }
    if (!foundRate) {
      const msg = await ctx.reply('Нед доступного курса для данной суммы.');
      ctx.session.messagesToDelete?.push(msg.message_id);
      ctx.wizard.selectStep(2);
      return;
    }
    const ibanRequest: IbanRequestType = {
      amount: ibanRawData.amount,
      currencyId: foundRate.currencyId,
      notificationSent: false,
      status: 'PENDING',
      vendorId: vendor?.id,
      rateId: foundRate.id,
      iban: {
        iban: ibanRawData.iban,
        inn: ibanRawData.inn,
        name: ibanRawData.name,
        comment: 'Card request created via bot',
      },
    };
    const request = await this.requestService.createIbanRequest(ibanRequest);
    console.log(request, 'ibanRawData');
    const publicCaption = this.utilsService.buildRequestMessage(
      request as unknown as FullRequestType,
      'iban',
      'public',
    );
    const vendorRequestPhotoMessage = {
      photoUrl: '/home/nikita/Code/klim-bot/src/assets/0056.jpg',
      caption: publicCaption,
    };
    const requestMessage = await ctx.replyWithPhoto(
      {
        source: createReadStream(vendorRequestPhotoMessage.photoUrl),
      },
      {
        caption: publicCaption.text,
        reply_markup: publicCaption.inline_keyboard,
      },
    );
    if (!requestMessage || !request) {
      return;
    }
    const messageToSave: SerializedMessage = {
      photoUrl: vendorRequestPhotoMessage.photoUrl,
      text: publicCaption.text,
      chatId: BigInt(ctx.chat?.id || 0),
      messageId: BigInt(requestMessage.message_id),
      requestId: request.id,
      accessType: 'PUBLIC',
    };
    await this.requestService.insertCardRequestMessage(
      request.id,
      messageToSave,
    );
    await this.cancel(ctx);
  }

  async cancel(ctx: CustomSceneContext) {
    await ctx.scene.leave();
  }

  @SceneLeave()
  async onSceneLeave(@Ctx() ctx: CustomSceneContext) {
    console.log('Leaving scene, messages to delete:', ctx.session);
    await this.deleteSceneMessages(ctx);
    await this.deleteSceneMenuMessages(ctx);
    ctx.session.messagesToDelete = [];
    ctx.session.customState = '';
    ctx.session.requestMenuMessageId = undefined;
  }
  async deleteSceneMessages(ctx: CustomSceneContext, msgIdToPass?: number[]) {
    try {
      await this.telegramService.deleteAllTelegramMessages(
        ctx.session.messagesToDelete,
        ctx.chat?.id,
        msgIdToPass,
      );
      ctx.session.messagesToDelete = [];
    } catch (error) {
      console.error('Failed to delete scene messages:', error);
    }
  }
  async deleteSceneMenuMessages(ctx: CustomSceneContext) {
    try {
      console.log(ctx.session.requestMenuMessageId, 'requestMenuMessageId');
      await this.telegramService.deleteAllTelegramMessages(
        ctx.session.requestMenuMessageId,
        ctx.chat?.id,
      );
      ctx.session.requestMenuMessageId = [];
    } catch (error) {
      console.error('Failed to delete scene messages:', error);
    }
  }
  async updateSceneMenuMessage(
    ctx: CustomSceneContext,
    text: string,
    markup?: InlineKeyboardMarkup,
  ) {
    try {
      await ctx.editMessageText(text, {
        reply_markup: markup ?? undefined,
      });
    } catch (error) {
      console.error('Failed to update scene menu message:', error);
    }
  }
  parseIbanRequest(input: string) {
    const lines = input
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const name = lines[0] || '';
    const iban = (lines[1] || '').replace(/\s+/g, '').toUpperCase();
    const inn = (lines[2] || '').replace(/\D/g, '');
    const amountStr = (lines[3] || '').replace(',', '.').replace(/[^\d.]/g, '');
    const comment = lines.length > 4 ? lines.slice(4).join('\n').trim() : '';

    const ibanPattern = /^UA\d{27}$/;
    const innPattern = /^\d{8}$|^\d{10}$/;
    const amountPattern = /^\d+([.,]\d{1,2})?$/;

    if (!ibanPattern.test(iban)) {
      throw new Error(
        'Некорректный IBAN. Пример: UAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      );
    }
    if (!innPattern.test(inn)) {
      throw new Error('ИНН должен содержать 8 или 10 цифр.');
    }
    if (!amountPattern.test(amountStr)) {
      throw new Error('Сумма должна быть числом, например: 1000.00');
    }

    return {
      name,
      iban,
      inn,
      amount: parseFloat(amountStr),
      comment,
    };
  }
}
