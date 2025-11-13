import { Module } from '@nestjs/common';
import { AiConfigurationsRepository } from '../../infrastructure/repositories/ai/ai-configurations.repository';
import { AiConfigurationsService } from '../../application/services/ai-configurations.service';
import { AiConfigurationsController } from '../../presentation/controllers/ai/configurations.controller';

@Module({
  imports: [],
  controllers: [AiConfigurationsController],
  providers: [AiConfigurationsRepository, AiConfigurationsService],
  exports: [AiConfigurationsService],
})
export class AiConfigurationsModule {}
