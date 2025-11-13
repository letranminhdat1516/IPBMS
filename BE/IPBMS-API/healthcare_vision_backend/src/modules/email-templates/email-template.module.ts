import { Module } from '@nestjs/common';
import { EmailTemplateService } from '../../application/services/notifications/email-template.service';
import { EmailTemplateController } from '../../presentation/controllers/admin/email-templates.controller';
import { EmailModule } from '../email/email.module';
import { DefaultEmailTemplatesService } from './default-templates.service';

@Module({
  imports: [EmailModule],
  controllers: [EmailTemplateController],
  providers: [EmailTemplateService, DefaultEmailTemplatesService],
  exports: [EmailTemplateService],
})
export class EmailTemplateModule {}
