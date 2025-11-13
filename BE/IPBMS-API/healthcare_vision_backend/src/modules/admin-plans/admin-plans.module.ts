import { Module } from '@nestjs/common';
import { AdminPlansController } from '../../presentation/controllers/admin/plans.controller';
import { AdminPlansService } from '../../application/services/admin/admin-plans.service';
import { AdminPlansRepository } from '../../infrastructure/repositories/admin/admin-plans.repository';
import { CacheModule } from '../cache/cache.module';
import { StringeeModule } from '../stringee/stringee.module';

@Module({
  imports: [CacheModule, StringeeModule],
  controllers: [AdminPlansController],
  providers: [AdminPlansService, AdminPlansRepository],
  exports: [AdminPlansService],
})
export class AdminPlansModule {}
