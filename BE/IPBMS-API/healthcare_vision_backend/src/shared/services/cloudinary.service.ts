import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

export interface CloudinaryUpload {
  public_id: string;
  secure_url: string;
  bytes: number;
}

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_KEY,
      api_secret: process.env.CLOUDINARY_SECRET,
    });
  }

  async uploadImage(file: any): Promise<CloudinaryUpload> {
    if (!file) throw new Error('No file uploaded');
    Logger.log(`🚀 Uploading file to Cloudinary: ${file.originalname}`, 'CloudinaryService');
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: 'heathcare_vision' },
          (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
            if (error) {
              Logger.error('❌ Cloudinary error:', String(error), 'CloudinaryService');
              return reject(error);
            }
            if (!result?.secure_url) {
              Logger.error('❌ No secure_url returned', 'CloudinaryService');
              return reject(new Error('Upload failed'));
            }
            resolve({
              public_id: result.public_id,
              secure_url: result.secure_url,
              bytes: result.bytes,
            });
          },
        )
        .end(file.buffer);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
