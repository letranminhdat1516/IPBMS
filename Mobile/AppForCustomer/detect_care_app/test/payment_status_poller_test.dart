import 'package:flutter_test/flutter_test.dart';
import 'package:detect_care_app/features/subscription/data/payment_status_poller.dart';

void main() {
  group('PaymentStatusPoller', () {
    test('pollStatus completes immediately when condition is met', () async {
      int callCount = 0;
      final result = await PaymentStatusPoller.pollStatus(
        statusChecker: () async {
          callCount++;
          return {'status': 'completed', 'data': 'success'};
        },
        isComplete: (data) => data['status'] == 'completed',
        maxAttempts: 10,
        initialDelay: 0, // No delay for test
      );

      expect(callCount, 1);
      expect(result['status'], 'completed');
      expect(result['data'], 'success');
    });

    test('pollStatus retries until condition is met', () async {
      int callCount = 0;
      final result = await PaymentStatusPoller.pollStatus(
        statusChecker: () async {
          callCount++;
          if (callCount < 3) {
            return {'status': 'pending'};
          }
          return {'status': 'completed', 'data': 'success'};
        },
        isComplete: (data) => data['status'] == 'completed',
        maxAttempts: 10,
        initialDelay: 0, // No delay for test
      );

      expect(callCount, 3);
      expect(result['status'], 'completed');
    });

    test('pollStatus fails after max attempts', () async {
      int callCount = 0;
      await expectLater(
        PaymentStatusPoller.pollStatus(
          statusChecker: () async {
            callCount++;
            return {'status': 'pending'};
          },
          isComplete: (data) => data['status'] == 'completed',
          maxAttempts: 3,
          initialDelay: 0,
        ),
        throwsException,
      );
      // Verify it was called exactly maxAttempts times
      expect(callCount, 3);
    });

    test('isVNPayPaymentComplete returns true for success status', () {
      expect(
        PaymentStatusPoller.isVNPayPaymentComplete({
          'vnp_TransactionStatus': '00',
        }),
        true,
      );
      expect(
        PaymentStatusPoller.isVNPayPaymentComplete({'status': '00'}),
        true,
      );
      expect(
        PaymentStatusPoller.isVNPayPaymentComplete({'transactionStatus': '00'}),
        true,
      );
    });

    test('isVNPayPaymentComplete returns true for failure status', () {
      expect(
        PaymentStatusPoller.isVNPayPaymentComplete({
          'vnp_TransactionStatus': '02',
        }),
        true,
      );
      expect(
        PaymentStatusPoller.isVNPayPaymentComplete({'status': '02'}),
        true,
      );
    });

    test('isVNPayPaymentComplete returns false for pending status', () {
      expect(
        PaymentStatusPoller.isVNPayPaymentComplete({
          'vnp_TransactionStatus': '01',
        }),
        false,
      );
      expect(
        PaymentStatusPoller.isVNPayPaymentComplete({'status': 'pending'}),
        false,
      );
    });

    test('isOpenApiPaymentComplete returns true for completed status', () {
      expect(
        PaymentStatusPoller.isOpenApiPaymentComplete({'status': 'completed'}),
        true,
      );
      expect(
        PaymentStatusPoller.isOpenApiPaymentComplete({'status': 'succeeded'}),
        true,
      );
      expect(
        PaymentStatusPoller.isOpenApiPaymentComplete({'status': 'COMPLETED'}),
        true,
      );
    });

    test('isOpenApiPaymentComplete returns true for failed status', () {
      expect(
        PaymentStatusPoller.isOpenApiPaymentComplete({'status': 'failed'}),
        true,
      );
      expect(
        PaymentStatusPoller.isOpenApiPaymentComplete({'status': 'cancelled'}),
        true,
      );
      expect(
        PaymentStatusPoller.isOpenApiPaymentComplete({'status': 'expired'}),
        true,
      );
    });

    test('isOpenApiPaymentComplete returns false for pending status', () {
      expect(
        PaymentStatusPoller.isOpenApiPaymentComplete({'status': 'pending'}),
        false,
      );
      expect(
        PaymentStatusPoller.isOpenApiPaymentComplete({'status': 'processing'}),
        false,
      );
    });
  });
}
