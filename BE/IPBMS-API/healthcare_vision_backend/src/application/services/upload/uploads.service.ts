import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CloudinaryService } from '../../../shared/services/cloudinary.service';

@Injectable()
export class UploadsService {
  constructor(
    private readonly _prisma: PrismaService,
    private readonly _cloudinaryService: CloudinaryService,
  ) {}

  async uploadFile(file: any, userId: string, uploadType: string = 'other') {
    // Upload to Cloudinary
    const cloudinaryResult = await this._cloudinaryService.uploadImage(file);

    // Normalize and validate uploadType against allowed enum values.
    const allowed = ['camera_error', 'other'];
    const normalized = uploadType && allowed.includes(uploadType) ? uploadType : 'other';

    // Save to database
    const upload = await this._prisma.credential_images.create({
      data: {
        user_id: userId,
        filename: file.originalname,
        mime: file.mimetype,
        size: file.size,
        url: cloudinaryResult.secure_url,
        upload_type: normalized as any,
      },
    });

    return {
      id: upload.upload_id,
      url: upload.url,
      filename: upload.filename,
      mime: upload.mime,
      size: upload.size,
    };
  }

  async getUploadById(uploadId: string) {
    const upload = await this._prisma.credential_images.findUnique({
      where: { upload_id: uploadId },
    });

    if (!upload) {
      throw new Error('Upload not found');
    }

    return {
      id: upload.upload_id,
      user_id: upload.user_id,
      filename: upload.filename,
      mime: upload.mime,
      size: upload.size,
      url: upload.url,
      upload_type: upload.upload_type,
      created_at: upload.created_at,
      metadata: upload.metadata,
    };
  }

  async initializeUploadSession(userId: string, metadata: any) {
    // Generate a simple session ID for now (in production, use proper session management)
    const sessionId = `upload_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      session_id: sessionId,
      user_id: userId,
      status: 'initialized',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      metadata: metadata,
      created_at: new Date(),
    };
  }

  async completeUploadSession(sessionId: string, fileIds: string[]) {
    // In a real implementation, this would validate the session and mark files as complete
    // For now, we'll just return a success response
    return {
      session_id: sessionId,
      status: 'completed',
      completed_at: new Date(),
      file_ids: fileIds,
      total_files: fileIds.length,
    };
  }
}
