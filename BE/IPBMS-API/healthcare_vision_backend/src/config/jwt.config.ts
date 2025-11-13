import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export const createJwtConfig = (configService: ConfigService): JwtModuleOptions => ({
  secret: configService.get<string>('JWT_SECRET') || 'supersecret',
  signOptions: {
    // JwtModuleOptions.signOptions.expiresIn accepts number | string-like types from library;
    // cast here to avoid strict typing issues from ConfigService generic.
    expiresIn: (configService.get('JWT_EXPIRES') as any) || '1d',
  },
});
