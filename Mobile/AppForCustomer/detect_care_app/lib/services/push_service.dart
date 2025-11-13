import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:detect_care_app/core/utils/logger.dart';
import 'package:detect_care_app/core/config/app_config.dart';
import 'package:detect_care_app/core/network/api_client.dart';
import 'package:device_info_plus/device_info_plus.dart';

class PushService {
  static const _maxAttempts = 5;
  static const _maxLogoutAttempts = 3; // Reduced for faster logout
  static const _baseDelayMs = 500;

  static Future<String> _getDeviceId() async {
    try {
      final deviceInfo = DeviceInfoPlugin();
      if (defaultTargetPlatform == TargetPlatform.android) {
        final androidInfo = await deviceInfo.androidInfo;
        return androidInfo.id; // Android ID
      } else if (defaultTargetPlatform == TargetPlatform.iOS) {
        final iosInfo = await deviceInfo.iosInfo;
        return iosInfo.identifierForVendor ?? 'unknown'; // IDFV
      }
    } catch (e, st) {
      AppLogger.e('Lỗi khi lấy ID thiết bị: $e', e, st);
    }
    return 'unknown-device-${DateTime.now().millisecondsSinceEpoch}';
  }

  static Future<void> registerDeviceToken({String? userId, String? jwt}) async {
    AppLogger.d(
      '🚀 [PushService] registerDeviceToken called with userId: $userId, jwt exists: ${jwt != null}',
    );

    // Validate userId
    if (userId == null || userId.isEmpty) {
      AppLogger.w('❌ [PushService] userId is null or empty');
      return;
    }

    // Basic UUID validation
    final uuidRegex = RegExp(
      r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    );
    if (!uuidRegex.hasMatch(userId)) {
      AppLogger.w('❌ [PushService] userId is not a valid UUID format: $userId');
      return;
    }

    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token == null) {
        AppLogger.w('❌ [PushService] FCM token is null');
        return;
      }
      AppLogger.i(
        '✅ [PushService] Got FCM token: ${token.substring(0, 20)}...',
      );

      final deviceId = await _getDeviceId();
      AppLogger.d('📱 [PushService] Device ID: $deviceId');

      final baseUrl = AppConfig.apiBaseUrl;
      AppLogger.d(
        '🌐 [PushService] Using API_BASE_URL: ${baseUrl.isEmpty ? '(empty)' : baseUrl}',
      );

      final api = ApiClient();
      final path = '/fcm/token';

      final payload = {
        'userId': userId, // userId is now guaranteed to be non-null
        'token': token,
        'type': 'device',
        'deviceId': deviceId,
      };

      AppLogger.d('📦 [PushService] Request payload: $payload');

      final extraHeaders = <String, String>{'Content-Type': 'application/json'};
      if (jwt != null) extraHeaders['Authorization'] = 'Bearer $jwt';

      int attempt = 0;
      while (attempt < _maxAttempts) {
        try {
          AppLogger.d('🔄 [PushService] Attempt ${attempt + 1}/$_maxAttempts');
          final res = await api.post(
            path,
            body: payload,
            extraHeaders: extraHeaders,
          );

          AppLogger.d('📡 [PushService] Response status: ${res.statusCode}');
          AppLogger.d('📡 [PushService] Response body: ${res.body}');

          if (res.statusCode >= 200 && res.statusCode < 300) {
            AppLogger.i('✅ [PushService] FCM token registered successfully');
            return;
          } else {
            AppLogger.w(
              '❌ [PushService] Registration failed ${res.statusCode}: ${res.body}',
            );
            throw Exception('Trạng thái không hợp lệ: ${res.statusCode}');
          }
        } catch (e) {
          attempt++;
          final delay = _baseDelayMs * (1 << (attempt - 1));
          AppLogger.d(
            '⏳ [PushService] Retrying in ${delay}ms (attempt $attempt) due to $e',
          );
          await Future.delayed(Duration(milliseconds: delay));
        }
      }
      AppLogger.w(
        '❌ [PushService] Failed to register FCM token after $_maxAttempts attempts',
      );
    } catch (e) {
      AppLogger.e('❌ [PushService] Exception in registerDeviceToken: $e', e);
    }
  }

  static Future<void> unregisterDeviceToken({String? jwt}) async {
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token == null) {
        debugPrint('FCM token is null');
        return;
      }

      final deviceId = await _getDeviceId();

      final api = ApiClient();
      final extraHeaders = <String, String>{'Content-Type': 'application/json'};
      if (jwt != null) extraHeaders['Authorization'] = 'Bearer $jwt';

      final payload = {'token': token, 'deviceId': deviceId};

      int attempt = 0;
      while (attempt < _maxLogoutAttempts) {
        try {
          // 1) Try DELETE with JSON body
          final res = await api.delete(
            '/fcm/token',
            body: payload,
            extraHeaders: extraHeaders,
          );
          if (res.statusCode >= 200 && res.statusCode < 300) {
            AppLogger.i('FCM token unregistered successfully (DELETE body)');
            return;
          }

          // 2) If server rejects body on DELETE, try DELETE with query param
          if (res.statusCode == 400 ||
              res.statusCode == 415 ||
              res.statusCode == 422) {
            AppLogger.d(
              'DELETE with body rejected (${res.statusCode}), trying DELETE with query param',
            );
            final res2 = await api.delete(
              '/fcm/token?token=${Uri.encodeQueryComponent(token)}',
              extraHeaders: extraHeaders,
            );
            if (res2.statusCode >= 200 && res2.statusCode < 300) {
              AppLogger.i('FCM token unregistered successfully (DELETE query)');
              return;
            }
          }

          // 3) Fallback: try POST to explicit unregister path
          AppLogger.d(
            'DELETE failed ${res.statusCode}: ${res.body}, trying POST unregister',
          );
          final res3 = await api.post(
            '/fcm/token/unregister',
            body: payload,
            extraHeaders: extraHeaders,
          );
          if (res3.statusCode >= 200 && res3.statusCode < 300) {
            AppLogger.i('FCM token unregistered successfully (POST fallback)');
            return;
          }

          // If none succeeded, check if it's an auth error (don't retry)
          if (res.statusCode == 401 || res.statusCode == 403) {
            AppLogger.w(
              'Authentication failed (${res.statusCode}), stopping unregister attempts',
            );
            return;
          }
          AppLogger.w(
            'Unregistration attempts failed: ${res.statusCode} / ${res3.statusCode}',
          );
          throw Exception('Unregistration failed');
        } catch (e) {
          attempt++;
          final delay = _baseDelayMs * (1 << (attempt - 1));
          AppLogger.d(
            'Retrying unregisterDeviceToken in ${delay}ms (attempt $attempt) due to $e',
          );
          await Future.delayed(Duration(milliseconds: delay));
        }
      }

      AppLogger.w(
        'Failed to unregister FCM token after $_maxLogoutAttempts attempts',
      );
    } catch (e) {
      AppLogger.e('Ngoại lệ trong unregisterDeviceToken: $e', e);
    }
  }
}
