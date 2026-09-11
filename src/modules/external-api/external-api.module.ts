import { Module } from '@nestjs/common';
import { ExternalApiService } from './external-api.service';
import { ExchangeCheckService } from './exchange-check.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [ExternalApiService, ExchangeCheckService],
  exports: [ExternalApiService, ExchangeCheckService],
})
export class ExternalApiModule {}
