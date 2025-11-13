import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:detect_care_app/features/subscription/providers/subscriptions_provider.dart';
import 'package:detect_care_app/features/subscription/screens/subscription_screen.dart';
import 'package:detect_care_app/features/subscription/models/subscription_model.dart';

void main() {
  group('SubscriptionScreen', () {
    late SubscriptionsProvider mockProvider;

    setUp(() {
      mockProvider = SubscriptionsProvider();
    });

    testWidgets('displays loading indicator when loading', (
      WidgetTester tester,
    ) async {
      mockProvider.isLoading = true;

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<SubscriptionsProvider>.value(
            value: mockProvider,
            child: const SubscriptionScreen(),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('displays error message when there is an error', (
      WidgetTester tester,
    ) async {
      mockProvider.error = 'Test error';
      mockProvider.isLoading = false;

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<SubscriptionsProvider>.value(
            value: mockProvider,
            child: const SubscriptionScreen(),
          ),
        ),
      );

      expect(find.text('Lỗi: Test error'), findsOneWidget);
    });

    testWidgets('displays empty message when no subscriptions', (
      WidgetTester tester,
    ) async {
      mockProvider.isLoading = false;
      mockProvider.subscriptions = [];

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<SubscriptionsProvider>.value(
            value: mockProvider,
            child: const SubscriptionScreen(),
          ),
        ),
      );

      expect(find.text('Bạn chưa đăng ký gói dịch vụ nào.'), findsOneWidget);
    });

    testWidgets('displays subscription list when subscriptions exist', (
      WidgetTester tester,
    ) async {
      final subscription = SubscriptionModel(
        id: '1',
        accountId: 'account1',
        planCode: 'basic',
        planVersion: '1.0',
        status: 'active',
        currentPeriodStart: DateTime.now(),
        currentPeriodEnd: DateTime.now().add(const Duration(days: 30)),
        renewalMode: 'auto',
        invoicingMode: 'prepaid',
        country: 'VN',
        currency: 'VND',
        planName: 'Basic Plan',
      );

      mockProvider.isLoading = false;
      mockProvider.subscriptions = [subscription];

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<SubscriptionsProvider>.value(
            value: mockProvider,
            child: const SubscriptionScreen(),
          ),
        ),
      );

      // Wait for any async operations
      await tester.pumpAndSettle();

      expect(find.text('Basic Plan'), findsOneWidget);
      expect(find.text('Status: active'), findsOneWidget);
    });

    testWidgets('has three tabs', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<SubscriptionsProvider>.value(
            value: mockProvider,
            child: const SubscriptionScreen(),
          ),
        ),
      );

      expect(find.text('Gói dịch vụ'), findsOneWidget);
      expect(find.text('Lịch sử thanh toán'), findsOneWidget);
      expect(find.text('Thống kê sử dụng'), findsOneWidget);
    });
  });
}
