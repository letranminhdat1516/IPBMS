import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class SubscriptionPaymentListener {
  private readonly logger = new Logger(SubscriptionPaymentListener.name);

  constructor(private readonly subscriptionService: SubscriptionService) {}

  @OnEvent('payment.success')
  async handlePaymentSuccess(paymentId: string) {
    this.logger.debug(`[SubscriptionPaymentListener] Handling payment success ${paymentId}`);
    await this.subscriptionService.handlePaymentSuccess(paymentId);
  }
}
