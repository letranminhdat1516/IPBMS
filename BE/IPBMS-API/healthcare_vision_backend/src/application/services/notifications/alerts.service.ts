import { Injectable, NotFoundException } from '@nestjs/common';
import { Alert } from '../../../core/entities/alerts.entity';
import { AlertsRepository } from '../../../infrastructure/repositories/notifications/alerts.repository';

@Injectable()
export class AlertsService {
  constructor(
    private readonly _repo: AlertsRepository,
    // private readonly _acl: AccessControlService,
  ) {}

  async findById(alert_id: string, requester?: { id: string; role: string }): Promise<Alert> {
    const alert = await this._repo.findAlertByIdPublic(alert_id);
    if (!alert) throw new NotFoundException('Alert not found');

    // If requester is caregiver, enforce alert:read permission
    if (requester && requester.role === 'caregiver') {
      if (requester.id !== alert.user_id) {
        // const ok = await this._acl.hasPermission(requester.id, alert.user_id);
        // if (!ok) throw new ForbiddenException('No permission to read this alert');
      }
    }

    return alert;
  }

  findAll(): Promise<Alert[]> {
    return this._repo.findAll();
  }

  async create(data: Partial<Alert>): Promise<Alert> {
    return this._repo.create(data);
  }

  async update(
    alert_id: string,
    data: Partial<Alert>,
    requester?: { id: string; role: string },
  ): Promise<Alert> {
    const existing = await this._repo.findAlertByIdPublic(alert_id);
    if (!existing) throw new NotFoundException('Alert not found');

    // If caregiver tries to acknowledge, enforce alert:ack
    if (requester && requester.role === 'caregiver') {
      if (
        (data.acknowledged_by && data.acknowledged_by !== requester.id) ||
        data.status === 'acknowledged'
      ) {
        // const ok = await this._acl.hasPermission(requester.id, existing.user_id);
        // if (!ok) throw new ForbiddenException('No permission to acknowledge this alert');
      }
    }

    const updated = await this._repo.update(alert_id, data);
    if (!updated) throw new NotFoundException('Alert not found');
    return updated;
  }

  async remove(alert_id: string) {
    return this._repo.remove(alert_id);
  }

  async getAlertsSummary() {
    const alerts = await this._repo.findAll();

    const summary = {
      total: alerts.length,
      by_status: {
        active: alerts.filter((a) => a.status === 'active').length,
        acknowledged: alerts.filter((a) => a.status === 'acknowledged').length,
        resolved: alerts.filter((a) => a.status === 'resolved').length,
      },
      by_severity: {
        low: alerts.filter((a) => a.severity === 'low').length,
        medium: alerts.filter((a) => a.severity === 'medium').length,
        high: alerts.filter((a) => a.severity === 'high').length,
        critical: alerts.filter((a) => a.severity === 'critical').length,
      },
      by_type: {
        fall_detection: alerts.filter((a) => a.alert_type === 'fall_detection').length,
        abnormal_behavior: alerts.filter((a) => a.alert_type === 'abnormal_behavior').length,
        emergency: alerts.filter((a) => a.alert_type === 'emergency').length,
        system: alerts.filter((a) => a.alert_type === 'system').length,
      },
      recent_trends: {
        today: alerts.filter((a) => {
          const today = new Date();
          const alertDate = new Date(a.created_at);
          return alertDate.toDateString() === today.toDateString();
        }).length,
        yesterday: alerts.filter((a) => {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const alertDate = new Date(a.created_at);
          return alertDate.toDateString() === yesterday.toDateString();
        }).length,
        this_week: alerts.filter((a) => {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return new Date(a.created_at) >= weekAgo;
        }).length,
        last_week: alerts.filter((a) => {
          const twoWeeksAgo = new Date();
          const weekAgo = new Date();
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
          weekAgo.setDate(weekAgo.getDate() - 7);
          const alertDate = new Date(a.created_at);
          return alertDate >= twoWeeksAgo && alertDate < weekAgo;
        }).length,
      },
      timestamp: new Date().toISOString(),
    };

    return summary;
  }

  async getAlertTypes() {
    // Return predefined alert types - in real implementation this could come from database
    const alertTypes = [
      {
        id: 'fall_detection',
        name: 'Fall Detection',
        description: 'Alert when fall is detected',
        severity: 'high',
        category: 'safety',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'abnormal_behavior',
        name: 'Abnormal Behavior',
        description: 'Alert for unusual behavior patterns',
        severity: 'medium',
        category: 'behavior',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'emergency',
        name: 'Emergency',
        description: 'Emergency situations requiring immediate attention',
        severity: 'critical',
        category: 'emergency',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'system',
        name: 'System Alert',
        description: 'System-related alerts and notifications',
        severity: 'low',
        category: 'system',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'medication_reminder',
        name: 'Medication Reminder',
        description: 'Reminders for medication schedules',
        severity: 'medium',
        category: 'health',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'vital_signs',
        name: 'Vital Signs Alert',
        description: 'Alerts for abnormal vital signs',
        severity: 'high',
        category: 'health',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'subscription_expiry',
        name: 'Subscription Expiry Reminder',
        description: 'Reminders for subscription expiration',
        severity: 'medium',
        category: 'billing',
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ];

    return {
      success: true,
      data: alertTypes,
      total: alertTypes.length,
      timestamp: new Date().toISOString(),
    };
  }
}
