import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  EventLifecycleEnum,
  EventStatusEnum,
  EventTypeEnum,
} from '../../../core/entities/events.entity';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { EventsRepository } from '../../../infrastructure/repositories/events/events.repository';
import { parseISOToDate } from '../../../shared/utils';
import {
  createForbiddenException,
  createInternalServerErrorException,
  createNotFoundException,
} from '../../../shared/utils/error.util';
import ErrorCodes from '../../../shared/constants/error-codes';
import { CacheService } from '../cache.service';
import { FcmService } from '../fcm.service';
import { SettingsService } from '../settings.service';
import { EventAuditLogService } from './event-audit-log.service';
import { EventConfirmationService } from './event-confirmation.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly _events: EventsRepository,
    private readonly _settings: SettingsService,
    private readonly _fcmService: FcmService,
    private readonly _cacheService: CacheService,
    @Optional() private readonly _eventConfirmationService?: EventConfirmationService,
    @Optional() private readonly _eventHistoryService?: EventAuditLogService,
    @Optional() private readonly _prisma?: PrismaService,
  ) {}

  async updateConfirm(
    event_id: string,
    confirm: boolean,
    notes?: string,
    requesterId?: string,
    requesterRole?: 'customer' | 'caregiver',
  ) {
    this.logger.debug(
      `[updateConfirm] id=${event_id} confirm=${confirm} notes=${!!notes} requesterRole=${requesterRole}`,
    );

    // Lấy thông tin event trước khi update để gửi notification
    const event = await this._events.findByIdWithContext(event_id);
    if (!event) {
      // Trả về lỗi 404 bằng tiếng Việt nếu không tìm thấy event
      throw createNotFoundException(`Không tìm thấy event ${event_id}`, ErrorCodes.EVENT_NOT_FOUND);
    }

    // If there's an active caregiver proposal, route confirm/reject to EventConfirmationService
    try {
      if ((event as any).confirmation_state === 'CAREGIVER_UPDATED') {
        // Only customer should confirm/reject proposals
        if (requesterRole === 'customer' && this._eventConfirmationService) {
          if (confirm) {
            const updated = await this._eventConfirmationService.confirmChange(
              event_id,
              requesterId!,
            );
            return updated;
          } else {
            const updated = await this._eventConfirmationService.rejectChange(
              event_id,
              requesterId!,
            );
            return updated;
          }
        }
        // If caregiver calls confirm on a pending proposal, fall through to legacy behavior
      }
    } catch (err) {
      // If confirmation flow fails, log and continue to legacy path to avoid blocking
      this.logger.warn(
        `[updateConfirm] confirmation flow error: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    // Enforce business policy: if a customer has already acknowledged/confirmed,
    // a caregiver should not be able to override the customer's final decision.
    const acknowledgedBy = (event as any).acknowledged_by as string | undefined;
    // If the event was previously acknowledged by the customer (that is, acknowledged_by === event.user_id),
    // then a caregiver must not override.
    if (requesterRole === 'caregiver' && acknowledgedBy === event.user_id) {
      this.logger.warn(
        `[updateConfirm] Rejecting caregiver override for event ${event_id} because customer confirmation is final`,
      );
      throw createForbiddenException(
        'Phê duyệt của khách hàng là quyết định cuối cùng; caregiver không được ghi đè',
        ErrorCodes.CAREGIVER_OVERRIDE_FORBIDDEN,
      );
    }

    // Update confirm status and persist who acknowledged it (store actual user id)
    // If event history service is available, perform update + audit in a transaction
    let updatedEvent: any;
    if (this._eventHistoryService && this._prisma) {
      try {
        updatedEvent = await this._prisma.$transaction(async (tx: any) => {
          // perform update
          const result = await tx.events.update({
            where: { event_id },
            data: {
              confirm_status: confirm,
              notes: notes ?? null,
              acknowledged_at: confirm ? new Date() : undefined,
              acknowledged_by: requesterId || undefined,
            },
          });

          // prepare history entry
          const historyEntry: any = {
            eventId: event_id,
            action: 'edited',
            actorId: requesterId || undefined,
            actorName: undefined,
            actorRole: requesterRole || undefined,
            previousStatus: event.confirm_status ? 'confirmed' : 'unconfirmed',
            newStatus: confirm ? 'confirmed' : 'unconfirmed',
            metadata: {
              notes: notes || null,
            },
          };

          await this._eventHistoryService!.recordAuditLog(historyEntry, tx);

          return result;
        });
      } catch (err) {
        this.logger.error(
          `[updateConfirm] Failed to update event ${event_id} and record audit log: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        throw createInternalServerErrorException(
          'Cập nhật xác nhận thất bại',
          'UPDATE_CONFIRM_FAILED',
        );
      }
    } else if (this._eventHistoryService) {
      // Prisma not injected: fallback to repository update and best-effort audit
      const updated = await this._events.updateConfirm(event_id, confirm, notes, requesterId);
      try {
        const historyEntry: any = {
          eventId: event_id,
          action: 'edited',
          actorId: requesterId || undefined,
          actorName: undefined,
          actorRole: requesterRole || undefined,
          previousStatus: event.confirm_status ? 'confirmed' : 'unconfirmed',
          newStatus: confirm ? 'confirmed' : 'unconfirmed',
          metadata: { notes: notes || null },
        };
        await this._eventHistoryService.recordAuditLog(historyEntry).catch(() => {});
      } catch {}
      updatedEvent = updated;
    } else {
      updatedEvent = await this._events.updateConfirm(event_id, confirm, notes, requesterId);
    }

    // Gửi notification dựa trên người confirm
    if (event.user_id) {
      try {
        if (requesterRole === 'customer') {
          // Customer confirm → gửi cho caregivers
          this.logger.debug(
            `[updateConfirm] Customer confirmed event ${event_id}, sending notification to caregivers`,
          );

          await this._fcmService.pushSystemEvent(event.user_id, {
            eventId: event_id,
            eventType: event.event_type,
            title: 'Khách hàng đã xác nhận sự kiện',
            body: `Khách hàng đã xác nhận ${event.event_type} tại ${(event as any).cameras?.location_in_room || (event as any).cameras?.camera_name || 'phòng không xác định'}`,
            deeplink: `detectcare://event/${event_id}`,
            extra: {
              confirmed_by: 'customer',
              event_type: event.event_type,
              room_name:
                (event as any).cameras?.location_in_room || (event as any).cameras?.camera_name,
            },
          });
        } else if (requesterRole === 'caregiver') {
          // Caregiver confirm → gửi cho customer
          this.logger.debug(
            `[updateConfirm] Caregiver confirmed event ${event_id}, sending notification to customer`,
          );

          await this._fcmService.pushSystemEvent(event.user_id, {
            eventId: event_id,
            eventType: event.event_type,
            title: 'Caregiver đã xác nhận sự kiện',
            body: `Caregiver đã xác nhận ${event.event_type} tại ${(event as any).cameras?.location_in_room || (event as any).cameras?.camera_name || 'phòng không xác định'}`,
            deeplink: `detectcare://event/${event_id}`,
            extra: {
              confirmed_by: 'caregiver',
              event_type: event.event_type,
              room_name:
                (event as any).cameras?.location_in_room || (event as any).cameras?.camera_name,
            },
          });
        }

        // If the action is a denial (confirm === false), still notify the other party
        if (!confirm) {
          this.logger.debug(
            `[updateConfirm] Event ${event_id} was denied by ${requesterRole}, notifying counterpart`,
          );
          if (requesterRole === 'customer') {
            // customer denied - notify caregivers
            await this._fcmService.pushActorMessage({
              fromUserId: event.user_id,
              toUserIds: [], // let FCM service resolve caregivers for the user
              direction: 'customer_to_caregiver',
              category: 'confirm',
              message: `Khách hàng phủ nhận sự kiện ${event.event_type}`,
              deeplink: `detectcare://event/${event_id}`,
              extra: { eventId: event_id },
            });
          } else if (requesterRole === 'caregiver') {
            // caregiver denied - notify customer
            await this._fcmService.pushSystemEvent(event.user_id, {
              eventId: event_id,
              eventType: event.event_type,
              title: 'Caregiver phủ nhận sự kiện',
              body: `Caregiver phủ nhận ${event.event_type} tại ${(event as any).cameras?.camera_name || ''}`,
              deeplink: `detectcare://event/${event_id}`,
              extra: { confirmed_by: 'caregiver', denied: 'true' },
            });
          }
        }

        this.logger.debug(`[updateConfirm] Notification(s) sent for event ${event_id}`);
      } catch (error) {
        this.logger.error(
          `[updateConfirm] Failed to send notification for event ${event_id}:`,
          error,
        );
        // Không throw error để không làm fail việc update confirm
      }
    }

    // Invalidate related caches
    if (event.user_id) {
      await this._cacheService.deleteByPattern(`events:daily-summary:${event.user_id}`);
      await this._cacheService.delete(`events:insights:${event.user_id}`);
    }

    // Reset notification attempts when caregiver acted (they responded)
    try {
      if (requesterRole === 'caregiver' && this._prisma) {
        await this._prisma.events.update({
          where: { event_id },
          data: { notification_attempts: 0 } as any,
        });
      }
    } catch (err) {
      this.logger.warn(`[updateConfirm] failed to reset notification_attempts: ${err}`);
    }

    return updatedEvent;
  }

  updateConfirmStatus(
    event_id: string,
    confirm_status: 'normal' | 'warning' | 'danger',
    notes?: string,
  ) {
    this.logger.debug(
      `[updateConfirmStatus] id=${event_id} status=${confirm_status} notes=${!!notes}`,
    );
    return this._events.updateConfirmStatus(event_id, confirm_status === 'danger', notes);
  }

  async listAll(limit?: number) {
    this.logger.debug(`[listAll] limit=${limit}`);
    const rows = await this._events.listAll(limit);
    return (rows || []).map((r: any) => this._normalizeEventForApi(r));
  }

  async listAllForCaregiver(caregiverId: string, limit?: number) {
    this.logger.debug(`[listAllForCaregiver] caregiverId=${caregiverId} limit=${limit}`);
    const rows = await this._events.listAllForCaregiver(caregiverId, limit);
    return (rows || []).map((r: any) => this._normalizeEventForApi(r));
  }

  async recentByUser(user_id: string, limit = 50) {
    this.logger.debug(`[recentByUser] user_id=${user_id} limit=${limit}`);
    const rows = await this._events.recentByUser(user_id, limit);
    return (rows || []).map((r: any) => this._normalizeEventForApi(r));
  }

  async listPaginated(filters: any) {
    this.logger.debug(`[listPaginated] ${JSON.stringify(filters)}`);
    // Accept dateFrom/dateTo coming from controllers and map to repository expected startDate/endDate
    const f = { ...filters } as any;
    // Normalize and validate incoming date strings to avoid passing Invalid Date to Prisma

    if (f.dateFrom && !f.startDate) {
      const parsed = parseISOToDate(f.dateFrom);
      if (parsed) f.startDate = parsed;
      else this.logger.warn(`[listPaginated] invalid dateFrom='${String(f.dateFrom)}' ignored`);
    }
    if (f.dateTo && !f.endDate) {
      const parsed = parseISOToDate(f.dateTo);
      if (parsed) f.endDate = parsed;
      else this.logger.warn(`[listPaginated] invalid dateTo='${String(f.dateTo)}' ignored`);
    }
    const res = await this._events.listPaginated(f as any);
    return {
      ...res,
      data: (res.data || []).map((r: any) => this._normalizeEventForApi(r)),
    };
  }

  async listPaginatedForCaregiver(caregiverUserId: string, filters: any) {
    this.logger.debug(
      `[listPaginatedForCaregiver] caregiverUserId=${caregiverUserId} filters=${JSON.stringify(filters)}`,
    );
    const f = { ...filters } as any;

    if (f.dateFrom && !f.startDate) {
      const p = parseISOToDate(f.dateFrom);
      if (p) {
        f.startDate = p;
      } else {
        this.logger.warn(
          `[listPaginatedForCaregiver] invalid dateFrom='${String(f.dateFrom)}' ignored`,
        );
      }
    }
    if (f.dateTo && !f.endDate) {
      const p = parseISOToDate(f.dateTo);
      if (p) {
        f.endDate = p;
      } else {
        this.logger.warn(
          `[listPaginatedForCaregiver] invalid dateTo='${String(f.dateTo)}' ignored`,
        );
      }
    }
    const res = await this._events.listPaginatedForCaregiverByUserId(caregiverUserId, f);
    return {
      ...res,
      data: (res.data || []).map((r: any) => this._normalizeEventForApi(r)),
    };
  }

  // ✅ Thêm nhánh cho customer (chính chủ)
  async listPaginatedForOwner(ownerUserId: string, filters: any) {
    this.logger.debug(
      `[listPaginatedForOwner] ownerUserId=${ownerUserId} filters=${JSON.stringify(filters)}`,
    );
    // ⬇️ Tạo hàm tương ứng ở repository (tên gợi ý):
    const f = { ...filters } as any;

    if (f.dateFrom && !f.startDate) {
      const p = parseISOToDate(f.dateFrom);
      if (p) {
        f.startDate = p;
      } else {
        this.logger.warn(
          `[listPaginatedForOwner] invalid dateFrom='${String(f.dateFrom)}' ignored`,
        );
      }
    }
    if (f.dateTo && !f.endDate) {
      const p = parseISOToDate(f.dateTo);
      if (p) {
        f.endDate = p;
      } else {
        this.logger.warn(`[listPaginatedForOwner] invalid dateTo='${String(f.dateTo)}' ignored`);
      }
    }
    const res = await this._events.listPaginatedForOwnerUserId(ownerUserId, f);
    return {
      ...res,
      data: (res.data || []).map((r: any) => this._normalizeEventForApi(r)),
    };
  }

  async getDetail(event_id: string) {
    this.logger.debug(`[getDetail] id=${event_id}`);
    const ev = await this._events.findByIdWithContext(event_id);
    if (!ev) return null;
    const normalized = this._normalizeEventForApi(ev);

    // Fetch event history if available (best-effort). Always include history
    let history: any[] = [];
    try {
      if (
        this._eventHistoryService &&
        typeof this._eventHistoryService.getHistoryForEvent === 'function'
      ) {
        history = await this._eventHistoryService.getHistoryForEvent(event_id);
      }
    } catch (err) {
      this.logger.warn(
        `Failed to fetch event history for ${event_id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      history = [];
    }

    return { ...normalized, history };
  }

  async updateStatus(
    event_id: string,
    status: EventStatusEnum | null,
    notes?: string,
    eventType?: EventTypeEnum,
  ) {
    this.logger.debug(
      `[updateStatus] id=${event_id} status=${status} notes=${!!notes} eventType=${eventType}`,
    );

    // If we don't have history service, fallback to repository update
    if (!this._eventHistoryService) {
      return this._events.updateStatus(event_id, status as any, notes, eventType);
    }

    // If Prisma client not injected, fallback to repo update + best-effort audit
    if (!this._prisma) {
      const updated = await this._events.updateStatus(
        event_id,
        status as any,
        notes,
        eventType as any,
      );
      try {
        const historyEntry: any = {
          eventId: event_id,
          action: 'edited',
          actorId: undefined,
          actorName: undefined,
          actorRole: undefined,
          previousStatus: null,
          newStatus: (updated as any).status ?? null,
          metadata: { notes: notes || null },
        };
        await this._eventHistoryService!.recordAuditLog(historyEntry).catch(() => {});
      } catch {}
      return updated;
    }

    // Perform transactional update + audit
    return this._prisma.$transaction(async (tx: any) => {
      const prev = await tx.events.findUnique({ where: { event_id } });
      const updated = await tx.events.update({
        where: { event_id },
        data: {
          ...(status !== undefined && { status: status as any }),
          ...(notes !== undefined && { notes: notes ?? null }),
          ...(eventType !== undefined && { event_type: eventType }),
        },
      });

      // Reset notification attempts when status changes (assume caregiver action)
      try {
        await tx.events.update({ where: { event_id }, data: { notification_attempts: 0 } as any });
      } catch {}

      const historyEntry: any = {
        eventId: event_id,
        action: 'edited',
        actorId: undefined,
        actorName: undefined,
        actorRole: undefined,
        previousStatus: prev?.status ?? null,
        newStatus: updated.status ?? null,
        metadata: { notes: notes || null },
      };

      await this._eventHistoryService!.recordAuditLog(historyEntry, tx);

      return updated;
    });
  }

  /**
   * Update lifecycle state for an event with audit logging.
   */
  async updateLifecycle(
    event_id: string,
    newState: EventLifecycleEnum,
    actorId?: string,
    actorRole?: string,
    notes?: string,
  ) {
    this.logger.debug(`[updateLifecycle] id=${event_id} newState=${newState} actor=${actorId}`);

    // If we don't have history service, fallback to repository update
    if (!this._eventHistoryService) {
      return this._events.updateLifecycle(event_id, newState as any);
    }

    // If Prisma client not injected, fallback to repo update + best-effort audit
    if (!this._prisma) {
      const updated = await this._events.updateLifecycle(event_id, newState as any);
      try {
        const historyEntry: any = {
          eventId: event_id,
          action: 'edited',
          actorId: actorId || undefined,
          actorName: undefined,
          actorRole: actorRole || undefined,
          previousStatus: null,
          newStatus: (updated as any).lifecycle_state ?? null,
          metadata: { notes: notes || null, lifecycle_to: newState },
        };
        await this._eventHistoryService!.recordAuditLog(historyEntry).catch(() => {});
      } catch {}
      return updated;
    }

    // Perform transactional update + audit
    return this._prisma.$transaction(async (tx: any) => {
      const prev = await tx.events.findUnique({ where: { event_id } });
      const updated = await tx.events.update({
        where: { event_id },
        data: {
          lifecycle_state: newState as any,
        },
      });

      const historyEntry: any = {
        eventId: event_id,
        action: 'edited',
        actorId: actorId || undefined,
        actorName: undefined,
        actorRole: actorRole || undefined,
        previousStatus: prev?.lifecycle_state ?? null,
        newStatus: updated.lifecycle_state ?? null,
        metadata: { notes: notes || null, lifecycle_to: newState },
      };

      await this._eventHistoryService!.recordAuditLog(historyEntry, tx);

      return updated;
    });
  }

  getEventSnapshots(event_id: string, windowSec?: number, limit?: number) {
    this.logger.debug(`[getEventSnapshots] id=${event_id} windowSec=${windowSec} limit=${limit}`);
    return this._events.getSnapshotsOfEvent(event_id, {
      windowSec: windowSec || 300,
      limit: limit || 50,
    });
  }

  getEventOwnerUserId(event_id: string) {
    this.logger.debug(`[getEventOwnerUserId] id=${event_id}`);
    return this._events.getEventOwnerUserId(event_id);
  }

  // Trigger FCM notification for new event
  async notifyNewEvent(event_id: string) {
    try {
      this.logger.debug(`[notifyNewEvent] id=${event_id}`);

      // Get event details
      const event = await this._events.findByIdWithContext(event_id);
      if (!event) {
        this.logger.warn(`Event ${event_id} not found`);
        return;
      }

      // Get owner user ID
      const ownerUserId = await this._events.getEventOwnerUserId(event_id);
      if (!ownerUserId) {
        this.logger.warn(`No owner found for event ${event_id}`);
        return;
      }

      // Send FCM notification (to customer + caregivers via pushSystemEvent)
      let pushResult: any = null;
      try {
        pushResult = await this._fcmService.pushSystemEvent(ownerUserId, {
          eventId: event_id,
          eventType: event.event_type || 'detection',
          title: 'Sự kiện mới được phát hiện',
          body: `Camera ${(event as any).cameras?.camera_name || 'Unknown'} phát hiện ${event.event_type || 'sự kiện'}`,
          deeplink: `detectcare://event/${event_id}`,
          extra: {
            eventId: event_id,
            cameraId: event.camera_id,
            confidence: event.confidence_score ? event.confidence_score.toString() : '',
            severity: event.status || 'normal',
            action: 'show_event_modal', // Thêm action để app biết cần hiển thị modal
            foregroundModal: 'true', // Flag để app biết cần hiển thị modal như foreground
          },
        });
      } catch (err) {
        this.logger.warn(
          '[notifyNewEvent] pushSystemEvent threw error for ' + event_id + ': ' + String(err),
        );
      }

      // Log kết quả gửi FCM thực tế (success/failure/noToken) thay vì log mặc định
      try {
        const sc = pushResult?.successCount ?? 0;
        const fc = pushResult?.failureCount ?? 0;
        const no = (pushResult?.noTokenRecipients && pushResult.noTokenRecipients.length) || 0;
        this.logger.log(
          '✅ Gửi FCM cho event ' +
            event_id +
            ', user ' +
            ownerUserId +
            ': ' +
            sc +
            ' success, ' +
            fc +
            ' failure, noToken=' +
            no,
        );
      } catch {
        this.logger.log(`✅ Đã gửi FCM notification cho event ${event_id}, user ${ownerUserId}`);
      }
      // Mark lifecycle as NOTIFIED
      try {
        await this.updateLifecycle(event_id, EventLifecycleEnum.NOTIFIED);
      } catch (err) {
        this.logger.warn(
          `[notifyNewEvent] Failed to set lifecycle NOTIFIED for ${event_id}: ${err}`,
        );
      }

      // Increment notification_attempts so workers can decide forwarding based on attempts
      try {
        if (this._prisma) {
          await this._prisma.events.update({
            where: { event_id },
            data: { notification_attempts: { increment: 1 } } as any,
          });
        }
      } catch (err) {
        this.logger.warn(`[notifyNewEvent] failed to increment notification_attempts: ${err}`);
      }
    } catch (error) {
      this.logger.error(`❌ Lỗi gửi FCM cho event ${event_id}:`, error);
    }
  }

  // Create new event with auto FCM notification
  async createEventWithNotification(eventData: {
    user_id: string;
    camera_id: string;
    snapshot_id?: string;
    event_type: EventTypeEnum;
    confidence_score?: string;
    reliability_score?: string;
    status?: EventStatusEnum;
    detected_at?: string | Date;
    metadata?: Record<string, any>;
  }) {
    try {
      this.logger.debug(
        `[createEventWithNotification] Creating event for user ${eventData.user_id}`,
      );

      // Create the event
      const createData: any = {
        ...eventData,
        status: eventData.status || EventStatusEnum.normal,
        detected_at: eventData.detected_at ? new Date(eventData.detected_at as any) : new Date(),
        // Persist initial lifecycle as NOTIFIED so the first DB state reflects a delivered notification
        lifecycle_state: EventLifecycleEnum.NOTIFIED,
      };

      createData.metadata = { ...(eventData.metadata ?? {}), trigger: 'notify' };

      // Convert confidence_score from string to number if provided
      if (eventData.confidence_score) {
        createData.confidence_score = parseFloat(eventData.confidence_score);
      }
      // Convert reliability_score from string to number if provided
      if (eventData.reliability_score) {
        createData.reliability_score = parseFloat(eventData.reliability_score);
      }

      const newEvent = await this._events.create(createData);

      this.logger.log(`✅ Event created: ${newEvent.event_id}`);

      // Auto-send FCM notification
      await this.notifyNewEvent(newEvent.event_id);

      // Invalidate related caches
      await this._cacheService.deleteByPattern(`events:daily-summary:${eventData.user_id}`);
      await this._cacheService.delete(`events:insights:${eventData.user_id}`);

      return newEvent;
    } catch (error) {
      this.logger.error(`❌ Error creating event with notification:`, error);
      // Trả về lỗi 500 bằng tiếng Việt
      throw createInternalServerErrorException(
        'Tạo event thất bại',
        ErrorCodes.CREATE_EVENT_FAILED,
      );
    }
  }

  async getDailyEventSummary(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cacheKey = `events:daily-summary:${userId}:${today.toISOString().split('T')[0]}`;

    // Try cache first (cache for 5 minutes)
    const cached = await this._cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const events = await this._events.findByUserIdAndDateRange(userId, today, tomorrow);

    const summary = {
      date: today.toISOString().split('T')[0],
      total_events: events.length,
      fall_detections: events.filter((e: any) => e.event_type === 'fall_detection').length,
      unusual_activities: events.filter((e: any) => e.event_type === 'unusual_activity').length,
      normal_activities: events.filter((e: any) => e.event_type === 'normal_activity').length,
      confirmed_events: events.filter((e: any) => e.confirm === true).length,
      unconfirmed_events: events.filter((e: any) => e.confirm === false || e.confirm === null)
        .length,
    };

    // Cache for 5 minutes
    await this._cacheService.set(cacheKey, summary, { ttl: 300 });

    return summary;
  }

  async getEventInsights(userId: string) {
    const cacheKey = `events:insights:${userId}`;

    // Try cache first (cache for 10 minutes)
    const cached = await this._cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get events from last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const today = new Date();

    const events = await this._events.findByUserIdAndDateRange(userId, weekAgo, today);

    const insights = {
      period: 'last_7_days',
      recommendations: [] as string[],
      statistics: {
        avg_daily_events: Math.round(events.length / 7),
        most_active_hour: this.getMostActiveHour(events),
        fall_detection_trend: this.calculateTrend(
          events.filter((e: any) => e.event_type === 'fall_detection'),
        ),
      },
    };

    // Generate recommendations based on data
    if (insights.statistics.avg_daily_events > 20) {
      insights.recommendations.push('Cân nhắc điều chỉnh ngưỡng phát hiện để giảm false positives');
    }

    if (insights.statistics.fall_detection_trend > 0) {
      insights.recommendations.push('Tăng cường giám sát do xu hướng té ngã tăng');
    }

    // Cache for 10 minutes
    await this._cacheService.set(cacheKey, insights, { ttl: 600 });

    return insights;
  }

  private getMostActiveHour(events: any[]): number {
    const hourCounts = events.reduce((acc, event) => {
      const hour = new Date(event.detected_at).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    const mostActiveHour = Object.keys(hourCounts).reduce(
      (a, b) => (hourCounts[a] > hourCounts[b] ? a : b),
      '0',
    );

    return parseInt(mostActiveHour, 10);
  }

  private calculateTrend(events: any[]): number {
    if (events.length < 2) return 0;

    const sorted = events.sort(
      (a, b) => new Date(a.detected_at).getTime() - new Date(b.detected_at).getTime(),
    );

    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

    return secondHalf.length - firstHalf.length;
  }

  // ====== EVENT UPDATE APPROVAL WORKFLOW METHODS ======

  /**
   * Find event by ID
   */
  async findById(event_id: string) {
    const ev = await this._events.findByIdWithContext(event_id);
    if (!ev) return null;
    return this._normalizeEventForApi(ev);
  }

  /**
   * Normalize event object shape for API responses ensuring snapshot_id and snapshot_url
   * are present and a singular `snapshot` alias is available to avoid mapping confusion.
   */
  private _normalizeEventForApi(row: any) {
    if (!row) return row;
    try {
      // Prefer the event.row.snapshot_id as authoritative. If present, try to
      // derive a cloud_url from the included snapshots.files relationship.
      const snapshotId = row.snapshot_id ?? null;

      // snapshots.files may contain one or more files. Prefer the newest file
      // (by created_at) that has a cloud_url. Fall back to the first item or
      // to row.snapshot_url.
      let snapshotUrl = null;
      const files = row.snapshots?.files;
      if (Array.isArray(files) && files.length > 0) {
        try {
          // Find file with max created_at (newest). created_at may be Date or string.
          let best = files[0];
          let bestTime = best?.created_at ? new Date(best.created_at).getTime() : -Infinity;
          for (const f of files) {
            const t = f?.created_at ? new Date(f.created_at).getTime() : -Infinity;
            if (t > bestTime) {
              best = f;
              bestTime = t;
            }
          }
          snapshotUrl = best?.cloud_url ?? null;
        } catch {
          snapshotUrl = files[0]?.cloud_url ?? null;
        }
      } else {
        snapshotUrl = row.snapshot_url ?? null;
      }

      const snapshot = snapshotId ? { snapshot_id: snapshotId, cloud_url: snapshotUrl } : null;

      return {
        ...row,
        event_type: row.event_type,
        snapshot_id: snapshotId,
        snapshot_url: snapshotUrl,
        snapshot,
      };
    } catch {
      return row;
    }
  }
}
