import { SetMetadata } from '@nestjs/common';

export const REPORT_ACCESS_KEY = 'report_access';
export const ReportAccess = () => SetMetadata(REPORT_ACCESS_KEY, true);
