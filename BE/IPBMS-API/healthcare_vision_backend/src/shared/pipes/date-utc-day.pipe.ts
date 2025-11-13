import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

// Accepts YYYY-MM-DD and returns { date, startUtcISO, endUtcISO }
@Injectable()
export class DateUtcDayPipe
  implements PipeTransform<string, { date: string; startUtcISO: string; endUtcISO: string }>
{
  constructor(private readonly options?: { strict?: boolean }) {}

  transform(value: string) {
    if (!value) return undefined as any;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD');
    }
    const start = new Date(`${value}T00:00:00.000Z`);
    const end = new Date(`${value}T23:59:59.999Z`);
    if (this.options?.strict && (isNaN(start.getTime()) || isNaN(end.getTime()))) {
      throw new BadRequestException('Invalid date value');
    }
    return {
      date: value,
      startUtcISO: start.toISOString(),
      endUtcISO: end.toISOString(),
    };
  }
}
