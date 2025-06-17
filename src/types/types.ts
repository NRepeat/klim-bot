import { Rates, User } from 'generated/prisma';
import { Scenes } from 'telegraf';
import { SceneContext } from 'telegraf/typings/scenes';

export type SerializedUser = SerializedModel<User>;
export type SerializedRate = SerializedModel<Rates>;

export type SerializedModel<T> = Omit<T, 'createdAt' | 'updatedAt' | 'id'>;
interface CustomSession {
  messagesToDelete?: number[];
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
  findById(id: string): Promise<T | null>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  getAll?(): Promise<T[]>;
  deleteAll?(): Promise<boolean>;
}

export interface ParsedMessageRates {
  header: string;
  lines: string[];
}
