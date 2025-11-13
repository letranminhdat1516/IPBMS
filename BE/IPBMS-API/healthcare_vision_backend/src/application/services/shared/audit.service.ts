import { Injectable, Logger } from '@nestjs/common';
import { AuditRepository } from '../../../infrastructure/repositories/shared/audit.repository';
import { ActivityLog } from '../../../core/entities/activity_logs.entity';

export interface CreateAuditEventDto {
  actor_id?: string;
  actor_name?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  resource_name?: string;
  message?: string;
  severity?: string;
  metadata?: Record<string, any>;
}

export interface AuditEventSummary {
  total_events: number;
  events_by_action: Record<string, number>;
  events_by_resource_type: Record<string, number>;
  recent_events: ActivityLog[];
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly _auditRepository: AuditRepository) {}

  async createEvent(dto: CreateAuditEventDto): Promise<ActivityLog> {
    try {
      const auditEvent = await this._auditRepository.create({
        actor_id: dto.actor_id,
        actor_name: dto.actor_name,
        action: dto.action,
        resource_type: dto.resource_type,
        resource_id: dto.resource_id,
        resource_name: dto.resource_name,
        message: dto.message,
      });

      this.logger.log(`Audit event created: ${dto.action} on ${dto.resource_type}`);
      return auditEvent;
    } catch (error) {
      this.logger.error(
        `Failed to create audit event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getUserEvents(userId: string, limit: number = 50): Promise<ActivityLog[]> {
    try {
      return await this._auditRepository.findByActorId(userId, limit);
    } catch (error) {
      this.logger.error(
        `Failed to get user audit events: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getUserSummary(userId: string): Promise<AuditEventSummary> {
    try {
      const events = await this._auditRepository.findByActorId(userId, 100);

      const eventsByAction = events.reduce(
        (acc, event) => {
          acc[event.action || 'unknown'] = (acc[event.action || 'unknown'] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const eventsByResourceType = events.reduce(
        (acc, event) => {
          acc[event.resource_type || 'unknown'] = (acc[event.resource_type || 'unknown'] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        total_events: events.length,
        events_by_action: eventsByAction,
        events_by_resource_type: eventsByResourceType,
        recent_events: events.slice(0, 10),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get user audit summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getAllEvents(limit: number = 100): Promise<ActivityLog[]> {
    try {
      return await this._auditRepository.findAll(limit);
    } catch (error) {
      this.logger.error(
        `Failed to get all audit events: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getEventsByAction(action: string, limit: number = 50): Promise<ActivityLog[]> {
    try {
      return await this._auditRepository.findByAction(action, limit);
    } catch (error) {
      this.logger.error(
        `Failed to get audit events by action: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getEventsByResourceType(resourceType: string, limit: number = 50): Promise<ActivityLog[]> {
    try {
      return await this._auditRepository.findByResourceType(resourceType, limit);
    } catch (error) {
      this.logger.error(
        `Failed to get audit events by resource type: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
