import { Module } from '@nestjs/common';
import { PermissionsService } from '../../application/services/permissions.service';
import { PermissionsController } from '../../presentation/controllers/permissions/permissions.controller';
import { RepositoriesModule } from '../../infrastructure/repositories/repositories.module';

@Module({
  imports: [RepositoriesModule],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
