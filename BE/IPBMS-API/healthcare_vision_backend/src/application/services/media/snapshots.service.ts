import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient, snapshots } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { SnapshotsRepository } from '../../../infrastructure/repositories/media/snapshots.repository';
import { CloudinaryService } from '../../../shared/services/cloudinary.service';
import { SystemConfigService } from '../system/system-config.service';
import { UserPreferencesService } from '../users/user-preferences.service';

@Injectable()
export class SnapshotsService {
  private readonly logger = new Logger(SnapshotsService.name);

  constructor(
    private readonly repo: SnapshotsRepository,
    private readonly cloudinary: CloudinaryService,
    private readonly prismaService: PrismaService,
    private readonly systemSettings: SystemConfigService,
    private readonly userPreferences: UserPreferencesService,
  ) {}

  /** Helper: check image.enabled (user override > system) */
  private async isImageEnabled(userId?: string): Promise<boolean> {
    // 1) Try strict form: category=image, key=enabled
    if (userId) {
      let override = await this.userPreferences.getBoolean(userId, 'enabled', 'image'); // <-- thêm tham số category
      if (override === undefined) override = null as unknown as boolean; // coerce
      if (override !== null) return override;

      // 2) Backward-compat: key='image.enabled' (không category)
      override = await this.userPreferences.getBoolean(userId, 'image.enabled');
      if (override === undefined) override = null as unknown as boolean;
      if (override !== null) return override;
    }

    // 3) System setting (strict)
    let sys = await this.systemSettings.getBoolean('image.enabled');
    if (sys === undefined || sys === null) {
      // Backward-compat thêm một key khác nếu trước đây dùng 'media.saveSnapshots'
      const alt = await this.systemSettings.getBoolean('media.saveSnapshots');
      if (typeof alt === 'boolean') sys = alt;
    }
    return !!sys; // coerce undefined/null -> false
  }
  async findById(snapshot_id: string): Promise<snapshots> {
    const snap = await this.prismaService.snapshots.findUnique({
      where: { snapshot_id },
      include: { files: true },
    });
    if (!snap) throw new NotFoundException('Không tìm thấy snapshot');
    return snap;
  }

  async findAll(): Promise<snapshots[]> {
    return this.prismaService.snapshots.findMany({
      include: { files: true },
      orderBy: { captured_at: 'desc' },
      take: 200,
    });
  }

  /**
   * Find images (snapshot_files) by user_id or camera_id.
   * Returns snapshots with their files (filtered and ordered).
   */
  async findImages(options: { userId?: string; cameraId?: string; limit?: number } = {}) {
    const where: any = {};
    if (options.userId) where.user_id = options.userId;
    if (options.cameraId) where.camera_id = options.cameraId;
    const take = options.limit ?? 200;
    return this.prismaService.snapshots.findMany({
      where,
      include: { files: { orderBy: { created_at: 'asc' } } },
      orderBy: { captured_at: 'desc' },
      take,
    });
  }

  /** Tạo snapshot + ảnh */
  async createWithImages(data: Partial<snapshots>, files?: any[]): Promise<snapshots> {
    const userId = data.user_id;
    const cameraId = data.camera_id;
    if (!userId) throw new BadRequestException('Trường user_id là bắt buộc');
    if (!cameraId) throw new BadRequestException('Trường camera_id là bắt buộc');

    // Validate camera exists to avoid Prisma foreign key constraint errors
    const camera = await this.prismaService.cameras.findUnique({ where: { camera_id: cameraId } });
    if (!camera) {
      throw new NotFoundException(`Không tìm thấy camera: ${cameraId}`);
    }

    // 1) Kiểm flag
    const enabled = await this.isImageEnabled(userId);
    if (!enabled) throw new ForbiddenException('🛑 Lưu ảnh đã bị vô hiệu hóa bởi cài đặt');

    // 2) Upload ảnh TRƯỚC (ngoài transaction)
    const uploads: Array<{ public_id: string; secure_url: string; bytes: number }> = [];
    if (files?.length) {
      // upload song song để nhanh hơn (giữ thứ tự)
      const results = await Promise.all(files.map((f) => this.cloudinary.uploadImage(f as any)));
      for (const up of results) {
        uploads.push({
          public_id: up.public_id,
          secure_url: up.secure_url,
          bytes: up.bytes,
        });
      }
    }

    try {
      // 3) Transaction NGẮN: tạo snapshot + insert rows
      const snapshot = await this.prismaService.$transaction(
        async (prisma) => {
          const created = await prisma.snapshots.create({
            data: {
              ...data,
              processed_at: data.processed_at ?? new Date(),
              capture_type: data.capture_type ?? ('alert_triggered' as any),
            } as any,
          });

          if (uploads.length) {
            let first = true;
            for (const up of uploads) {
              await prisma.snapshot_files.create({
                data: {
                  snapshot_id: created.snapshot_id,
                  image_path: up.public_id,
                  cloud_url: up.secure_url,
                  file_size: BigInt(up.bytes),
                  is_primary: first,
                } as any,
              });
              first = false;
            }
          }

          return prisma.snapshots.findUnique({
            where: { snapshot_id: created.snapshot_id },
            include: { files: { orderBy: { created_at: 'asc' } } },
          });
        },
        // (tuỳ chọn) có thể tăng timeout 60s — nhưng vẫn nên giữ tx ngắn như trên
        { timeout: 60_000, maxWait: 5_000 },
      );

      return snapshot as snapshots;
    } catch (err) {
      // 4) Nếu transaction fail, xoá ảnh Cloudinary đã upload để không bị orphan
      if (uploads.length) {
        for (const up of uploads) {
          try {
            await this.cloudinary.deleteImage(up.public_id);
          } catch (e) {
            this.logger.warn(
              `[createWithImages] cleanup cloudinary failed: ${up.public_id} -> ${String(e)}`,
            );
          }
        }
      }
      throw err;
    }
  }

