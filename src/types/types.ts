import { User } from 'generated/prisma';

export type SerializedUser = Omit<User, 'createdAt' | 'updatedAt' | 'id'>;
export enum UserRole {
  ADMIN = '1',
  WORKER = '0',
}
