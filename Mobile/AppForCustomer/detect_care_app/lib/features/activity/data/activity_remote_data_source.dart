import 'dart:convert';

import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/activity/models/activity_models.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:flutter/foundation.dart';

class ActivityException implements Exception {
  final String message;
  final int? statusCode;
  final String? body;

  ActivityException(this.message, {this.statusCode, this.body});

  @override
  String toString() {
    if (statusCode != null) {
      return 'ActivityException: $message (Status: $statusCode)';
    }
    return 'ActivityException: $message';
  }
}

class ActivityRemoteDataSource {
  final ApiClient _api;

  ActivityRemoteDataSource({ApiClient? api})
    : _api = api ?? ApiClient(tokenProvider: AuthStorage.getAccessToken);

  /// GET /activity-logs - Get all activity logs (Admin only)
  Future<List<ActivityLog>> getActivityLogs({
    int page = 1,
    int limit = 20,
    String? actorId,
    String? action,
    String? resourceName,
    ActivitySeverity? severity,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      debugPrint('📋 [Activity] Fetching activity logs');

      final queryParams = _buildQueryParams(
        page: page,
        limit: limit,
        actorId: actorId,
        action: action,
        resourceName: resourceName,
        severity: severity,
        startDate: startDate,
        endDate: endDate,
      );

      final uri = '/activity-logs$queryParams';
      final res = await _api.get(uri);

      if (res.statusCode == 200) {
        final data = _api.extractDataFromResponse(res);
        if (data is List) {
          return data.map((item) => ActivityLog.fromJson(item)).toList();
        } else {
          throw ActivityException(
            'Invalid response format: expected List but got ${data.runtimeType}',
            statusCode: res.statusCode,
            body: res.body,
          );
        }
      } else {
        throw ActivityException(
          'Failed to fetch activity logs',
          statusCode: res.statusCode,
          body: res.body,
        );
      }
    } catch (e) {
      if (e is ActivityException) rethrow;
      throw ActivityException(
        'Network error during activity logs fetch: ${e.toString()}',
      );
    }
  }

  /// GET /activity-logs/export - Export activity logs (Admin only)
  Future<String> exportActivityLogs({
    String? actorId,
    String? action,
    String? resourceName,
    ActivitySeverity? severity,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      debugPrint('📋 [Activity] Exporting activity logs');

      final queryParams = _buildQueryParams(
        actorId: actorId,
        action: action,
        resourceName: resourceName,
        severity: severity,
        startDate: startDate,
        endDate: endDate,
      );

      final uri = '/activity-logs/export$queryParams';
      final res = await _api.get(uri);

      if (res.statusCode == 200) {
        // Return the export data (could be CSV, JSON, etc.)
        return res.body;
      } else {
        throw ActivityException(
          'Failed to export activity logs',
          statusCode: res.statusCode,
          body: res.body,
        );
      }
    } catch (e) {
      if (e is ActivityException) rethrow;
      throw ActivityException(
        'Network error during activity logs export: ${e.toString()}',
      );
    }
  }

  /// GET /users/{userId}/activity-logs - Get activity logs for specific user
  Future<List<ActivityLog>> getUserActivityLogs(
    String userId, {
    int page = 1,
    int limit = 20,
    String? action,
    String? resourceName,
    ActivitySeverity? severity,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      debugPrint('📋 [Activity] Fetching activity logs for user: $userId');

      final queryParams = _buildQueryParams(
        page: page,
        limit: limit,
        action: action,
        resourceName: resourceName,
        severity: severity,
        startDate: startDate,
        endDate: endDate,
      );

      final uri = '/users/$userId/activity-logs$queryParams';
      final res = await _api.get(uri);

      if (res.statusCode == 200) {
        final data = _api.extractDataFromResponse(res);
        if (data is List) {
          return data.map((item) => ActivityLog.fromJson(item)).toList();
        } else {
          throw ActivityException(
            'Invalid response format: expected List but got ${data.runtimeType}',
            statusCode: res.statusCode,
            body: res.body,
          );
        }
      } else {
        throw ActivityException(
          'Failed to fetch user activity logs',
          statusCode: res.statusCode,
          body: res.body,
        );
      }
    } catch (e) {
      if (e is ActivityException) rethrow;
      throw ActivityException(
        'Network error during user activity logs fetch: ${e.toString()}',
      );
    }
  }

