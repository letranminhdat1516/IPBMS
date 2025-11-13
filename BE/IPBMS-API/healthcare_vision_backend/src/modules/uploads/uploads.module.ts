import { Module } from '@nestjs/common';
import { UploadsController } from '../../presentation/controllers/media/uploads.controller';
import { UploadsService } from '../../application/services/upload/uploads.service';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
