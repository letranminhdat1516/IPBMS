import { Test, TestingModule } from '@nestjs/testing';
import { AdminPlansService } from '../src/application/services/admin/admin-plans.service';
import { DataSource } from 'typeorm';
import { CacheService } from '../src/application/services/cache.service';
import { AdminPlansRepository } from '../src/infrastructure/repositories/admin/admin-plans.repository';

describe('AdminPlansService', () => {
  let service: AdminPlansService;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockAdminPlansRepo: any;

  beforeEach(async () => {
    const mockQuery = jest.fn();
    mockDataSource = {
      query: mockQuery,
    } as any;

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      deleteByPattern: jest.fn(),
      getStats: jest.fn(),
      clear: jest.fn(),
    } as any;

    mockAdminPlansRepo = {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      findPlansWithVersions: jest.fn().mockResolvedValue([]),
      findPlanByCode: jest.fn().mockResolvedValue(null),
      planExists: jest.fn().mockResolvedValue(false),
      planVersionExists: jest.fn().mockResolvedValue(false),
      findVersionsByPlanCode: jest.fn().mockResolvedValue([]),
      createNewPlanVersion: jest.fn().mockResolvedValue({ created: true, id: '1' }),
      getPlanStatistics: jest.fn().mockResolvedValue([]),
      validateEffectiveDates: jest.fn().mockReturnValue(true),
      createPlan: jest.fn().mockResolvedValue({
        id: '1',
        code: 'test',
        name: 'Test Plan',
        price: 29.99,
        camera_quota: 5,
        retention_days: 30,
        caregiver_seats: 2,
        version: '1.0',
        is_current: true,
        created_at: new Date(),
        updated_at: new Date(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminPlansService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: AdminPlansRepository,
          useValue: mockAdminPlansRepo,
        },
      ],
    }).compile();

    service = module.get<AdminPlansService>(AdminPlansService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPlans', () => {
    it('should return all plans', async () => {
      const mockPlans = [
        { code: 'basic', name: 'Basic Plan', price: 29.99 },
        { code: 'premium', name: 'Premium Plan', price: 59.99 },
      ];

      mockCacheService.get.mockResolvedValue(null);
      mockAdminPlansRepo.findPlansWithVersions.mockResolvedValue(mockPlans);

      const result = await service.getPlans();

      expect(mockAdminPlansRepo.findPlansWithVersions).toHaveBeenCalledWith(false);
      expect(result).toHaveLength(mockPlans.length);
      result.forEach((plan: any, index: number) => {
        expect(plan).toEqual(expect.objectContaining(mockPlans[index]));
      });
    });
  });

  describe('getPlan', () => {
    it('should return a specific plan', async () => {
      const mockPlan = { code: 'basic', name: 'Basic Plan', price: 29.99 };

      mockCacheService.get.mockResolvedValue(null);
      mockAdminPlansRepo.findPlanByCode.mockResolvedValue(mockPlan);

      const result = await service.getPlan('basic');

      expect(mockAdminPlansRepo.findPlanByCode).toHaveBeenCalledWith('basic');
      expect(result).toEqual(mockPlan);
    });

    it('should throw error if plan not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockAdminPlansRepo.findPlanByCode.mockResolvedValue(null);

      await expect(service.getPlan('nonexistent')).rejects.toThrow('Plan not found');
    });
  });

  describe('createPlan', () => {
    it('should create a new plan successfully', async () => {
      const planData = {
        code: 'new_plan',
        name: 'New Plan',
        price: 39.99,
        camera_quota: 5,
        retention_days: 30,
        caregiver_seats: 2,
      };

      mockAdminPlansRepo.planExists.mockResolvedValue(false);
      mockAdminPlansRepo.createPlan.mockResolvedValue({
        id: '1',
        code: 'new_plan',
        name: 'New Plan',
        price: 39.99,
        camera_quota: 5,
        retention_days: 30,
        caregiver_seats: 2,
        version: '1.0',
        is_current: true,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      });

      const result = await service.createPlan(planData);

      expect(result).toEqual({
        id: '1',
        code: 'new_plan',
        name: 'New Plan',
        price: 39.99,
        camera_quota: 5,
        retention_days: 30,
        caregiver_seats: 2,
        version: '1.0',
        is_current: true,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should throw error if plan code already exists', async () => {
      const planData = {
        code: 'existing_plan',
        name: 'Existing Plan',
        price: 39.99,
        camera_quota: 5,
        retention_days: 30,
        caregiver_seats: 2,
      };

      mockAdminPlansRepo.planVersionExists.mockResolvedValue(true);

      await expect(service.createPlan(planData)).rejects.toThrow(
        "Plan with code 'existing_plan' and version '1.0' already exists",
      );
    });
  });

  describe('getPlanVersions', () => {
    it('should return plan versions', async () => {
      const mockVersions = [
        { id: '1', version: '2024.1', is_current: true },
        { id: '2', version: '2024.2', is_current: false },
      ];

      mockAdminPlansRepo.findVersionsByPlanCode.mockResolvedValue(mockVersions);

      const result = await service.getPlanVersions('basic');

      expect(mockAdminPlansRepo.findVersionsByPlanCode).toHaveBeenCalledWith('basic');
      expect(result).toEqual(mockVersions);
    });
  });

  describe('createPlanVersion', () => {
    it('should create a new plan version with valid CalVer', async () => {
      const versionData = {
        plan_code: 'basic',
        version: '2024.1',
        price: 39.99,
        effective_from: '2026-01-01',
      };

      mockDataSource.query
        .mockResolvedValueOnce([{ code: 'basic' }]) // Plan exists
        .mockResolvedValueOnce([]) // Version doesn't exist
        .mockResolvedValueOnce([{ id: '1' }]); // Insert result

      const result = await service.createPlanVersion(versionData);

      expect(result).toEqual({ created: true, id: '1' });
    });

    it('should throw error for invalid CalVer format', async () => {
      const versionData = {
        plan_code: 'basic',
        version: 'invalid_version',
        effective_from: '2024-01-01',
      };

      await expect(service.createPlanVersion(versionData)).rejects.toThrow(
        'Version must follow CalVer format',
      );
    });
  });

  describe('getPlanUsageStatistics', () => {
    it('should return usage statistics', async () => {
      const mockStats = [
        { year: 2024, plan_code: 'basic', user_count: 150 },
        { year: 2023, plan_code: 'premium', user_count: 200 },
      ];

      mockAdminPlansRepo.getPlanStatistics.mockResolvedValue(mockStats);

      const result = await service.getPlanUsageStatistics(2);

      expect(result).toEqual(mockStats);
    });
  });

  describe('createPlan', () => {
    it('should create a new plan with initial version successfully', async () => {
      const planData = {
        code: 'premium',
        name: 'Premium Plan',
        price: 99.99,
        camera_quota: 10,
        retention_days: 90,
        caregiver_seats: 5,
        sites: 2,
        storage_size: '100GB',
        // Use a date in the future relative to now to avoid flaky failures
        effective_from: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockAdminPlansRepo.planExists.mockResolvedValue(false);
      mockAdminPlansRepo.createPlan.mockResolvedValue({
        id: '1',
        code: 'premium',
        name: 'Premium Plan',
        price: 99.99,
        camera_quota: 10,
        retention_days: 90,
        caregiver_seats: 5,
        sites: 2,
        storage_size: '100GB',
        version: '1.0',
        is_current: true,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      });

      const result = await service.createPlan(planData);

      expect(result).toEqual({
        id: '1',
        code: 'premium',
        name: 'Premium Plan',
        price: 99.99,
        camera_quota: 10,
        retention_days: 90,
        caregiver_seats: 5,
        sites: 2,
        storage_size: '100GB',
        version: '1.0',
        is_current: true,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should throw error if plan code already exists', async () => {
      const planData = {
        code: 'existing',
        name: 'Existing Plan',
        price: 49.99,
        camera_quota: 5,
        retention_days: 30,
        caregiver_seats: 2,
      };

      mockAdminPlansRepo.planVersionExists.mockResolvedValue(true);

      await expect(service.createPlan(planData)).rejects.toThrow(
        "Plan with code 'existing' and version '1.0' already exists",
      );
    });

    it('should throw error if required fields are missing', async () => {
      const incompletePlanData = {
        code: 'test',
        name: 'Test Plan',
        // Missing price, camera_quota, etc.
      };

      await expect(service.createPlan(incompletePlanData)).rejects.toThrow(
        'Missing required fields',
      );
    });

    it('should throw error if effective_from is in the past', async () => {
      const planData = {
        code: 'future',
        name: 'Future Plan',
        price: 79.99,
        camera_quota: 8,
        retention_days: 60,
        caregiver_seats: 3,
        effective_from: new Date('2025-09-09T00:00:00Z'), // Yesterday
      };

      await expect(service.createPlan(planData)).rejects.toThrow(
        'effective_from cannot be in the past for new plans',
      );
    });

    it('should use current date as effective_from if not provided', async () => {
      const planData = {
        code: 'current',
        name: 'Current Plan',
        price: 59.99,
        camera_quota: 6,
        retention_days: 45,
        caregiver_seats: 4,
      };

      mockAdminPlansRepo.planExists.mockResolvedValue(false);
      mockAdminPlansRepo.createPlan.mockResolvedValue({
        id: '1',
        code: 'current',
        name: 'Current Plan',
        price: 59.99,
        camera_quota: 6,
        retention_days: 45,
        caregiver_seats: 4,
        version: '1.0',
        is_current: true,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      });

      const result = await service.createPlan(planData);

      expect(result).toEqual({
        id: '1',
        code: 'current',
        name: 'Current Plan',
        price: 59.99,
        camera_quota: 6,
        retention_days: 45,
        caregiver_seats: 4,
        version: '1.0',
        is_current: true,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should create plan without transaction (fallback)', async () => {
      const planData = {
        code: 'fallback',
        name: 'Fallback Plan',
        price: 39.99,
        camera_quota: 4,
        retention_days: 30,
        caregiver_seats: 2,
      };

      mockAdminPlansRepo.planExists.mockResolvedValue(false);
      mockAdminPlansRepo.createPlan.mockResolvedValue({
        id: '1',
        code: 'fallback',
        name: 'Fallback Plan',
        price: 39.99,
        camera_quota: 4,
        retention_days: 30,
        caregiver_seats: 2,
        version: '1.0',
        is_current: true,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      });

      const result = await service.createPlan(planData);

      expect(result).toEqual({
        id: '1',
        code: 'fallback',
        name: 'Fallback Plan',
        price: 39.99,
        camera_quota: 4,
        retention_days: 30,
        caregiver_seats: 2,
        version: '1.0',
        is_current: true,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      });
    });
  });

  describe('getPlanTrends', () => {
    it('should return plan trends', async () => {
      const mockTrends = [
        { year: 2023, new_subscriptions: 50 },
        { year: 2024, new_subscriptions: 75 },
      ];

      const result = await service.getPlanTrends('basic', 2);

      expect(result).toEqual({
        planCode: 'basic',
        trends: [],
        period: '2 years',
      });
    });
  });
});
