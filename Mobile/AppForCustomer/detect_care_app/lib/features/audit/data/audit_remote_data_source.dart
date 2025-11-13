import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:detect_care_app/features/audit/models/audit_models.dart';
import 'package:flutter/foundation.dart';

class AuditException implements Exception {
  final String message;
  final int? statusCode;
  final String? body;

  AuditException(this.message, {this.statusCode, this.body});

  @override
  String toString() {
    if (statusCode != null) {
      return 'AuditException: $message (Status: $statusCode)';
    }
    return 'AuditException: $message';
  }
}

class AuditRemoteDataSource {
  final ApiClient _api;

  AuditRemoteDataSource({ApiClient? api})
    : _api = api ?? ApiClient(tokenProvider: AuthStorage.getAccessToken);

  /// POST /audit/events - Create new audit event
  Future<AuditEvent> createAuditEvent(CreateAuditEventRequest request) async {
    try {
      debugPrint('📝 [Audit] Creating audit event: ${request.toJson()}');

      final res = await _api.post('/audit/events', body: request.toJson());

      if (res.statusCode == 201 || res.statusCode == 200) {
        final data = _api.extractDataFromResponse(res);
        if (data is Map<String, dynamic>) {
          return AuditEvent.fromJson(data);
        } else {
          throw AuditException(
            'Invalid response format: expected Map but got ${data.runtimeType}',
            statusCode: res.statusCode,
            body: res.body,
          );
        }
      } else {
        throw AuditException(
          'Failed to create audit event',
          statusCode: res.statusCode,
          body: res.body,
        );
      }
    } catch (e) {
      if (e is AuditException) rethrow;
      throw AuditException(
        'Network error during audit event creation: ${e.toString()}',
      );
    }
  }

  /// GET /audit/users/{userId}/events - Get audit events for specific user
  Future<List<AuditEvent>> getUserAuditEvents(
    String userId, {
    int page = 1,
    int limit = 20,
    String? action,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      debugPrint('📋 [Audit] Fetching audit events for user: $userId');

      final queryParams = _buildQueryParams(
        page: page,
        limit: limit,
        action: action,
        startDate: startDate,
        endDate: endDate,
      );

      final uri = '/audit/users/$userId/events$queryParams';
      final res = await _api.get(uri);

      if (res.statusCode == 200) {
        final data = _api.extractDataFromResponse(res);
        if (data is List) {
          return data.map((item) => AuditEvent.fromJson(item)).toList();
        } else {
          throw AuditException(
            'Invalid response format: expected List but got ${data.runtimeType}',
            statusCode: res.statusCode,
            body: res.body,
          );
        }
      } else {
        throw AuditException(
          'Failed to fetch user audit events',
          statusCode: res.statusCode,
          body: res.body,
        );
      }
    } catch (e) {
      if (e is AuditException) rethrow;
      throw AuditException(
        'Network error during user audit events fetch: ${e.toString()}',
      );
    }
  }

  /// GET /audit/users/{userId}/summary - Get audit summary for specific user
  Future<AuditSummary> getUserAuditSummary(String userId) async {
    try {
      debugPrint('📊 [Audit] Fetching audit summary for user: $userId');

      final res = await _api.get('/audit/users/$userId/summary');

      if (res.statusCode == 200) {
        final data = _api.extractDataFromResponse(res);
        if (data is Map<String, dynamic>) {
          return AuditSummary.fromJson(data);
        } else {
          throw AuditException(
            'Invalid response format: expected Map but got ${data.runtimeType}',
            statusCode: res.statusCode,
            body: res.body,
          );
        }
      } else {
        throw AuditException(
          'Failed to fetch user audit summary',
          statusCode: res.statusCode,
          body: res.body,
        );
      }
    } catch (e) {
      if (e is AuditException) rethrow;
      throw AuditException(
        'Network error during user audit summary fetch: ${e.toString()}',
      );
    }
  }

