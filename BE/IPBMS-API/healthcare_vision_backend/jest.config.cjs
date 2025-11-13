module.exports = {
  preset: null,
  testEnvironment: 'node',
  testMatch: [
    '**/test/**/*.spec.ts',
    '**/test/**/*.test.ts',
    'test/**/*.spec.ts',
    '**/test/**/*.e2e-spec.ts',
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.js$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@$': '<rootDir>/src',
    '^@prisma/client$': '<rootDir>/node_modules/@prisma/client/index.js',
    '^@prisma/client/(.*)$': '<rootDir>/node_modules/@prisma/client/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@core$': '<rootDir>/src/core',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@application$': '<rootDir>/src/application',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@infrastructure$': '<rootDir>/src/infrastructure',
    '^@presentation/(.*)$': '<rootDir>/src/presentation/$1',
    '^@presentation$': '<rootDir>/src/presentation',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@shared$': '<rootDir>/src/shared',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@modules$': '<rootDir>/src/modules',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@config$': '<rootDir>/src/config',
    '^@swagger/(.*)$': '<rootDir>/src/swagger/$1',
    '^@swagger$': '<rootDir>/src/swagger',
  },
  // By default jest ignores node_modules for transforms. We want ts-jest to
  // transform TypeScript and JS files and allow transforming specific ESM
  // packages like `uuid`. The pattern below ignores node_modules except for
  // the `uuid` package so it will be transformed by ts-jest.
  // Ignore all node_modules except when the path contains 'uuid' anywhere
  // (handles pnpm's nested paths like node_modules/.pnpm/.../node_modules/uuid/...)
  transformIgnorePatterns: ['/node_modules/(?!.*uuid).*'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },
  injectGlobals: true,
  extensionsToTreatAsEsm: [],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
};
