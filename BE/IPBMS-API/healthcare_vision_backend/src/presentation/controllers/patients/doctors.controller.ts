import { DoctorDto } from '@/application/dto/patient-info/doctor.dto';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import { CreateDoctorDto } from '../../../application/dto/patient-info/create-doctor.dto';
import { SendEmailDto } from '../../../application/dto/patient-info/send-email.dto';
import { UpdateDoctorDto } from '../../../application/dto/patient-info/update-doctor.dto';
import { EmailTemplateService } from '../../../application/services/notifications/email-template.service';
import { DoctorsService } from '../../../application/services/users';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { SharedPermission } from '../../../shared/decorators/shared-permission.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { SharedPermissionGuard } from '../../../shared/guards/shared-permission.guard';
import { EmailService } from '../../../shared/services/email.service';

@ApiTags('patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, SharedPermissionGuard)
@Roles('admin', 'caregiver', 'customer')
@Controller('patients/:customerId/doctors')
export class DoctorsController {
  constructor(
    private readonly svc: DoctorsService,
    private readonly emailSvc: EmailService,
    private readonly emailTemplateSvc: EmailTemplateService,
  ) {}

  @Get()
  @SharedPermission('profile:view')
  @ApiOperation({ summary: 'Lấy danh sách bác sĩ của bệnh nhân' })
  @ApiOkResponse({
    description: 'List of doctors',
    type: [DoctorDto],
  })
  async list(@Param('customerId') customerId: string, @Req() req: any) {
    return this.svc.listForPatient(req.user, customerId);
  }

  @Get(':doctorId')
  @SharedPermission('profile:view')
  @ApiOperation({ summary: 'Lấy thông tin bác sĩ theo id' })
  @ApiOkResponse({
    description: 'Doctor',
    type: DoctorDto,
  })
  async getOne(
    @Param('customerId') customerId: string,
    @Param('doctorId') doctorId: string,
    @Req() req: any,
  ) {
    return this.svc.getDoctor(req.user, customerId, doctorId);
  }

  @Post()
  @SharedPermission('profile:update')
  @ApiOperation({ summary: 'Tạo hồ sơ bác sĩ cho bệnh nhân' })
  @ApiBody({
    description: 'Doctor payload',
    schema: {
      example: {
        name: 'Dr. Nguyen Van A',
        email: 'nguyenvana@example.com',
        phone: '+84 912345678',
        specialty: 'Cardiology',
        notes: 'Primary cardiologist for hypertension management',
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Doctor created',
    type: DoctorDto,
  })
  async create(
    @Param('customerId') customerId: string,
    @Body() body: CreateDoctorDto,
    @Req() req: any,
  ) {
    return this.svc.createDoctor(req.user, customerId, body);
  }

  @Put(':doctorId')
  @SharedPermission('profile:update')
  @ApiOperation({ summary: 'Cập nhật hồ sơ bác sĩ' })
  @ApiBody({
    description: 'Fields to update for a doctor',
    schema: {
      example: {
        name: 'Dr. Nguyen Van B',
        phone: '+84 909876543',
        notes: 'Updated phone and name',
      },
    },
  })
  @ApiOkResponse({
    description: 'Doctor updated',
    type: DoctorDto,
  })
  async update(
    @Param('customerId') customerId: string,
    @Param('doctorId') doctorId: string,
    @Body() body: UpdateDoctorDto,
    @Req() req: any,
  ) {
    return this.svc.updateDoctor(req.user, customerId, doctorId, body);
  }

  @Delete(':doctorId')
  @SharedPermission('profile:update')
  @ApiOperation({ summary: 'Xóa hồ sơ bác sĩ' })
  @ApiOkResponse({ description: 'Delete result', schema: { example: { success: true } } })
  async remove(
    @Param('customerId') customerId: string,
    @Param('doctorId') doctorId: string,
    @Req() req: any,
  ) {
    return this.svc.removeDoctor(req.user, customerId, doctorId);
  }

  @Post(':doctorId/email')
  @SharedPermission('profile:update')
  @ApiOperation({ summary: 'Gửi email tới bác sĩ của bệnh nhân' })
  @ApiBody({
    type: SendEmailDto,
    description: `Hướng dẫn gửi email tới bác sĩ (tóm tắt):

1) Xác thực & quyền truy cập
   - Gọi kèm header Authorization: Bearer <JWT> của user (admin/caregiver/customer) có quyền 'profile:update'.

2) Kiểm tra thông tin bác sĩ
   - Server sẽ kiểm tra email của bác sĩ (theo doctorId). Nếu bác sĩ chưa có email, request sẽ trả lỗi 400.

3) Chọn kiểu gửi nội dung (3 cách)
  A) Raw content: truyền trực tiếp 'subject' và 'html' hoặc 'text'.
    - Ví dụ: { "subject": "Xác nhận lịch hẹn", "text": "Xin chào..." }
  B) Template: truyền 'templateType' và 'variables' để server render template có sẵn.
    - Ví dụ: { "templateType": "appointment_confirmation", "variables": { "patientName": "Nguyen A", "time": "09:00" } }
  C) Message fallback: chỉ truyền 'message' (chuỗi ngắn) — server sẽ dùng template mặc định 'doctor_message' và map 'variables.message'.

4) Trả về
   - Response: { success: true } khi gửi thành công (hoặc false nếu gửi thất bại).

Ghi chú kỹ thuật: Nếu truyền 'templateType', server không yêu cầu 'html'/'text' (template sẽ cung cấp nội dung).`,
    examples: {
      raw: {
        summary: 'Nội dung thô (raw)',
        value: {
          subject: 'Xác nhận lịch hẹn',
          // html: '<p>Kính gửi bác sĩ, xin vui lòng xác nhận lịch hẹn vào 2025-11-11 09:00.</p>',
          text: 'Xin chào bác sĩ, xin vui lòng xác nhận lịch hẹn vào 2025-11-11 09:00',
        },
      },
      template: {
        summary: 'Gửi theo mẫu (template)',
        value: {
          templateType: 'appointment_confirmation',
          variables: { patientName: 'Nguyen A', time: '2025-11-11 09:00' },
        },
      },
      message_fallback: {
        summary: 'Gửi nhanh bằng message (fallback)',
        value: { message: 'Bệnh nhân cần khám gấp, xin vui lòng liên hệ.' },
      },
    },
    schema: {
      example: {
        subject: 'Xác nhận lịch hẹn',
        text: 'Xin chào bác sĩ, xin vui lòng xác nhận lịch hẹn vào 2025-11-11 09:00.',
      },
    },
  })
  @ApiOkResponse({ description: 'Email send result', schema: { example: { success: true } } })
  async sendEmail(
    @Param('customerId') customerId: string,
    @Param('doctorId') doctorId: string,
    @Body() body: SendEmailDto,
    @Req() req: any,
  ) {
    const doctor = await this.svc.getDoctor(req.user, customerId, doctorId);
    const to = doctor?.email;
    if (!to) throw new BadRequestException('Doctor does not have an email');
    // Auto-fallback: if no templateType and no raw content but a message is provided,
    // use the default 'doctor_message' template and pass message as variable.
    let subject = body.subject;
    let html = body.html;
    let text = body.text;
    let templateType = body.templateType;
    const variables = body.variables || {};

    if (!templateType) {
      // If caller provided explicit message field, use it as fallback
      if (typeof (body as any).message === 'string' && (body as any).message.trim() !== '') {
        templateType = 'doctor_message';
        variables.message = (body as any).message;
      }
      // If variables.message exists, treat it as an implicit request to use doctor_message
      else if (
        variables &&
        typeof variables.message === 'string' &&
        variables.message.trim() !== ''
      ) {
        templateType = 'doctor_message';
      }
    }

    if (templateType) {
      const rendered = await this.emailTemplateSvc.renderTemplate(templateType, variables);
      subject = rendered.subject;
      html = rendered.html;
      text = rendered.text;
    }

    const ok = await this.emailSvc.sendEmail(to as string, {
      subject: subject ?? 'Message from Care System',
      html,
      text,
    });
    return { success: ok };
  }
}
