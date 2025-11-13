import 'package:flutter/material.dart';

class SubscriptionMenuAction {
  static const String view = 'view';
  static const String change = 'change';
  static const String upgrade = 'upgrade';
  static const String pause = 'pause';
  static const String resume = 'resume';
  static const String cancel = 'cancel';
}

class SubscriptionMenuLabels {
  static const Map<String, String> labels = {
    SubscriptionMenuAction.view: 'Xem chi tiết',
    SubscriptionMenuAction.change: 'Thay đổi gói',
    SubscriptionMenuAction.upgrade: 'Nâng cấp',
    SubscriptionMenuAction.pause: 'Tạm dừng',
    SubscriptionMenuAction.resume: 'Tiếp tục',
    SubscriptionMenuAction.cancel: 'Hủy gói',
  };

  static String label(String key) => labels[key] ?? key;
}

List<PopupMenuEntry<String>> buildSubscriptionMenuItems({
  required String status,
}) {
  final s = status.toLowerCase();
  final items = <PopupMenuEntry<String>>[];

  // Always available
  items.add(
    PopupMenuItem(
      value: SubscriptionMenuAction.view,
      child: Text(SubscriptionMenuLabels.label(SubscriptionMenuAction.view)),
    ),
  );
  items.add(
    PopupMenuItem(
      value: SubscriptionMenuAction.change,
      child: Text(SubscriptionMenuLabels.label(SubscriptionMenuAction.change)),
    ),
  );

  final isActive = s == 'active';
  final isPaused = s == 'paused' || s == 'pause';

  items.add(
    PopupMenuItem(
      value: SubscriptionMenuAction.upgrade,
      enabled: isActive,
      child: Text(SubscriptionMenuLabels.label(SubscriptionMenuAction.upgrade)),
    ),
  );

  items.add(
    PopupMenuItem(
      value: SubscriptionMenuAction.pause,
      enabled: isActive,
      child: Text(SubscriptionMenuLabels.label(SubscriptionMenuAction.pause)),
    ),
  );

  items.add(
    PopupMenuItem(
      value: SubscriptionMenuAction.resume,
      enabled: isPaused,
      child: Text(SubscriptionMenuLabels.label(SubscriptionMenuAction.resume)),
    ),
  );

  items.add(
    PopupMenuItem(
      value: SubscriptionMenuAction.cancel,
      enabled: isActive || isPaused,
      child: Text(SubscriptionMenuLabels.label(SubscriptionMenuAction.cancel)),
    ),
  );

  return items;
}
