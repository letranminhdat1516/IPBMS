import '../models/notification_setting.dart';
import '../repositories/notification_settings_repository.dart';

class NotificationSettingsService {
  final NotificationSettingsRepository repo;

  NotificationSettingsService(this.repo);

  Future<List<NotificationSetting>> getAllSettings() async {
    return await repo.fetchSettings();
  }

  Future<void> toggleSetting(String key, bool enabled) async {
    await repo.toggleSetting(key, enabled);
  }
}
