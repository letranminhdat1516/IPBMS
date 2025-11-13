import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:flutter/foundation.dart';

class ImageSettingsException implements Exception {
  final String message;
  final int? statusCode;
  final String? body;

  ImageSettingsException(this.message, {this.statusCode, this.body});

  @override
  String toString() {
    if (statusCode != null) {
      return 'ImageSettingsException: $message (Status: $statusCode)';
    }
    return 'ImageSettingsException: $message';
  }
}

class ImageSetting {
  final String id;
  final String key;
  final String? value;
  final bool isEnabled;

  ImageSetting({
    required this.id,
    required this.key,
    required this.value,
    required this.isEnabled,
  });

  factory ImageSetting.fromJson(Map<String, dynamic> json) {
    return ImageSetting(
      id: json['id'] ?? '',
      key: json['setting_key'] ?? '',
      value: json['setting_value']?.toString(),
      isEnabled: json['is_enabled'] ?? false,
    );
  }
}

class ImageSettingsRemoteDataSource {
  final ApiProvider _api;

  ImageSettingsRemoteDataSource({ApiProvider? api})
    : _api = api ?? ApiClient(tokenProvider: AuthStorage.getAccessToken);

  Future<List<ImageSetting>> fetchImageSettings() async {
    try {
      print('🔄 [ImageSettings] GET /settings/image');

      final res = await _api.get('/settings/image');

      print('📡 Status: ${res.statusCode}');
      print('📡 Body: ${res.body}');

      if (res.statusCode != 200) {
        throw ImageSettingsException(
          'Failed to load settings',
          statusCode: res.statusCode,
          body: res.body,
        );
      }

      final decoded = _api.extractDataFromResponse(res);

      if (decoded == null) {
        throw ImageSettingsException(
          'Invalid response format: empty body',
          statusCode: res.statusCode,
          body: res.body,
        );
      }

      List<dynamic>? dataList;
      if (decoded is List) {
        dataList = decoded;
      } else if (decoded is Map) {
        final dynamic maybeData = decoded['data'];
        if (maybeData is List) {
          dataList = maybeData;
        }
      }

      if (dataList == null) {
        throw ImageSettingsException(
          'Invalid response format: expected List data',
          statusCode: res.statusCode,
          body: res.body,
        );
      }

      return dataList.map<ImageSetting>((e) {
        if (e is Map<String, dynamic>) {
          return ImageSetting.fromJson(e);
        }
        if (e is Map) {
          return ImageSetting.fromJson(Map<String, dynamic>.from(e));
        }
        throw ImageSettingsException(
          'Invalid item in data list: expected Map, got ${e.runtimeType}',
          statusCode: res.statusCode,
          body: res.body,
        );
      }).toList();
    } catch (e) {
      if (e is ImageSettingsException) rethrow;
      throw ImageSettingsException('Network error: $e');
    }
  }

  Future<void> updateImageSetting(String backendKey, String value) async {
    if (backendKey.isEmpty) {
      throw ImageSettingsException('Setting key cannot be empty');
    }

    try {
      print('✏️ [ImageSettings] PUT /settings/image/$backendKey');
      print('➡ Value: $value');

      final res = await _api.put(
        '/settings/image/$backendKey',
        body: {"value": value},
      );

      print('📡 Status: ${res.statusCode}');
      print('📡 Body: ${res.body}');

      if (res.statusCode != 200) {
        throw ImageSettingsException(
          'Failed to update setting: $backendKey',
          statusCode: res.statusCode,
          body: res.body,
        );
      }
    } catch (e) {
      if (e is ImageSettingsException) rethrow;
      throw ImageSettingsException('Network error: $e');
    }
  }

  // Future<void> toggleSetting(String backendKey, bool enabled) async {
  //   if (backendKey.isEmpty) {
  //     throw ImageSettingsException('Setting key cannot be empty');
  //   }

  //   try {
  //     print('🔘 [ImageSettings] TOGGLE /api/settings/image/$backendKey/toggle');
  //     print('➡ Enabled: $enabled');

  //     final res = await _api.put(
  //       '/api/settings/image/$backendKey/toggle',
  //       body: {"enabled": enabled},
  //     );

  //     print('📡 Status: ${res.statusCode}');
  //     print('📡 Body: ${res.body}');

  //     if (res.statusCode != 200) {
  //       throw ImageSettingsException(
  //         'Failed to toggle setting: $backendKey',
  //         statusCode: res.statusCode,
  //         body: res.body,
  //       );
  //     }
  //   } catch (e) {
  //     if (e is ImageSettingsException) rethrow;
  //     throw ImageSettingsException('Network error: $e');
  //   }
  // }
}
