import { Test, TestingModule } from '@nestjs/testing';
import { QuotaService } from '../src/application/services/admin/quota.service';
import { QuotaRepository } from '../src/infrastructure/repositories/admin/quota.repository';

// Mock repository
const mockQuotaRepository = {
  getQuotaStatus: jest.fn(),
  getUserQuotaUsage: jest.fn(),
  executeTransaction: jest.fn(),
};

describe('QuotaService - Entitlement Enforcement', () => {
  let service: QuotaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotaService,
        {
          provide: QuotaRepository,
          useValue: mockQuotaRepository,
        },
      ],
    }).compile();

    service = module.get<QuotaService>(QuotaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('enforceHardCap', () => {
    it('should throw error when camera quota exceeded', async () => {
      mockQuotaRepository.getQuotaStatus.mockResolvedValue({
        cameras: { quota: 5, used: 3, allowed: true },
        caregivers: { quota: 10, used: 2, allowed: true },
        storage: { exceeded: false, quota: 100, used: 50 },
      });

      mockQuotaRepository.getUserQuotaUsage.mockResolvedValue({
        camera_count: 6, // Exceeds quota of 5
        caregiver_count: 2,
        room_count: 1,
        storage_used_gb: 50,
      });

      await expect(service.enforceHardCap('user-123', 'camera', 'add')).rejects.toThrow(
        'Camera quota exceeded. Current: 6, Limit: 5',
      );
    });

    it('should not throw when quota not exceeded', async () => {
      mockQuotaRepository.getQuotaStatus.mockResolvedValue({
        cameras: { quota: 5, used: 3, allowed: true },
        caregivers: { quota: 10, used: 2, allowed: true },
        storage: { exceeded: false, quota: 100, used: 50 },
      });

      mockQuotaRepository.getUserQuotaUsage.mockResolvedValue({
        camera_count: 4, // Within quota
        caregiver_count: 2,
        room_count: 1,
        storage_used_gb: 50,
      });

      await expect(service.enforceHardCap('user-123', 'camera', 'add')).resolves.not.toThrow();
    });
  });

  describe('checkSoftCap', () => {
    it('should return warning when approaching camera limit', async () => {
      mockQuotaRepository.getQuotaStatus.mockResolvedValue({
        cameras: { quota: 10, used: 8, allowed: true },
        caregivers: { quota: 10, used: 2, allowed: true },
        storage: { exceeded: false, quota: 100, used: 50 },
      });

      mockQuotaRepository.getUserQuotaUsage.mockResolvedValue({
        camera_count: 8, // 80% of 10
        caregiver_count: 2,
        room_count: 1,
        storage_used_gb: 50,
      });

      const result = await service.checkSoftCap('user-123', 'camera');

      expect(result.warning).toBe(true);
      expect(result.message).toContain('Approaching camera limit');
      expect(result.percentage).toBe(0.8);
    });

    it('should not warn when usage is low', async () => {
      mockQuotaRepository.getQuotaStatus.mockResolvedValue({
        cameras: { quota: 10, used: 2, allowed: true },
        caregivers: { quota: 10, used: 2, allowed: true },
        storage: { exceeded: false, quota: 100, used: 50 },
      });

      mockQuotaRepository.getUserQuotaUsage.mockResolvedValue({
        camera_count: 2, // 20% of 10
        caregiver_count: 2,
        room_count: 1,
        storage_used_gb: 50,
      });

      const result = await service.checkSoftCap('user-123', 'camera');

      expect(result.warning).toBe(false);
      expect(result.percentage).toBe(0.2);
    });
  });

  describe('checkEntitlement', () => {
    it('should allow action when within limits', async () => {
      mockQuotaRepository.getQuotaStatus.mockResolvedValue({
        cameras: { quota: 10, used: 3, allowed: true },
        caregivers: { quota: 10, used: 2, allowed: true },
        storage: { exceeded: false, quota: 100, used: 50 },
      });

      mockQuotaRepository.getUserQuotaUsage.mockResolvedValue({
        camera_count: 3,
        caregiver_count: 2,
        room_count: 1,
        storage_used_gb: 50,
      });

      const result = await service.checkEntitlement('user-123', 'camera', 'add');

      expect(result.allowed).toBe(true);
      expect(result.warning).toBeUndefined();
      expect(result.error).toBeUndefined();
    });

    it('should block action when hard cap exceeded', async () => {
      mockQuotaRepository.getQuotaStatus.mockResolvedValue({
        cameras: { quota: 5, used: 3, allowed: true },
        caregivers: { quota: 10, used: 2, allowed: true },
        storage: { exceeded: false, quota: 100, used: 50 },
      });

      mockQuotaRepository.getUserQuotaUsage.mockResolvedValue({
        camera_count: 6, // Exceeds quota
        caregiver_count: 2,
        room_count: 1,
        storage_used_gb: 50,
      });

      const result = await service.checkEntitlement('user-123', 'camera', 'add');

      expect(result.allowed).toBe(false);
      expect(result.error).toContain('Camera quota exceeded');
    });

    it('should warn when approaching limits', async () => {
      mockQuotaRepository.getQuotaStatus.mockResolvedValue({
        cameras: { quota: 10, used: 8, allowed: true },
        caregivers: { quota: 10, used: 2, allowed: true },
        storage: { exceeded: false, quota: 100, used: 50 },
      });

      mockQuotaRepository.getUserQuotaUsage.mockResolvedValue({
        camera_count: 8, // 80% usage
        caregiver_count: 2,
        room_count: 1,
        storage_used_gb: 50,
      });

      const result = await service.checkEntitlement('user-123', 'camera', 'add');

      expect(result.allowed).toBe(true);
      expect(result.warning).toContain('Approaching camera limit');
    });
  });
});
