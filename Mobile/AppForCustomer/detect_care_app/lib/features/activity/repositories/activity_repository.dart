import 'package:detect_care_app/features/activity/data/activity_remote_data_source.dart';
import 'package:detect_care_app/features/activity/models/activity_models.dart';

class ActivityRepository {
  final ActivityRemoteDataSource _remoteDataSource;

  ActivityRepository({ActivityRemoteDataSource? remoteDataSource})
    : _remoteDataSource = remoteDataSource ?? ActivityRemoteDataSource();

  /// Get all activity logs (Admin only)
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
    return await _remoteDataSource.getActivityLogs(
      page: page,
      limit: limit,
      actorId: actorId,
      action: action,
      resourceName: resourceName,
      severity: severity,
      startDate: startDate,
      endDate: endDate,
    );
  }

  /// Export activity logs (Admin only)
  Future<String> exportActivityLogs({
    String? actorId,
    String? action,
    String? resourceName,
    ActivitySeverity? severity,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    return await _remoteDataSource.exportActivityLogs(
      actorId: actorId,
      action: action,
      resourceName: resourceName,
      severity: severity,
      startDate: startDate,
      endDate: endDate,
    );
  }

  /// Get activity logs for a specific user
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
    return await _remoteDataSource.getUserLogs(userId: userId, limit: limit);
  }

  /// Get activity logs summary (Admin only)
  Future<ActivitySummary> getActivitySummary({
    String? actorId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    return await _remoteDataSource.getActivitySummary(
      actorId: actorId,
      startDate: startDate,
      endDate: endDate,
    );
  }
}