  /// GET /audit/events - Get all audit events (Admin only)
  Future<List<AuditEvent>> getAllAuditEvents({
    int page = 1,
    int limit = 20,
    String? action,
    String? resourceType,
    String? userId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      debugPrint('📋 [Audit] Fetching all audit events (admin)');

      final queryParams = _buildQueryParams(
        page: page,
        limit: limit,
        action: action,
        resourceType: resourceType,
        userId: userId,
        startDate: startDate,
        endDate: endDate,
      );

      final uri = '/audit/events$queryParams';
      final res = await _api.get(uri);

      if (res.statusCode == 200) {
        final data = _api.extractDataFromResponse(res);
        if (data is List) {
          return data.map((item) => AuditEvent.fromJson(item)).toList();
        } else {
          throw AuditException(
            'Invalid response format: expected List but got ${data.runtimeType}',
            statusCode: res.statusCode,
            body: res.body,
          );
        }
      } else {
        throw AuditException(
          'Failed to fetch all audit events',
          statusCode: res.statusCode,
          body: res.body,
        );
      }
    } catch (e) {
      if (e is AuditException) rethrow;
      throw AuditException(
        'Network error during all audit events fetch: ${e.toString()}',
      );
    }
  }

  /// GET /audit/events/action/{action} - Get audit events by action type
  Future<List<AuditEvent>> getAuditEventsByAction(
    String action, {
    int page = 1,
    int limit = 20,
  }) async {
    try {
      debugPrint('📋 [Audit] Fetching audit events by action: $action');

      final queryParams = _buildQueryParams(page: page, limit: limit);
      final uri = '/audit/events/action/$action$queryParams';
      final res = await _api.get(uri);

      if (res.statusCode == 200) {
        final data = _api.extractDataFromResponse(res);
        if (data is List) {
          return data.map((item) => AuditEvent.fromJson(item)).toList();
        } else {
          throw AuditException(
            'Invalid response format: expected List but got ${data.runtimeType}',
            statusCode: res.statusCode,
            body: res.body,
          );
        }
      } else {
        throw AuditException(
          'Failed to fetch audit events by action',
          statusCode: res.statusCode,
          body: res.body,
        );
      }
    } catch (e) {
      if (e is AuditException) rethrow;
      throw AuditException(
        'Network error during action audit events fetch: ${e.toString()}',
      );
    }
  }

  /// GET /audit/events/resource/{resourceType} - Get audit events by resource type
  Future<List<AuditEvent>> getAuditEventsByResource(
    String resourceType, {
    int page = 1,
    int limit = 20,
  }) async {
    try {
      debugPrint('📋 [Audit] Fetching audit events by resource: $resourceType');

      final queryParams = _buildQueryParams(page: page, limit: limit);
      final uri = '/audit/events/resource/$resourceType$queryParams';
      final res = await _api.get(uri);

      if (res.statusCode == 200) {
        final data = _api.extractDataFromResponse(res);
        if (data is List) {
          return data.map((item) => AuditEvent.fromJson(item)).toList();
        } else {
          throw AuditException(
            'Invalid response format: expected List but got ${data.runtimeType}',
            statusCode: res.statusCode,
            body: res.body,
          );
        }
      } else {
        throw AuditException(
          'Failed to fetch audit events by resource',
          statusCode: res.statusCode,
          body: res.body,
        );
      }
    } catch (e) {
      if (e is AuditException) rethrow;
      throw AuditException(
        'Network error during resource audit events fetch: ${e.toString()}',
      );
    }
  }

  /// Helper method to build query parameters
  String _buildQueryParams({
    int? page,
    int? limit,
    String? action,
    String? resourceType,
    String? userId,
    DateTime? startDate,
    DateTime? endDate,
  }) {
    final params = <String>[];

    if (page != null) params.add('page=$page');
    if (limit != null) params.add('limit=$limit');
    if (action != null && action.isNotEmpty) {
      params.add('action=${Uri.encodeQueryComponent(action)}');
    }
    if (resourceType != null && resourceType.isNotEmpty) {
      params.add('resource_type=${Uri.encodeQueryComponent(resourceType)}');
    }
    if (userId != null && userId.isNotEmpty) {
      params.add('user_id=${Uri.encodeQueryComponent(userId)}');
    }
    if (startDate != null) {
      params.add('start_date=${startDate.toIso8601String()}');
    }
    if (endDate != null) {
      params.add('end_date=${endDate.toIso8601String()}');
    }

    return params.isEmpty ? '' : '?${params.join('&')}';
  }
}
