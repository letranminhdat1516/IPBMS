import 'package:flutter/foundation.dart';
import 'package:detect_care_app/features/activity/data/activity_remote_data_source.dart';
import 'package:detect_care_app/features/activity/models/activity_models.dart';
import 'package:detect_care_app/features/activity/repositories/activity_repository.dart';

class ActivityProvider extends ChangeNotifier {
  final ActivityRepository _repository;

  // State management
  bool _isLoading = false;
  String? _error;
  List<ActivityLog> _activityLogs = [];
  ActivitySummary? _activitySummary;

  // Getters
  bool get isLoading => _isLoading;
  String? get error => _error;
  List<ActivityLog> get activityLogs => _activityLogs;
  ActivitySummary? get activitySummary => _activitySummary;

  ActivityProvider({ActivityRepository? repository})
    : _repository = repository ?? ActivityRepository();

  /// Clear error state
  void _clearError() {
    _error = null;
    notifyListeners();
  }

  /// Set error state
  void _setError(String error) {
    _error = error;
    notifyListeners();
  }

  /// Set loading state
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  /// Load activity logs (Admin only)
  Future<void> loadActivityLogs({
    int page = 1,
    int limit = 20,
    String? actorId,
    String? action,
    String? resourceName,
    ActivitySeverity? severity,
    DateTime? startDate,
    DateTime? endDate,
    bool append = false,
  }) async {
    _clearError();
    _setLoading(true);

    try {
      final logs = await _repository.getActivityLogs(
        page: page,
        limit: limit,
        actorId: actorId,
        action: action,
        resourceName: resourceName,
        severity: severity,
        startDate: startDate,
        endDate: endDate,
      );

      if (append) {
        _activityLogs.addAll(logs);
      } else {
        _activityLogs = logs;
      }

      debugPrint('✅ [Activity] Loaded ${logs.length} activity logs');
      notifyListeners();
    } catch (e) {
      final errorMsg = e is ActivityException
          ? e.message
          : 'Failed to load activity logs';
      debugPrint('❌ [Activity] Load activity logs failed: $errorMsg');
      _setError(errorMsg);
    } finally {
      _setLoading(false);
    }
  }

  /// Export activity logs (Admin only)
  Future<String?> exportActivityLogs({
    String? actorId,
    String? action,
    String? resourceName,
    ActivitySeverity? severity,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    _clearError();
    _setLoading(true);

    try {
      final exportData = await _repository.exportActivityLogs(
        actorId: actorId,
        action: action,
        resourceName: resourceName,
        severity: severity,
        startDate: startDate,
        endDate: endDate,
      );

      debugPrint('✅ [Activity] Exported activity logs');
      return exportData;
    } catch (e) {
      final errorMsg = e is ActivityException
          ? e.message
          : 'Failed to export activity logs';
      debugPrint('❌ [Activity] Export activity logs failed: $errorMsg');
      _setError(errorMsg);
      return null;
    } finally {
      _setLoading(false);
    }
  }

  /// Load activity logs for a specific user
  Future<void> loadUserActivityLogs(
    String userId, {
    int page = 1,
    int limit = 20,
    String? action,
    String? resourceName,
    ActivitySeverity? severity,
    DateTime? startDate,
    DateTime? endDate,
    bool append = false,
  }) async {
    _clearError();
    _setLoading(true);

    try {
      final logs = await _repository.getUserActivityLogs(
        userId,
        page: page,
        limit: limit,
        action: action,
        resourceName: resourceName,
        severity: severity,
        startDate: startDate,
        endDate: endDate,
      );

      if (append) {
        _activityLogs.addAll(logs);
      } else {
        _activityLogs = logs;
      }

      debugPrint(
        '✅ [Activity] Loaded ${logs.length} activity logs for user: $userId',
      );
      notifyListeners();
    } catch (e) {
      final errorMsg = e is ActivityException
          ? e.message
          : 'Failed to load user activity logs';
      debugPrint('❌ [Activity] Load user activity logs failed: $errorMsg');
      _setError(errorMsg);
    } finally {
      _setLoading(false);
    }
  }

  /// Load activity summary (Admin only)
  Future<void> loadActivitySummary({
    String? actorId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    _clearError();
    _setLoading(true);

    try {
      _activitySummary = await _repository.getActivitySummary(
        actorId: actorId,
        startDate: startDate,
        endDate: endDate,
      );
      debugPrint('✅ [Activity] Loaded activity summary');
      notifyListeners();
    } catch (e) {
      final errorMsg = e is ActivityException
          ? e.message
          : 'Failed to load activity summary';
      debugPrint('❌ [Activity] Load activity summary failed: $errorMsg');
      _setError(errorMsg);
    } finally {
      _setLoading(false);
    }
  }

  /// Clear activity logs
  void clearActivityLogs() {
    _activityLogs.clear();
    notifyListeners();
  }

  /// Clear activity summary
  void clearActivitySummary() {
    _activitySummary = null;
    notifyListeners();
  }

  /// Clear all data
  void clearAll() {
    _activityLogs.clear();
    _activitySummary = null;
    _error = null;
    notifyListeners();
  }
}
