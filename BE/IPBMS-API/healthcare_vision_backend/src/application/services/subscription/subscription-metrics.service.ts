import { Injectable } from '@nestjs/common';

export interface SubscriptionMetricSnapshot {
  expiredProcessed: number;
  expiredFollowups: number;
}

@Injectable()
export class SubscriptionMetricsService {
  private expiredProcessed = 0;
  private expiredFollowups = 0;

  incrementExpiredProcessed(count = 1) {
    this.expiredProcessed += count;
  }

  incrementExpiredFollowups(count = 1) {
    this.expiredFollowups += count;
  }

  snapshot(): SubscriptionMetricSnapshot {
    return {
      expiredProcessed: this.expiredProcessed,
      expiredFollowups: this.expiredFollowups,
    };
  }

  reset() {
    this.expiredProcessed = 0;
    this.expiredFollowups = 0;
  }
}
