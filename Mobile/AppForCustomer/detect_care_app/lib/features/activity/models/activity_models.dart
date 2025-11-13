enum ActivitySeverity { info, warning, critical }

class ActivityLog {
  final String id;
  final String actorId;
  final String action;
  final String resourceName;
  final ActivitySeverity severity;
  final Map<String, dynamic>? meta;
  final DateTime createdAt;

  ActivityLog({
    required this.id,
    required this.actorId,
    required this.action,
    required this.resourceName,
    required this.severity,
    this.meta,
    required this.createdAt,
  });

  factory ActivityLog.fromJson(Map<String, dynamic> json) {
    return ActivityLog(
      id: json['id'] as String,
      actorId: json['actor_id'] as String,
      action: json['action'] as String,
      resourceName: json['resource_name'] as String,
      severity: _parseSeverity(json['severity'] as String),
      meta: json['meta'] as Map<String, dynamic>?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'actor_id': actorId,
      'action': action,
      'resource_name': resourceName,
      'severity': _severityToString(severity),
      'meta': meta,
      'created_at': createdAt.toIso8601String(),
    };
  }

  static ActivitySeverity _parseSeverity(String severity) {
    switch (severity.toLowerCase()) {
      case 'warning':
        return ActivitySeverity.warning;
      case 'critical':
        return ActivitySeverity.critical;
      case 'info':
      default:
        return ActivitySeverity.info;
    }
  }

  static String _severityToString(ActivitySeverity severity) {
    switch (severity) {
      case ActivitySeverity.warning:
        return 'warning';
      case ActivitySeverity.critical:
        return 'critical';
      case ActivitySeverity.info:
        return 'info';
    }
  }
}

class ActivitySummary {
  final int totalLogs;
  final Map<String, int> logsByAction;
  final Map<String, int> logsBySeverity;
  final Map<String, int> logsByResource;
  final DateTime? lastActivity;

  ActivitySummary({
    required this.totalLogs,
    required this.logsByAction,
    required this.logsBySeverity,
    required this.logsByResource,
    this.lastActivity,
  });

  factory ActivitySummary.fromJson(Map<String, dynamic> json) {
    return ActivitySummary(
      totalLogs: json['total_logs'] as int,
      logsByAction: Map<String, int>.from(json['logs_by_action'] as Map),
      logsBySeverity: Map<String, int>.from(json['logs_by_severity'] as Map),
      logsByResource: Map<String, int>.from(json['logs_by_resource'] as Map),
      lastActivity: json['last_activity'] != null
          ? DateTime.parse(json['last_activity'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'total_logs': totalLogs,
      'logs_by_action': logsByAction,
      'logs_by_severity': logsBySeverity,
      'logs_by_resource': logsByResource,
      'last_activity': lastActivity?.toIso8601String(),
    };
  }
}

class CreateActivityLogRequest {
  final String actorId;
  final String action;
  final String resourceName;
  final ActivitySeverity severity;
  final Map<String, dynamic>? meta;

  CreateActivityLogRequest({
    required this.actorId,
    required this.action,
    required this.resourceName,
    required this.severity,
    this.meta,
  });

  Map<String, dynamic> toJson() {
    return {
      'actor_id': actorId,
      'action': action,
      'resource_name': resourceName,
      'severity': ActivityLog._severityToString(severity),
      'meta': meta,
    };
  }
}
