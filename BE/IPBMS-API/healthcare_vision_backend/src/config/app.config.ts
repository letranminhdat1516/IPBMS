export interface AppConfig {
  port: number;
  nodeEnv: string;
  database: {
    url: string;
    logging: boolean;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  swagger: {
    enabled: boolean;
    title: string;
    description: string;
    version: string;
  };
}

export const appConfig = (): AppConfig => ({
  port: parseInt(process.env.PORT || '3002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || '',
    logging: process.env.DB_LOGGING === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'supersecret',
    expiresIn: process.env.JWT_EXPIRES || '1d',
  },
  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
    title: process.env.SWAGGER_TITLE || 'Healthcare Vision API',
    description: process.env.SWAGGER_DESC || 'API Documentation for Healthcare Vision',
    version: process.env.SWAGGER_VERSION || '1.0.0',
  },
});
