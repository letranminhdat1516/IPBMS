import { Module } from '@nestjs/common';
import { SearchService } from '../../application/services/search.service';
import { SearchController } from '../../presentation/controllers/external/search.controller';
import { CaregiversModule } from '../caregivers/caregivers.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule, CaregiversModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
