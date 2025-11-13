import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';
import { Snapshot } from '../../../core/entities/snapshots.entity';

@Injectable()
export class SnapshotsRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async findSnapshotById(snapshot_id: string): Promise<Snapshot | null> {
    return super.findById<Snapshot>('snapshots', snapshot_id);
  }

  async findAllSnapshots(): Promise<Snapshot[]> {
    const result = await super.paginate<Snapshot>('snapshots', { take: 1000 });
    return result.data as Snapshot[];
  }

  async createSnapshot(data: Partial<Snapshot>): Promise<Snapshot> {
    return super.createRecord<Snapshot>('snapshots', data);
  }

  async updateSnapshot(snapshot_id: string, data: Partial<Snapshot>): Promise<Snapshot | null> {
    return super.updateRecord<Snapshot>('snapshots', snapshot_id, data);
  }

  async removeSnapshot(snapshot_id: string): Promise<{ deleted: boolean }> {
    try {
      await super.hardDelete<Snapshot>('snapshots', snapshot_id);
      return { deleted: true };
    } catch {
      return { deleted: false };
    }
  }
}
