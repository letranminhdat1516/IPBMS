// Shared types for User Details domain

export type Sev = 'low' | 'medium' | 'high' | 'critical';

export interface AlertsSummary {
  bySeverity: Record<Sev, number>;
  byStatus: Record<string, number>;
}

export interface MonitoringSettings {
  fallDetection: boolean;
  sleepMonitoring: boolean;
  medicationReminders: boolean;
  abnormalDetection: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  maxSitMinutes: number;
  notifyChannels: string[];
}

export interface AlertFilters {
  types?: string[];
  statuses?: string[];
  severities?: Sev[];
  dateFrom?: string;
  dateTo?: string;
}
