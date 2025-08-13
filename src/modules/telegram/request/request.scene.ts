import { Injectable } from '@nestjs/common';
import { Wizard, WizardStep, Ctx, SceneLeave, On } from 'nestjs-telegraf';
import { RatesService } from 'src/modules/rates/rates.service';
import { RequestService } from 'src/modules/request/request.service';
import { UtilsService } from 'src/modules/utils/utils.service';
import { VendorService } from 'src/modules/vendor/vendor.service';
import {
  CardRequestType,
  CustomSceneContext,
  FullRequestType,
  IbanRequestType,
  SerializedMessage,
} from 'src/types/types';
import { TelegramService } from '../telegram.service';
import { InlineKeyboardMarkup } from 'telegraf/typings/core/types/typegram';
import { MenuFactory } from '../telegram-keyboards';

@Injectable()
@Wizard('create-request')
export class CreateRequestWizard {
  constructor(
    private readonly requestService: RequestService,
    private readonly ratesService: RatesService,
    private readonly vendorService: VendorService,
    private readonly utilsService: UtilsService,
    private readonly telegramService: TelegramService,
  ) {}

  @WizardStep(0)
  async selectMethod(@Ctx() ctx: CustomSceneContext) {
    // console.log('@WizardStep selectMethod');
    const username = ctx.from?.username || 'Unknown User';
    const selectPaymentMenu =
      MenuFactory.createSelectPaymentMethodMenu(username);
    ctx.session.messagesToDelete = ctx.session.messagesToDelete || [];
    ctx.session.requestMenuMessageId = ctx.session.requestMenuMessageId || [];
    if (ctx.session.customState !== 'select_method') {
      const msg = await ctx.reply(selectPaymentMenu.caption, {
        reply_markup: selectPaymentMenu.markup,
        parse_mode: 'HTML',
      });
      ctx.session.customState = 'select_method';
      ctx.session.requestMenuMessageId?.push(msg.message_id);
    } else {
      await this.deleteSceneMessages(ctx);
      await this.deleteSceneMenuMessages(ctx);
      const msg = await ctx.reply(selectPaymentMenu.caption, {
        reply_markup: selectPaymentMenu.markup,
        parse_mode: 'HTML',
      });
      ctx.session.requestMenuMessageId?.push(msg.message_id);
    }
  }

  @On('callback_query')
  async onCallbackQuery(@Ctx() ctx: CustomSceneContext) {
    // console.log('@WizardStep callBack');
    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) {
      await ctx.answerCbQuery('Unknown action');
      return;
    }

    const username = ctx.from?.username || 'Unknown User';
    const selectPaymentMenu =
      MenuFactory.createSelectPaymentMethodMenu(username);
    switch (callbackQuery.data) {
      case 'return_to_request_menu': {
        await this.updateSceneMenuMessage(
          ctx,
          selectPaymentMenu.caption,
          selectPaymentMenu.markup,
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
        const cardRequestMenu = MenuFactory.createCardPaymentMenu(username);
        await this.updateSceneMenuMessage(
          ctx,
          cardRequestMenu.caption,
          cardRequestMenu.markup,
        );
        ctx.session.customState = 'card_request';
        ctx.wizard.selectStep(1);
        break;
      }
      case 'iban_request': {
        ctx.session.requestType = 'iban';
        const ibanRequestMenu = MenuFactory.createIbanPaymentMenu(username);
        await this.updateSceneMenuMessage(
          ctx,
          ibanRequestMenu.caption,
          ibanRequestMenu.markup,
        );
        ctx.session.customState = 'iban_request';
        ctx.wizard.selectStep(2);
        break;
      }
      default: {
        await ctx.scene.leave();
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
        const bankName = await this.utilsService.getBankNameByCardNumber(
          cardDetail.cardNumber,
        );
        const cardRequest: CardRequestType = {
          amount: cardDetail.amount,
          currencyId: foundRate.currencyId,
          notificationSent: false,
          status: 'PENDING',
          vendorId: vendor?.id,
          rateId: foundRate.id,
          rate: String(foundRate.rate),
          card: {
            card: cardDetail.cardNumber,
            comment: 'Card request created via bot',
            bankId: bankName ? bankName.id : '',
          },
        };
        try {
          const request =
            await this.requestService.createCardRequest(cardRequest);
          const photoUrl = './src/assets/0056.jpg';
          const publicMenu = MenuFactory.createPublicMenu(
            request as unknown as FullRequestType,
            photoUrl,
          );
          const requestMessage = await ctx.replyWithPhoto(
            {
              source: publicMenu.inWork().source,
            },
            {
              caption: publicMenu.inWork().caption,
              reply_markup: publicMenu.inWork().markup,
              parse_mode: 'HTML',
            },
          );
          if (!requestMessage || !request) {
            return;
          }
          const messageToSave: SerializedMessage = {
            photoUrl: photoUrl,
            text: publicMenu.inWork().caption,
            chatId: BigInt(ctx.chat?.id || 0),
            messageId: requestMessage.message_id,
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
  }

  @WizardStep(2)
  async ibanStep(@Ctx() ctx: CustomSceneContext) {
    const input = ctx.text;
    if (!input || input.split('\n').length < 4) {
      await ctx.reply(
        'Пожалуйста, введите данные в формате:\nИмя\nIBAN\nИНН\nСумма\nКомментарий (если нужно)',
      );
      ctx.wizard.selectStep(2);
      return;
    }
    const chatId = ctx.chat?.id;
    if (!chatId) {
      return;
    }
    try {
      let ibanRawData;
      try {
        ibanRawData = this.parseIbanRequest(input);
      } catch (error) {
        ctx.sendMessage(`${error.message}`);
        // await this.cancel(ctx);
        return;
      }
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
        rate: String(foundRate.rate),
        rateId: foundRate.id,
        iban: {
          iban: ibanRawData.iban,
          inn: ibanRawData.inn,
          name: ibanRawData.name,
          comment: ibanRawData.comment || '',
        },
      };
      const request = await this.requestService.createIbanRequest(ibanRequest);

      const photoUrl = './src/assets/0056.jpg';
      const publicMenu = MenuFactory.createPublicMenu(
        request as unknown as FullRequestType,
        photoUrl,
      );
      const requestMessage = await ctx.replyWithPhoto(
        {
          source: publicMenu.inWork().source,
        },
        {
          parse_mode: 'HTML',
          caption: publicMenu.inWork(undefined, request.id).caption,
          reply_markup: publicMenu.inWork().markup,
        },
      );
      if (!requestMessage || !request) {
        return;
      }
      const messageToSave: SerializedMessage = {
        photoUrl: photoUrl,
        text: publicMenu.inWork().caption,
        chatId: BigInt(ctx.chat?.id || 0),
        messageId: requestMessage.message_id,
        requestId: request.id,
        accessType: 'PUBLIC',
      };
      await this.requestService.insertCardRequestMessage(
        request.id,
        messageToSave,
      );
      await this.cancel(ctx);
    } catch (error) {
      console.error('Error parsing IBAN request:', error);

      return await this.cancel(ctx);
    }
  }

  async cancel(ctx: CustomSceneContext) {
    await ctx.scene.leave();
  }

  @SceneLeave()
  async onSceneLeave(@Ctx() ctx: CustomSceneContext) {
    // console.log('Leaving scene, messages to delete:', ctx.session);
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
