import { Module } from '@nestjs/common';
import { QuotaService } from '../../application/services/admin/quota.service';
import { QuotaController } from '../../presentation/controllers/system/quota.controller';
import { RepositoriesModule } from '../../infrastructure/repositories/repositories.module';

@Module({
  imports: [RepositoriesModule],
  controllers: [QuotaController],
  providers: [QuotaService],
  exports: [QuotaService],
})
export class QuotaModule {}
