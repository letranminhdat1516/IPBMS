import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { createJwtConfig } from '../../config/jwt.config';
import { TicketsRepository } from '../../infrastructure/repositories/system/tickets.repository';
import { TicketsService } from '../../application/services/tickets.service';
import {
  AdminHistoryController,
  HistoryController,
} from '../../presentation/controllers/external/history.controller';
import { TicketsController } from '../../presentation/controllers/external/tickets.controller';
import { AttachmentResolveInterceptor } from '../../shared/interceptors/attachment-resolve.interceptor';
import { NotificationEventsModule } from '../notification-events/notification-events.module';
import { UploadsModule } from '../uploads/uploads.module';
import { HistoryService } from './history.service';
import { TicketMessagingGateway } from './ticket-messaging.gateway';

@Module({
  imports: [
    NotificationEventsModule,
    UploadsModule,
    JwtModule.registerAsync({ useFactory: createJwtConfig, inject: [ConfigService] }),
  ],
  controllers: [TicketsController, HistoryController, AdminHistoryController],
  providers: [
    TicketsRepository,
    TicketsService,
    AttachmentResolveInterceptor,
    HistoryService,
    TicketMessagingGateway,
  ],
  exports: [TicketsService, HistoryService, TicketMessagingGateway],
})
export class TicketsModule {}
