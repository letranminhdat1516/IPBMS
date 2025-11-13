import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { EventTypeEnum } from '../../../core/entities/events.entity';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { EventConfirmationRepository } from '../../../infrastructure/repositories/events/event-confirmation.repository';
import { TIME_LIMITS_MS, timeUtils } from '../../../shared/constants/time.constants';
import { FcmService } from '../fcm.service';
import { NotificationsService } from '../notifications.service';
import { NotificationPreferencesService } from '../notification-preferences.service';
import type { EventAuditLogEntry, EventAuditLogService } from './event-audit-log.service';

/**
 * Result type for auto-approve operation
 */
export interface AutoApproveResult {
  success: boolean;
  count: number;
  events: Array<{
    event_id: string;
    status: string;
    event_type: string;
    user_id: string;
  }>;
  errors?: Array<{
    event_id: string;
    error: string;
  }>;
}

/**
 * Result type for auto-reject operation
 */
export interface AutoRejectResult {
  success: boolean;
  count: number;
  events: Array<{
    event_id: string;
    status: string;
    event_type: string;
    user_id: string;
    rejected_reason: string;
  }>;
  errors?: Array<{
    event_id: string;
    error: string;
  }>;
}

@Injectable()
export class EventConfirmationService {
  private readonly logger = new Logger(EventConfirmationService.name);

  constructor(
    private readonly _prisma: PrismaService,
    private readonly _eventConfirmationRepo: EventConfirmationRepository,
    @Optional() private readonly _notificationsService?: NotificationsService,
    @Optional() private readonly _fcmService?: FcmService,
    @Optional() private readonly _eventHistoryService?: EventAuditLogService,
    @Optional() private readonly _notificationPreferencesService?: NotificationPreferencesService,
  ) {}

  // Backwards-compatible getters for existing code that references the old property names
  protected get prisma(): PrismaService {
    return this._prisma;
  }

  protected get eventConfirmationRepo(): EventConfirmationRepository {
    return this._eventConfirmationRepo;
  }

  protected get notificationsService(): NotificationsService | undefined {
    return this._notificationsService;
  }

  protected get fcmService(): FcmService | undefined {
    return this._fcmService;
  }

  protected get eventHistoryService(): EventAuditLogService | undefined {
    return this._eventHistoryService;
  }

  protected get notificationPreferencesService(): NotificationPreferencesService | undefined {
    return this._notificationPreferencesService;
  }

  /**
   * Caregiver proposes a status/event_type change. Customer must confirm or reject.
   * Creates proposed_status, proposed_event_type, proposed_reason and sets confirmation_state.
   * Status and event_type remain unchanged until customer approves.
   */
  async proposeChange(
    eventId: string,
    caregiverId: string,
    newStatus: string,
    ttlMs: number,
    reason?: string,
    proposedEventType?: string,
  ) {
    // Note: we do not strictly restrict proposed_status here to allow
    // custom status-like values from upstream systems (tests expect this).
    // Validate proposed_event_type if provided
    if (proposedEventType) {
      const validEventTypes = Object.values(EventTypeEnum);
      if (!validEventTypes.includes(proposedEventType as any)) {
        throw new Error(
          `Invalid proposed_event_type: ${proposedEventType}. Must be one of: ${validEventTypes.join(', ')}`,
        );
      }
    }

    // const pendingUntil = timeUtils.getFutureTimestamp(ttlMs);

    // Use repository to propose change atomically while staging outbound notifications
    const pendingFcmNotifications: Array<{
      userId: string;
      title: string;
      body: string;
      data: Record<string, any>;
      logOnSend: string;
      logOnSkip?: string;
      preferenceUserId?: string;
    }> = [];
    const pendingDbNotifications: Array<{
      payload: any;
      logText: string;
    }> = [];

    const updated = await this._prisma.$transaction(async (tx: any) => {
      // Get event to access detected_at for safe pending_until calculation
      const event = await this._eventConfirmationRepo.getEventWithContext(eventId, tx);

      if (!event) {
        throw new NotFoundException(`Không tìm thấy sự kiện với ID ${eventId}`);
      }

      // Business rule: if event has already been confirmed by customer, caregivers should not be able to propose further changes
      if (event.confirmation_state === 'CONFIRMED_BY_CUSTOMER') {
        throw new ConflictException(
          'Sự kiện đã được khách hàng xác nhận; không thể gửi đề xuất thay đổi nữa.',
        );
      }

      // Calculate safe pending_until that respects detected_at + 48h limit
      const safePendingUntil = timeUtils.getSafePendingUntil(
        event.detected_at,
        ttlMs,
        TIME_LIMITS_MS.CAREGIVER_ACCESS_WINDOW,
      );

      if (!safePendingUntil) {
        throw new BadRequestException(
          'Không đủ thời gian để tạo đề xuất (đã hết hoặc sắp hết 48h từ khi phát hiện sự kiện)',
        );
      }

      const updated = await this._eventConfirmationRepo.proposeChange(
        {
          eventId,
          caregiverId,
          newStatus,
          pendingUntil: safePendingUntil,
          reason,
          proposedEventType,
        },
        tx,
      );

      if (!updated) {
        // Determine whether event doesn't exist or an active proposal exists
        const exist = await this._eventConfirmationRepo.eventExists(eventId, tx);
        if (!exist) {
          throw new NotFoundException(`Không tìm thấy sự kiện với ID ${eventId}`);
        }
        throw new ConflictException(
          'Đã có đề xuất đang chờ xử lý cho sự kiện này. Vui lòng chờ khách hàng phê duyệt hoặc hết hạn.',
        );
      }

      // Get additional context using repository
      const eventWithContext = await this._eventConfirmationRepo.getEventWithContext(eventId, tx);

      // Get caregiver name using repository
      const caregiverName =
        (await this._eventConfirmationRepo.getUserFullName(caregiverId, tx)) || 'Caregiver';

      // Build detailed event information
      const eventDate = updated.detected_at
        ? new Date(updated.detected_at).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
        : '';

      const eventTime = updated.detected_at
        ? new Date(updated.detected_at).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        : '';

      const cameraInfo = eventWithContext?.cameras?.camera_name || 'Camera không xác định';
      const locationInfo = eventWithContext?.cameras?.location_in_room || '';
      const snapshotUrl = eventWithContext?.snapshots?.files?.[0]?.cloud_url || null;

      // Build notification message - show current vs proposed values
      const currentStatus = updated.status || 'không xác định';
      const currentEventType = updated.event_type || 'không xác định';
      const statusChange = `'${currentStatus}' → '${newStatus}'`;
      const eventTypeChange = proposedEventType
        ? ` và loại sự kiện '${currentEventType}' → '${proposedEventType}'`
        : '';

      const locationText = locationInfo ? ` tại ${locationInfo}` : '';
      const eventTypeText = updated.event_type || 'Sự kiện';

      let message = '';
      if (proposedEventType) {
        message = `${caregiverName} đề xuất thay đổi sự kiện '${eventTypeText}'${locationText} (${cameraInfo}) vào ${eventDate} lúc ${eventTime} từ trạng thái ${statusChange}${eventTypeChange}. Bạn có đồng ý không?`;
      } else {
        message = `${caregiverName} đề xuất thay đổi sự kiện '${eventTypeText}'${locationText} (${cameraInfo}) vào ${eventDate} lúc ${eventTime} từ trạng thái ${statusChange}. Bạn có đồng ý không?`;
      }

      const deeplink = `detectcare://event/${eventId}`;

      const customerId = updated.user_id; // event belongs to customer
      if (
        customerId &&
        this._notificationsService &&
        typeof this._notificationsService.create === 'function'
      ) {
        pendingDbNotifications.push({
          payload: {
            user_id: customerId,
            event_id: eventId,
            message,
            business_type: 'confirmation_request',
            delivery_data: {
              title: 'Yêu cầu xác nhận thay đổi sự kiện',
              eventId,
              proposed_status: newStatus,
              proposed_event_type: proposedEventType ?? null,
            },
          },
          logText: `Notification record created for customer ${customerId} for event ${eventId}`,
        });
      }

      if (!customerId) {
        this.logger.warn(`Customer id missing for event ${eventId}; skip push notification`);
      } else if (!this._fcmService) {
        this.logger.warn(`FCM service not available for event ${eventId}; skip push notification`);
      } else {
        pendingFcmNotifications.push({
          userId: customerId,
          title: 'Yêu cầu xác nhận thay đổi sự kiện',
          body: message,
          data: {
            eventId,
            event_date: eventDate,
            event_time: eventTime,
            camera_name: cameraInfo,
            location: locationInfo,
            snapshot_url: snapshotUrl || '',
            caregiver_name: caregiverName,
            caregiver_id: caregiverId,
            proposed_by: caregiverId,
            current_status: updated.status ?? '',
            current_event_type: updated.event_type ?? '',
            proposed_status: newStatus,
            proposed_event_type: proposedEventType ?? '',
            pending_until: safePendingUntil?.toISOString() ?? '',
            confirmation_state: 'CAREGIVER_UPDATED',
            reason: reason || '',
            deeplink,
            type: 'event_confirmation_request',
          },
          logOnSend: `FCM notification sent to customer ${customerId} for event ${eventId}`,
          logOnSkip: `Event update notification skipped for customer ${customerId} due to preferences`,
          preferenceUserId: customerId,
        });
      }

      // Create activity log entry for proposal
      try {
        const logMessage = proposedEventType
          ? `Caregiver ${caregiverName} proposed change for event ${eventId}: status '${currentStatus}' → '${newStatus}', event_type '${currentEventType}' → '${proposedEventType}'`
          : `Caregiver ${caregiverName} proposed change for event ${eventId}: status '${currentStatus}' → '${newStatus}'`;

        await (tx as any).activity_logs.create({
          data: {
            actor_id: caregiverId,
            actor_name: caregiverName,
            action: 'propose_change',
            resource_type: 'event',
            resource_id: eventId,
            message: logMessage,
            meta: {
              current_status: currentStatus,
              proposed_status: newStatus,
              current_event_type: currentEventType,
              proposed_event_type: proposedEventType ?? null,
              reason: reason ?? null,
              pending_until: safePendingUntil?.toISOString(),
            },
          },
        });
        this.logger.log(`Activity log created for propose_change event ${eventId}`);
      } catch (logErr) {
        const msg = logErr instanceof Error ? logErr.message : String(logErr);
        this.logger.warn(
          `Failed to write activity log for propose_change event ${eventId}: ${msg}`,
        );
      }

      // Record event history
      try {
        if (this.eventHistoryService) {
          // Check if this is the first caregiver action for this event
          const isFirstAction = await this.eventHistoryService.isFirstCaregiverAction(
            eventId,
            caregiverId,
            tx,
          );

          // Record caregiver assignment/invitation if this is the first action
          if (isFirstAction) {
            const invitationEntry: EventAuditLogEntry = {
              eventId,
              action: 'caregiver_assigned',
              actorId: caregiverId,
              actorName: caregiverName,
              actorRole: 'caregiver',
              previousStatus: currentStatus,
              newStatus: currentStatus, // Status doesn't change on assignment
              previousEventType: currentEventType,
              newEventType: currentEventType,
              previousConfirmationState: 'DETECTED',
              newConfirmationState: 'DETECTED', // State doesn't change on assignment
              reason: 'Caregiver assigned to event',
              isFirstAction: true,
              metadata: {
                assignment_time: new Date().toISOString(),
                camera_name: cameraInfo,
                location: locationInfo,
              },
            };
            await this.eventHistoryService.recordAuditLog(invitationEntry, tx);
          }

          // Record the proposal
          const historyEntry: EventAuditLogEntry = {
            eventId,
            action: 'proposed',
            actorId: caregiverId,
            actorName: caregiverName,
            actorRole: 'caregiver',
            previousStatus: currentStatus,
            newStatus: newStatus,
            previousEventType: currentEventType,
            newEventType: proposedEventType || currentEventType,
            previousConfirmationState: 'DETECTED',
            newConfirmationState: 'CAREGIVER_UPDATED',
            reason: reason || undefined,
            isFirstAction,
            metadata: {
              pending_until: safePendingUntil?.toISOString(),
              camera_name: cameraInfo,
              location: locationInfo,
            },
          };
          await this.eventHistoryService.recordAuditLog(historyEntry, tx);
        }
      } catch (historyErr) {
        const msg = historyErr instanceof Error ? historyErr.message : String(historyErr);
        this.logger.warn(`Failed to record event history for event ${eventId}: ${msg}`);
      }

      this.logger.log(
        `Proposed change for event ${eventId} by ${caregiverId}: ${updated.status} -> ${newStatus}`,
      );
      return updated;
    });

    if (
      pendingDbNotifications.length &&
      this._notificationsService &&
      typeof this._notificationsService.create === 'function'
    ) {
      for (const pending of pendingDbNotifications) {
        try {
          await (this._notificationsService as any).create(pending.payload);
          this.logger.log(pending.logText);
        } catch (notifyErr) {
          const msg = notifyErr instanceof Error ? notifyErr.message : String(notifyErr);
          this.logger.warn('Failed to notify customer after proposeChange: ' + msg);
        }
      }
    }

    if (pendingFcmNotifications.length) {
      if (!this._fcmService) {
        this.logger.warn(
          'FCM service not available for staged proposeChange notifications; skipping delivery',
        );
      } else {
        for (const notification of pendingFcmNotifications) {
          let shouldSend = true;
          if (notification.preferenceUserId && this._notificationPreferencesService) {
            try {
              shouldSend = await this._notificationPreferencesService.shouldSendEventUpdate(
                notification.preferenceUserId,
              );
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              this.logger.error(
                `Error checking event update preference for user ${notification.preferenceUserId}: ${msg}`,
              );
              shouldSend = false;
            }
          }

          if (!shouldSend) {
            if (notification.logOnSkip) {
              this.logger.log(notification.logOnSkip);
            }
            continue;
          }

          try {
            await this._fcmService.sendNotificationToUser(
              notification.userId,
              notification.title,
              notification.body,
              notification.data,
            );
            this.logger.log(notification.logOnSend);
          } catch (fcmErr) {
            const msg = fcmErr instanceof Error ? fcmErr.message : String(fcmErr);
            this.logger.warn(
              `Failed to send FCM notification to user ${notification.userId} after proposeChange: ${msg}`,
            );
          }
        }
      }
    }

    return updated;
  }

