// src/application/services/license-quota.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

type Limits = {
  maxCameras: number;
  retentionDays: number;
  maxMonthlyEvents: number;
  caregiverSeats: number;
};

@Injectable()
export class LicenseQuotaService {
  constructor(private readonly prismaService: PrismaService) {}

  async getLimitsBySite(siteId: string): Promise<Limits> {
    // Get active subscription for the user
    const activeSubscription = await this.prismaService.subscriptions.findFirst({
      where: {
        user_id: siteId,
        status: 'active',
        OR: [{ current_period_end: null }, { current_period_end: { gt: new Date() } }],
      },
      include: {
        plans: true,
      },
    });

    if (!activeSubscription) {
      throw new BadRequestException('No active subscription found for this user');
    }

    if (!activeSubscription.plans) {
      throw new BadRequestException('Subscription plan not found');
    }

    // Calculate total limits: base plan limits + extra subscription limits
    const baseLimits = activeSubscription.plans;
    const extraLimits = activeSubscription;

    const limits: Limits = {
      maxCameras: baseLimits.camera_quota + extraLimits.extra_camera_quota,
      retentionDays: baseLimits.retention_days,
      maxMonthlyEvents: 1000, // Default monthly events limit - could be added to plans table later
      caregiverSeats: baseLimits.caregiver_seats + extraLimits.extra_caregiver_seats,
    };

    return limits;
  }

  async countCameras(siteId: string): Promise<number> {
    const count = await this.prismaService.cameras.count({
      where: { user_id: siteId },
    });
    return count;
  }

  async countEvents30d(siteId: string): Promise<number> {
    // Using events instead of ai_events as it doesn't exist in schema
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const count = await this.prismaService.events.count({
      where: {
        cameras: {
          user_id: siteId,
        },
        detected_at: {
          gte: thirtyDaysAgo,
        },
      },
    });
    return count;
  }

  async countCaregivers(siteId: string): Promise<number> {
    const count = await this.prismaService.caregiver_invitations.count({
      where: { customer_id: siteId },
    });
    return count;
  }

  async validateCameraQuota(
    siteId: string,
  ): Promise<{ isValid: boolean; current: number; limit: number }> {
    const limits = await this.getLimitsBySite(siteId);
    const current = await this.countCameras(siteId);

    return {
      isValid: current < limits.maxCameras,
      current,
      limit: limits.maxCameras,
    };
  }

  async validateCaregiverQuota(
    siteId: string,
  ): Promise<{ isValid: boolean; current: number; limit: number }> {
    const limits = await this.getLimitsBySite(siteId);
    const current = await this.countCaregivers(siteId);

    return {
      isValid: current < limits.caregiverSeats,
      current,
      limit: limits.caregiverSeats,
    };
  }

  async validateEventQuota(
    siteId: string,
  ): Promise<{ isValid: boolean; current: number; limit: number }> {
    const limits = await this.getLimitsBySite(siteId);
    const current = await this.countEvents30d(siteId);

    return {
      isValid: current < limits.maxMonthlyEvents,
      current,
      limit: limits.maxMonthlyEvents,
    };
  }

  async getQuotaUsage(siteId: string): Promise<{
    cameras: { current: number; limit: number; percentage: number };
    caregivers: { current: number; limit: number; percentage: number };
    events: { current: number; limit: number; percentage: number };
  }> {
    const limits = await this.getLimitsBySite(siteId);

    const [cameraCount, caregiverCount, eventCount] = await Promise.all([
      this.countCameras(siteId),
      this.countCaregivers(siteId),
      this.countEvents30d(siteId),
    ]);

    return {
      cameras: {
        current: cameraCount,
        limit: limits.maxCameras,
        percentage: Math.round((cameraCount / limits.maxCameras) * 100),
      },
      caregivers: {
        current: caregiverCount,
        limit: limits.caregiverSeats,
        percentage: Math.round((caregiverCount / limits.caregiverSeats) * 100),
      },
      events: {
        current: eventCount,
        limit: limits.maxMonthlyEvents,
        percentage: Math.round((eventCount / limits.maxMonthlyEvents) * 100),
      },
    };
  }
}
