import { ImageSettingsService } from '../src/application/services/media/image-settings.service';

describe('ImageSettingsService.getCompact', () => {
  it('returns defaults from system config when no user overrides', async () => {
    const mockRepo: any = {
      list: jest.fn().mockResolvedValue([]),
    };

    const mockPrisma: any = {
      system_config: {
        findMany: jest.fn().mockResolvedValue([
          { setting_key: 'image_quality', setting_value: '1080p', data_type: 'string' },
          { setting_key: 'retention_alert_days', setting_value: '90', data_type: 'int' },
          { setting_key: 'retention_days', setting_value: '30', data_type: 'int' },
        ]),
      },
    };

    const svc = new ImageSettingsService(mockRepo, mockPrisma);
    const out = await svc.getCompact('user-1');

    expect(out).toEqual({
      normal_image_retention_time: 30,
      alert_image_retention_time: 90,
      image_storage_quality: '1080',
    });
  });

  it('prefers user overrides when present', async () => {
    const mockRepo: any = {
      list: jest.fn().mockResolvedValue([
        { key: 'retention_days', value: '45', is_overridden: true },
        { key: 'image_quality', value: '720p', is_overridden: true },
      ]),
    };

    const mockPrisma: any = {
      system_config: {
        findMany: jest.fn().mockResolvedValue([
          { setting_key: 'image_quality', setting_value: '1080p', data_type: 'string' },
          { setting_key: 'retention_alert_days', setting_value: '90', data_type: 'int' },
          { setting_key: 'retention_days', setting_value: '30', data_type: 'int' },
        ]),
      },
    };

    const svc = new ImageSettingsService(mockRepo, mockPrisma);
    const out = await svc.getCompact('user-1');

    expect(out).toEqual({
      normal_image_retention_time: 45,
      alert_image_retention_time: 90,
      image_storage_quality: '720',
    });
  });
});
