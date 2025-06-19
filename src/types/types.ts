import { Rates, User, Vendors } from 'generated/prisma';
import { SceneContext } from 'telegraf/typings/scenes';

export type SerializedUser = SerializedModel<User & { role?: UserRole }>;
export type SerializedRate = SerializedModel<Rates>;
export type SerializedVendors = SerializedModel<Vendors>;

export type SerializedModel<T> = Omit<T, 'createdAt' | 'updatedAt' | 'id'>;
interface CustomSession {
  messagesToDelete?: number[];
  state: 'updated' | 'cancelled' | 'done';
}

export type CustomSceneContext = SceneContext & { session: CustomSession };

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
