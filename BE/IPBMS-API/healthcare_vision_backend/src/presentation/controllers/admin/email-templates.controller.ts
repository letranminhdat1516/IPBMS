import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { EmailTemplateService } from '../../../application/services/email-template.service';
import { DefaultEmailTemplatesService } from '../../../modules/email-templates/default-templates.service';
import { CreateEmailTemplateDto } from '../../../application/dto/email-templates/create-email-template.dto';
import { UpdateEmailTemplateDto } from '../../../application/dto/email-templates/update-email-template.dto';

@ApiTags('email-templates')
@Controller('admin/email-templates')
export class EmailTemplateController {
  constructor(
    private readonly _emailTemplateService: EmailTemplateService,
    private readonly _defaultTemplatesService: DefaultEmailTemplatesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new email template' })
  @ApiResponse({
    status: 201,
    description: 'Email template created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid template syntax',
  })
  create(@Body() createEmailTemplateDto: CreateEmailTemplateDto) {
    return this._emailTemplateService.create(createEmailTemplateDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all email templates with optional filtering' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by template type' })
  @ApiQuery({ name: 'is_active', required: false, description: 'Filter by active status' })
  @ApiQuery({ name: 'skip', required: false, description: 'Number of records to skip' })
  @ApiQuery({ name: 'take', required: false, description: 'Number of records to take' })
  @ApiResponse({
    status: 200,
    description: 'List of email templates',
  })
  findAll(
    @Query('type') type?: string,
    @Query('is_active') is_active?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this._emailTemplateService.findAll({
      type,
      is_active: is_active ? is_active === 'true' : undefined,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  @Get('types')
  @ApiOperation({ summary: 'Get all available template types' })
  @ApiResponse({
    status: 200,
    description: 'List of template types',
  })
  async getTemplateTypes() {
    const templates = await this._emailTemplateService.findAll();
    const types = [...new Set(templates.map((t) => t.type))];
    return { types };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get email template by ID' })
  @ApiParam({ name: 'id', description: 'Email template ID' })
  @ApiResponse({
    status: 200,
    description: 'Email template details',
  })
  @ApiResponse({
    status: 404,
    description: 'Email template not found',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this._emailTemplateService.findOne(id);
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get active email template by type' })
  @ApiParam({ name: 'type', description: 'Template type' })
  @ApiResponse({
    status: 200,
    description: 'Email template details',
  })
  @ApiResponse({
    status: 404,
    description: 'Email template not found',
  })
  findByType(@Param('type') type: string) {
    return this._emailTemplateService.findByType(type);
  }

  @Get('type/:type/variables')
  @ApiOperation({ summary: 'Get variables for a template type' })
  @ApiParam({ name: 'type', description: 'Template type' })
  @ApiResponse({
    status: 200,
    description: 'List of template variables',
  })
  getTemplateVariables(@Param('type') type: string) {
    return this._emailTemplateService.getTemplateVariables(type);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update email template' })
  @ApiParam({ name: 'id', description: 'Email template ID' })
  @ApiResponse({
    status: 200,
    description: 'Email template updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Email template not found',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEmailTemplateDto: UpdateEmailTemplateDto,
  ) {
    return this._emailTemplateService.update(id, updateEmailTemplateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete email template' })
  @ApiParam({ name: 'id', description: 'Email template ID' })
  @ApiResponse({
    status: 200,
    description: 'Email template deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Email template not found',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this._emailTemplateService.remove(id);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate email template' })
  @ApiParam({ name: 'id', description: 'Email template ID to duplicate' })
  @ApiResponse({
    status: 201,
    description: 'Email template duplicated successfully',
  })
  duplicate(@Param('id', ParseUUIDPipe) id: string, @Body() body: { name: string }) {
    return this._emailTemplateService.duplicateTemplate(id, body.name);
  }

  @Post('render/:type')
  @ApiOperation({ summary: 'Render email template with variables' })
  @ApiParam({ name: 'type', description: 'Template type' })
  @ApiResponse({
    status: 200,
    description: 'Rendered email template',
  })
  @ApiResponse({
    status: 404,
    description: 'Email template not found',
  })
  renderTemplate(@Param('type') type: string, @Body() variables: Record<string, any>) {
    return this._emailTemplateService.renderTemplate(type, variables);
  }

  @Post('seed-defaults')
  @ApiOperation({
    summary: 'Seed default email templates (appointment_confirmation, doctor_message)',
  })
  @ApiResponse({ status: 200, description: 'Seed result' })
  async seedDefaults() {
    return this._defaultTemplatesService.seedDefaults();
  }

  @Post(':id/send-test')
  @ApiOperation({ summary: 'Send test email using template' })
  @ApiParam({ name: 'id', description: 'Email template ID' })
  @ApiResponse({
    status: 200,
    description: 'Test email sent successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Email template not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Failed to send test email',
  })
  sendTestEmail(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { to: string; variables?: Record<string, any> },
  ) {
    return this._emailTemplateService.sendTestEmail(id, body.to, body.variables || {});
  }
}
