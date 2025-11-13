import { Module } from '@nestjs/common';
import { AiProcessingLogsRepository } from '../../infrastructure/repositories/ai/ai-processing-logs.repository';
import { AiProcessingLogsService } from '../../application/services/ai-processing-logs.service';
import { AiProcessingLogsController } from '../../presentation/controllers/ai/processing-logs.controller';

@Module({
  imports: [],
  controllers: [AiProcessingLogsController],
  providers: [AiProcessingLogsRepository, AiProcessingLogsService],
  exports: [AiProcessingLogsService],
})
export class AiProcessingLogsModule {}
