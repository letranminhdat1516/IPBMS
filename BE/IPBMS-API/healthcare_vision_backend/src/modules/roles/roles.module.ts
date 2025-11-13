import { Module } from '@nestjs/common';
import { RolesService } from '../../application/services/roles.service';
import { RolesController } from '../../presentation/controllers/system/roles.controller';
import { RepositoriesModule } from '../../infrastructure/repositories/repositories.module';

@Module({
  imports: [RepositoriesModule],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
