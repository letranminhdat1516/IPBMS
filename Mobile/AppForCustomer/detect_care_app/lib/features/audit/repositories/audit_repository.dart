import 'package:detect_care_app/features/audit/data/audit_remote_data_source.dart';
import 'package:detect_care_app/features/audit/models/audit_models.dart';

class AuditRepository {
  final AuditRemoteDataSource _remoteDataSource;

  AuditRepository({AuditRemoteDataSource? remoteDataSource})
    : _remoteDataSource = remoteDataSource ?? AuditRemoteDataSource();

  /// Create a new audit event
  Future<AuditEvent> createAuditEvent(CreateAuditEventRequest request) async {
    return await _remoteDataSource.createAuditEvent(request);
  }

  /// Get audit events for a specific user
  Future<List<AuditEvent>> getUserAuditEvents(
    String userId, {
    int page = 1,
    int limit = 20,
    String? action,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    return await _remoteDataSource.getUserAuditEvents(
      userId,
      page: page,
      limit: limit,
      action: action,
      startDate: startDate,
      endDate: endDate,
    );
  }

  /// Get audit summary for a specific user
  Future<AuditSummary> getUserAuditSummary(String userId) async {
    return await _remoteDataSource.getUserAuditSummary(userId);
  }

  /// Get all audit events (Admin only)
  Future<List<AuditEvent>> getAllAuditEvents({
    int page = 1,
    int limit = 20,
    String? action,
    String? resourceType,
    String? userId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    return await _remoteDataSource.getAllAuditEvents(
      page: page,
      limit: limit,
      action: action,
      resourceType: resourceType,
      userId: userId,
      startDate: startDate,
      endDate: endDate,
    );
  }

  /// Get audit events by action type
  Future<List<AuditEvent>> getAuditEventsByAction(
    String action, {
    int page = 1,
    int limit = 20,
  }) async {
    return await _remoteDataSource.getAuditEventsByAction(
      action,
      page: page,
      limit: limit,
    );
  }

  /// Get audit events by resource type
  Future<List<AuditEvent>> getAuditEventsByResource(
    String resourceType, {
    int page = 1,
    int limit = 20,
  }) async {
    return await _remoteDataSource.getAuditEventsByResource(
      resourceType,
      page: page,
      limit: limit,
    );
  }
}
