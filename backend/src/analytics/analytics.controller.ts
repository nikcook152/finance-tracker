// backend/src/analytics/analytics.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import type { User } from '@prisma/client';
import { AnalyticsService } from './analytics.service';

@UseGuards(AuthGuard('jwt'))
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get()
  getAnalytics(@GetUser() user: User) {
    return this.analyticsService.getMonthlyAnalytics(user);
  }

  @Get('historical')
  getHistoricalAnalytics(@GetUser() user: User) {
    return this.analyticsService.getHistoricalAnalytics(user);
  }

  @Get('monthly-summary')
  getMonthlySummary(@GetUser() user: User) {
    return this.analyticsService.getMonthlySummary(user);
  }
}