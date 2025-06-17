import { SerializedRate } from 'src/types/types';

export default class Rate implements SerializedRate {
  rate: number;
  minAmount: number;
  maxAmount: number;
  currencyId: string;
  paymentMethodId: string;

  constructor(
    rate: number,
    minAmount: number,
    maxAmount: number,
    currencyId: string,
    paymentMethodId: string,
  ) {
    this.rate = rate;
    this.minAmount = minAmount;
    this.maxAmount = maxAmount;
    this.currencyId = currencyId;
    this.paymentMethodId = paymentMethodId;
  }
}
