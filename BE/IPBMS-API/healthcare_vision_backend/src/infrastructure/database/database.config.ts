import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const createTypeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: configService.get<string>('DATABASE_URL'),
  autoLoadEntities: true,
  synchronize: false,
  logging: configService.get<string>('DB_LOGGING') === 'true',
  ssl: { rejectUnauthorized: false },
});