  /**
   * Customer confirms the proposed change. Applies proposed_status and proposed_event_type to event.
   */
  async confirmChange(eventId: string, customerId: string) {
    const pendingFcmNotifications: Array<{
      userId: string;
      title: string;
      body: string;
      data: Record<string, any>;
      logOnSend: string;
      logOnSkip?: string;
      preferenceUserId?: string;
    }> = [];
    const pendingDbNotifications: Array<{
      payload: any;
      logText: string;
    }> = [];

    const updated = await this.prisma.$transaction(async (tx) => {
      // Get event with context first
      const ev: any = await this.eventConfirmationRepo.getEventWithContext(eventId, tx);

      if (!ev) {
        throw new NotFoundException(`Không tìm thấy sự kiện với ID ${eventId}`);
      }
      if (ev.confirmation_state !== 'CAREGIVER_UPDATED') {
        throw new ConflictException('Không có đề xuất nào đang chờ xác nhận');
      }

      const caregiverId = ev.proposed_by;

      // Use repository to confirm change
      const updated = await this.eventConfirmationRepo.confirmChange(
        eventId,
        customerId,
        ev.proposed_event_type,
        tx,
      );

      if (!updated) {
        throw new ConflictException('Không thể xác nhận đề xuất. Vui lòng thử lại.');
      }

      this.logger.log(`Customer ${customerId} confirmed event ${eventId}`);

      const cameraInfo = ev.cameras?.camera_name || 'Camera';
      const locationInfo = ev.cameras?.location_in_room || '';
      const locationText = locationInfo ? ` tại ${locationInfo}` : '';
      const customerName =
        (await this.eventConfirmationRepo.getUserFullName(customerId, tx)) || 'Khách hàng';
      const confirmationMessage = `${customerName} đã chấp nhận thay đổi sự kiện${locationText} (${cameraInfo}) sang trạng thái '${updated.status}'.`;

      if (caregiverId) {
        if (this.fcmService) {
          pendingFcmNotifications.push({
            userId: caregiverId,
            title: 'Thay đổi sự kiện được chấp nhận',
            body: confirmationMessage,
            data: {
              eventId,
              confirmation_state: 'CONFIRMED_BY_CUSTOMER',
              status: updated.status,
              event_type: updated.event_type,
              customer_name: customerName,
              deeplink: `detectcare://event/${eventId}`,
              type: 'event_confirmation_approved',
            },
            logOnSend: `FCM notification sent to caregiver ${caregiverId} for event ${eventId} approval`,
            logOnSkip: `Event update notification skipped for caregiver ${caregiverId} due to preferences`,
            preferenceUserId: caregiverId,
          });
        } else {
          this.logger.warn(
            `FCM service not available; skipping approval push notification for caregiver ${caregiverId}`,
          );
        }
      }

      if (this.notificationsService && caregiverId) {
        pendingDbNotifications.push({
          payload: {
            user_id: caregiverId,
            event_id: eventId,
            business_type: 'event_confirmation_approved',
            message: confirmationMessage,
            delivery_data: {
              eventId,
              confirmation_state: 'CONFIRMED_BY_CUSTOMER',
              status: updated.status,
              event_type: updated.event_type,
              customer_name: customerName,
              deeplink: `detectcare://event/${eventId}`,
              type: 'event_confirmation_approved',
            },
            status: 'pending',
          },
          logText: `Database notification created for caregiver ${caregiverId} for event ${eventId} approval`,
        });
      }

      // Create activity log entry for confirmation
      try {
        const logMessage = ev.proposed_event_type
          ? `Customer ${customerName} confirmed event ${eventId}: status '${ev.status}' → '${updated.status}', event_type '${ev.event_type}' → '${updated.event_type}'`
          : `Customer ${customerName} confirmed event ${eventId}: status '${ev.status}' → '${updated.status}'`;

        await (tx as any).activity_logs.create({
          data: {
            actor_id: customerId,
            actor_name: customerName,
            action: 'confirm_change',
            resource_type: 'event',
            resource_id: eventId,
            message: logMessage,
            meta: {
              previous_status: ev.status,
              new_status: updated.status,
              previous_event_type: ev.event_type,
              new_event_type: updated.event_type,
              proposed_by: caregiverId,
            },
          },
        });
        this.logger.log(`Activity log created for confirm_change event ${eventId}`);
      } catch (logErr) {
        const msg = logErr instanceof Error ? logErr.message : String(logErr);
        this.logger.warn(
          `Failed to write activity log for confirm_change event ${eventId}: ${msg}`,
        );
      }

      // Record event history for confirmation
      try {
        if (this.eventHistoryService) {
          const customerName =
            (await this.eventConfirmationRepo.getUserFullName(customerId, tx)) || 'Khách hàng';

          // Calculate response time - for now, we'll estimate from pending_until
          const responseTime = undefined; // TODO: Calculate from proposal time when available

          const historyEntry: EventAuditLogEntry = {
            eventId,
            action: 'confirmed',
            actorId: customerId,
            actorName: customerName,
            actorRole: 'customer',
            previousStatus: ev.status,
            newStatus: updated.status,
            previousEventType: ev.event_type,
            newEventType: updated.event_type,
            previousConfirmationState: 'CAREGIVER_UPDATED',
            newConfirmationState: 'CONFIRMED_BY_CUSTOMER',
            responseTimeMinutes: responseTime,
            metadata: {
              proposed_by: caregiverId,
              camera_name: ev.cameras?.camera_name,
              location: ev.cameras?.location_in_room,
            },
          };
          await this.eventHistoryService.recordAuditLog(historyEntry, tx);
        }
      } catch (historyErr) {
        const msg = historyErr instanceof Error ? historyErr.message : String(historyErr);
        this.logger.warn(`Failed to record event history for confirmation ${eventId}: ${msg}`);
      }

      return updated;
    });

    if (pendingDbNotifications.length && this.notificationsService) {
      for (const pending of pendingDbNotifications) {
        try {
          await this.notificationsService.create(pending.payload);
          this.logger.log(pending.logText);
        } catch (notiErr) {
          const msg = notiErr instanceof Error ? notiErr.message : String(notiErr);
          this.logger.warn(
            'Failed to create database notification for caregiver after approval: ' + msg,
          );
        }
      }
    }

    if (pendingFcmNotifications.length) {
      if (!this.fcmService) {
        this.logger.warn(
          'FCM service not available for staged confirmChange notifications; skipping delivery',
        );
      } else {
        for (const notification of pendingFcmNotifications) {
          let shouldSend = true;
          if (notification.preferenceUserId && this.notificationPreferencesService) {
            try {
              shouldSend = await this.notificationPreferencesService.shouldSendEventUpdate(
                notification.preferenceUserId,
              );
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              this.logger.error(
                `Error checking event update preference for user ${notification.preferenceUserId}: ${msg}`,
              );
              shouldSend = false;
            }
          }

          if (!shouldSend) {
            if (notification.logOnSkip) {
              this.logger.log(notification.logOnSkip);
            }
            continue;
          }

          try {
            await this.fcmService.sendNotificationToUser(
              notification.userId,
              notification.title,
              notification.body,
              notification.data,
            );
            this.logger.log(notification.logOnSend);
          } catch (fcmErr) {
            const msg = fcmErr instanceof Error ? fcmErr.message : String(fcmErr);
            this.logger.warn(
              `Failed to send FCM notification to caregiver ${notification.userId} after approval: ${msg}`,
            );
          }
        }
      }
    }

    return updated;
  }

