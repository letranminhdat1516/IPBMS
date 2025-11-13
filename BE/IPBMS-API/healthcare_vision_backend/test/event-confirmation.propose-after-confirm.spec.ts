import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventConfirmationService } from '../src/application/services/event-confirmation.service';

describe('EventConfirmationService - proposeChange guard', () => {
  let service: EventConfirmationService;
  let prismaMock: any;
  let repositoryMock: any;

  beforeEach(() => {
    repositoryMock = {
      getEventWithContext: jest.fn(),
      proposeChange: jest.fn(),
      eventExists: jest.fn(),
      getUserFullName: jest.fn().mockResolvedValue('Caregiver'),
    } as any;

    prismaMock = {
      $transaction: jest.fn(async (cb) => cb({})),
    } as any;

    service = new EventConfirmationService(prismaMock as any, repositoryMock as any, undefined);
  });

  it('throws ConflictException when event already CONFIRMED_BY_CUSTOMER', async () => {
    repositoryMock.getEventWithContext.mockResolvedValue({
      event_id: 'evt-1',
      confirmation_state: 'CONFIRMED_BY_CUSTOMER',
      detected_at: new Date(),
    });

    await expect(service.proposeChange('evt-1', 'care-1', 'resolved', 1000)).rejects.toThrow(
      ConflictException,
    );
    await expect(service.proposeChange('evt-1', 'care-1', 'resolved', 1000)).rejects.toThrow(
      'Sự kiện đã được khách hàng xác nhận; không thể gửi đề xuất thay đổi nữa.',
    );
  });
});
