import { Injectable } from '@nestjs/common';
import { ActivityLog } from '../../../core/entities/activity_logs.entity';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from './base-prisma.repository';

@Injectable()
export class AuditRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async create(data: Partial<ActivityLog>): Promise<ActivityLog> {
    const result = await this.prisma.activity_logs.create({
      data: {
        actor_id: data.actor_id,
        actor_name: data.actor_name,
        action: data.action || '',
        resource_type: data.resource_type,
        resource_id: data.resource_id,
        resource_name: data.resource_name,
        message: data.message,
        timestamp: new Date(),
      },
    });

    return {
      id: result.id,
      timestamp: result.timestamp,
      actor_id: result.actor_id,
      actor_name: result.actor_name,
      action: result.action,
      resource_type: result.resource_type,
      resource_id: result.resource_id,
      resource_name: result.resource_name,
      message: result.message,
    } as ActivityLog;
  }

  async findByIdAudit(id: string): Promise<ActivityLog | null> {
    const result = await this.prisma.activity_logs.findUnique({
      where: { id },
    });

    if (!result) return null;

    return {
      id: result.id,
      timestamp: result.timestamp,
      actor_id: result.actor_id,
      actor_name: result.actor_name,
      action: result.action,
      resource_type: result.resource_type,
      resource_id: result.resource_id,
      resource_name: result.resource_name,
      message: result.message,
    } as ActivityLog;
  }

  async findByActorId(actorId: string, limit: number = 50): Promise<ActivityLog[]> {
    const results = await this.prisma.activity_logs.findMany({
      where: { actor_id: actorId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return results.map((result) => ({
      id: result.id,
      timestamp: result.timestamp,
      actor_id: result.actor_id,
      actor_name: result.actor_name,
      action: result.action,
      resource_type: result.resource_type,
      resource_id: result.resource_id,
      resource_name: result.resource_name,
      message: result.message,
    })) as ActivityLog[];
  }

  async findAll(limit: number = 100): Promise<ActivityLog[]> {
    const results = await this.prisma.activity_logs.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return results.map((result) => ({
      id: result.id,
      timestamp: result.timestamp,
      actor_id: result.actor_id,
      actor_name: result.actor_name,
      action: result.action,
      resource_type: result.resource_type,
      resource_id: result.resource_id,
      resource_name: result.resource_name,
      message: result.message,
    })) as ActivityLog[];
  }

  async findByAction(action: string, limit: number = 50): Promise<ActivityLog[]> {
    const results = await this.prisma.activity_logs.findMany({
      where: { action },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return results.map((result) => ({
      id: result.id,
      timestamp: result.timestamp,
      actor_id: result.actor_id,
      actor_name: result.actor_name,
      action: result.action,
      resource_type: result.resource_type,
      resource_id: result.resource_id,
      resource_name: result.resource_name,
      message: result.message,
    })) as ActivityLog[];
  }

  async findByResourceType(resourceType: string, limit: number = 50): Promise<ActivityLog[]> {
    const results = await this.prisma.activity_logs.findMany({
      where: { resource_type: resourceType },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return results.map((result) => ({
      id: result.id,
      timestamp: result.timestamp,
      actor_id: result.actor_id,
      actor_name: result.actor_name,
      action: result.action,
      resource_type: result.resource_type,
      resource_id: result.resource_id,
      resource_name: result.resource_name,
      message: result.message,
    })) as ActivityLog[];
  }
}