  /** Thêm ảnh */
  async addImages(snapshot_id: string, files: any[]): Promise<snapshots> {
    const exists = await this.prismaService.snapshots.findUnique({
      where: { snapshot_id },
    });
    if (!exists) throw new NotFoundException(`Không tìm thấy snapshot ${snapshot_id}`);

    const enabled = await this.isImageEnabled(exists.user_id ?? undefined);
    if (!enabled) {
      throw new ForbiddenException('🛑 Image saving disabled by settings');
    }

    return this.prismaService.$transaction(async (prisma) => {
      const client = prisma as PrismaClient;
      // When adding images, create them and mark the last uploaded as primary
      for (const file of files) {
        const up = await this.cloudinary.uploadImage(file as any);
        await client.snapshot_files.create({
          data: {
            snapshot_id,
            image_path: up.public_id,
            cloud_url: up.secure_url,
            file_size: BigInt(up.bytes),
            is_primary: true,
          } as any,
        } as any);
        // unset previous primary images for this snapshot so only one primary remains
        await client.snapshot_files.updateMany({
          where: { snapshot_id, is_primary: true, NOT: { image_path: up.public_id } } as any,
          data: { is_primary: false } as any,
        } as any);
      }
      return (await client.snapshots.findUnique({
        where: { snapshot_id },
        include: { files: { orderBy: { created_at: 'asc' } } },
      })) as snapshots;
    });
  }

  /** Thay toàn bộ ảnh */
  async replaceImages(snapshot_id: string, files: any[]): Promise<snapshots> {
    return this.prismaService.$transaction(async (prisma) => {
      const client = prisma as PrismaClient;
      const snap = await client.snapshots.findUnique({
        where: { snapshot_id },
        include: { files: true },
      });
      if (!snap) throw new NotFoundException('Không tìm thấy snapshot');

      const enabled = await this.isImageEnabled(snap.user_id ?? undefined);
      if (!enabled) {
        throw new ForbiddenException('🛑 Lưu ảnh đã bị vô hiệu hóa bởi cài đặt');
      }

      // xoá ảnh cũ
      for (const img of snap.files) {
        if (img.image_path) await this.cloudinary.deleteImage(img.image_path);
      }
      await client.snapshot_files.deleteMany({ where: { snapshot_id } });

      // thêm mới - mark first new file as primary and others non-primary
      let first = true;
      for (const file of files) {
        const up = await this.cloudinary.uploadImage(file as any);
        await client.snapshot_files.create({
          data: {
            snapshot_id,
            image_path: up.public_id,
            cloud_url: up.secure_url,
            file_size: BigInt(up.bytes),
            is_primary: first,
          } as any,
        } as any);
        if (first) {
          // unset any previous primary images
          await client.snapshot_files.updateMany({
            where: { snapshot_id, NOT: { image_path: up.public_id } } as any,
            data: { is_primary: false } as any,
          } as any);
        }
        first = false;
      }

      return (await client.snapshots.findUnique({
        where: { snapshot_id },
        include: { files: { orderBy: { created_at: 'asc' } } },
      })) as snapshots;
    });
  }

  /** Xoá 1 ảnh */
  async removeImage(snapshot_id: string, image_id: string): Promise<void> {
    const img = (await this.prismaService.snapshot_files.findUnique({
      where: { image_id },
    })) as any;
    if (!img || img.snapshot_id !== snapshot_id) {
      throw new NotFoundException('Không tìm thấy ảnh');
    }
    if (img.image_path) await this.cloudinary.deleteImage(img.image_path);
    await this.prismaService.$transaction(async (prisma) => {
      await prisma.snapshot_files.delete({ where: { image_id } });
      // If deleted image was primary, promote the newest remaining to primary
      if ((img as any).is_primary) {
        const remaining = (await prisma.snapshot_files.findMany({
          where: { snapshot_id },
          orderBy: { created_at: 'desc' },
          take: 1,
        })) as any[];
        if (remaining.length) {
          await prisma.snapshot_files.update({
            where: { image_id: remaining[0].image_id },
            data: { is_primary: true } as any,
          } as any);
        }
      }
    });
  }

  /** Xoá snapshot (xoá cả ảnh Cloudinary) */
  async removeSnapshot(snapshot_id: string): Promise<void> {
    return this.prismaService.$transaction(async (prisma) => {
      const client = prisma as PrismaClient;
      const imgs = await client.snapshot_files.findMany({ where: { snapshot_id } });

      for (const img of imgs) {
        if (img.image_path) await this.cloudinary.deleteImage(img.image_path);
      }

      const deleted = await client.snapshots.delete({ where: { snapshot_id } });
      if (!deleted) throw new NotFoundException('Không tìm thấy snapshot');
    });
  }
}
