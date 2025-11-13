/// Utility class for calculating subscription proration amounts
/// Implements the business rule: max(0, P_new - P_old) * (t_left / t_total)
class ProrationCalculator {
  /// Calculate proration amount for plan changes
  ///
  /// [oldPrice] - Current plan price per period
  /// [newPrice] - Target plan price per period
  /// [periodStart] - Start of current billing period
  /// [periodEnd] - End of current billing period
  /// [currentTime] - Current timestamp (defaults to now)
  ///
  /// Returns the proration amount (positive for upgrade, negative for downgrade)
  static double calculateProration({
    required double oldPrice,
    required double newPrice,
    required DateTime periodStart,
    required DateTime periodEnd,
    DateTime? currentTime,
  }) {
    final now = currentTime ?? DateTime.now();

    // Ensure current time is within the period
    if (now.isBefore(periodStart) || now.isAfter(periodEnd)) {
      throw ArgumentError('Current time must be within the billing period');
    }

    // Calculate time remaining in period
    final totalPeriodMs = periodEnd.difference(periodStart).inMilliseconds;
    final remainingMs = periodEnd.difference(now).inMilliseconds;

    if (totalPeriodMs <= 0) {
      throw ArgumentError('Invalid billing period');
    }

    final timeRatio = remainingMs / totalPeriodMs;

    // Business rule: max(0, P_new - P_old) * (t_left / t_total)
    final priceDifference = newPrice - oldPrice;
    final prorationAmount = priceDifference * timeRatio;

    return prorationAmount;
  }

  /// Calculate upgrade proration (always positive or zero)
  static double calculateUpgradeProration({
    required double oldPrice,
    required double newPrice,
    required DateTime periodStart,
    required DateTime periodEnd,
    DateTime? currentTime,
  }) {
    final proration = calculateProration(
      oldPrice: oldPrice,
      newPrice: newPrice,
      periodStart: periodStart,
      periodEnd: periodEnd,
      currentTime: currentTime,
    );

    // For upgrades, we only charge the positive difference
    return proration > 0 ? proration : 0.0;
  }

  /// Calculate downgrade credit (always negative or zero)
  static double calculateDowngradeCredit({
    required double oldPrice,
    required double newPrice,
    required DateTime periodStart,
    required DateTime periodEnd,
    DateTime? currentTime,
  }) {
    final proration = calculateProration(
      oldPrice: oldPrice,
      newPrice: newPrice,
      periodStart: periodStart,
      periodEnd: periodEnd,
      currentTime: currentTime,
    );

    // For downgrades, we credit the negative difference
    return proration < 0 ? proration : 0.0;
  }

  /// Get proration breakdown for display
  static ProrationBreakdown getProrationBreakdown({
    required double oldPrice,
    required double newPrice,
    required DateTime periodStart,
    required DateTime periodEnd,
    DateTime? currentTime,
  }) {
    final now = currentTime ?? DateTime.now();
    final totalPeriodMs = periodEnd.difference(periodStart).inMilliseconds;
    final remainingMs = periodEnd.difference(now).inMilliseconds;
    final timeRatio = remainingMs / totalPeriodMs;

    final priceDifference = newPrice - oldPrice;
    final prorationAmount = priceDifference * timeRatio;

    return ProrationBreakdown(
      oldPrice: oldPrice,
      newPrice: newPrice,
      priceDifference: priceDifference,
      timeRatio: timeRatio,
      prorationAmount: prorationAmount,
      periodStart: periodStart,
      periodEnd: periodEnd,
      calculatedAt: now,
    );
  }
}

/// Data class for proration calculation breakdown
class ProrationBreakdown {
  final double oldPrice;
  final double newPrice;
  final double priceDifference;
  final double timeRatio;
  final double prorationAmount;
  final DateTime periodStart;
  final DateTime periodEnd;
  final DateTime calculatedAt;

  const ProrationBreakdown({
    required this.oldPrice,
    required this.newPrice,
    required this.priceDifference,
    required this.timeRatio,
    required this.prorationAmount,
    required this.periodStart,
    required this.periodEnd,
    required this.calculatedAt,
  });

  /// Get the absolute proration amount for billing
  double get billableAmount => prorationAmount > 0 ? prorationAmount : 0.0;

  /// Get the credit amount for downgrades
  double get creditAmount => prorationAmount < 0 ? prorationAmount.abs() : 0.0;

  /// Check if this is an upgrade
  bool get isUpgrade => newPrice > oldPrice;

  /// Check if this is a downgrade
  bool get isDowngrade => newPrice < oldPrice;

  /// Check if prices are the same
  bool get isSamePrice => newPrice == oldPrice;

  @override
  String toString() {
    return 'ProrationBreakdown('
        'oldPrice: $oldPrice, '
        'newPrice: $newPrice, '
        'priceDifference: $priceDifference, '
        'timeRatio: ${timeRatio.toStringAsFixed(4)}, '
        'prorationAmount: $prorationAmount, '
        'periodStart: $periodStart, '
        'periodEnd: $periodEnd, '
        'calculatedAt: $calculatedAt'
        ')';
  }
}
