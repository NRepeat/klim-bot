import { Module } from '@nestjs/common';
import UserRepository from './user.repo';

@Module({
  imports: [],
  controllers: [],
  providers: [UserRepository],
})
export class UserModule {}
