import 'package:flutter/foundation.dart';
import 'package:detect_care_app/features/audit/data/audit_remote_data_source.dart';
import 'package:detect_care_app/features/audit/models/audit_models.dart';
import 'package:detect_care_app/features/audit/repositories/audit_repository.dart';

class AuditProvider extends ChangeNotifier {
  final AuditRepository _repository;

  // State management
  bool _isLoading = false;
  String? _error;
  List<AuditEvent> _auditEvents = [];
  AuditSummary? _auditSummary;

  // Getters
  bool get isLoading => _isLoading;
  String? get error => _error;
  List<AuditEvent> get auditEvents => _auditEvents;
  AuditSummary? get auditSummary => _auditSummary;

  AuditProvider({AuditRepository? repository})
    : _repository = repository ?? AuditRepository();

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

  /// Create a new audit event
  Future<AuditEvent?> createAuditEvent(CreateAuditEventRequest request) async {
    _clearError();
    _setLoading(true);

    try {
      final auditEvent = await _repository.createAuditEvent(request);
      debugPrint('✅ [Audit] Created audit event: ${auditEvent.id}');
      return auditEvent;
    } catch (e) {
      final errorMsg = e is AuditException
          ? e.message
          : 'Failed to create audit event';
      debugPrint('❌ [Audit] Create audit event failed: $errorMsg');
      _setError(errorMsg);
      return null;
    } finally {
      _setLoading(false);
    }
  }

  /// Load audit events for a specific user
  Future<void> loadUserAuditEvents(
    String userId, {
    int page = 1,
    int limit = 20,
    String? action,
    DateTime? startDate,
    DateTime? endDate,
    bool append = false,
  }) async {
    _clearError();
    _setLoading(true);

    try {
      final events = await _repository.getUserAuditEvents(
        userId,
        page: page,
        limit: limit,
        action: action,
        startDate: startDate,
        endDate: endDate,
      );

      if (append) {
        _auditEvents.addAll(events);
      } else {
        _auditEvents = events;
      }

      debugPrint(
        '✅ [Audit] Loaded ${events.length} audit events for user: $userId',
      );
      notifyListeners();
    } catch (e) {
      final errorMsg = e is AuditException
          ? e.message
          : 'Failed to load user audit events';
      debugPrint('❌ [Audit] Load user audit events failed: $errorMsg');
      _setError(errorMsg);
    } finally {
      _setLoading(false);
    }
  }

  /// Load audit summary for a specific user
  Future<void> loadUserAuditSummary(String userId) async {
    _clearError();
    _setLoading(true);

    try {
      _auditSummary = await _repository.getUserAuditSummary(userId);
      debugPrint('✅ [Audit] Loaded audit summary for user: $userId');
      notifyListeners();
    } catch (e) {
      final errorMsg = e is AuditException
          ? e.message
          : 'Failed to load user audit summary';
      debugPrint('❌ [Audit] Load user audit summary failed: $errorMsg');
      _setError(errorMsg);
    } finally {
      _setLoading(false);
    }
  }

  /// Load all audit events (Admin only)
  Future<void> loadAllAuditEvents({
    int page = 1,
    int limit = 20,
    String? action,
    String? resourceType,
    String? userId,
    DateTime? startDate,
    DateTime? endDate,
    bool append = false,
  }) async {
    _clearError();
    _setLoading(true);

    try {
      final events = await _repository.getAllAuditEvents(
        page: page,
        limit: limit,
        action: action,
        resourceType: resourceType,
        userId: userId,
        startDate: startDate,
        endDate: endDate,
      );

      if (append) {
        _auditEvents.addAll(events);
      } else {
        _auditEvents = events;
      }

      debugPrint('✅ [Audit] Loaded ${events.length} audit events (admin)');
      notifyListeners();
    } catch (e) {
      final errorMsg = e is AuditException
          ? e.message
          : 'Failed to load all audit events';
      debugPrint('❌ [Audit] Load all audit events failed: $errorMsg');
      _setError(errorMsg);
    } finally {
      _setLoading(false);
    }
  }

  /// Load audit events by action type
  Future<void> loadAuditEventsByAction(
    String action, {
    int page = 1,
    int limit = 20,
    bool append = false,
  }) async {
    _clearError();
    _setLoading(true);

    try {
      final events = await _repository.getAuditEventsByAction(
        action,
        page: page,
        limit: limit,
      );

      if (append) {
        _auditEvents.addAll(events);
      } else {
        _auditEvents = events;
      }

      debugPrint(
        '✅ [Audit] Loaded ${events.length} audit events for action: $action',
      );
      notifyListeners();
    } catch (e) {
      final errorMsg = e is AuditException
          ? e.message
          : 'Failed to load audit events by action';
      debugPrint('❌ [Audit] Load audit events by action failed: $errorMsg');
      _setError(errorMsg);
    } finally {
      _setLoading(false);
    }
  }

  /// Load audit events by resource type
  Future<void> loadAuditEventsByResource(
    String resourceType, {
    int page = 1,
    int limit = 20,
    bool append = false,
  }) async {
    _clearError();
    _setLoading(true);

    try {
      final events = await _repository.getAuditEventsByResource(
        resourceType,
        page: page,
        limit: limit,
      );

      if (append) {
        _auditEvents.addAll(events);
      } else {
        _auditEvents = events;
      }

      debugPrint(
        '✅ [Audit] Loaded ${events.length} audit events for resource: $resourceType',
      );
      notifyListeners();
    } catch (e) {
      final errorMsg = e is AuditException
          ? e.message
          : 'Failed to load audit events by resource';
      debugPrint('❌ [Audit] Load audit events by resource failed: $errorMsg');
      _setError(errorMsg);
    } finally {
      _setLoading(false);
    }
  }

  /// Clear audit events
  void clearAuditEvents() {
    _auditEvents.clear();
    notifyListeners();
  }

  /// Clear audit summary
  void clearAuditSummary() {
    _auditSummary = null;
    notifyListeners();
  }

  /// Clear all data
  void clearAll() {
    _auditEvents.clear();
    _auditSummary = null;
    _error = null;
    notifyListeners();
  }
}
