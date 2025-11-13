import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { AccessControlService } from '../access-control.service';
import { TIME_LIMITS_MS, timeUtils } from '../../../shared/constants/time.constants';

/**
 * Service for validating event-related operations
 * Extracted from EventsController to promote reusability and testability
 */
@Injectable()
export class EventValidationService {
  constructor(
    private readonly _eventsService: EventsService,
    private readonly _accessControlService: AccessControlService,
  ) {}

  /**
   * Validate event exists and return it with owner info
   */
  async validateEventExists(eventId: string) {
    const event = await this._eventsService.getDetail(eventId);
    if (!event) {
      throw new NotFoundException(`Không tìm thấy sự kiện với ID ${eventId}`);
    }
    if (!event.user_id) {
      throw new BadRequestException('Sự kiện không có thông tin chủ sở hữu');
    }
    return { event, ownerId: event.user_id };
  }

  /**
   * Validate requester authentication
   */
  validateRequester(requesterId?: string): string {
    if (!requesterId) {
      throw new ForbiddenException('Người dùng chưa đăng nhập');
    }
    return requesterId;
  }

  /**
   * Validate customer ownership of event
   */
  validateCustomerOwnership(requesterId: string, ownerId: string): void {
    if (ownerId !== requesterId) {
      throw new ForbiddenException('Khách hàng không sở hữu sự kiện này');
    }
  }

  /**
   * Validate caregiver can access event (48h window + assignment)
   */
  async validateCaregiverAccess(
    requesterId: string,
    ownerId: string,
    detectedAt: Date | string | null,
  ): Promise<void> {
    // Check 48-hour time window
    if (!timeUtils.isWithinWindow(detectedAt, TIME_LIMITS_MS.CAREGIVER_ACCESS_WINDOW)) {
      throw new BadRequestException('Khoảng thời gian caregiver có thể xác nhận đã hết');
    }

    // Check assignment
    const hasAccess = await this._accessControlService.caregiverCanAccessPatient(
      requesterId,
      ownerId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Caregiver chưa được phân công cho bệnh nhân này');
    }
  }

  /**
   * Consolidated validation for confirm/reject actions
   */
  async validateEventAction(
    eventId: string,
    requesterId: string,
    role: string,
  ): Promise<{ event: any; ownerId: string }> {
    this.validateRequester(requesterId);

    const { event, ownerId } = await this.validateEventExists(eventId);

    if (role === 'customer') {
      this.validateCustomerOwnership(requesterId, ownerId);
    } else if (role === 'caregiver') {
      await this.validateCaregiverAccess(requesterId, ownerId, event.detected_at);
    }

    return { event, ownerId };
  }
}
