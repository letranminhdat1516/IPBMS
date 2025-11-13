import { Injectable, NotFoundException } from '@nestjs/common';
import { events, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class AiProcessingLogsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(event_id: string): Promise<events> {
    const log = await this.prismaService.events.findUnique({
      where: { event_id },
      include: {
        snapshots: true,
        cameras: true,
        user: true,
      },
    });
    if (!log) throw new NotFoundException('AI processing log not found');
    return log;
  }

  findAll(): Promise<events[]> {
    return this.prismaService.events.findMany({
      include: {
        snapshots: true,
        cameras: true,
        user: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(data: Partial<events>): Promise<events> {
    // Transaction SERIALIZABLE: kiểm quota + insert event
    const user_id = data.user_id;
    // Determine AI events quota precedence:
    // 1) subscription.plan_snapshot.features.ai_events_quota
    // 2) subscription.plan_snapshot.ai_events_quota
    // 3) system_config setting 'ai.default_events_quota'
    // 4) fallback default 1000
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));

    return await this.prismaService.$transaction(async (prisma) => {
      const client = prisma as PrismaClient;

      // Resolve quota: check subscription snapshot first
      let ai_events_quota_number: number | null = null;
      try {
        const subscription = await client.subscriptions.findFirst({
          where: { user_id, status: 'active' },
          orderBy: { current_period_end: 'desc' },
        });
        const planSnapshot: any = subscription?.plan_snapshot ?? null;
        if (planSnapshot) {
          ai_events_quota_number =
            (planSnapshot?.features && planSnapshot.features.ai_events_quota) ||
            planSnapshot?.ai_events_quota ||
            null;
          if (ai_events_quota_number !== null && typeof ai_events_quota_number === 'string') {
            const parsed = parseInt(ai_events_quota_number as unknown as string, 10);
            ai_events_quota_number = isNaN(parsed) ? null : parsed;
          }
        }
      } catch (err) {
        void err;
        // ignore and fallback to system config
      }

      if (ai_events_quota_number === null) {
        try {
          const sys = await client.system_config.findUnique({
            where: { setting_key: 'ai.default_events_quota' },
          });
          if (sys && sys.setting_value) {
            const parsed = parseInt(sys.setting_value, 10);
            ai_events_quota_number = isNaN(parsed) ? null : parsed;
          }
        } catch (err) {
          void err;
          // ignore
        }
      }

      if (ai_events_quota_number === null) ai_events_quota_number = 1000;

      // Đếm số event trong tháng hiện tại
      const total = await client.events.count({
        where: {
          user_id,
          detected_at: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
      });

      if (total >= ai_events_quota_number) {
        throw new Error('Vượt quota AI events');
      }

      // Insert event
      const saved = await client.events.create({
        data: data as any,
        include: {
          snapshots: true,
          cameras: true,
          user: true,
        },
      });

      return saved;
    });
  }

  async update(event_id: string, data: Partial<events>): Promise<events> {
    const updated = await this.prismaService.events.update({
      where: { event_id },
      data: data as any,
      include: {
        snapshots: true,
        cameras: true,
        user: true,
      },
    });
    if (!updated) throw new NotFoundException('AI processing log not found');
    return updated;
  }

  async remove(event_id: string) {
    return this.prismaService.events.delete({
      where: { event_id },
    });
  }
}
