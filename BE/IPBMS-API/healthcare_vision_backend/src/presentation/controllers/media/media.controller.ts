import { Controller, Get, Logger, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ErrorResponseDto } from '../../../application/dto/shared/error-response.dto';
import { AccessControlService } from '../../../application/services/access-control.service';
import ErrorCodes from '../../../shared/constants/error-codes';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { createForbiddenException } from '../../../shared/utils';
import { MediaSwagger } from '../../../swagger/media.swagger';

@ApiTags('media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'caregiver', 'customer')
@Controller('media')
export class MediaController {
  constructor(private readonly _acl: AccessControlService) {}

  private async enforceSnapshotAccess(req: any, snapshotId: string) {
    const requester = {
      id: req?.user?.userId as string,
      role: req?.user?.role as string,
    };
    const ok = await this._acl.canAccessSnapshot(requester, snapshotId);
    if (!ok) {
      throw createForbiddenException(
        'Không được phép truy cập snapshot',
        ErrorCodes.SNAPSHOT_FORBIDDEN,
      );
    }
  }

  @Get('snapshots/:id')
  @MediaSwagger.getSnapshot
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  async getSnapshot(@Param('id') id: string, @Res() res: Response, @Req() req: any) {
    await this.enforceSnapshotAccess(req, id);
    const png1x1 = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAoMBgLw9eG8AAAAASUVORK5CYII=',
      'base64',
    );
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.send(png1x1);
  }

  @Get('snapshots/:id/signed-url')
  @MediaSwagger.getSnapshotSignedUrl
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  async getSnapshotSignedUrl(@Param('id') id: string, @Req() req: any) {
    await this.enforceSnapshotAccess(req, id);
    const base = process.env.PUBLIC_MEDIA_BASE_URL ?? '';
    const url = `${base}/media/snapshots/${id}`;
    return { url };
  }

  @Get('snapshots')
  @ApiQuery({ name: 'ids', required: true, description: 'Comma-separated snapshot ids' })
  @MediaSwagger.getSnapshots
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  async getSnapshots(@Query('ids') ids: string, @Req() req: any) {
    if (!ids) {
      return { snapshots: [] };
    }

    const snapshotIds = ids
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id);
    const snapshots = [];

    for (const id of snapshotIds) {
      try {
        await this.enforceSnapshotAccess(req, id);
        snapshots.push({
          id,
          url: `${process.env.PUBLIC_MEDIA_BASE_URL ?? ''}/media/snapshots/${id}`,
        });
      } catch {
        // Skip snapshots that user doesn't have access to
        Logger.warn(`User does not have access to snapshot ${id}`, 'MediaController');
      }
    }

    return { snapshots };
  }

  @Get('devices/:deviceId/thumbnail')
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  async getDeviceThumbnail(@Param('deviceId') deviceId: string, @Req() req: any) {
    // For now, return the same as snapshot
    // In a real implementation, this would get device-specific thumbnail
    await this.enforceSnapshotAccess(req, deviceId);
    const base = process.env.PUBLIC_MEDIA_BASE_URL ?? '';
    const url = `${base}/media/devices/${deviceId}/thumbnail`;
    return { url, device_id: deviceId };
  }
}
