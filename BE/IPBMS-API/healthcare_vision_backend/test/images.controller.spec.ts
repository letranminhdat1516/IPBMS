import { ImageSettingsController } from '../src/presentation/controllers';
import { ImageSettingsService } from '../src/application/services';

describe('ImageSettingsController', () => {
  let controller: ImageSettingsController;
  const mockService = {
    getCompact: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    batchSave: jest.fn(),
    toggle: jest.fn(),
  } as unknown as ImageSettingsService;

  beforeEach(async () => {
    const module = await (global as any).testUtils.createTestingModule(
      [
        {
          provide: ImageSettingsService,
          useValue: mockService,
        },
      ],
      [ImageSettingsController],
    );

    controller = module.get(ImageSettingsController);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should return compact image settings from the service', async () => {
    const expected = {
      normal_image_retention_time: 30,
      alert_image_retention_time: 90,
      image_storage_quality: '1080',
    };

    (mockService.getCompact as jest.Mock).mockResolvedValue(expected);

    const req: any = { user: { userId: 'user-1' } };
    const res = await controller.findAll(req);

    expect(mockService.getCompact).toHaveBeenCalledWith('user-1');
    expect(res).toEqual(expected);
  });

  it('should delegate get by key to the service', async () => {
    const expected = { key: 'normal_image_retention_time', value: 30 };
    (mockService.get as jest.Mock).mockResolvedValue(expected);

    const req: any = { user: { userId: 'user-2' } };
    const res = await controller.findByKey('normal_image_retention_time', req);

    expect(mockService.get).toHaveBeenCalledWith('user-2', 'normal_image_retention_time');
    expect(res).toEqual(expected);
  });
});
