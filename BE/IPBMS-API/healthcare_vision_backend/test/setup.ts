import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

// Set test environment
process.env.NODE_ENV = 'test';

// Global test utilities
(global as any).testUtils = {
  createTestingModule: async (providers: any[] = [], controllers: any[] = []) => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [...providers],
      controllers,
    }).compile();

    return moduleFixture;
  },

  mockRepository: () => ({
    findOne: () => Promise.resolve(null),
    find: () => Promise.resolve([]),
    save: (entity: any) => Promise.resolve(entity),
    create: (entity: any) => entity,
    update: () => Promise.resolve({ affected: 1 }),
    delete: () => Promise.resolve({ affected: 1 }),
    count: () => Promise.resolve(0),
  }),

  getRepositoryToken: (entity: any) => getRepositoryToken(entity),
};
