import { ForbiddenException } from '@nestjs/common';
import { EventStatusEnum } from '../src/core/entities/events.entity';
import { EventsController } from '../src/presentation/controllers';

describe('EventsController (caregiver permissions)', () => {
  const eventsService = {
    getDetail: jest.fn(),
    updateConfirm: jest.fn(),
    updateLifecycle: jest.fn(),
    notifyNewEvent: jest.fn(),
  };

  const accessControlService = {
    caregiverCanAccessPatient: jest.fn(),
    hasPermission: jest.fn(),
  };

  const caregiversRepository = {
    findCaregiverById: jest.fn(),
  };

  const eventConfirmationService = {
    proposeChange: jest.fn(),
    confirmChange: jest.fn(),
    rejectChange: jest.fn(),
  };

  const eventValidationService = {
    validateRequester: jest.fn((id) => id || 'test-user'),
    validateEventExists: jest.fn(),
    validateCaregiverAccess: jest.fn(),
    validateCustomerOwnership: jest.fn(),
    validateEventAction: jest.fn(),
  };

  const eventAuditLogService = {
    getHistoryForEvent: jest.fn(),
    recordAuditLog: jest.fn(),
  };

  const eventDetectionsService = {
    createEvent: jest.fn(),
    createEventWithSnapshot: jest.fn(),
    attachSnapshotToEvent: jest.fn(),
    updatePartial: jest.fn(),
  };

  const snapshotsService = {
    createWithImages: jest.fn(),
    removeSnapshot: jest.fn(),
  };

  const controller = new EventsController(
    eventsService as any,
    accessControlService as any,
    caregiversRepository as any,
    eventConfirmationService as any,
    eventValidationService as any,
    eventAuditLogService as any,
    eventDetectionsService as any,
    snapshotsService as any,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('alarmTrigger', () => {
    it('should attach snapshot to existing event and set lifecycle', async () => {
      const customerReq = { user: { role: 'customer', userId: 'cust-1' } } as any;
      const event = { event_id: 'evt-1', user_id: 'cust-1', camera_id: 'cam-1' } as any;
      const updated = { ...event, lifecycle_state: 'ALARM_ACTIVATED' } as any;
      const snap = { snapshot_id: 'snap-1', camera_id: 'cam-1' } as any;

      eventsService.getDetail.mockResolvedValueOnce(event).mockResolvedValueOnce(updated);
      snapshotsService.createWithImages.mockResolvedValue(snap);
      eventDetectionsService.attachSnapshotToEvent.mockResolvedValue(updated);
      eventsService.updateLifecycle.mockResolvedValue(updated);

      const res = await controller.alarmTrigger(
        { event_id: 'evt-1', notes: 'pressed' },
        undefined,
        customerReq,
      );

      expect(snapshotsService.createWithImages).toHaveBeenCalledWith(expect.any(Object), undefined);
      expect(eventDetectionsService.attachSnapshotToEvent).toHaveBeenCalledWith('evt-1', 'snap-1');
      expect(eventsService.updateLifecycle).toHaveBeenCalled();
      expect(res).toEqual({ event: updated, snapshot: snap });
    });

    it('should create snapshot and new event when event_id not provided', async () => {
      const adminReq = { user: { role: 'admin', userId: 'admin-1' } } as any;
      const snap = { snapshot_id: 'snap-2', camera_id: 'cam-2' } as any;
      const createdEvent = { event_id: 'evt-2', user_id: 'user-2', snapshot_id: 'snap-2' } as any;

      snapshotsService.createWithImages.mockResolvedValue(snap);
      eventDetectionsService.createEvent.mockResolvedValue(createdEvent);
      eventsService.updateLifecycle.mockResolvedValue({
        ...createdEvent,
        lifecycle_state: 'ALARM_ACTIVATED',
      });
      eventsService.notifyNewEvent.mockResolvedValue(undefined);

      const body = { camera_id: 'cam-2', user_id: 'user-2', event_type: 'emergency' } as any;
      const res = await controller.alarmTrigger(body, undefined, adminReq);

      expect(snapshotsService.createWithImages).toHaveBeenCalled();
      expect(eventDetectionsService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({ snapshot_id: 'snap-2' }),
      );
      expect(eventsService.notifyNewEvent).toHaveBeenCalledWith('evt-2');
      expect(res).toEqual({ event: createdEvent, snapshot: snap });
    });

    it("should include trigger: 'alarm' in created event's context_data when creating new event", async () => {
      const adminReq = { user: { role: 'admin', userId: 'admin-2' } } as any;
      const snap = { snapshot_id: 'snap-5', camera_id: 'cam-5' } as any;
      const createdEvent = { event_id: 'evt-5', user_id: 'user-5', snapshot_id: 'snap-5' } as any;

      snapshotsService.createWithImages.mockResolvedValue(snap);
      eventDetectionsService.createEvent.mockResolvedValue(createdEvent);
      eventsService.updateLifecycle.mockResolvedValue({
        ...createdEvent,
        lifecycle_state: 'ALARM_ACTIVATED',
      });
      eventsService.notifyNewEvent.mockResolvedValue(undefined);

      const body = { camera_id: 'cam-5', user_id: 'user-5', event_type: 'emergency' } as any;
      await controller.alarmTrigger(body, undefined, adminReq);

      expect(eventDetectionsService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          context_data: expect.objectContaining({ trigger: 'alarm' }),
        }),
      );
    });

    it('should cleanup snapshot when createEvent fails', async () => {
      const adminReq = { user: { role: 'admin', userId: 'admin-1' } } as any;
      const snap = { snapshot_id: 'snap-3', camera_id: 'cam-3' } as any;

      snapshotsService.createWithImages.mockResolvedValue(snap);
      eventDetectionsService.createEvent.mockRejectedValue(new Error('DB error'));
      snapshotsService.removeSnapshot.mockResolvedValue(undefined);

      const body = { camera_id: 'cam-3', user_id: 'user-3', event_type: 'emergency' } as any;

      await expect(controller.alarmTrigger(body, undefined, adminReq)).rejects.toThrow('DB error');

      expect(snapshotsService.createWithImages).toHaveBeenCalled();
      expect(snapshotsService.removeSnapshot).toHaveBeenCalledWith('snap-3');
    });

    it('should cleanup snapshot when attaching to existing event fails', async () => {
      const customerReq = { user: { role: 'customer', userId: 'cust-2' } } as any;
      const event = { event_id: 'evt-3', user_id: 'cust-2', camera_id: 'cam-3' } as any;
      const snap = { snapshot_id: 'snap-4', camera_id: 'cam-3' } as any;

      eventsService.getDetail.mockResolvedValueOnce(event);
      snapshotsService.createWithImages.mockResolvedValue(snap);
      eventDetectionsService.attachSnapshotToEvent.mockRejectedValue(new Error('attach fail'));
      snapshotsService.removeSnapshot.mockResolvedValue(undefined);

      await expect(
        controller.alarmTrigger({ event_id: 'evt-3' }, undefined, customerReq),
      ).rejects.toThrow('attach fail');

      expect(snapshotsService.createWithImages).toHaveBeenCalled();
      expect(snapshotsService.removeSnapshot).toHaveBeenCalledWith('snap-4');
    });
  });

  describe('proposeStatus', () => {
    const caregiverReq = {
      user: {
        role: 'caregiver',
        userId: 'caregiver-1',
      },
    } as any;

    const payload = {
      proposed_status: EventStatusEnum.warning,
    } as any;

    it('should call proposeChange when caregiver has access', async () => {
      const now = new Date();
      eventValidationService.validateRequester.mockReturnValue('caregiver-1');
      eventValidationService.validateEventExists.mockResolvedValue({
        event: { user_id: 'customer-1', detected_at: now },
        ownerId: 'customer-1',
      });
      eventValidationService.validateCaregiverAccess.mockResolvedValue(undefined);
      eventConfirmationService.proposeChange.mockResolvedValue({ ok: true });

      const result = await controller.proposeStatus('event-1', payload, caregiverReq);

      expect(result).toEqual({ ok: true });
      expect(eventConfirmationService.proposeChange).toHaveBeenCalledWith(
        'event-1',
        'caregiver-1',
        EventStatusEnum.warning,
        expect.any(Number),
        undefined,
      );
    });

    it('should throw Forbidden if caregiver not assigned to patient', async () => {
      eventValidationService.validateRequester.mockReturnValue('caregiver-1');
      eventValidationService.validateEventExists.mockResolvedValue({
        event: { user_id: 'customer-1' },
        ownerId: 'customer-1',
      });
      eventValidationService.validateCaregiverAccess.mockRejectedValue(
        new ForbiddenException('Caregiver chưa được phân công cho bệnh nhân này'),
      );

      await expect(controller.proposeStatus('event-1', payload, caregiverReq)).rejects.toThrow(
        ForbiddenException,
      );

      expect(eventConfirmationService.proposeChange).not.toHaveBeenCalled();
    });
  });

  describe('postConfirm', () => {
    const caregiverReq = {
      user: {
        role: 'caregiver',
        userId: 'caregiver-1',
      },
    } as any;

    const patientEvent = {
      event_id: 'event-1',
      user_id: 'customer-1',
      detected_at: new Date().toISOString(),
    } as any;

    it('should pass notes to updateConfirm when caregiver is allowed', async () => {
      eventValidationService.validateRequester.mockReturnValue('caregiver-1');
      eventValidationService.validateEventAction.mockResolvedValue({
        event: patientEvent,
        ownerId: 'customer-1',
      });
      eventsService.updateConfirm.mockResolvedValue({ success: true });

      const result = await controller.postConfirm(
        'event-1',
        { action: 'approve', notes: 'đã kiểm tra' } as any,
        caregiverReq,
      );

      expect(result).toEqual({ success: true });
      expect(eventsService.updateConfirm).toHaveBeenCalledWith(
        'event-1',
        true,
        'đã kiểm tra',
        'caregiver-1',
        'caregiver',
      );
    });

    it('should throw Forbidden if caregiver not assigned', async () => {
      eventValidationService.validateRequester.mockReturnValue('caregiver-1');
      eventValidationService.validateEventAction.mockRejectedValue(
        new ForbiddenException('Caregiver chưa được phân công cho bệnh nhân này'),
      );

      await expect(
        controller.postConfirm('event-1', { action: 'approve' } as any, caregiverReq),
      ).rejects.toThrow(ForbiddenException);

      expect(eventsService.updateConfirm).not.toHaveBeenCalled();
    });
  });

  describe('postReject', () => {
    const caregiverReq = {
      user: {
        role: 'caregiver',
        userId: 'caregiver-1',
      },
    } as any;

    const patientEvent = {
      event_id: 'event-1',
      user_id: 'customer-1',
      detected_at: new Date().toISOString(),
    } as any;

    it('should call updateConfirm with false when caregiver has access', async () => {
      eventValidationService.validateRequester.mockReturnValue('caregiver-1');
      eventValidationService.validateEventAction.mockResolvedValue({
        event: patientEvent,
        ownerId: 'customer-1',
      });
      eventsService.updateConfirm.mockResolvedValue({ success: true });

      const result = await controller.postReject(
        'event-1',
        { action: 'reject', notes: 'không hợp lệ' } as any,
        caregiverReq,
      );

      expect(result).toEqual({ success: true });
      expect(eventsService.updateConfirm).toHaveBeenCalledWith(
        'event-1',
        false,
        'không hợp lệ',
        'caregiver-1',
        'caregiver',
      );
    });

    it('should throw Forbidden if caregiver not assigned when rejecting', async () => {
      eventValidationService.validateRequester.mockReturnValue('caregiver-1');
      eventValidationService.validateEventAction.mockRejectedValue(
        new ForbiddenException('Caregiver chưa được phân công cho bệnh nhân này'),
      );

      await expect(
        controller.postReject('event-1', { action: 'reject' } as any, caregiverReq),
      ).rejects.toThrow(ForbiddenException);

      expect(eventsService.updateConfirm).not.toHaveBeenCalled();
    });
  });

  describe('customer flows', () => {
    const customerReq = {
      user: {
        role: 'customer',
        userId: 'cust-1',
      },
    } as any;

    it('customer confirm should call EventConfirmationService.confirmChange', async () => {
      eventValidationService.validateRequester.mockReturnValue('cust-1');
      eventValidationService.validateEventAction.mockResolvedValue({
        event: {},
        ownerId: 'cust-1',
      });
      eventConfirmationService.confirmChange.mockResolvedValue({ success: true });

      const result = await controller.postConfirm(
        'evt-1',
        { action: 'approve' } as any,
        customerReq,
      );
      expect(result).toEqual({ success: true });
      expect(eventConfirmationService.confirmChange).toHaveBeenCalledWith('evt-1', 'cust-1');
    });

    it('customer reject should call EventConfirmationService.rejectChange with notes', async () => {
      eventValidationService.validateRequester.mockReturnValue('cust-1');
      eventValidationService.validateEventAction.mockResolvedValue({
        event: {},
        ownerId: 'cust-1',
      });
      eventConfirmationService.rejectChange.mockResolvedValue({ success: true });

      const result = await controller.postReject(
        'evt-2',
        { action: 'reject', rejection_reason: 'not an event' } as any,
        customerReq,
      );
      expect(result).toEqual({ success: true });
      expect(eventConfirmationService.rejectChange).toHaveBeenCalledWith(
        'evt-2',
        'cust-1',
        'not an event',
      );
    });
  });
});
