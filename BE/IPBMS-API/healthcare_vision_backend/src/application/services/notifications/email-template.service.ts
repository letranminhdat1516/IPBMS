import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { EmailService } from '../../../shared/services/email.service';
import { CreateEmailTemplateDto } from '../../../application/dto/email-templates/create-email-template.dto';
import { UpdateEmailTemplateDto } from '../../../application/dto/email-templates/update-email-template.dto';

export interface RenderedEmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailTemplateService {
  constructor(
    private readonly _prisma: PrismaService,
    private readonly _moduleRef: ModuleRef,
  ) {}

  async create(createDto: CreateEmailTemplateDto) {
    // Validate template syntax and extract used variables
    this.validateTemplate(createDto.subject_template);
    this.validateTemplate(createDto.html_template);
    if (createDto.text_template) {
      this.validateTemplate(createDto.text_template);
    }

    // Collect variable names used in provided templates
    const usedVars = new Set<string>([
      ...this.extractTemplateVariables(createDto.subject_template),
      ...this.extractTemplateVariables(createDto.html_template),
      ...(createDto.text_template ? this.extractTemplateVariables(createDto.text_template) : []),
    ]);

    // If caller supplied a variables array, ensure it contains all used variables.
    if (createDto.variables && createDto.variables.length > 0) {
      const missing = [...usedVars].filter((v) => !createDto.variables!.includes(v));
      if (missing.length > 0) {
        throw new BadRequestException(
          `Danh sách biến truyền vào: ${JSON.stringify(createDto.variables)} nhưng mẫu sử dụng: ${JSON.stringify(
            [...usedVars],
          )}. Thiếu: ${missing.join(', ')}`,
        );
      }
    }

    const variablesToStore =
      createDto.variables && createDto.variables.length > 0 ? createDto.variables : [...usedVars];

    return this._prisma.mail_templates.create({
      data: {
        name: createDto.name,
        type: createDto.type,
        subject_template: createDto.subject_template,
        html_template: createDto.html_template,
        text_template: createDto.text_template,
        variables: variablesToStore || [],
      },
    });
  }

  async findAll(options?: { type?: string; is_active?: boolean; skip?: number; take?: number }) {
    const { type, is_active, skip = 0, take = 50 } = options || {};

    return this._prisma.mail_templates.findMany({
      where: {
        ...(type && { type }),
        ...(is_active !== undefined && { is_active }),
      },
      orderBy: { created_at: 'desc' },
      skip,
      take,
    });
  }

  async findByType(type: string): Promise<any | null> {
    return this._prisma.mail_templates.findFirst({
      where: {
        type,
        is_active: true,
      },
    });
  }

