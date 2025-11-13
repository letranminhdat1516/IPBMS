import { Module } from '@nestjs/common';
import { AdminDashboardService } from '../../application/services/admin/admin-dashboard.service';
import { AdminDashboardController } from '../../presentation/controllers/admin/admin-dashboard.controller';
import { TicketsModule } from '../tickets/tickets.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TicketsModule, UsersModule],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
  exports: [AdminDashboardService],
})
export class AdminDashboardModule {}
