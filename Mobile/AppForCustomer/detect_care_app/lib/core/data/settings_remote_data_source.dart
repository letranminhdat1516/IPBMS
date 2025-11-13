import 'package:detect_care_app/core/models/settings.dart';
import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:flutter/foundation.dart';

class SettingsRemoteDataSource {
  final ApiProvider _api;

  SettingsRemoteDataSource({ApiProvider? api})
    : _api = api ?? ApiClient(tokenProvider: AuthStorage.getAccessToken);

  Future<ImageSettings> getImageSettings(String userId) async {
    // API docs/OpenAPI use a user-scoped endpoint without including the userId
    // in the path (authentication identifies the current user). Use
    // '/image-settings' to align with docs and OpenAPI skeleton.
    final res = await _api.get('/image-settings');
    if (res.statusCode != 200) {
      throw Exception(
        'Get image settings failed: ${res.statusCode} ${res.body}',
      );
    }

    final dynamic data = _api.extractDataFromResponse(res);
    if (data is Map<String, dynamic>) {
      return ImageSettings.fromJson(data);
    }

    debugPrint(
      '[SettingsRemoteDataSource.getImageSettings] unexpected data type: ${data.runtimeType}',
    );
    return const ImageSettings(
      monitoringMode: 'Giám sát nâng cao',
      duration: '30 minute',
      frameCount: '10 frame',
      imageQuality: 'Medium (1080p)',
      enableImageSaving: true,
      normalRetentionDays: 30,
      alertRetentionDays: 90,
    );
  }

  Future<ImageSettings> saveImageSettings(
    String userId,
    ImageSettings settings,
  ) async {
    final body = settings.toJson();
    // Keep the method signature but post to '/image-settings' per docs.
    final res = await _api.post('/image-settings', body: body);

    if (res.statusCode != 200 && res.statusCode != 201) {
      throw Exception(
        'Save image settings failed: ${res.statusCode} ${res.body}',
      );
    }

    final dynamic data = _api.extractDataFromResponse(res);
    if (data is Map<String, dynamic>) {
      return ImageSettings.fromJson(data);
    }

    debugPrint(
      '[SettingsRemoteDataSource.saveImageSettings] unexpected data type: ${data.runtimeType}',
    );
    return settings;
  }

  Future<AlertSettings> getAlertSettings(String userId) async {
    final res = await _api.get('/users/$userId/alert-settings');
    if (res.statusCode != 200) {
      throw Exception(
        'Get alert settings failed: ${res.statusCode} ${res.body}',
      );
    }

    final dynamic data = _api.extractDataFromResponse(res);
    if (data is Map<String, dynamic>) {
      return AlertSettings.fromJson(data);
    }

    // Handle case where API returns a List
    if (data is List<dynamic>) {
      if (data.isNotEmpty) {
        // Take first item if list has items
        final firstItem = data.first;
        if (firstItem is Map<String, dynamic>) {
          return AlertSettings.fromJson(firstItem);
        }
      } else {
        // Empty list means no settings exist, return defaults
        debugPrint(
          '[SettingsRemoteDataSource.getAlertSettings] No alert settings found, using defaults',
        );
        return const AlertSettings(
          masterNotifications: true,
          appNotifications: true,
          emailNotifications: false,
          smsNotifications: false,
          callNotifications: false,
          deviceAlerts: false,
        );
      }
    }

    debugPrint(
      '[SettingsRemoteDataSource.getAlertSettings] unexpected data type: ${data.runtimeType}, data: $data',
    );
    return const AlertSettings(
      masterNotifications: true,
      appNotifications: true,
      emailNotifications: false,
      smsNotifications: false,
      callNotifications: false,
      deviceAlerts: false,
    );
  }

  Future<AlertSettings> saveAlertSettings(
    String userId,
    AlertSettings settings,
  ) async {
    final body = settings.toJson();
    final res = await _api.post('/users/$userId/alert-settings', body: body);

    if (res.statusCode != 200 && res.statusCode != 201) {
      throw Exception(
        'Save alert settings failed: ${res.statusCode} ${res.body}',
      );
    }

    final dynamic data = _api.extractDataFromResponse(res);
    if (data is Map<String, dynamic>) {
      return AlertSettings.fromJson(data);
    }

    // Handle case where API returns a List
    if (data is List<dynamic>) {
      if (data.isNotEmpty) {
        // Take first item if list has items
        final firstItem = data.first;
        if (firstItem is Map<String, dynamic>) {
          return AlertSettings.fromJson(firstItem);
        }
      }
      // For empty list or invalid items, return the settings we just saved
      debugPrint(
        '[SettingsRemoteDataSource.saveAlertSettings] API returned list, using saved settings',
      );
      return settings;
    }

    debugPrint(
      '[SettingsRemoteDataSource.saveAlertSettings] unexpected data type: ${data.runtimeType}, data: $data',
    );
    return settings;
  }

  Future<void> syncSettingsToCamera(String userId) async {
    final res = await _api.post('/users/$userId/camera/sync-settings');

    if (res.statusCode != 200) {
      throw Exception(
        'Sync settings to camera failed: ${res.statusCode} ${res.body}',
      );
    }

    debugPrint(
      '[SettingsRemoteDataSource] Settings synced to camera successfully',
    );
  }
}
