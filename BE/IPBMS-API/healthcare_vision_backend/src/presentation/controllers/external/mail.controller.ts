import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MailService } from '../../../application/services/mail.service';

@ApiTags('mail')
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get('test-before-expiry')
  @ApiOperation({ summary: 'Test gửi email nhắc nhở subscription trước X ngày' })
  @ApiQuery({ name: 'to', required: true, example: 'abc@gmail.com' })
  @ApiQuery({ name: 'name', required: false, example: 'Nhật' })
  @ApiQuery({ name: 'plan', required: false, example: 'Pro' })
  @ApiQuery({ name: 'days', required: true, example: '3', description: 'Số ngày trước hết hạn' })
  async testBeforeExpiry(
    @Query('to') to: string,
    @Query('name') name: string = 'Khách hàng',
    @Query('plan') plan: string = 'Standard',
    @Query('days') days: string = '3',
  ) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + Number(days));

    return this.mailService.sendSubscriptionExpiryNotice(to, name, plan, expiryDate, Number(days));
  }

  @Get('test-on-expiry')
  @ApiOperation({ summary: 'Test gửi email nhắc nhở subscription đúng ngày hết hạn' })
  @ApiQuery({ name: 'to', required: true, example: 'abc@gmail.com' })
  @ApiQuery({ name: 'name', required: false, example: 'Nhật' })
  @ApiQuery({ name: 'plan', required: false, example: 'Pro' })
  async testOnExpiry(
    @Query('to') to: string,
    @Query('name') name: string = 'Khách hàng',
    @Query('plan') plan: string = 'Standard',
  ) {
    const expiryDate = new Date(); // giả định hôm nay là ngày hết hạn
    return this.mailService.sendSubscriptionExpiryNotice(
      to,
      name,
      plan,
      expiryDate,
      0, // diffDays = 0 nghĩa là đúng ngày hết hạn
    );
  }
}
