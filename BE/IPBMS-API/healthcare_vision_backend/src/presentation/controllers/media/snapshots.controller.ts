import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Query,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiForbiddenResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../application/dto/shared/error-response.dto';
import { CreateSnapshotDto } from '../../../application/dto/snapshots/create-snapshot.dto';
import { SnapshotsService } from '../../../application/services/snapshots.service';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { SnapshotsSwagger } from '../../../swagger/snapshots.swagger';
import { timeUtils } from '../../../shared/constants/time.constants';
import { Response } from 'express';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'caregiver', 'customer')
@ApiTags('snapshots')
@Controller('snapshots')
export class SnapshotsController {
  private readonly logger = new Logger(SnapshotsController.name);
  constructor(private readonly service: SnapshotsService) {}

  @Post()
  @SnapshotsSwagger.create
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @LogActivity({
    action: 'create_snapshot',
    action_enum: ActivityAction.CREATE,
    message: 'Tạo snapshot mới',
    resource_type: 'snapshot',
    severity: ActivitySeverity.LOW,
  })
  @UseInterceptors(FilesInterceptor('image_files', 20))
  async create(@Body() dto: CreateSnapshotDto, @UploadedFiles() files?: any[]) {
    const snapshot = await this.service.createWithImages(dto, files);
    const urls = (((snapshot as any).files || []) as any[])
      .map((f: any) => f.cloud_url)
      .filter(Boolean);
    this.logger.log(`Snapshot created with files: ${urls.join(', ')}`);
    const snapshotWithLocal = {
      ...snapshot,
      captured_at_local: timeUtils.toTimezoneIsoString(snapshot.captured_at),
      processed_at_local: timeUtils.toTimezoneIsoString(snapshot.processed_at),
      uploaded_urls: urls,
    } as any;
    return { message: 'Tạo snapshot thành công', snapshot: snapshotWithLocal };
  }

  @Get('images')
  async listImages(
    @Query('user_id') user_id?: string,
    @Query('camera_id') camera_id?: string,
    @Query('limit') limit?: string,
  ) {
    const take = limit ? Number(limit) : 200;
    const snaps = await this.service.findImages({
      userId: user_id,
      cameraId: camera_id,
      limit: take,
    });
    // Flatten files into array with snapshot metadata
    const images: any[] = [];
    for (const s of snaps) {
      const base = {
        snapshot_id: s.snapshot_id,
        camera_id: s.camera_id,
        user_id: s.user_id,
        captured_at: s.captured_at,
        captured_at_local: timeUtils.toTimezoneIsoString(s.captured_at),
        processed_at: s.processed_at,
        processed_at_local: timeUtils.toTimezoneIsoString(s.processed_at),
      } as any;
      for (const f of (s.files || []) as any[]) {
        images.push({
          ...base,
          image_id: f.image_id,
          image_path: f.image_path,
          cloud_url: f.cloud_url,
          is_primary: f.is_primary,
          file_size: f.file_size?.toString?.() ?? f.file_size,
          file_created_at: f.created_at,
        });
      }
    }
    return { images };
  }

  @Get(':id/image/:image_id')
  async getImage(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('image_id', new ParseUUIDPipe({ version: '4' })) image_id: string,
    @Res() res: Response,
  ) {
    const snapshot = await this.service.findById(id);
    const file = (((snapshot as any).files || []) as any[]).find(
      (f: any) => f.image_id === image_id,
    );
    if (!file) throw new NotFoundException('Không tìm thấy ảnh');
    if (file.cloud_url) return res.redirect(file.cloud_url);
    throw new NotFoundException('URL ảnh không khả dụng');
  }

  @Post(':id/images')
  @SnapshotsSwagger.addImages
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @LogActivity({
    action: 'add_snapshot_images',
    action_enum: ActivityAction.UPDATE,
    message: 'Thêm ảnh vào snapshot',
    resource_type: 'snapshot',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  @UseInterceptors(FilesInterceptor('image_files', 20))
  async addImages(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @UploadedFiles() files: any[],
  ) {
    const snapshot = await this.service.addImages(id, files);
    const urls = (((snapshot as any).files || []) as any[])
      .map((f: any) => f.cloud_url)
      .filter(Boolean);
    this.logger.log(`Added ${files.length} image(s) to snapshot ${id}: ${urls.join(', ')}`);
    const snapshotWithLocal = {
      ...snapshot,
      captured_at_local: timeUtils.toTimezoneIsoString(snapshot.captured_at),
      processed_at_local: timeUtils.toTimezoneIsoString(snapshot.processed_at),
      uploaded_urls: urls,
    } as any;
    return { message: `Đã thêm ${files.length} ảnh`, snapshot: snapshotWithLocal };
  }

  @Put(':id/images')
  @SnapshotsSwagger.replaceImages
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @LogActivity({
    action: 'replace_snapshot_images',
    action_enum: ActivityAction.UPDATE,
    message: 'Thay thế toàn bộ ảnh của snapshot',
    resource_type: 'snapshot',
    resource_id: 'id',
    severity: ActivitySeverity.HIGH,
  })
  @UseInterceptors(FilesInterceptor('image_files', 20))
  async replaceImages(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @UploadedFiles() files: any[],
  ) {
    const snapshot = await this.service.replaceImages(id, files);
    const urls = (((snapshot as any).files || []) as any[])
      .map((f: any) => f.cloud_url)
      .filter(Boolean);
    this.logger.log(`Replaced images for snapshot ${id}: ${urls.join(', ')}`);
    const snapshotWithLocal = {
      ...snapshot,
      captured_at_local: timeUtils.toTimezoneIsoString(snapshot.captured_at),
      processed_at_local: timeUtils.toTimezoneIsoString(snapshot.processed_at),
      uploaded_urls: urls,
    } as any;
    return { message: 'Đã thay thế toàn bộ ảnh', snapshot: snapshotWithLocal };
  }

  @Delete(':id/images/:image_id')
  @SnapshotsSwagger.removeImage
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @LogActivity({
    action: 'delete_snapshot_image',
    action_enum: ActivityAction.DELETE,
    message: 'Xoá 1 ảnh trong snapshot',
    resource_type: 'snapshot',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async removeImage(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('image_id', new ParseUUIDPipe({ version: '4' })) image_id: string,
  ) {
    await this.service.removeImage(id, image_id);
    return { message: 'Ảnh đã được xóa' };
  }

  @Get(':id')
  async get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const snapshot = await this.service.findById(id);
    const urls = (((snapshot as any).files || []) as any[])
      .map((f: any) => f.cloud_url)
      .filter(Boolean);
    const snapshotWithLocal = {
      ...snapshot,
      captured_at_local: timeUtils.toTimezoneIsoString(snapshot.captured_at),
      processed_at_local: timeUtils.toTimezoneIsoString(snapshot.processed_at),
      uploaded_urls: urls,
    } as any;
    return { snapshot: snapshotWithLocal };
  }

  @Delete(':id')
  @SnapshotsSwagger.remove
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @LogActivity({
    action: 'delete_snapshot',
    action_enum: ActivityAction.DELETE,
    message: 'Xoá snapshot',
    resource_type: 'snapshot',
    resource_id: 'id',
    severity: ActivitySeverity.HIGH,
  })
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    await this.service.removeSnapshot(id);
    return { message: 'Snapshot deleted successfully' };
  }
}