  Future<List<ActivityLog>> getUserLogs({
    required String userId,
    int? limit,
    int? offset,
    String? search,
  }) async {
    try {
      debugPrint('📋 [Activity] Fetching activity logs (by user) for: $userId');

      final path = '/activity-logs';
      final res = await _api.get(path, query: {'user_id': userId});

      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw ActivityException(
          'Fetch activity logs failed: ${res.statusCode} ${res.body}',
          statusCode: res.statusCode,
          body: res.body,
        );
      }

      try {
        final decoded = json.decode(res.body);
        if (decoded is Map &&
            decoded.containsKey('data') &&
            decoded['data'] is List) {
          final list = decoded['data'] as List;
          return list
              .map(
                (item) => ActivityLog.fromJson(Map<String, dynamic>.from(item)),
              )
              .toList();
        }

        if (decoded is List) {
          return decoded
              .map(
                (item) => ActivityLog.fromJson(Map<String, dynamic>.from(item)),
              )
              .toList();
        }

        throw ActivityException(
          'Invalid response format for user logs',
          body: res.body,
        );
      } catch (e) {
        throw ActivityException(
          'Failed to parse activity logs: ${e.toString()}',
          body: res.body,
        );
      }
    } catch (e) {
      if (e is ActivityException) rethrow;
      throw ActivityException(
        'Network error during user activity logs fetch: ${e.toString()}',
      );
    }
  }

  /// GET /activity-logs/summary - Get activity logs summary (Admin only)
  Future<ActivitySummary> getActivitySummary({
    String? actorId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      debugPrint('📊 [Activity] Fetching activity summary');

      final queryParams = _buildQueryParams(
        actorId: actorId,
        startDate: startDate,
        endDate: endDate,
      );

      final uri = '/activity-logs/summary$queryParams';
      final res = await _api.get(uri);

      if (res.statusCode == 200) {
        final data = _api.extractDataFromResponse(res);
        if (data is Map<String, dynamic>) {
          return ActivitySummary.fromJson(data);
        } else {
          throw ActivityException(
            'Invalid response format: expected Map but got ${data.runtimeType}',
            statusCode: res.statusCode,
            body: res.body,
          );
        }
      } else {
        throw ActivityException(
          'Failed to fetch activity summary',
          statusCode: res.statusCode,
          body: res.body,
        );
      }
    } catch (e) {
      if (e is ActivityException) rethrow;
      throw ActivityException(
        'Network error during activity summary fetch: ${e.toString()}',
      );
    }
  }

  /// Helper method to convert severity to string
  String _severityToString(ActivitySeverity severity) {
    switch (severity) {
      case ActivitySeverity.warning:
        return 'warning';
      case ActivitySeverity.critical:
        return 'critical';
      case ActivitySeverity.info:
        return 'info';
    }
  }

  /// Helper method to build query parameters
  String _buildQueryParams({
    int? page,
    int? limit,
    String? actorId,
    String? action,
    String? resourceName,
    ActivitySeverity? severity,
    DateTime? startDate,
    DateTime? endDate,
  }) {
    final params = <String>[];

    if (page != null) params.add('page=$page');
    if (limit != null) params.add('limit=$limit');
    if (actorId != null && actorId.isNotEmpty) {
      params.add('actor_id=${Uri.encodeQueryComponent(actorId)}');
    }
    if (action != null && action.isNotEmpty) {
      params.add('action=${Uri.encodeQueryComponent(action)}');
    }
    if (resourceName != null && resourceName.isNotEmpty) {
      params.add('resource_name=${Uri.encodeQueryComponent(resourceName)}');
    }
    if (severity != null) {
      params.add('severity=${_severityToString(severity)}');
    }
    if (startDate != null) {
      params.add('date_from=${startDate.toIso8601String()}');
    }
    if (endDate != null) {
      params.add('date_to=${endDate.toIso8601String()}');
    }

    return params.isEmpty ? '' : '?${params.join('&')}';
  }
}
