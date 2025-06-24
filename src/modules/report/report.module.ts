import { Module } from '@nestjs/common';
import ReportService from './report.service';

@Module({
  providers: [ReportService],
  imports: [],
  exports: [ReportService],
})
export class ReportModule {}
