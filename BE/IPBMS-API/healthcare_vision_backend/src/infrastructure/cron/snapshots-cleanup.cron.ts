// src/infrastructure/cron/snapshots-cleanup.cron.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, capture_type_enum } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { SystemConfigService } from '../../application/services/system/system-config.service';
import { CloudinaryService } from '../../shared/services/cloudinary.service';

type SnapshotWithImages = Prisma.snapshotsGetPayload<{
  include: { files: true };
}>;

@Injectable()
export class SnapshotsCleanupCron {
  private readonly logger = new Logger(SnapshotsCleanupCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly systemSettings: SystemConfigService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // 🧹 cleanup lúc 03:00 sáng UTC mỗi ngày
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCleanup() {
    this.logger.log('🧹 Starting daily cleanup for snapshots...');

    try {
      const normalDays = (await this.systemSettings.getInt('image.normal_retention_days')) ?? 30;
      const alertDays = (await this.systemSettings.getInt('image.alert_retention_days')) ?? 90;

      const now = new Date();
      const cutoffNormal = new Date(now.getTime() - normalDays * 86400000);
      const cutoffAlert = new Date(now.getTime() - alertDays * 86400000);

      // lấy snapshot quá hạn (scheduled ~ thường, alert_triggered ~ alert)
      const expired: SnapshotWithImages[] = await this.prisma.snapshots.findMany({
        where: {
          OR: [
            {
              capture_type: capture_type_enum.scheduled,
              captured_at: { lt: cutoffNormal },
            },
            {
              capture_type: capture_type_enum.alert_triggered,
              captured_at: { lt: cutoffAlert },
            },
          ],
        },
        include: { files: true },
      });

      this.logger.debug(`🔍 Found ${expired.length} expired snapshots`);

      // xoá ảnh Cloudinary + record DB
      for (const snap of expired) {
        for (const img of snap.files) {
          if (img.image_path) {
            await this.cloudinary.deleteImage(img.image_path);
          }
        }
        await this.prisma.snapshot_files.deleteMany({
          where: { snapshot_id: snap.snapshot_id },
        });
        await this.prisma.snapshots.delete({
          where: { snapshot_id: snap.snapshot_id },
        });
      }

      this.logger.log(
        `✅ Snapshots cleanup finished. Removed ${expired.length} snapshots (normal>${normalDays}d, alert>${alertDays}d)`,
      );
    } catch (err: unknown) {
      const error = err instanceof Error ? (err.stack ?? err.message) : JSON.stringify(err);
      this.logger.error('❌ Failed to cleanup snapshots', error);
    }
  }
}
