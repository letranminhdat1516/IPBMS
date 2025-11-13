import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionService } from '../../application/services/subscription';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.userId) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if endpoint requires license validation
    const requireLicense = this.reflector.get<boolean>('requireLicense', context.getHandler());
    if (!requireLicense) {
      return true; // Skip license check
    }

    // Get user's active subscription
    const subscription = await this.subscriptionService.getActive(user.userId);
    if (!subscription) {
      throw new ForbiddenException('No active subscription found. Please subscribe to a plan.');
    }

    // Check subscription status
    if (subscription.status !== 'active') {
      throw new ForbiddenException(
        `Subscription is ${subscription.status}. Please renew your subscription.`,
      );
    }

    // Check if subscription has expired
    if (subscription.current_period_end && new Date() > new Date(subscription.current_period_end)) {
      throw new ForbiddenException('Subscription has expired. Please renew your subscription.');
    }

    // Get license requirements from metadata
    const cameraRequired = this.reflector.get<number>('cameraRequired', context.getHandler()) || 0;
    const siteRequired = this.reflector.get<number>('siteRequired', context.getHandler()) || 0;

    // Validate quotas
    if (cameraRequired > 0) {
      const totalCameraQuota =
        (subscription.plans?.camera_quota || 0) + (subscription.extra_camera_quota || 0);
      if (cameraRequired > totalCameraQuota) {
        throw new ForbiddenException(
          `Camera quota exceeded. Your plan allows ${totalCameraQuota} cameras, but ${cameraRequired} are required.`,
        );
      }
    }

    if (siteRequired > 0) {
      const totalSiteQuota = (subscription.plans?.sites || 0) + (subscription.extra_sites || 0);
      if (siteRequired > totalSiteQuota) {
        throw new ForbiddenException(
          `Site quota exceeded. Your plan allows ${totalSiteQuota} sites, but ${siteRequired} are required.`,
        );
      }
    }

    // Attach subscription info to request for later use
    request.subscription = subscription;
    request.plan = subscription.plans;

    return true;
  }
}
