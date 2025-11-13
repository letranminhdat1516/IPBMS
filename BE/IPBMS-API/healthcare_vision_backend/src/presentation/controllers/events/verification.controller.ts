import { Roles } from '@/shared/decorators/roles.decorator';
import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EventsVerificationService } from '../../../application/services/events/events-verification.service';
import { EventsSwagger } from '../../../swagger/events.swagger';

type VerifyDto = {
  action: 'APPROVED' | 'REJECTED' | 'CANCELED';
  notes?: string;
};

@Controller('events')
@ApiTags('events-verification')
@ApiBearerAuth()
@Roles('admin', 'caregiver', 'customer')
export class EventsVerificationController {
  constructor(private readonly svc: EventsVerificationService) {}

  @Post(':event_id/verify')
  @EventsSwagger.verify
  async verify(@Param('event_id') event_id: string, @Body() body: VerifyDto, @Req() req: any) {
    const userId = req.user?.user_id || null;
    return this.svc.verifyEvent(event_id, body.action, userId, body.notes);
  }

  @Post(':event_id/escalate')
  @EventsSwagger.escalate
  async escalate(@Param('event_id') event_id: string, @Body() body: { reason?: string }) {
    return this.svc.escalateEvent(event_id, body.reason);
  }
}

export default EventsVerificationController;
