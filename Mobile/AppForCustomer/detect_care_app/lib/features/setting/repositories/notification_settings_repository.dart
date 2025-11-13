import '../models/notification_setting.dart';
import '../data/notification_settings_remote_data_source.dart';

class NotificationSettingsRepository {
  final NotificationSettingsRemoteDataSource remote;

  NotificationSettingsRepository(this.remote);

  Future<List<NotificationSetting>> fetchSettings() {
    return remote.getNotificationSettings();
  }

  Future<void> toggleSetting(String key, bool enabled) {
    return remote.toggleNotification(key, enabled);
  }
}
