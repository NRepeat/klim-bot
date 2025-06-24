import {
  AdminRequestPhotoMessage,
  BlackList,
  CardPaymentRequestsMethod,
  Currency,
  IbanPaymentRequestsMethod,
  Message,
  PaymentMethod,
  PaymentRequests,
  Rates,
  User,
  Vendors,
} from 'generated/prisma';
import { Scenes } from 'telegraf';
import { InlineKeyboardMarkup } from 'telegraf/typings/core/types/typegram';

export type SerializedUser = SerializedModel<User & { role?: UserRole }>;
export type SerializedRate = SerializedModel<Rates>;
export type SerializedVendors = SerializedModel<Vendors>;
export type SerializedPaymentMethod = SerializedModel<PaymentMethod>;
export type SerializedRequest = SerializedModel<PaymentRequests>;
export type SerializedMessage = Omit<
  SerializedModel<Message>,
  | 'adminRequestPhotoMessageId'
  | 'workerRequestPhotoMessageId'
  | 'vendorRequestPhotoMessageId'
>;
export type SerializedModel<T> = Omit<T, 'createdAt' | 'updatedAt' | 'id'>;
export type IbanRequestType = Omit<
  SerializedRequest,
  | 'payedByUserId'
  | 'completedAt'
  | 'error'
  | 'user'
  | 'userId'
  | 'ratesId'
  | 'activeUserId'
  | 'paymentMethodId'
> & {
  rateId: string;
  blackList?: BlackList;
  iban: Omit<
    IbanPaymentRequestsMethod,
    'id' | 'createdAt' | 'updatedAt' | 'requestId'
  >;
};
// Extend session for wizard scenes
export interface CustomSession extends Scenes.WizardSessionData {
  messagesToDelete?: number[];
  requestMenuMessageId?: number[];
  customState?: string; // renamed from 'state' to avoid conflict
  requestType?: string; // card, iban, etc
}
export type CardRequestType = Omit<
  SerializedRequest,
  | 'payedByUserId'
  | 'completedAt'
  | 'error'
  | 'user'
  | 'userId'
  | 'ratesId'
  | 'activeUserId'
  | 'paymentMethodId'
> & {
  rateId: string;
  blackList?: BlackList;
  card: Omit<
    CardPaymentRequestsMethod,
    'id' | 'createdAt' | 'updatedAt' | 'requestId'
  >;
};
export type FullRequestType = PaymentRequests & {
  cardMethods?: (CardPaymentRequestsMethod & { blackList?: BlackList[] })[];
  ibanMethods?: IbanPaymentRequestsMethod[];
  message?: Message[];
  vendor?: Vendors;
  user?: SerializedUser;
  activeUser?: User;
  paymentMethod?: SerializedPaymentMethod;
  adminRequestPhotoMessage?: AdminRequestPhotoMessage[];
  currency?: Currency;
  rates?: Rates;
};
export type MessageAccessType = 'public' | 'admin' | 'worker';
// Extend context for wizard scenes
export type CustomSceneContext = Scenes.WizardContext & {
  session: CustomSession;
};

export enum UserRole {
  ADMIN = '1',
  WORKER = '0',
  GEEST = '2',
}

export enum CurrencyEnum {
  UAH = '0',
}

export enum PaymentMethodEnum {
  CARD = '0',
  IBAN = '1',
}

export interface Repository<T> {
  findById?(id: string): Promise<T | null>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update?(id: string, data: Partial<T>): Promise<T>;
  getAll?(): Promise<T[]>;
  deleteAll?(): Promise<boolean>;
}

export interface ParsedMessageRates {
  header: string;
  lines: string[];
}

export interface ReplyMessage {
  text: string;
  inline_keyboard?: InlineKeyboardMarkup;
}
export interface ReplyPhotoMessage extends ReplyMessage {
  source?: Buffer<ArrayBufferLike>;
  photoUrl?: string;
}
