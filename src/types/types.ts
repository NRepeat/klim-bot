import { User } from "generated/prisma";

export interface SerilizedUser extends Omit<User, 'createdAt' | 'updatedAt' | 'id'> {

}
export enum UserRole {
  ADMIN = '1', WORKER = '0'
}
