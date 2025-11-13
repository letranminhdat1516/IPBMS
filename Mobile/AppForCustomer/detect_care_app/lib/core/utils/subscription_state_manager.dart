/// State machine manager for subscription lifecycle
/// Enforces valid state transitions and actions per status according to business rules
class SubscriptionStateManager {
  /// Valid status transitions map
  static const Map<String, List<String>> _validTransitions = {
    'trialing': ['active', 'canceled', 'past_due'],
    'active': ['past_due', 'canceled', 'suspended'],
    'past_due': ['active', 'canceled', 'suspended'],
    'canceled': ['active'], // Reactivation possible
    'suspended': ['active', 'canceled'],
    'incomplete': ['active', 'canceled'],
    'incomplete_expired': [], // Terminal state
  };

  /// Actions allowed per status
  static const Map<String, List<String>> _allowedActions = {
    'trialing': ['upgrade', 'downgrade', 'cancel', 'apply_coupon'],
    'active': ['upgrade', 'downgrade', 'cancel', 'apply_coupon'],
    'past_due': ['upgrade', 'cancel'], // Limited actions when past due
    'canceled': ['reactivate'], // Only reactivation allowed
    'suspended': ['reactivate'], // Only reactivation allowed
    'incomplete': ['retry_payment', 'cancel'],
    'incomplete_expired': [], // No actions allowed
  };

  /// Check if a status transition is valid
  static bool isValidTransition(String fromStatus, String toStatus) {
    final allowedTransitions = _validTransitions[fromStatus];
    return allowedTransitions?.contains(toStatus) ?? false;
  }

  /// Check if an action is allowed for the current status
  static bool isActionAllowed(String status, String action) {
    final allowedActions = _allowedActions[status];
    return allowedActions?.contains(action) ?? false;
  }

  /// Get all valid transitions from current status
  static List<String> getValidTransitions(String status) {
    return _validTransitions[status] ?? [];
  }

  /// Get all allowed actions for current status
  static List<String> getAllowedActions(String status) {
    return _allowedActions[status] ?? [];
  }

  /// Validate and perform status transition
  static String? validateTransition(String fromStatus, String toStatus) {
    if (!isValidTransition(fromStatus, toStatus)) {
      return 'Invalid transition from $fromStatus to $toStatus';
    }
    return null; // Valid transition
  }

  /// Validate action for current status
  static String? validateAction(String status, String action) {
    if (!isActionAllowed(status, action)) {
      return 'Action "$action" not allowed for status "$status"';
    }
    return null; // Valid action
  }

  /// Check if subscription can be upgraded
  static bool canUpgrade(String status) {
    return isActionAllowed(status, 'upgrade');
  }

  /// Check if subscription can be downgraded
  static bool canDowngrade(String status) {
    return isActionAllowed(status, 'downgrade');
  }

  /// Check if subscription can be canceled
  static bool canCancel(String status) {
    return isActionAllowed(status, 'cancel');
  }

  /// Check if coupon can be applied
  static bool canApplyCoupon(String status) {
    return isActionAllowed(status, 'apply_coupon');
  }

  /// Check if subscription can be reactivated
  static bool canReactivate(String status) {
    return isActionAllowed(status, 'reactivate');
  }

  /// Check if subscription is in active state (can use features)
  static bool isActive(String status) {
    return status == 'active' || status == 'trialing';
  }

  /// Check if subscription is in terminal state (cannot be changed)
  static bool isTerminal(String status) {
    return status == 'incomplete_expired';
  }

  /// Check if subscription requires payment attention
  static bool requiresPaymentAttention(String status) {
    return status == 'past_due' || status == 'incomplete';
  }

  /// Get status display information
  static StatusDisplayInfo getStatusDisplayInfo(String status) {
    switch (status) {
      case 'trialing':
        return const StatusDisplayInfo(
          displayName: 'Trial',
          color: StatusColor.blue,
          description: 'Free trial period',
          canUseFeatures: true,
        );
      case 'active':
        return const StatusDisplayInfo(
          displayName: 'Active',
          color: StatusColor.green,
          description: 'Subscription is active',
          canUseFeatures: true,
        );
      case 'past_due':
        return const StatusDisplayInfo(
          displayName: 'Past Due',
          color: StatusColor.orange,
          description: 'Payment overdue',
          canUseFeatures: true, // Grace period
        );
      case 'canceled':
        return const StatusDisplayInfo(
          displayName: 'Canceled',
          color: StatusColor.red,
          description: 'Subscription canceled',
          canUseFeatures: false,
        );
      case 'suspended':
        return const StatusDisplayInfo(
          displayName: 'Suspended',
          color: StatusColor.red,
          description: 'Subscription suspended',
          canUseFeatures: false,
        );
      case 'incomplete':
        return const StatusDisplayInfo(
          displayName: 'Incomplete',
          color: StatusColor.yellow,
          description: 'Payment incomplete',
          canUseFeatures: false,
        );
      case 'incomplete_expired':
        return const StatusDisplayInfo(
          displayName: 'Expired',
          color: StatusColor.red,
          description: 'Payment expired',
          canUseFeatures: false,
        );
      default:
        return const StatusDisplayInfo(
          displayName: 'Unknown',
          color: StatusColor.gray,
          description: 'Unknown status',
          canUseFeatures: false,
        );
    }
  }
}

/// Display information for subscription status
class StatusDisplayInfo {
  final String displayName;
  final StatusColor color;
  final String description;
  final bool canUseFeatures;

  const StatusDisplayInfo({
    required this.displayName,
    required this.color,
    required this.description,
    required this.canUseFeatures,
  });
}

/// Status color enum for UI display
enum StatusColor { green, blue, orange, red, yellow, gray }
