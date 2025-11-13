import { Module } from '@nestjs/common';
import { MailService } from '../../application/services/mail.service';
import { MailController } from '../../presentation/controllers/external/mail.controller';
import { AlertsModule } from '../alerts/alerts.module';
import { EmailTemplateModule } from '../email-templates/email-template.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentModule } from '../payment/payment.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule, EmailTemplateModule, PaymentModule, AlertsModule, NotificationsModule],
  providers: [MailService],
  controllers: [MailController],
  exports: [MailService],
})
export class MailModule {}
