/**
 * Payment Events - Event-driven architecture for payment processing
 */

export enum PaymentEventType {
  PAYMENT_SUCCESS = 'payment.success',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_RETRY_SUCCESS = 'payment.retry.success',
  PAYMENT_RETRY_FAILED = 'payment.retry.failed',
}

export interface PaymentSuccessEvent {
  type: PaymentEventType.PAYMENT_SUCCESS;
  paymentId: string;
  userId: string;
  planCode: string;
  amount: bigint;
  transactionId?: string;
  timestamp: Date;
}

export interface PaymentFailedEvent {
  type: PaymentEventType.PAYMENT_FAILED;
  paymentId: string;
  userId: string;
  planCode: string;
  amount: bigint;
  error: string;
  timestamp: Date;
}

export interface PaymentRetryEvent {
  type: PaymentEventType.PAYMENT_RETRY_SUCCESS | PaymentEventType.PAYMENT_RETRY_FAILED;
  paymentId: string;
  userId: string;
  retryCount: number;
  timestamp: Date;
}

export type PaymentEvent = PaymentSuccessEvent | PaymentFailedEvent | PaymentRetryEvent;
