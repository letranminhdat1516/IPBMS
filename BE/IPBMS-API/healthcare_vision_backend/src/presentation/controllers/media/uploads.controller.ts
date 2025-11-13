import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../application/dto/shared/error-response.dto';
import { UploadsService } from '../../../application/services/upload/uploads.service';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { getUserIdFromReq } from '../../../shared/utils/auth.util';
import type { AuthenticatedRequest } from '../../../shared/types/auth.types';
import { createBadRequestException } from '../../../shared/utils';

@ApiTags('uploads')
@Controller('credential_images')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(private readonly _uploadsService: UploadsService) {}

  @Post()
  @ApiOperation({
    summary: 'Upload file (multipart/form-data)',
    description:
      'Upload một file (hỗ trợ image/other). Trả về metadata file (id, url, filename, mime, size). Frontend nên lấy id/url để đính kèm vào ticket attachments.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        upload_type: {
          type: 'string',
          example: 'attachment',
          description: 'Optional tag for upload type',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Uploaded file metadata',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' },
        url: { type: 'string', example: 'https://res.cloudinary.com/.../photo.png' },
        filename: { type: 'string', example: 'photo.png' },
        mime: { type: 'string', example: 'image/png' },
        size: { type: 'number', example: 204800 },
      },
    },
  })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: any,
    @Body('upload_type') uploadType?: string,
  ) {
    const userId = getUserIdFromReq(req);
    this.logger.log(
      `📥 [UPLOAD] incoming upload request user=${userId} upload_type=${uploadType || 'unspecified'}`,
    );

    // Ensure a file was uploaded by the client. If FileInterceptor didn't
    // attach a file, return a descriptive 400 error instead of letting the
    // Cloudinary service throw a 500.
    if (!file) {
      this.logger.warn(`⚠️ [UPLOAD] No file attached in request for user=${userId}`);
      throw createBadRequestException(
        'Không có file được tải lên. Vui lòng gửi multipart/form-data với field tên "file"',
        'UPLOAD_NO_FILE',
      );
    }

    const normalizedUploadType =
      uploadType && uploadType.trim() !== '' ? uploadType.trim() : undefined;

    return this._uploadsService.uploadFile(file, userId, normalizedUploadType);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy metadata upload theo id' })
  @ApiOkResponse({ description: 'Upload metadata', schema: { type: 'object' } })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  async getUpload(@Param('id') uploadId: string) {
    return this._uploadsService.getUploadById(uploadId);
  }

  @Post('init')
  @ApiOperation({ summary: 'Khởi tạo upload session (optional)' })
  @ApiCreatedResponse({ description: 'Initialized upload session', schema: { type: 'object' } })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  async initializeUpload(@Req() req: AuthenticatedRequest, @Body() metadata: any) {
    const userId = getUserIdFromReq(req);
    return this._uploadsService.initializeUploadSession(userId, metadata);
  }

  @Put(':id/complete')
  @ApiOperation({ summary: 'Hoàn tất upload session (optional)' })
  @ApiOkResponse({ description: 'Completed upload session', schema: { type: 'object' } })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  async completeUpload(@Param('id') sessionId: string, @Body() body: { file_ids: string[] }) {
    return this._uploadsService.completeUploadSession(sessionId, body.file_ids);
  }
}