  /**
   * Customer rejects the proposed change. Clears proposal fields without changing status/event_type.
   */
  async rejectChange(eventId: string, customerId: string, reason?: string) {
    const pendingFcmNotifications: Array<{
      userId: string;
      title: string;
      body: string;
      data: Record<string, any>;
      logOnSend: string;
      logOnSkip?: string;
      preferenceUserId?: string;
    }> = [];
    const pendingDbNotifications: Array<{
      payload: any;
      logText: string;
    }> = [];

    const updated = await this.prisma.$transaction(async (tx) => {
      // Get event with context first
      const ev: any = await this.eventConfirmationRepo.getEventWithContext(eventId, tx);

      if (!ev) {
        throw new NotFoundException(`Không tìm thấy sự kiện với ID ${eventId}`);
      }
      if (ev.confirmation_state !== 'CAREGIVER_UPDATED') {
        throw new ConflictException('Không có đề xuất nào đang chờ từ chối');
      }

      const caregiverId = ev.proposed_by;

      // Use repository to reject change
      const updated = await this.eventConfirmationRepo.rejectChange(eventId, customerId, tx);

      if (!updated) {
        throw new ConflictException('Không thể từ chối đề xuất. Vui lòng thử lại.');
      }

      this.logger.log(
        `Customer ${customerId} rejected event ${eventId}. Reason: ${reason || 'N/A'}`,
      );

      const cameraInfo = ev.cameras?.camera_name || 'Camera';
      const locationInfo = ev.cameras?.location_in_room || '';
      const locationText = locationInfo ? ` tại ${locationInfo}` : '';
      const customerName =
        (await this.eventConfirmationRepo.getUserFullName(customerId, tx)) || 'Khách hàng';
      const reasonText = reason ? ` với lý do: "${reason}"` : '';
      const rejectionMessage = `${customerName} đã từ chối thay đổi sự kiện${locationText} (${cameraInfo})${reasonText}. Trạng thái giữ nguyên '${updated.status}'.`;

      if (caregiverId) {
        if (this.fcmService) {
          pendingFcmNotifications.push({
            userId: caregiverId,
            title: 'Thay đổi sự kiện bị từ chối',
            body: rejectionMessage,
            data: {
              eventId,
              confirmation_state: 'REJECTED_BY_CUSTOMER',
              status: updated.status,
              event_type: updated.event_type,
              customer_name: customerName,
              rejection_reason: reason || '',
              deeplink: `detectcare://event/${eventId}`,
              type: 'event_confirmation_rejected',
            },
            logOnSend: `FCM notification sent to caregiver ${caregiverId} for event ${eventId} rejection`,
            logOnSkip: `Event update notification skipped for caregiver ${caregiverId} due to preferences`,
            preferenceUserId: caregiverId,
          });
        } else {
          this.logger.warn(
            `FCM service not available; skipping rejection push notification for caregiver ${caregiverId}`,
          );
        }
      }

      if (this.notificationsService && caregiverId) {
        pendingDbNotifications.push({
          payload: {
            user_id: caregiverId,
            event_id: eventId,
            business_type: 'event_confirmation_rejected',
            message: rejectionMessage,
            delivery_data: {
              eventId,
              confirmation_state: 'REJECTED_BY_CUSTOMER',
              status: updated.status,
              event_type: updated.event_type,
              customer_name: customerName,
              rejection_reason: reason || '',
              deeplink: `detectcare://event/${eventId}`,
              type: 'event_confirmation_rejected',
            },
            status: 'pending',
          },
          logText: `Database notification created for caregiver ${caregiverId} for event ${eventId} rejection`,
        });
      }

      // Create activity log entry for rejection
      try {
        const customerName =
          (await this.eventConfirmationRepo.getUserFullName(customerId, tx)) || 'Khách hàng';

        const logMessage = reason
          ? `Customer ${customerName} rejected event ${eventId} change. Reason: ${reason}. Status remains '${updated.status}'`
          : `Customer ${customerName} rejected event ${eventId} change. Status remains '${updated.status}'`;

        await (tx as any).activity_logs.create({
          data: {
            actor_id: customerId,
            actor_name: customerName,
            action: 'reject_change',
            resource_type: 'event',
            resource_id: eventId,
            message: logMessage,
            meta: {
              proposed_status: ev.proposed_status,
              proposed_event_type: ev.proposed_event_type,
              current_status: updated.status,
              current_event_type: updated.event_type,
              rejection_reason: reason ?? null,
              proposed_by: caregiverId,
            },
          },
        });
        this.logger.log(`Activity log created for reject_change event ${eventId}`);
      } catch (logErr) {
        const msg = logErr instanceof Error ? logErr.message : String(logErr);
        this.logger.warn(`Failed to write activity log for reject_change event ${eventId}: ${msg}`);
      }

      // Record event history for rejection
      try {
        if (this.eventHistoryService) {
          const customerName =
            (await this.eventConfirmationRepo.getUserFullName(customerId, tx)) || 'Khách hàng';

          const historyEntry: EventAuditLogEntry = {
            eventId,
            action: 'rejected',
            actorId: customerId,
            actorName: customerName,
            actorRole: 'customer',
            previousStatus: ev.proposed_status,
            newStatus: updated.status, // remains unchanged
            previousEventType: ev.proposed_event_type,
            newEventType: updated.event_type, // remains unchanged
            previousConfirmationState: 'CAREGIVER_UPDATED',
            newConfirmationState: 'REJECTED_BY_CUSTOMER',
            reason: reason || undefined,
            metadata: {
              proposed_status: ev.proposed_status,
              proposed_event_type: ev.proposed_event_type,
              proposed_by: caregiverId,
              camera_name: ev.cameras?.camera_name,
              location: ev.cameras?.location_in_room,
            },
          };
          await this.eventHistoryService.recordAuditLog(historyEntry, tx);
        }
      } catch (historyErr) {
        const msg = historyErr instanceof Error ? historyErr.message : String(historyErr);
        this.logger.warn(`Failed to record event history for rejection ${eventId}: ${msg}`);
      }

      return updated;
    });

    if (pendingDbNotifications.length && this.notificationsService) {
      for (const pending of pendingDbNotifications) {
        try {
          await this.notificationsService.create(pending.payload);
          this.logger.log(pending.logText);
        } catch (notiErr) {
          const msg = notiErr instanceof Error ? notiErr.message : String(notiErr);
          this.logger.warn(
            'Failed to create database notification for caregiver after rejection: ' + msg,
          );
        }
      }
    }

    if (pendingFcmNotifications.length) {
      if (!this.fcmService) {
        this.logger.warn(
          'FCM service not available for staged rejectChange notifications; skipping delivery',
        );
      } else {
        for (const notification of pendingFcmNotifications) {
          let shouldSend = true;
          if (notification.preferenceUserId && this.notificationPreferencesService) {
            try {
              shouldSend = await this.notificationPreferencesService.shouldSendEventUpdate(
                notification.preferenceUserId,
              );
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              this.logger.error(
                `Error checking event update preference for user ${notification.preferenceUserId}: ${msg}`,
              );
              shouldSend = false;
            }
          }

          if (!shouldSend) {
            if (notification.logOnSkip) {
              this.logger.log(notification.logOnSkip);
            }
            continue;
          }

          try {
            await this.fcmService.sendNotificationToUser(
              notification.userId,
              notification.title,
              notification.body,
              notification.data,
            );
            this.logger.log(notification.logOnSend);
          } catch (fcmErr) {
            const msg = fcmErr instanceof Error ? fcmErr.message : String(fcmErr);
            this.logger.warn(
              `Failed to send FCM notification to caregiver ${notification.userId} after rejection: ${msg}`,
            );
          }
        }
      }
    }

    return updated;
  }

