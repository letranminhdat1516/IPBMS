import { Module } from '@nestjs/common';
import { AdminUsersService } from '../../application/services/admin/admin-users.service';
import { AdminUsersController } from '../../presentation/controllers/admin/users.controller';
import { QuotaModule } from '../quota/quota.module';
import { AdminPlansModule } from '../admin-plans/admin-plans.module';

@Module({
  imports: [QuotaModule, AdminPlansModule],
  controllers: [AdminUsersController],
  providers: [AdminUsersService],
  exports: [AdminUsersService],
})
export class AdminUsersModule {}
