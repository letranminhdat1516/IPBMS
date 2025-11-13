export type AlertType =
  | 'emergency'
  | 'warning'
  | 'info'
  | 'medication_reminder'
  | 'habit_deviation';
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type NotificationType = 'email' | 'sms' | 'push' | 'in_app' | 'webhook';

export function mapEventTypeToAlertType(eventType: string): AlertType {
  const mapping: Record<string, AlertType> = {
    fall_detection: 'emergency',
    fall: 'emergency',
    abnormal_behavior: 'warning',
    emergency: 'emergency',
    normal_activity: 'info',
    inactivity: 'info',
    medication_reminder: 'medication_reminder',
    sleep: 'info',
    intrusion: 'warning',
  };
  return mapping[eventType] || 'warning';
}

export function getEventSeverity(eventType: string): Severity {
  const severity: Record<string, Severity> = {
    fall_detection: 'critical',
    fall: 'critical',
    emergency: 'critical',
    abnormal_behavior: 'high',
    intrusion: 'high',
    normal_activity: 'low',
    inactivity: 'low',
    medication_reminder: 'low',
    sleep: 'low',
  };
  return severity[eventType] || 'medium';
}

export function getNotificationType(eventType: string): NotificationType {
  const types: Record<string, NotificationType> = {
    fall_detection: 'push',
    fall: 'push',
    emergency: 'push',
    abnormal_behavior: 'push',
    normal_activity: 'in_app',
    inactivity: 'in_app',
    intrusion: 'push',
    medication_reminder: 'push',
    sleep: 'in_app',
  };
  return types[eventType] || 'in_app';
}
