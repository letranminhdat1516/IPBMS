import { Injectable, NotFoundException } from '@nestjs/common';
import { ThreadMemoryRepository } from '../../../infrastructure/repositories/system/thread-memory.repository';
import { ThreadMemory } from '../../../core/entities/thread_memory.entity';

@Injectable()
export class ThreadMemoryService {
  constructor(private readonly repo: ThreadMemoryRepository) {}

  async findById(thread_id: string): Promise<ThreadMemory> {
    const thread = await this.repo.findThreadById(thread_id);
    if (!thread) throw new NotFoundException('Thread not found');
    return thread;
  }

  findAll(): Promise<ThreadMemory[]> {
    return this.repo.findAll();
  }

  async create(data: Partial<ThreadMemory>): Promise<ThreadMemory> {
    return this.repo.create(data);
  }

  async update(thread_id: string, data: Partial<ThreadMemory>): Promise<ThreadMemory> {
    const updated = await this.repo.update(thread_id, data);
    if (!updated) throw new NotFoundException('Thread not found');
    return updated;
  }

  async remove(thread_id: string) {
    return this.repo.remove(thread_id);
  }
}
