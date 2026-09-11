import { Module } from '@nestjs/common';
import ReportService from './report.service';
import { DailySummaryService } from './daily-summary.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  providers: [ReportService, DailySummaryService],
  imports: [PrismaModule],
  exports: [ReportService, DailySummaryService],
})
export class ReportModule {}
