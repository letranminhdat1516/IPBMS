import 'package:flutter/foundation.dart';
import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';

class MePreferencesRemoteDataSource {
  final ApiClient _api;
  MePreferencesRemoteDataSource({ApiClient? api})
    : _api = api ?? ApiClient(tokenProvider: AuthStorage.getAccessToken);

  Future<Map<String, dynamic>?> getAppearance() async {
    final res = await _api.get('/me/preferences/appearance');
    if (res.statusCode < 200 || res.statusCode >= 300) return null;

    final decoded = _api.decodeResponseBody(res);
    if (decoded is! Map<String, dynamic>) {
      debugPrint(
        'MePreferences: getAppearance response not a map: ${res.body}',
      );
      return null;
    }

    // Check for new error format
    if (decoded['success'] == false) {
      return null; // Return null for errors
    }

    // Extract data from response - could be in 'data' key or directly in response
    final data = _api.extractDataFromResponse(res);
    if (data is! Map<String, dynamic>) {
      debugPrint('MePreferences: getAppearance data not a map: ${res.body}');
      return null;
    }
    return data.cast<String, dynamic>();
  }

  Future<void> setAppearance({
    required String theme,
    required String font,
  }) async {
    final res = await _api.put(
      '/me/preferences/appearance',
      body: {'theme': theme, 'font': font},
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      // Parse response with new format for error handling
      try {
        final Map<String, dynamic> response = _api.decodeResponseBody(res);
        if (response['success'] == false) {
          final error = response['error'];
          if (error is Map) {
            final code = error['code']?.toString() ?? 'UNKNOWN_ERROR';
            final message =
                error['message']?.toString() ?? 'Set appearance failed';
            throw Exception('Set appearance failed: $code - $message');
          } else {
            throw Exception(
              'Set appearance failed: ${response['error'] ?? 'Unknown error'}',
            );
          }
        }
      } catch (_) {
        // If parsing fails, use original error
      }
      throw Exception('Set appearance failed: ${res.statusCode} ${res.body}');
    }
  }

  Future<Map<String, dynamic>?> getNotifications() async {
    final res = await _api.get('/me/preferences/notifications');
    if (res.statusCode < 200 || res.statusCode >= 300) return null;

    final decoded = _api.decodeResponseBody(res);
    if (decoded is! Map<String, dynamic>) {
      debugPrint(
        'MePreferences: getNotifications response not a map: ${res.body}',
      );
      return null;
    }

    // Check for new error format
    if (decoded['success'] == false) {
      return null; // Return null for errors
    }

    // Extract data from response - could be in 'data' key or directly in response
    final data = _api.extractDataFromResponse(res);
    if (data is! Map<String, dynamic>) {
      debugPrint('MePreferences: getNotifications data not a map: ${res.body}');
      return null;
    }
    return data.cast<String, dynamic>();
  }

  Future<void> setNotifications({
    required String type,
    required bool mobile,
    required bool communicationEmails,
    required bool socialEmails,
    required bool marketingEmails,
    required bool securityEmails,
  }) async {
    final res = await _api.put(
      '/me/preferences/notifications',
      body: {
        'type': type,
        'mobile': mobile,
        'communication_emails': communicationEmails,
        'social_emails': socialEmails,
        'marketing_emails': marketingEmails,
        'security_emails': securityEmails,
      },
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      // Parse response with new format for error handling
      try {
        final decoded = _api.decodeResponseBody(res);
        if (decoded is Map<String, dynamic> && decoded['success'] == false) {
          final error = decoded['error'];
          if (error is Map) {
            final code = error['code']?.toString() ?? 'UNKNOWN_ERROR';
            final message =
                error['message']?.toString() ?? 'Set notifications failed';
            throw Exception('Set notifications failed: $code - $message');
          } else {
            throw Exception(
              'Set notifications failed: ${decoded['error'] ?? 'Unknown error'}',
            );
          }
        }
      } catch (_) {
        // If parsing fails, use original error
      }
      throw Exception(
        'Set notifications failed: ${res.statusCode} ${res.body}',
      );
    }
  }

  Future<Map<String, dynamic>?> getDisplay() async {
    final res = await _api.get('/me/preferences/display');
    if (res.statusCode < 200 || res.statusCode >= 300) return null;

    final decoded = _api.decodeResponseBody(res);
    if (decoded is! Map<String, dynamic>) {
      debugPrint('MePreferences: getDisplay response not a map: ${res.body}');
      return null;
    }

    // Check for new error format
    if (decoded['success'] == false) {
      return null; // Return null for errors
    }

    // Extract data from response - could be in 'data' key or directly in response
    final data = _api.extractDataFromResponse(res);
    if (data is! Map<String, dynamic>) {
      debugPrint('MePreferences: getDisplay data not a map: ${res.body}');
      return null;
    }
    return data.cast<String, dynamic>();
  }

  Future<void> setDisplay({required List<String> items}) async {
    final res = await _api.put(
      '/me/preferences/display',
      body: {'items': items},
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      // Parse response with new format for error handling
      try {
        final decoded = _api.decodeResponseBody(res);
        if (decoded is Map<String, dynamic> && decoded['success'] == false) {
          final error = decoded['error'];
          if (error is Map) {
            final code = error['code']?.toString() ?? 'UNKNOWN_ERROR';
            final message =
                error['message']?.toString() ?? 'Set display failed';
            throw Exception('Set display failed: $code - $message');
          } else {
            throw Exception(
              'Set display failed: ${decoded['error'] ?? 'Unknown error'}',
            );
          }
        }
      } catch (_) {
        // If parsing fails, use original error
      }
      throw Exception('Set display failed: ${res.statusCode} ${res.body}');
    }
  }
}
