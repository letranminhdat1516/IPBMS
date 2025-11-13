import { PatientsInfoController } from '../src/presentation/controllers/patients/info.controller';

describe('PatientsInfoController - sleepCheckin', () => {
  const patientInfoService = {
    getComposite: jest.fn(),
    listContacts: jest.fn(),
  } as any;

  const acl = {
    caregiverCanAccessPatient: jest.fn(),
  } as any;

  const cloudinary = {} as any;

  const activity = {
    create: jest.fn(),
    logger: { warn: jest.fn(), error: jest.fn() },
  } as any;

  const sleepService = {
    upsertDailyCheckin: jest.fn(),
    getHistory: jest.fn(),
  } as any;

  const controller = new PatientsInfoController(
    patientInfoService,
    acl,
    cloudinary,
    activity,
    sleepService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns persisted=true when activity.create returns record with real id', async () => {
    const req = { user: { userId: 'user-1', role: 'customer', name: 'User One' } } as any;
    const body = { state: 'slept', timestamp: new Date().toISOString(), source: 'app' } as any;

    activity.create.mockResolvedValueOnce({ id: '11111111-1111-1111-1111-111111111111' });

    const res = await controller.sleepCheckin('user-1', body, req);

    expect(activity.create).toHaveBeenCalled();
    // Response is wrapped by createSuccessResponse -> { success: true, data: { log_id, persisted, checkin }, ... }
    expect(res).toHaveProperty('success', true);
    expect(res).toHaveProperty('data.log_id', '11111111-1111-1111-1111-111111111111');
    expect(res).toHaveProperty('data.persisted', true);
  });

  it('returns persisted=false when activity.create returns TEMP id', async () => {
    const req = { user: { userId: 'user-2', role: 'customer' } } as any;
    const body = { state: 'awake' } as any;

    activity.create.mockResolvedValueOnce({ id: 'TEMP-12345' });

    const res = await controller.sleepCheckin('user-2', body, req);

    expect(activity.create).toHaveBeenCalled();
    expect(res).toHaveProperty('success', true);
    expect(res).toHaveProperty('data.log_id', 'TEMP-12345');
    expect(res).toHaveProperty('data.persisted', false);
  });

  it('returns ok:false when activity.create throws', async () => {
    const req = { user: { userId: 'user-3', role: 'customer' } } as any;
    const body = { state: 'napping' } as any;

    activity.create.mockRejectedValueOnce(new Error('DB down'));

    const res = await controller.sleepCheckin('user-3', body, req);

    expect(activity.create).toHaveBeenCalled();
    // Error responses are created with createErrorResponse
    expect(res).toHaveProperty('success', false);
    expect(res).toHaveProperty('error.code', 'ACTIVITY_CREATE_FAILED');
    expect(res).toHaveProperty('error.message', 'failed_to_create_activity_log');
    expect(res).toHaveProperty('error.details');
  });
});
