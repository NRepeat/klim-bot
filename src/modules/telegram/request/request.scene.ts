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
  SerializedMessage,
} from 'src/types/types';
import { Markup } from 'telegraf';
import { TelegramService } from '../telegram.service';

@Injectable()
@Wizard('create-request')
export class CreateRequestWizard {
  constructor(
    private readonly requestService: RequestService,
    private readonly ratesService: RatesService,
    private readonly vendorService: VendorService,
    private readonly utilsService: UtilsService,
    private readonly userService: UserService,
    private readonly telegramService: TelegramService,
  ) {}

  @WizardStep(0)
  async selectMethod(@Ctx() ctx: CustomSceneContext) {
    const inline_keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('Cancel', 'cancel_request'),
        Markup.button.callback('Card', 'card_request'),
        Markup.button.callback('Iban', 'iban_request'),
      ],
    ]);
    ctx.session.messagesToDelete = ctx.session.messagesToDelete || [];
    if (ctx.session.customState !== 'select_method') {
      const msg = await ctx.reply('Оберіть метод заявки\n\n', inline_keyboard);
      ctx.session.customState = 'select_method';
      ctx.session.messagesToDelete.push(msg.message_id);
    }
  }

  @On('callback_query')
  async onCallbackQuery(@Ctx() ctx: CustomSceneContext) {
    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) {
      await ctx.answerCbQuery('Unknown action');
      return;
    }
    if (callbackQuery.data === 'cancel_request') {
      await this.cancel(ctx);
    } else if (callbackQuery.data === 'card_request') {
      ctx.session.requestType = 'card';
      await ctx.reply('You selected Card request. Please provide the details.');
      ctx.session.customState = 'card_request';
      ctx.wizard.next();
    } else if (callbackQuery.data === 'iban_request') {
      ctx.session.requestType = 'iban';
      await ctx.reply('You selected IBAN request. Please provide the details.');
      ctx.session.customState = 'iban_request';
      ctx.wizard.selectStep(2);
    }
  }

  @WizardStep(1)
  async cardStep(@Ctx() ctx: CustomSceneContext) {
    const message = ctx.text;
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
      if (
        !cardRegex.test(line.split(' ')[0]) ||
        !amountRegex.test(line.split(' ')[1] || '0')
      ) {
        await ctx.reply(
          'Invalid card details format. Please use "CardNumber Amount" format.',
        );
        return;
      }
      cardDetails.push({
        cardNumber: line.split(' ')[0],
        amount: parseFloat(line.split(' ')[1] || '0'),
      });
    }
    if (cardDetails.length !== 0) {
      for (const cardDetail of cardDetails) {
        const rates = await this.ratesService.getAllRates();
        if (!rates || rates.length === 0) {
          await ctx.reply('No rates available. Please create a rate first.');
          return;
        }
        const foundRate = rates.find((rate) => {
          return (
            console.log('Checking rate:', rate),
            console.log('Card amount:', cardDetail.amount),
            cardDetail.amount >= rate.minAmount &&
              (rate.maxAmount === 0 || cardDetail.amount <= rate.maxAmount)
          );
        });
        const vendor = await this.vendorService.getVendorByChatId(
          ctx.chat?.id || 0,
        );
        if (!vendor) {
          await ctx.reply(
            'No vendor found for this chat. Please contact support.',
          );
          return;
        }
        if (!foundRate) {
          await ctx.reply(
            `No rate found for amount ${cardDetail.amount}. Please check the available rates.`,
          );
          continue;
        }
        const allCardRequests =
          await this.requestService.findAllCardRequestsByCard();
        const requestExists = allCardRequests.find(
          (request) =>
            request.amount === cardDetail.amount &&
            Array.isArray(request.cardMethods) &&
            request.cardMethods.length > 0 &&
            request.cardMethods[0].card === cardDetail.cardNumber,
        );
        if (requestExists) {
          await ctx.reply(
            `Request for card ${cardDetail.cardNumber} with amount ${cardDetail.amount} already exists.`,
          );
          continue;
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
          console.log('Created request:', request);

          const publicCaption = this.utilsService.buildRequestMessage(
            request as unknown as FullRequestType,
            'card',
            'public',
          );
          const vendorRequestPhotoMessage = {
            source: '/home/nikita/Code/klim-bot/src/assets/0056.jpg',
            caption: publicCaption,
          };
          const requestMessage = await ctx.replyWithPhoto(
            {
              source: createReadStream(vendorRequestPhotoMessage.source),
            },
            {
              caption: publicCaption.text,
              reply_markup: publicCaption.inline_keyboard,
            },
          );
          if (!requestMessage || !request) {
            await ctx.reply('Failed to create card request. Please try again.');
            return;
          }
          const messageToSave: SerializedMessage = {
            photoUrl: vendorRequestPhotoMessage.source,
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
          await ctx.scene.leave();
          return;
        }
      }
      await ctx.scene.leave();
      return;
    }
  }

  @WizardStep(2)
  async ibanStep(@Ctx() ctx: CustomSceneContext) {
    // Here you can handle IBAN details input
    // For demo, just go to finish
    await ctx.reply('IBAN details step. (Demo: send any text to finish)');
    ctx.wizard.next();
  }

  @WizardStep(3)
  async finishStep(@Ctx() ctx: CustomSceneContext) {
    await ctx.reply('Request creation finished.');
    ctx.session.customState = 'finished';
    await ctx.scene.leave();
  }

  async cancel(ctx: CustomSceneContext) {
    ctx.session.messagesToDelete = ctx.session.messagesToDelete || [];
    const messagesToDelete = ctx.session.messagesToDelete;
    // if (messagesToDelete.length > 0) {
    //   for (const messageId of messagesToDelete) {
    //     try {
    //       await ctx.deleteMessage(messageId);
    //     } catch (error) {
    //       console.error('Failed to delete message:', error);
    //     }
    //   }
    // }
    ctx.session.messagesToDelete = [];
    ctx.session.customState = 'cancelled';
    await ctx.scene.leave();
  }

  @SceneLeave()
  async onSceneLeave(@Ctx() ctx: CustomSceneContext) {
    const messagesToDelete = ctx.session.messagesToDelete || [];
    // if (messagesToDelete.length > 0) {
    //   for (const messageId of messagesToDelete) {
    //     try {
    //       await ctx.deleteMessage(messageId);
    //     } catch (error) {
    //       console.error('Failed to delete message:', error);
    //     }
    //   }
    // }
  }
}
