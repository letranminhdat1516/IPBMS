import 'package:flutter_test/flutter_test.dart';
import 'package:detect_care_app/features/subscription/utils/proration_calculator.dart';

void main() {
  group('ProrationCalculator', () {
    test('calculateProration - upgrade scenario', () {
      final periodStart = DateTime(2025, 9, 1);
      final periodEnd = DateTime(2025, 10, 1);
      final currentTime = DateTime(2025, 9, 15); // Halfway through period

      final proration = ProrationCalculator.calculateProration(
        oldPrice: 100.0,
        newPrice: 200.0,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        changeEffectiveAt: currentTime,
      );

      // Sept 1-30 (30 days), Sept 15-30 (16 days remaining)
      // Expected: (200 - 100) * (16/30) ≈ 53.33
      expect(proration['proration_charge'], closeTo(53.33, 0.01));
      expect(proration['proration_credit'], equals(0.0));
      expect(proration['is_upgrade'], isTrue);
      expect(proration['is_downgrade'], isFalse);
    });

    test('calculateProration - downgrade scenario', () {
      final periodStart = DateTime(2025, 9, 1);
      final periodEnd = DateTime(2025, 10, 1);
      final currentTime = DateTime(2025, 9, 15); // Halfway through period

      final proration = ProrationCalculator.calculateProration(
        oldPrice: 200.0,
        newPrice: 100.0,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        changeEffectiveAt: currentTime,
      );

      // Sept 1-30 (30 days), Sept 15-30 (16 days remaining)
      // Expected: (100 - 200) * (16/30) ≈ -53.33 -> credit = 53.33
      expect(proration['proration_charge'], equals(0.0));
      expect(proration['proration_credit'], closeTo(53.33, 0.01));
      expect(proration['is_upgrade'], isFalse);
      expect(proration['is_downgrade'], isTrue);
    });

    test('throws error for invalid period', () {
      final periodStart = DateTime(2025, 9, 1);
      final periodEnd = DateTime(2025, 8, 1); // End before start
      final currentTime = DateTime(2025, 9, 15);

      expect(
        () => ProrationCalculator.calculateProration(
          oldPrice: 100.0,
          newPrice: 200.0,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          changeEffectiveAt: currentTime,
        ),
        throwsArgumentError,
      );
    });
  });
}
