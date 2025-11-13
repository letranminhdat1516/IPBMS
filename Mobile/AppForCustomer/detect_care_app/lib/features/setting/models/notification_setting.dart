class NotificationSetting {
  final String? id;
  final String userId;
  final String category;
  final String settingKey;
  final String? settingValue;
  final bool isEnabled;
  final bool isOverridden;
  final String? overriddenAt;
  final String? updatedBy;
  final String? updatedAt;
  final String source;

  NotificationSetting({
    this.id,
    required this.userId,
    required this.category,
    required this.settingKey,
    this.settingValue,
    required this.isEnabled,
    required this.isOverridden,
    this.overriddenAt,
    this.updatedBy,
    this.updatedAt,
    required this.source,
  });

  factory NotificationSetting.fromJson(Map<String, dynamic> json) {
    return NotificationSetting(
      id: json['id']?.toString(),
      userId: json['user_id']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      settingKey: json['setting_key']?.toString() ?? '',
      settingValue: json['setting_value']?.toString(),
      isEnabled: json['is_enabled'] == true,
      isOverridden: json['is_overridden'] == true,
      overriddenAt: json['overridden_at']?.toString(),
      updatedBy: json['updated_by']?.toString(),
      updatedAt: json['updated_at']?.toString(),
      source: json['source']?.toString() ?? '',
    );
  }
}
