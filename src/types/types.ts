import {
  CardPaymentRequestsMethod,
  Message,
  PaymentRequests,
  Rates,
  User,
  Vendors,
} from 'generated/prisma';
import { Scenes } from 'telegraf';

export type SerializedUser = SerializedModel<User & { role?: UserRole }>;
export type SerializedRate = SerializedModel<Rates>;
export type SerializedVendors = SerializedModel<Vendors>;
export type SerializedRequest = SerializedModel<PaymentRequests>;

export type SerializedModel<T> = Omit<T, 'createdAt' | 'updatedAt' | 'id'>;

// Extend session for wizard scenes
export interface CustomSession extends Scenes.WizardSessionData {
  messagesToDelete?: number[];
  customState?: string; // renamed from 'state' to avoid conflict
  requestType?: string; // card, iban, etc
}
export type CardRequestType = Omit<
  SerializedRequest,
  'payedByUserId' | 'completedAt' | 'error' | 'user' | 'userId' | 'ratesId'
> & {
  rateId: string;
  card: Omit<
    CardPaymentRequestsMethod,
    'id' | 'createdAt' | 'updatedAt' | 'requestId'
  >;
};
export type FullRequestType = PaymentRequests & {
  cardMethods?: CardPaymentRequestsMethod[];
  message?: Message[];
  vendor?: Vendors;
  currency?: Currency;
  rates?: Rates;
};

// Extend context for wizard scenes
export type CustomSceneContext = Scenes.WizardContext & {
  session: CustomSession;
};

export enum UserRole {
  ADMIN = '1',
  WORKER = '0',
  GEEST = '2',
}

export enum Currency {
  UAH = '0',
}

export enum PaymentMethod {
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
