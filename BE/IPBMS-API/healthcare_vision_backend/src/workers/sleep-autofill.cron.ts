// src/workers/sleep-autofill.cron.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { PatientSleepService } from '../application/services/users/patient-sleep.service';

@Injectable()
export class SleepAutofillCron {
  private readonly logger = new Logger(SleepAutofillCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sleepSvc: PatientSleepService,
  ) {}

  // 09:00 Asia/Ho_Chi_Minh mỗi ngày
  @Cron('0 0 9 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async runDaily() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0); // mốc giữa ngày, tránh DST

    // Lấy danh sách user có habit ngủ active
    const userIds: { user_id: string }[] = await (this.prisma as any).patient_habits.findMany({
      where: { habit_type: 'sleep', is_active: true },
      select: { user_id: true },
      distinct: ['user_id'],
      take: 1,
    });

    for (const u of userIds) {
      try {
        await this.sleepSvc.ensureAutofillForDate(u.user_id, yesterday);
      } catch (e) {
        this.logger.warn(`Autofill sleep failed for user=${u.user_id}: ${String(e)}`);
      }
    }
  }
}
