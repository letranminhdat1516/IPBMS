import { Module } from '@nestjs/common';
import { ThreadMemoryRepository } from '../../infrastructure/repositories/system/thread-memory.repository';
import { ThreadMemoryService } from '../../application/services/thread-memory.service';
import { ThreadMemoryController } from '../../presentation/controllers/system/thread-memory.controller';

@Module({
  imports: [],
  controllers: [ThreadMemoryController],
  providers: [ThreadMemoryRepository, ThreadMemoryService],
  exports: [ThreadMemoryService],
})
export class ThreadMemoryModule {}
