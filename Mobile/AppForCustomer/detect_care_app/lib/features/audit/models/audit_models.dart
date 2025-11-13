class AuditEvent {
  final String id;
  final String userId;
  final String action;
  final String resourceType;
  final String? resourceId;
  final Map<String, dynamic>? details;
  final String ipAddress;
  final String userAgent;
  final DateTime timestamp;
  final String? caregiverId;
  final String? caregiverName;

  AuditEvent({
    required this.id,
    required this.userId,
    required this.action,
    required this.resourceType,
    this.resourceId,
    this.details,
    required this.ipAddress,
    required this.userAgent,
    required this.timestamp,
    this.caregiverId,
    this.caregiverName,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'action': action,
      'resource_type': resourceType,
      'resource_id': resourceId,
      'details': details,
      'ip_address': ipAddress,
      'user_agent': userAgent,
      'timestamp': timestamp.toIso8601String(),
      'caregiver_id': caregiverId,
      'caregiver_name': caregiverName,
    };
  }

  factory AuditEvent.fromJson(Map<String, dynamic> json) {
    return AuditEvent(
      id: json['id'] ?? '',
      userId: json['user_id'] ?? '',
      action: json['action'] ?? '',
      resourceType: json['resource_type'] ?? '',
      resourceId: json['resource_id'],
      details: json['details'],
      ipAddress: json['ip_address'] ?? '',
      userAgent: json['user_agent'] ?? '',
      timestamp: DateTime.parse(
        json['timestamp'] ?? DateTime.now().toIso8601String(),
      ),
      caregiverId: json['caregiver_id'],
      caregiverName: json['caregiver_name'],
    );
  }
}

class AuditSummary {
  final int totalEvents;
  final Map<String, int> eventsByAction;
  final Map<String, int> eventsByResource;
  final DateTime? lastActivity;

  AuditSummary({
    required this.totalEvents,
    required this.eventsByAction,
    required this.eventsByResource,
    this.lastActivity,
  });

  factory AuditSummary.fromJson(Map<String, dynamic> json) {
    return AuditSummary(
      totalEvents: json['total_events'] ?? 0,
      eventsByAction: Map<String, int>.from(json['events_by_action'] ?? {}),
      eventsByResource: Map<String, int>.from(json['events_by_resource'] ?? {}),
      lastActivity: json['last_activity'] != null
          ? DateTime.parse(json['last_activity'])
          : null,
    );
  }
}

class CreateAuditEventRequest {
  final String action;
  final String resourceType;
  final String? resourceId;
  final Map<String, dynamic>? details;

  CreateAuditEventRequest({
    required this.action,
    required this.resourceType,
    this.resourceId,
    this.details,
  });

  Map<String, dynamic> toJson() {
    return {
      'action': action,
      'resource_type': resourceType,
      'resource_id': resourceId,
      'details': details,
    };
  }
}