  /**
   * Auto-approve any pending proposals that have exceeded their pending_until deadline.
   * Returns structured result with count and processed events.
   */
  async autoApprovePending(limit = 100): Promise<AutoApproveResult> {
    // Legacy: auto-approve expired proposals. Kept for compatibility and tests.
    // It will iterate over expired proposals (found via repository) and call
    // repository.autoApproveProposal for each, within a transaction.
    const expired = await this.eventConfirmationRepo.findExpiredProposals(limit);

    if (!expired || expired.length === 0) {
      return { success: true, count: 0, events: [] };
    }

    const processed: AutoApproveResult['events'] = [];
    const errors: AutoApproveResult['errors'] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const ev of expired) {
        const eventId = ev.event_id;
        try {
          const updated = await this.eventConfirmationRepo.autoApproveProposal(eventId, tx);
          if (!updated) {
            errors.push({ event_id: eventId, error: 'Repository returned null' });
            continue;
          }

          processed.push({
            event_id: updated.event_id,
            status: updated.status,
            event_type: updated.event_type,
            user_id: updated.user_id,
          });

          // activity log (best-effort)
          try {
            await (tx as any).activity_logs.create({
              data: {
                actor_id: null,
                actor_name: 'system',
                action: 'auto_approve',
                resource_type: 'event',
                resource_id: eventId,
                message: 'Auto-approved expired proposal (legacy flow)',
              },
            });
          } catch (logErr) {
            const msg = logErr instanceof Error ? logErr.message : String(logErr);
            this.logger.warn(
              `Failed to write activity log for auto-approve event ${eventId}: ${msg}`,
            );
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(`Error auto-approving event ${eventId}: ${msg}`);
          errors.push({ event_id: eventId, error: msg });
        }
      }
    });

    return {
      success: true,
      count: processed.length,
      events: processed,
      ...(errors.length ? { errors } : {}),
    };
  }

  /**
   * New: Treat expired proposals (pending_until <= now) as explicit rejection
   * — "silence =/= consent" policy: do NOT auto-approve. Instead expire => REJECTED_BY_CUSTOMER.
   */
  async autoExpirePending(limit = 500): Promise<AutoRejectResult> {
    const pending = await this.eventConfirmationRepo.findExpiredProposals(limit);

    if (pending.length === 0) {
      return { success: true, count: 0, events: [] };
    }

    const processedEvents: AutoRejectResult['events'] = [];
    const errors: AutoRejectResult['errors'] = [];
    const pendingFcmNotifications: Array<{
      userId: string;
      title: string;
      body: string;
      data: Record<string, any>;
      logText: string;
    }> = [];

    await this.prisma.$transaction(async (tx) => {
      for (const ev of pending) {
        const current: any = ev;
        const caregiverId = current.proposed_by;
        const eventId = current.event_id;
        const reason = `Expired: no response before pending_until (silence != consent)`;

        try {
          // expireProposal will set confirmation_state = 'REJECTED_BY_CUSTOMER' and clear proposed fields
          const updated = await this.eventConfirmationRepo.expireProposal(eventId, tx);

          if (!updated) {
            this.logger.warn(`Failed to expire (reject) event ${eventId}`);
            errors.push({ event_id: eventId, error: 'Repository returned null or state changed' });
            continue;
          }

          processedEvents.push({
            event_id: updated.event_id,
            status: updated.status,
            event_type: updated.event_type,
            user_id: updated.user_id,
            rejected_reason: reason,
          });

          // Activity log
          try {
            await (tx as any).activity_logs.create({
              data: {
                actor_id: null,
                actor_name: 'system',
                action: 'auto_expire',
                resource_type: 'event',
                resource_id: eventId,
                message: 'Proposal expired due to no response before pending_until',
              },
            });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            this.logger.warn(`Failed to write activity log for expire event ${eventId}: ${msg}`);
          }

          // Event history
          try {
            if (this.eventHistoryService) {
              const historyEntry: EventAuditLogEntry = {
                eventId,
                action: 'auto_rejected',
                actorName: 'system',
                actorRole: 'system',
                previousStatus: current.proposed_status,
                newStatus: current.status,
                previousEventType: current.proposed_event_type,
                newEventType: current.event_type,
                previousConfirmationState: 'CAREGIVER_UPDATED',
                newConfirmationState: 'REJECTED_BY_CUSTOMER',
                reason,
                metadata: {
                  expired_at: new Date().toISOString(),
                  pending_until: current.pending_until,
                },
              };
              await this.eventHistoryService.recordAuditLog(historyEntry, tx);
            }
          } catch (historyErr) {
            const msg = historyErr instanceof Error ? historyErr.message : String(historyErr);
            this.logger.warn(`Failed to record event history for expire ${eventId}: ${msg}`);
          }

          if (caregiverId) {
            if (this.fcmService) {
              const eventWithContext = await this.eventConfirmationRepo.getEventWithContext(
                eventId,
                tx,
              );
              const customerName = eventWithContext?.users?.full_name || 'Khách hàng';
              const cameraInfo = eventWithContext?.cameras?.camera_name || 'Camera';
              const locationInfo = eventWithContext?.cameras?.location_in_room || '';
              const locationText = locationInfo ? ` tại ${locationInfo}` : '';

              const message = `Đề xuất thay đổi sự kiện${locationText} (${cameraInfo}) đã hết hạn và được coi là từ chối vì khách hàng không phản hồi.`;

              pendingFcmNotifications.push({
                userId: caregiverId,
                title: 'Đề xuất thay đổi sự kiện hết hạn',
                body: message,
                data: {
                  eventId,
                  confirmation_state: 'REJECTED_BY_CUSTOMER',
                  status: updated.status,
                  event_type: updated.event_type,
                  customer_name: customerName,
                  deeplink: `detectcare://event/${eventId}`,
                  type: 'event_confirmation_expired',
                },
                logText: `FCM notification sent to caregiver ${caregiverId} for expired event ${eventId}`,
              });
            } else {
              this.logger.warn(
                `FCM service not available; skipping expiration push notification for caregiver ${caregiverId}`,
              );
            }
          }
        } catch (eventErr) {
          const msg = eventErr instanceof Error ? eventErr.message : String(eventErr);
          this.logger.error(`Error processing expire for event ${eventId}: ${msg}`);
          errors.push({ event_id: eventId, error: msg });
        }
      }
    });

    if (pendingFcmNotifications.length) {
      if (!this.fcmService) {
        this.logger.warn(
          'FCM service not available for staged autoExpirePending notifications; skipping delivery',
        );
      } else {
        for (const notification of pendingFcmNotifications) {
          try {
            await this.fcmService.sendNotificationToUser(
              notification.userId,
              notification.title,
              notification.body,
              notification.data,
            );
            this.logger.log(notification.logText);
          } catch (fcmErr) {
            const msg = fcmErr instanceof Error ? fcmErr.message : String(fcmErr);
            this.logger.warn(
              `Failed to send FCM notification to caregiver ${notification.userId} after expire event: ${msg}`,
            );
          }
        }
      }
    }

    this.logger.log(
      `Expired (treated-as-rejected) ${processedEvents.length} event(s)${errors.length > 0 ? `, ${errors.length} error(s)` : ''}`,
    );

    return {
      success: true,
      count: processedEvents.length,
      events: processedEvents,
      ...(errors.length > 0 && { errors }),
    };
  }

  /**
   * Get pending proposals for a user
   * - Customer: see proposals that caregivers made for their events
   * - Caregiver: see proposals they created
   */
  async getPendingProposals(
    userId: string,
    role: 'customer' | 'caregiver',
    page: number = 1,
    limit: number = 20,
  ) {
    const { data, total } = await this.eventConfirmationRepo.getPendingProposals(
      userId,
      role,
      page,
      limit,
    );

    return {
      total,
      page,
      limit,
      proposals: data.map((p: any) => ({
        event_id: p.event_id,
        confirmation_state: p.confirmation_state,
        status: p.status,
        event_type: p.event_type,
        proposed_status: p.proposed_status,
        proposed_event_type: p.proposed_event_type,
        pending_until: p.pending_until,
        proposed_reason: p.proposed_reason,
        proposed_by: p.proposed_by,
        detected_at: p.detected_at,
        camera_info: p.cameras
          ? {
              camera_name: p.cameras.camera_name,
              location_in_room: p.cameras.location_in_room,
            }
          : undefined,
        snapshot_url: p.files?.[0]?.cloud_url,
        snapshot_id: p.snapshot_id || null,
      })),
    };
  }

  /**
   * Get combined proposal details (event row + event history timeline)
   * Returns null if event not found.
   */
  async getProposalDetails(eventId: string): Promise<{ proposal: any; history: any[] } | null> {
    // Fetch the event row with context
    const proposal = await this.eventConfirmationRepo.getEventWithContext(eventId);
    if (!proposal) return null;

    // Fetch history via EventAuditLogService if available
    let history: any[] = [];
    try {
      if (
        this.eventHistoryService &&
        typeof this.eventHistoryService.getHistoryForEvent === 'function'
      ) {
        history = await this.eventHistoryService.getHistoryForEvent(eventId);
      }
    } catch (err) {
      // swallow errors and return empty history if audit service unavailable
      this.logger.warn(
        `Failed to fetch history for ${eventId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      history = [];
    }

    // Normalize history to DTO-friendly shape and ensure asc order
    const normalizedHistory = (history || [])
      .slice()
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((h: any) => ({
        event_id: h.event_id,
        action: h.action,
        actor_id: h.actor_id || h.actorId || null,
        actor_name: h.actor_name || h.actorName || null,
        actor_role: h.actor_role || h.actorRole || null,
        timestamp: h.created_at || h.timestamp || null,
        details: {
          from_status: h.previous_status || h.previousStatus || undefined,
          to_status: h.new_status || h.newStatus || undefined,
          from_event_type: h.previous_event_type || h.previousEventType || undefined,
          to_event_type: h.new_event_type || h.newEventType || undefined,
          reason: h.reason || undefined,
        },
      }));

    // Compute derived proposal_state and pending_expired on the proposal object
    const lastAction =
      normalizedHistory.length > 0 ? normalizedHistory[normalizedHistory.length - 1].action : null;
    const proposalState = (() => {
      if (lastAction === 'confirmed' || lastAction === 'auto_approved') return 'approved';
      if (lastAction === 'rejected' || lastAction === 'auto_rejected') return 'rejected';
      if (proposal.confirmation_state === 'CAREGIVER_UPDATED') return 'pending';
      return 'none';
    })();

    const pendingExpired = (() => {
      if (!proposal.pending_until) return false;
      try {
        return new Date().getTime() > new Date(proposal.pending_until).getTime();
      } catch {
        return false;
      }
    })();

    const proposalWithDerived = {
      ...proposal,
      proposal_state: proposalState,
      pending_expired: pendingExpired,
    };

    return { proposal: proposalWithDerived, history: normalizedHistory };
  }

  /**
   * Cancel a proposal (only by the caregiver who created it)
   */
  async cancelProposal(eventId: string, caregiverId: string) {
    const pendingFcmNotifications: Array<{
      userId: string;
      title: string;
      body: string;
      data: Record<string, any>;
      logText: string;
    }> = [];

    const updatedEvent = await this.prisma.$transaction(async (tx) => {
      // Get event with context first
      const ev: any = await this.eventConfirmationRepo.getEventWithContext(eventId, tx);

      if (!ev) {
        throw new NotFoundException(`Không tìm thấy sự kiện với ID ${eventId}`);
      }

      if (ev.confirmation_state !== 'CAREGIVER_UPDATED') {
        throw new ConflictException('Không có đề xuất nào đang chờ để hủy');
      }

      if (ev.proposed_by !== caregiverId) {
        throw new BadRequestException('Bạn chỉ có thể hủy đề xuất của chính mình');
      }

      const customerId = ev.user_id;
      let caregiverName = 'Caregiver';
      try {
        const fetchedName =
          (await this.eventConfirmationRepo.getUserFullName(caregiverId, tx)) || null;
        if (fetchedName) caregiverName = fetchedName;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed to resolve caregiver name for cancelProposal: ${msg}`);
      }

      // Use repository to cancel proposal
      const updated = await this.eventConfirmationRepo.cancelProposal(eventId, tx);

      if (!updated) {
        throw new ConflictException('Không thể hủy đề xuất. Vui lòng thử lại.');
      }

      this.logger.log(`Caregiver ${caregiverId} cancelled proposal for event ${eventId}`);

      const cameraInfo = ev.cameras?.camera_name || 'Camera';
      const locationInfo = ev.cameras?.location_in_room || '';
      const locationText = locationInfo ? ` tại ${locationInfo}` : '';
      const cancellationMessage = `${caregiverName} đã hủy đề xuất thay đổi sự kiện${locationText} (${cameraInfo}).`;

      if (customerId) {
        if (this.fcmService) {
          pendingFcmNotifications.push({
            userId: customerId,
            title: 'Đề xuất thay đổi sự kiện đã bị hủy',
            body: cancellationMessage,
            data: {
              eventId,
              confirmation_state: 'DETECTED',
              status: updated.status,
              event_type: updated.event_type,
              caregiver_name: caregiverName,
              deeplink: `detectcare://event/${eventId}`,
              type: 'event_confirmation_cancelled',
            },
            logText: `FCM notification sent to customer ${customerId} about cancellation`,
          });
        } else {
          this.logger.warn(
            `FCM service not available; skipping cancellation push notification for customer ${customerId}`,
          );
        }
      }

      // Create activity log entry for cancellation
      try {
        const logMessage = `Caregiver ${caregiverName} cancelled proposal for event ${eventId}. Status remains '${updated.status}'`;

        await (tx as any).activity_logs.create({
          data: {
            actor_id: caregiverId,
            actor_name: caregiverName,
            action: 'cancel_proposal',
            resource_type: 'event',
            resource_id: eventId,
            message: logMessage,
            meta: {
              cancelled_proposed_status: ev.proposed_status,
              cancelled_proposed_event_type: ev.proposed_event_type,
              current_status: updated.status,
              current_event_type: updated.event_type,
            },
          },
        });
        this.logger.log(`Activity log created for cancel_proposal event ${eventId}`);
      } catch (logErr) {
        const msg = logErr instanceof Error ? logErr.message : String(logErr);
        this.logger.warn(
          `Failed to write activity log for cancel_proposal event ${eventId}: ${msg}`,
        );
      }

      return updated;
    });

    if (pendingFcmNotifications.length) {
      if (!this.fcmService) {
        this.logger.warn(
          'FCM service not available for staged cancelProposal notifications; skipping delivery',
        );
      } else {
        for (const notification of pendingFcmNotifications) {
          try {
            await this.fcmService.sendNotificationToUser(
              notification.userId,
              notification.title,
              notification.body,
              notification.data,
            );
            this.logger.log(notification.logText);
          } catch (fcmErr) {
            const msg = fcmErr instanceof Error ? fcmErr.message : String(fcmErr);
            this.logger.warn(
              'Failed to send FCM notification to customer after cancellation: ' + msg,
            );
          }
        }
      }
    }

    return updatedEvent;
  }

  /**
   * Get confirmation history for a user
   */
  async getConfirmationHistory(
    userId: string,
    role: 'customer' | 'caregiver',
    page: number = 1,
    limit: number = 20,
  ) {
    const { data, total } = await this.eventConfirmationRepo.getConfirmationHistory(
      userId,
      role,
      page,
      limit,
    );

    // Build a map of acknowledged_by -> full_name for display
    const ackIds = Array.from(
      new Set(
        (data || [])
          .map((h: any) => h?.acknowledged_by)
          .filter((v: string | null | undefined): v is string => Boolean(v)),
      ),
    );
    const ackNameMap = new Map<string, string>();
    if (ackIds.length > 0) {
      const ackUsers = await this.prisma.users.findMany({
        where: { user_id: { in: ackIds } },
        select: { user_id: true, full_name: true },
      });
      for (const u of ackUsers) {
        if (u?.user_id) ackNameMap.set(u.user_id, u.full_name || '');
      }
    }

    return {
      total,
      page,
      limit,
      history: data.map((h: any) => ({
        event_id: h.event_id,
        confirmation_state: h.confirmation_state,
        status: h.status,
        event_type: h.event_type,
        acknowledged_at: h.acknowledged_at,
        acknowledged_by: h.acknowledged_by,
        acknowledged_by_name: h.acknowledged_by ? ackNameMap.get(h.acknowledged_by) || null : null,
        detected_at: h.detected_at,
        camera_info: h.cameras
          ? {
              camera_name: h.cameras.camera_name,
              location_in_room: h.cameras.location_in_room,
            }
          : undefined,
      })),
    };
  }

  /**
   * Get received proposals for a user (customer: proposals received from caregivers; caregiver: proposals they created)
   * Includes pending (CAREGIVER_UPDATED) and terminal states (CONFIRMED_BY_CUSTOMER, REJECTED_BY_CUSTOMER)
   */
  async getReceivedProposals(
    userId: string,
    role: 'customer' | 'caregiver',
    opts?: {
      status?: 'all' | 'pending' | 'approved' | 'rejected';
      from?: string;
      to?: string;
      limit?: number;
      cursor?: string;
      page?: number;
    },
  ) {
    // normalize and validate status input
    const rawStatus = (opts && opts.status) || 'all';
    const normalized = String(rawStatus).trim().toLowerCase();
    const allowedStatuses = ['all', 'pending', 'approved', 'rejected'] as const;
    if (!allowedStatuses.includes(normalized as any)) {
      throw new BadRequestException(`Invalid status value: ${normalized}`);
    }
    const status = normalized as (typeof allowedStatuses)[number];
    const limit = (opts && opts.limit) || 20;
    const from = opts && opts.from ? new Date(opts.from) : null;
    const to = opts && opts.to ? new Date(opts.to) : null;
    const cursor = opts && opts.cursor ? opts.cursor : null;
    const page =
      opts && typeof opts.page !== 'undefined' && opts.page !== null
        ? Math.max(1, Number(opts.page) || 1)
        : null;

    // Build SQL predicate for ownership: customer -> user_id, caregiver -> proposed_by
    const ownerColumn = role === 'customer' ? 'e.user_id' : 'e.proposed_by';

    // Terminal actions
    const terminalActions = [
      'confirmed',
      'auto_approved',
      'rejected',
      'auto_rejected',
      'confirmed_by_customer',
    ];

    // Build status predicate according to mapping rules
    // pending -> confirmation_state = 'CAREGIVER_UPDATED' AND last_action NOT IN terminalActions
    // approved -> last_action IN ('confirmed','auto_approved')
    // rejected -> last_action IN ('rejected','auto_rejected')

    // Decode cursor if provided (expects base64 JSON { t: detected_at, id: event_id })
    let cursorDetectedAt: string | null = null;
    let cursorEventId: string | null = null;
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
        cursorDetectedAt = decoded.t;
        cursorEventId = decoded.id;
      } catch {
        // ignore invalid cursor
      }
    }

    // Build where clauses dynamically
    const whereClauses: string[] = [];
    const params: any[] = [];

    // Ownership filter
    whereClauses.push(`${ownerColumn} = $${params.length + 1}::uuid`);
    params.push(userId);

    if (from) {
      whereClauses.push(`e.detected_at >= $${params.length + 1}`);
      params.push(from.toISOString());
    }
    if (to) {
      whereClauses.push(`e.detected_at < $${params.length + 1}`);
      params.push(to.toISOString());
    }

    // status predicate will be appended below

    // Cursor predicate for keyset pagination (detected_at DESC, event_id DESC)
    if (!page && cursorDetectedAt && cursorEventId) {
      whereClauses.push(
        `(e.detected_at < $${params.length + 1} OR (e.detected_at = $${params.length + 1} AND e.event_id < $${params.length + 2}::uuid))`,
      );
      params.push(cursorDetectedAt);
      params.push(cursorEventId);
    }

    // Compose status filter SQL using array parameters (safer than building many $n placeholders)
    let statusSql = '';
    if (status === 'pending') {
      // pending: either confirmation_state is CAREGIVER_UPDATED OR there is a proposed_by
      // and last_action is NOT a terminal action (or is NULL)
      statusSql = `((e.confirmation_state = 'CAREGIVER_UPDATED') OR (e.proposed_by IS NOT NULL)) AND (lh.last_action IS NULL OR NOT (lh.last_action::text = ANY($${params.length + 1}::text[])))`;
      params.push(terminalActions);
    } else if (status === 'approved') {
      // approved: either confirmation_state indicates confirmed by customer OR last_action shows confirmation
      const approved = ['confirmed', 'auto_approved'];
      statusSql = `(e.confirmation_state = 'CONFIRMED_BY_CUSTOMER' OR lh.last_action::text = ANY($${params.length + 1}::text[]))`;
      params.push(approved);
    } else if (status === 'rejected') {
      // rejected: either confirmation_state indicates rejected by customer OR last_action shows rejection
      const rejected = ['rejected', 'auto_rejected'];
      statusSql = `(e.confirmation_state = 'REJECTED_BY_CUSTOMER' OR lh.last_action::text = ANY($${params.length + 1}::text[]))`;
      params.push(rejected);
    }

    if (status !== 'all' && statusSql) whereClauses.push(`(${statusSql})`);

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // (no debug logs) whereSql prepared

    // Build final SQL with lateral last_action lookup
    // If page is provided use offset pagination (LIMIT/OFFSET). Otherwise use keyset cursor behavior.
    let rows: any[] = [];
    let nextCursor: string | null = null;
    if (page) {
      const offset = (page - 1) * limit;
      // Compute exact total for page-based pagination
      // If statusSql references lh.last_action we must include the lateral
      // join for event_history in the count query as well to avoid
      // "missing FROM-clause entry for table 'lh'" errors.
      const countSql = `
        SELECT COUNT(1) as cnt
        FROM event_detections e
        LEFT JOIN LATERAL (
          SELECT eh.action AS last_action
          FROM event_history eh
          WHERE eh.event_id = e.event_id
          ORDER BY eh.created_at DESC
          LIMIT 1
        ) lh ON true
        ${whereSql}
      `;
      const countRows: any[] = await this.prisma.$queryRawUnsafe(countSql, ...params);
      const exactTotal = (countRows && countRows[0] && Number(countRows[0].cnt)) || 0;
      const sql = `
        SELECT e.*, lh.last_action, s.files
        FROM event_detections e
        LEFT JOIN LATERAL (
          SELECT eh.action AS last_action
          FROM event_history eh
          WHERE eh.event_id = e.event_id
          ORDER BY eh.created_at DESC
          LIMIT 1
        ) lh ON true
        LEFT JOIN LATERAL (
          SELECT json_agg(json_build_object('cloud_url', f.cloud_url)) AS files
          FROM snapshots sn
          LEFT JOIN snapshot_images f ON f.snapshot_id = sn.snapshot_id
          WHERE sn.snapshot_id = e.snapshot_id
        ) s ON true
        ${whereSql}
        ORDER BY e.detected_at DESC, e.event_id DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      rows = await this.prisma.$queryRawUnsafe(sql, ...params);
      // page-based pagination does not return nextCursor
      nextCursor = null;

      // Deduplicate rows by event_id (merge files) to avoid returning duplicate event rows
      if (Array.isArray(rows) && rows.length > 0) {
        const seen = new Map<string, any>();
        for (const r of rows) {
          const id = r.event_id;
          if (!id) continue;
          if (!seen.has(id)) {
            const filesArr = r.files && Array.isArray(r.files) ? r.files : r.files ? [r.files] : [];
            seen.set(id, { ...r, files: filesArr });
          } else {
            const existing = seen.get(id);
            const existingFiles = Array.isArray(existing.files) ? existing.files : [];
            const newFiles = Array.isArray(r.files) ? r.files : r.files ? [r.files] : [];
            const dedupUrls = Array.from(
              new Set(
                [...existingFiles, ...newFiles].map((f: any) => f?.cloud_url || JSON.stringify(f)),
              ),
            );
            existing.files = dedupUrls.map((u: string) => ({ cloud_url: u }));
            seen.set(id, existing);
          }
        }
        rows = Array.from(seen.values());
      }

      // override approximate total with exact count
      return {
        total: exactTotal,
        page,
        limit,
        proposals: rows.map((p: any) => {
          // derive proposal_state from last_action + confirmation_state (consistent with keyset branch)
          const proposalState = (() => {
            if (p.last_action === 'confirmed' || p.last_action === 'auto_approved')
              return 'approved';
            if (p.last_action === 'rejected' || p.last_action === 'auto_rejected')
              return 'rejected';
            if (p.confirmation_state === 'CAREGIVER_UPDATED') return 'pending';
            // fallback: if proposed_by exists but confirmation_state wasn't set, treat as pending
            if (p.proposed_by) return 'pending';
            return 'none';
          })();

          return {
            event_id: p.event_id,
            confirmation_state: p.confirmation_state,
            status: p.status,
            event_type: p.event_type,
            proposed_status: p.proposed_status,
            proposed_event_type: p.proposed_event_type,
            pending_until: p.pending_until,
            proposed_reason: p.proposed_reason,
            proposed_by: p.proposed_by,
            detected_at: p.detected_at,
            acknowledged_at: p.acknowledged_at,
            acknowledged_by: p.acknowledged_by,
            camera_info: p.camera_name
              ? { camera_name: p.camera_name, location_in_room: p.location_in_room }
              : undefined,
            is_pending: p.confirmation_state === 'CAREGIVER_UPDATED' && proposalState === 'pending',
            proposal_state: proposalState,
            pending_expired: p.pending_until
              ? new Date().getTime() > new Date(p.pending_until).getTime()
              : false,
            files: p.files || [],
            snapshot_id: p.snapshot_id || null,
          };
        }),
      };
    } else {
      const sql = `
        SELECT e.*, lh.last_action, s.files
        FROM event_detections e
        LEFT JOIN LATERAL (
          SELECT eh.action AS last_action
          FROM event_history eh
          WHERE eh.event_id = e.event_id
          ORDER BY eh.created_at DESC
          LIMIT 1
        ) lh ON true
        LEFT JOIN LATERAL (
          SELECT json_agg(json_build_object('cloud_url', f.cloud_url)) AS files
          FROM snapshots sn
          LEFT JOIN snapshot_images f ON f.snapshot_id = sn.snapshot_id
          WHERE sn.snapshot_id = e.snapshot_id
        ) s ON true
        ${whereSql}
        ORDER BY e.detected_at DESC, e.event_id DESC
        LIMIT ${limit + 1}
      `;

      const qrows: any[] = await this.prisma.$queryRawUnsafe(sql, ...params);
      if (qrows.length > limit) {
        const last = qrows[limit - 1];
        const cursorObj = { t: last.detected_at.toISOString(), id: last.event_id };
        nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString('base64');
        rows = qrows.slice(0, limit);
      } else {
        rows = qrows;
      }

      // Deduplicate rows by event_id in case lateral joins produced duplicate rows
      if (Array.isArray(rows) && rows.length > 0) {
        const seen = new Map<string, any>();
        for (const r of rows) {
          const id = r.event_id;
          if (!id) continue;
          if (!seen.has(id)) {
            // normalize files to array
            const filesArr = r.files && Array.isArray(r.files) ? r.files : r.files ? [r.files] : [];
            seen.set(id, { ...r, files: filesArr });
          } else {
            // merge files arrays
            const existing = seen.get(id);
            const existingFiles = Array.isArray(existing.files) ? existing.files : [];
            const newFiles = Array.isArray(r.files) ? r.files : r.files ? [r.files] : [];
            const merged = Array.from(
              new Set(
                [...existingFiles, ...newFiles].map((f: any) => f?.cloud_url || JSON.stringify(f)),
              ),
            ).map((u: string) => ({ cloud_url: u }));
            existing.files = merged;
            seen.set(id, existing);
          }
        }

        rows = Array.from(seen.values());
      }
    }

    const items = rows.map((p: any) => {
      const lastAction = p.last_action || null;
      const proposalState = (() => {
        if (lastAction === 'confirmed' || lastAction === 'auto_approved') return 'approved';
        if (lastAction === 'rejected' || lastAction === 'auto_rejected') return 'rejected';
        if (p.confirmation_state === 'CAREGIVER_UPDATED') return 'pending';
        return 'none';
      })();

      return {
        event_id: p.event_id,
        confirmation_state: p.confirmation_state,
        status: p.status,
        event_type: p.event_type,
        proposed_status: p.proposed_status,
        proposed_event_type: p.proposed_event_type,
        pending_until: p.pending_until,
        proposed_reason: p.proposed_reason,
        proposed_by: p.proposed_by,
        detected_at: p.detected_at,
        acknowledged_at: p.acknowledged_at,
        acknowledged_by: p.acknowledged_by,
        camera_info: p.camera_name
          ? { camera_name: p.camera_name, location_in_room: p.location_in_room }
          : undefined,
        is_pending: p.confirmation_state === 'CAREGIVER_UPDATED' && proposalState === 'pending',
        proposal_state: proposalState,
        pending_expired: p.pending_until
          ? new Date().getTime() > new Date(p.pending_until).getTime()
          : false,
        files: p.files || [],
        snapshot_id: p.snapshot_id || null,
      };
    });

    return page
      ? {
          total: items.length,
          page,
          limit,
          proposals: items,
        }
      : {
          total: items.length, // approximate — computing global total is expensive; repo methods can be used if exact required
          limit,
          nextCursor,
          proposals: items,
        };
  }

  /**
   * Get confirmation statistics for a user
   * Enhanced with event history data when available
   */
  async getConfirmationStats(
    userId: string,
    role: 'customer' | 'caregiver',
    dateFrom?: Date,
    dateTo?: Date,
  ) {
    // Get basic stats from repository (existing functionality)
    const basicStats = await this.eventConfirmationRepo.getConfirmationStats(
      userId,
      role,
      dateFrom,
      dateTo,
    );

    // If history service is available, get enhanced stats
    if (this.eventHistoryService) {
      try {
        // Try enhanced stats first, fallback to basic stats
        const historyStats = await this.eventHistoryService.getEnhancedStats(
          userId,
          dateFrom,
          dateTo,
        );

        // Merge basic stats with enhanced history stats for comprehensive view
        return {
          total_proposed: Math.max(basicStats.total_proposed, historyStats.total_proposed),
          confirmed: Math.max(basicStats.confirmed, historyStats.confirmed),
          rejected: Math.max(basicStats.rejected, historyStats.rejected),
          // Historical auto_approved is excluded from runtime stats; use auto_rejected instead
          auto_rejected: historyStats.auto_rejected, // New metric
          cancelled: historyStats.cancelled, // New metric
          abandoned: historyStats.abandoned, // New metric
          caregiver_invitations: historyStats.caregiver_invitations, // New metric
          caregiver_assignments: historyStats.caregiver_assignments, // New metric
          pending: basicStats.pending,
          avg_response_time_hours: historyStats.avg_response_time_hours,
          approval_rate: historyStats.approval_rate,
          rejection_rate: historyStats.rejection_rate,
          auto_rejection_rate: historyStats.auto_rejection_rate,
          abandonment_rate: historyStats.abandonment_rate, // New metric
        };
      } catch {
        this.logger.warn(
          'Failed to get enhanced stats from history service, falling back to basic stats',
        );
        return basicStats;
      }
    }

    return basicStats;
  }

  /**
   * Helper method to check if a status change should be auto-rejected
   * Auto-reject dangerous status escalations to prevent false alarms
   */
  private shouldAutoReject(currentStatus: string, proposedStatus: string): boolean {
    // Define safe-to-dangerous status transitions that should be auto-rejected
    const dangerousTransitions = [
      { from: 'normal', to: 'danger' },
      { from: 'normal', to: 'warning' },
      { from: 'warning', to: 'danger' },
    ];

    return dangerousTransitions.some(
      (transition) => currentStatus === transition.from && proposedStatus === transition.to,
    );
  }

  /**
   * Auto-reject expired proposals that represent dangerous status escalations.
   * This prevents false alarms from being automatically escalated when customers don't respond.
   */
  async autoRejectPending(limit = 100): Promise<AutoRejectResult> {
    // Find expired proposals using repository
    const pending = await this.eventConfirmationRepo.findExpiredProposals(limit);

    if (pending.length === 0) {
      return {
        success: true,
        count: 0,
        events: [],
      };
    }

    // Filter proposals that should be auto-rejected based on business logic
    const toReject = pending.filter((ev: any) => {
      const currentStatus = ev.status || '';
      const proposedStatus = ev.proposed_status || '';
      return this.shouldAutoReject(currentStatus, proposedStatus);
    });

    if (toReject.length === 0) {
      return {
        success: true,
        count: 0,
        events: [],
      };
    }

    const processedEvents: AutoRejectResult['events'] = [];
    const errors: AutoRejectResult['errors'] = [];
    const pendingFcmNotifications: Array<{
      userId: string;
      title: string;
      body: string;
      data: Record<string, any>;
      logText: string;
    }> = [];

    // Update each row in transaction to reject the proposal
    await this.prisma.$transaction(async (tx) => {
      for (const ev of toReject) {
        const current: any = ev;
        const caregiverId = current.proposed_by;
        const eventId = current.event_id;
        const rejectionReason = `Auto-rejected: Dangerous status change from '${current.status}' to '${current.proposed_status}' not confirmed within time limit`;

        try {
          // Use repository to auto-reject the proposal
          const updated = await this.eventConfirmationRepo.autoRejectProposal(eventId, tx);

          if (!updated) {
            this.logger.warn(`Failed to auto-reject event ${eventId}`);
            errors.push({
              event_id: eventId,
              error: 'Repository returned null - concurrent update or invalid state',
            });
            continue;
          }

          // Add to processed events
          processedEvents.push({
            event_id: updated.event_id,
            status: updated.status,
            event_type: updated.event_type,
            user_id: updated.user_id,
            rejected_reason: rejectionReason,
          });

          // Create activity log entry marking system auto-rejection
          try {
            const logMessage = `Event ${eventId} auto-rejected: dangerous status change from '${current.status}' to '${current.proposed_status}' not confirmed within time limit`;

            await (tx as any).activity_logs.create({
              data: {
                actor_id: null,
                actor_name: 'system',
                action: 'auto_reject',
                resource_type: 'event',
                resource_id: eventId,
                message: logMessage,
                meta: {
                  current_status: current.status,
                  proposed_status: current.proposed_status,
                  current_event_type: current.event_type,
                  proposed_event_type: current.proposed_event_type,
                  rejection_reason: rejectionReason,
                  proposed_by: caregiverId,
                },
              },
            });
          } catch (e) {
            // non-fatal: log and continue; don't fail auto-rejection if audit insert fails
            const msg = e instanceof Error ? e.message : String(e);
            this.logger.warn(
              `Failed to write activity log for auto-reject event ${eventId}: ${msg}`,
            );
          }

          // Record event history for auto-rejection
          try {
            if (this.eventHistoryService) {
              const historyEntry: EventAuditLogEntry = {
                eventId,
                action: 'auto_rejected',
                actorId: undefined, // system action
                actorName: 'system',
                actorRole: 'system',
                previousStatus: current.proposed_status,
                newStatus: current.status, // remains unchanged
                previousEventType: current.proposed_event_type,
                newEventType: current.event_type, // remains unchanged
                previousConfirmationState: 'CAREGIVER_UPDATED',
                newConfirmationState: 'REJECTED_BY_CUSTOMER',
                reason: rejectionReason,
                metadata: {
                  proposed_by: caregiverId,
                  expired_at: new Date().toISOString(),
                  danger_type: 'status_escalation',
                },
              };
              await this.eventHistoryService.recordAuditLog(historyEntry, tx);
            }
          } catch (historyErr) {
            const msg = historyErr instanceof Error ? historyErr.message : String(historyErr);
            this.logger.warn(`Failed to record event history for auto-reject ${eventId}: ${msg}`);
          }

          if (caregiverId) {
            if (this.fcmService) {
              const eventWithContext = await this.eventConfirmationRepo.getEventWithContext(
                eventId,
                tx,
              );

              const customerName = eventWithContext?.users?.full_name || 'Khách hàng';
              const cameraInfo = eventWithContext?.cameras?.camera_name || 'Camera';
              const locationInfo = eventWithContext?.cameras?.location_in_room || '';
              const locationText = locationInfo ? ` tại ${locationInfo}` : '';

              const message = `Đề xuất thay đổi sự kiện${locationText} (${cameraInfo}) từ '${current.status}' sang '${current.proposed_status}' đã bị tự động từ chối do ${customerName} không phản hồi và đây là thay đổi nguy hiểm.`;

              pendingFcmNotifications.push({
                userId: caregiverId,
                title: 'Đề xuất thay đổi sự kiện bị tự động từ chối',
                body: message,
                data: {
                  eventId,
                  confirmation_state: 'REJECTED_BY_CUSTOMER',
                  status: updated.status,
                  event_type: updated.event_type,
                  customer_name: customerName,
                  rejection_reason: rejectionReason,
                  deeplink: `detectcare://event/${eventId}`,
                  type: 'event_confirmation_auto_rejected',
                },
                logText: `FCM notification sent to caregiver ${caregiverId} for auto-rejected event ${eventId}`,
              });
            } else {
              this.logger.warn(
                `FCM service not available; skipping auto-rejection push notification for caregiver ${caregiverId}`,
              );
            }
          }
        } catch (eventErr) {
          // Catch any error processing this specific event
          const msg = eventErr instanceof Error ? eventErr.message : String(eventErr);
          this.logger.error(`Error processing auto-reject for event ${eventId}: ${msg}`);
          errors.push({
            event_id: eventId,
            error: msg,
          });
        }
      }
    });

    this.logger.log(
      `Auto-rejected ${processedEvents.length} event(s)${errors.length > 0 ? `, ${errors.length} error(s)` : ''}`,
    );

    if (pendingFcmNotifications.length) {
      if (!this.fcmService) {
        this.logger.warn(
          'FCM service not available for staged autoRejectPending notifications; skipping delivery',
        );
      } else {
        for (const notification of pendingFcmNotifications) {
          try {
            await this.fcmService.sendNotificationToUser(
              notification.userId,
              notification.title,
              notification.body,
              notification.data,
            );
            this.logger.log(notification.logText);
          } catch (fcmErr) {
            const msg = fcmErr instanceof Error ? fcmErr.message : String(fcmErr);
            this.logger.warn(
              `Failed to send FCM notification to caregiver ${notification.userId} after auto-rejection: ${msg}`,
            );
          }
        }
      }
    }

    return {
      success: true,
      count: processedEvents.length,
      events: processedEvents,
      ...(errors.length > 0 && { errors }),
    };
  }
}