  async findOne(id: string) {
    const template = await this._prisma.mail_templates.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Email template with ID ${id} not found`);
    }

    return template;
  }

  async update(id: string, updateDto: UpdateEmailTemplateDto) {
    // Check if template exists
    await this.findOne(id);

    // Validate template syntax if provided
    if (updateDto.subject_template) {
      this.validateTemplate(updateDto.subject_template);
    }
    if (updateDto.html_template) {
      this.validateTemplate(updateDto.html_template);
    }
    if (updateDto.text_template) {
      this.validateTemplate(updateDto.text_template);
    }

    return this._prisma.mail_templates.update({
      where: { id },
      data: {
        ...(updateDto.name && { name: updateDto.name }),
        ...(updateDto.type && { type: updateDto.type }),
        ...(updateDto.subject_template && { subject_template: updateDto.subject_template }),
        ...(updateDto.html_template && { html_template: updateDto.html_template }),
        ...(updateDto.text_template !== undefined && { text_template: updateDto.text_template }),
        ...(updateDto.variables && { variables: updateDto.variables }),
        ...(updateDto.is_active !== undefined && { is_active: updateDto.is_active }),
      },
    });
  }

  async remove(id: string) {
    // Check if template exists
    await this.findOne(id);

    return this._prisma.mail_templates.delete({
      where: { id },
    });
  }

  async renderTemplate(
    type: string,
    variables: Record<string, any>,
  ): Promise<RenderedEmailTemplate> {
    const template = await this.findByType(type);

    if (!template) {
      throw new NotFoundException(`Không tìm thấy mẫu email cho loại '${type}'`);
    }

    try {
      const subject = this.interpolate(template.subject_template, variables);
      const html = this.interpolate(template.html_template, variables);
      const text = template.text_template
        ? this.interpolate(template.text_template, variables)
        : undefined;

      return {
        subject,
        html,
        text,
      };
    } catch (error) {
      throw new BadRequestException(`Không thể kết xuất mẫu email: ${(error as Error).message}`);
    }
  }

  async sendTestEmail(id: string, to: string, variables: Record<string, any> = {}) {
    const template = await this.findOne(id);

    if (!template) {
      throw new NotFoundException(`Không tìm thấy mẫu email với ID ${id}`);
    }

    try {
      const rendered = await this.renderTemplateById(id, variables);

      const emailService = this._moduleRef.get(EmailService);
      const success = await emailService.sendEmail(to, rendered);

      if (!success) {
        throw new BadRequestException('Gửi email thử không thành công');
      }

      return { message: 'Gửi email thử thành công' };
    } catch (error) {
      throw new BadRequestException(`Gửi email thử không thành công: ${(error as Error).message}`);
    }
  }

  async renderTemplateById(
    id: string,
    variables: Record<string, any>,
  ): Promise<RenderedEmailTemplate> {
    const template = await this.findOne(id);

    try {
      const subject = this.interpolate(template.subject_template, variables);
      const html = this.interpolate(template.html_template, variables);
      const text = template.text_template
        ? this.interpolate(template.text_template, variables)
        : undefined;

      return {
        subject,
        html,
        text,
      };
    } catch (error) {
      throw new BadRequestException(`Không thể kết xuất mẫu email: ${(error as Error).message}`);
    }
  }

  private validateTemplate(template: string): void {
    // Basic validation - check for balanced braces
    const openBraces = (template.match(/{{/g) || []).length;
    const closeBraces = (template.match(/}}/g) || []).length;

    if (openBraces !== closeBraces) {
      throw new BadRequestException(
        'Mẫu chứa dấu ngoặc biến không khớp. Vui lòng sử dụng định dạng {{variable}}.',
      );
    }
    // Optionally, attempt to extract variables to ensure regex compatibility
    this.extractTemplateVariables(template);
  }

  private interpolate(template: string, variables: Record<string, any>): string {
    const missing: string[] = [];

    const result = template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, key) => {
      const val = this.getVariableValue(variables, key);
      if (val === undefined) {
        missing.push(key);
        return '';
      }
      return String(val);
    });

    if (missing.length > 0) {
      // Report all missing variables at once for clearer errors
      throw new BadRequestException(`Thiếu biến bắt buộc: ${[...new Set(missing)].join(', ')}`);
    }

    return result;
  }

  /**
   * Extract unique variable keys from a template string.
   * Supports nested keys like `patient.name` and keys with underscores/hyphens.
   */
  private extractTemplateVariables(template: string): string[] {
    const re = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;
    const vars: string[] = [];
    let m: RegExpExecArray | null = null;
    while ((m = re.exec(template)) !== null) {
      vars.push(m[1]);
    }
    return Array.from(new Set(vars));
  }

  /**
   * Resolve a potentially nested key (dot-separated) from the variables object.
   */
  private getVariableValue(variables: Record<string, any>, key: string): any {
    if (!variables || typeof variables !== 'object') return undefined;
    const parts = key.split('.');
    let cur: any = variables;
    for (const p of parts) {
      if (cur == null) return undefined;
      cur = cur[p];
    }
    return cur;
  }

  async getTemplateVariables(type: string): Promise<string[]> {
    const template = await this.findByType(type);
    return (template?.variables as string[]) || [];
  }

  async duplicateTemplate(id: string, newName: string): Promise<any> {
    const original = await this.findOne(id);

    return this._prisma.mail_templates.create({
      data: {
        name: newName,
        type: original.type,
        subject_template: original.subject_template,
        html_template: original.html_template,
        text_template: original.text_template,
        variables: original.variables || [],
        is_active: false, // Start as inactive
      },
    });
  }
}
