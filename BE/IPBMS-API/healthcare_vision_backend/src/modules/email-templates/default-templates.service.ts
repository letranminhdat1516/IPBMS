import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EmailTemplateService } from '../../application/services/notifications/email-template.service';

@Injectable()
export class DefaultEmailTemplatesService implements OnModuleInit {
  private readonly logger = new Logger(DefaultEmailTemplatesService.name);

  constructor(private readonly emailTemplateService: EmailTemplateService) {}

  async onModuleInit() {
    await this.seedDefaults().catch((err) => {
      this.logger.error('Failed to seed default email templates', err as any);
    });
  }

  async seedDefaults(): Promise<{ created: string[]; skipped: string[] }> {
    const created: string[] = [];
    const skipped: string[] = [];

    // appointment_confirmation
    const appt = await this.emailTemplateService.findByType('appointment_confirmation');
    if (!appt) {
      await this.emailTemplateService.create({
        name: 'Appointment confirmation',
        type: 'appointment_confirmation',
        subject_template: 'Appointment confirmation for {{patientName}}',
        html_template:
          '<p>Dear Doctor,</p><p>You have an appointment with <strong>{{patientName}}</strong> at <strong>{{time}}</strong>.</p>',
        text_template: 'Dear Doctor, You have an appointment with {{patientName}} at {{time}}.',
        variables: ['patientName', 'time'],
        is_active: true,
      });
      this.logger.log('Seeded email template: appointment_confirmation');
      created.push('appointment_confirmation');
    } else {
      skipped.push('appointment_confirmation');
    }

    // doctor_message
    const dm = await this.emailTemplateService.findByType('doctor_message');
    if (!dm) {
      await this.emailTemplateService.create({
        name: 'Doctor notification',
        type: 'doctor_message',
        subject_template: 'Message from care team',
        html_template: '<p>You have a new message from the care team.</p><p>{{message}}</p>',
        text_template: 'You have a new message from the care team. {{message}}',
        variables: ['message'],
        is_active: true,
      });
      this.logger.log('Seeded email template: doctor_message');
      created.push('doctor_message');
    } else {
      skipped.push('doctor_message');
    }

    return { created, skipped };
  }
}
