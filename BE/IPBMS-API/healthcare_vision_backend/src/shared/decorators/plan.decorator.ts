import { SetMetadata } from '@nestjs/common';

export const RequirePlan = (requireLicense: boolean = true) =>
  SetMetadata('requireLicense', requireLicense);

export const CameraRequired = (count: number) => SetMetadata('cameraRequired', count);

export const SiteRequired = (count: number) => SetMetadata('siteRequired', count);
