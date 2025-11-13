import 'dart:convert';

import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/core/utils/logger.dart';
import 'fcm_endpoints.dart';

class FcmRemoteDataSource {
  final ApiClient _api;
  final FcmEndpoints endpoints;

  FcmRemoteDataSource({required ApiClient api, required this.endpoints})
    : _api = api;

  Future<void> saveToken({
    required String userId,
    required String token,
    String type = 'device',
  }) async {
    // Input validation
    if (userId.isEmpty) {
      throw ArgumentError('userId cannot be empty');
    }
    if (token.isEmpty) {
      throw ArgumentError('token cannot be empty');
    }
    if (type.isEmpty) {
      throw ArgumentError('type cannot be empty');
    }

    AppLogger.api('Saving FCM token for userId: "$userId"');
    AppLogger.api('userId length: ${userId.length}');

    // Validate UUID format
    if (!_isUuid(userId)) {
      AppLogger.apiError('userId is not a valid UUID format: $userId');
      throw ArgumentError('userId must be a valid UUID format: $userId');
    }

    final payload = {'userId': userId, 'token': token, 'type': type};

    final res = await _api.post(endpoints.postTokenPath, body: payload);

    if (res.statusCode < 200 || res.statusCode >= 300) {
      // Safe JSON decoding for error response
      try {
        if (res.body.isNotEmpty) {
          final errorData = jsonDecode(res.body) as Map<String, dynamic>;
          AppLogger.apiError(
            'Save FCM token failed: ${res.statusCode} - ${errorData['message'] ?? res.body}',
          );
        } else {
          AppLogger.apiError(
            'Save FCM token failed: ${res.statusCode} - Empty response',
          );
        }
      } catch (e) {
        AppLogger.apiError(
          'Save FCM token failed: ${res.statusCode} - ${res.body}',
        );
      }
      throw Exception('Save FCM token failed: ${res.statusCode}');
    }

    AppLogger.api('FCM token saved successfully');
  }

  bool _isUuid(String s) {
    final r = RegExp(
      r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    );
    return r.hasMatch(s);
  }

  Future<Map<String, dynamic>> pushMessage({
    required List<String> toUserIds,
    required String direction,
    required String category,
    required String message,
    required String fromUserId,
    String? deeplink,
  }) async {
    // Input validation
    if (toUserIds.isEmpty) {
      throw ArgumentError('toUserIds cannot be empty');
    }
    if (direction.isEmpty) {
      throw ArgumentError('direction cannot be empty');
    }
    if (category.isEmpty) {
      throw ArgumentError('category cannot be empty');
    }
    if (message.isEmpty) {
      throw ArgumentError('message cannot be empty');
    }
    if (fromUserId.isEmpty) {
      throw ArgumentError('fromUserId cannot be empty');
    }

    // Validate all user IDs are valid UUIDs
    for (final userId in toUserIds) {
      if (!_isUuid(userId)) {
        throw ArgumentError('toUserIds contains invalid UUID: $userId');
      }
    }
    if (!_isUuid(fromUserId)) {
      throw ArgumentError('fromUserId must be a valid UUID: $fromUserId');
    }

    // Payload format for backend API (not direct Firebase FCM)
    final payload = <String, dynamic>{
      'toUserIds': toUserIds,
      'direction': direction,
      'category': category,
      'message': message,
      'fromUserId': fromUserId,
      if (deeplink != null && deeplink.isNotEmpty) 'deeplink': deeplink,
    };

    AppLogger.api('Sending push message to ${toUserIds.length} recipients');

    final res = await _api.post(endpoints.postMessagePath, body: payload);

    AppLogger.api('Push response: Status ${res.statusCode}, Body: ${res.body}');

    if (res.statusCode < 200 || res.statusCode >= 300) {
      // Safe JSON decoding for error response
      try {
        if (res.body.isNotEmpty) {
          final errorData = jsonDecode(res.body) as Map<String, dynamic>;
          AppLogger.apiError(
            'Push FCM failed: ${res.statusCode} - ${errorData['message'] ?? res.body}',
          );
        } else {
          AppLogger.apiError(
            'Push FCM failed: ${res.statusCode} - Empty response',
          );
        }
      } catch (e) {
        AppLogger.apiError('Push FCM failed: ${res.statusCode} - ${res.body}');
      }
      throw Exception('Push FCM failed: ${res.statusCode}');
    }

    // Safe JSON decoding with error handling
    dynamic responseData;
    try {
      if (res.body.isEmpty) {
        throw Exception('Empty response body');
      }
      responseData = jsonDecode(res.body);
    } catch (e) {
      AppLogger.apiError('Failed to parse push response: $e');
      throw Exception('Failed to parse push response: $e');
    }

    // Handle standardized response format
    if (responseData is Map<String, dynamic> &&
        responseData['success'] == true) {
      AppLogger.api('Push message sent successfully (standardized format)');
      return responseData['data'] as Map<String, dynamic>;
    }
    // Fallback for legacy format
    else if (responseData is Map<String, dynamic>) {
      AppLogger.api('Push message sent successfully (legacy format)');
      return responseData;
    } else {
      AppLogger.apiError('Invalid push response format');
      throw Exception('Invalid push response format');
    }
  }
}
