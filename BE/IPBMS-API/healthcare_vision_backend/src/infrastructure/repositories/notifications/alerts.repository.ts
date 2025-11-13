import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';
import { Alert } from '../../../core/entities/alerts.entity';

@Injectable()
export class AlertsRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async findAlertById(alert_id: string): Promise<Alert | null> {
    return super.findById<Alert>('notifications', alert_id);
  }

  async findAllAlerts(): Promise<Alert[]> {
    const result = await super.paginate<Alert>('notifications', { take: 1000 });
    return result.data as Alert[];
  }

  async createAlert(data: Partial<Alert>): Promise<Alert> {
    return super.createRecord<Alert>('notifications', data);
  }

  async updateAlert(alert_id: string, data: Partial<Alert>): Promise<Alert | null> {
    return super.updateRecord<Alert>('notifications', alert_id, data);
  }

  async removeAlert(alert_id: string): Promise<{ deleted: boolean }> {
    try {
      await super.hardDelete<Alert>('notifications', alert_id);
      return { deleted: true };
    } catch {
      return { deleted: false };
    }
  }

  async getAlertsByPatientAndDateRange(
    customerId: string,
    start: Date,
    end: Date,
  ): Promise<Alert[]> {
    const result = await super.paginate<Alert>('notifications', {
      where: {
        user_id: customerId,
        created_at: {
          gte: start,
          lte: end,
        },
      },
      take: 1000,
    });
    return result.data as Alert[];
  }

  // Service interface methods
  async findAlertByIdPublic(alert_id: string): Promise<Alert | null> {
    return this.findAlertById(alert_id);
  }

  async findAll(): Promise<Alert[]> {
    return this.findAllAlerts();
  }

  async create(data: Partial<Alert>): Promise<Alert> {
    return this.createAlert(data);
  }

  async update(alert_id: string, data: Partial<Alert>): Promise<Alert | null> {
    return this.updateAlert(alert_id, data);
  }

  async remove(alert_id: string): Promise<{ deleted: boolean }> {
    return this.removeAlert(alert_id);
  }
}
