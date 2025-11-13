import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:detect_care_app/core/network/api_client.dart';
import '../models/notification_setting.dart';

class NotificationSettingsRemoteDataSource {
  final ApiClient _client;
  NotificationSettingsRemoteDataSource(this._client);

  /// GET /api/settings/notification
  Future<List<NotificationSetting>> getNotificationSettings() async {
    final res = await _client.get('/settings/notification');
    if (res.statusCode >= 200 && res.statusCode < 300) {
      final data = _client.extractDataFromResponse(res);
      if (data is List) {
        return data.map((e) => NotificationSetting.fromJson(e)).toList();
      } else {
        throw Exception('Invalid data format from server');
      }
    } else {
      throw Exception('Failed to fetch settings: ${res.statusCode}');
    }
  }

  /// PUT /api/settings/notification/{key}/toggle
  Future<void> toggleNotification(String key, bool enabled) async {
    final res = await _client.put(
      '/settings/notification/$key/toggle',
      body: {'enabled': enabled},
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Failed to update setting: ${res.statusCode}');
    }
  }
}
