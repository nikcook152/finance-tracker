// backend/src/analytics/analytics.module.ts

import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { PrismaModule } from 'src/prisma/prisma.module'; // 1. Import this

@Module({
  imports: [PrismaModule], // 2. Add this line
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}