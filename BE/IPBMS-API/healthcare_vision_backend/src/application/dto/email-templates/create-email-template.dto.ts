import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateEmailTemplateDto {
  @ApiProperty({
    description: 'Template name (unique identifier)',
    example: 'Welcome Email',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Template type/category',
    example: 'welcome',
  })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({
    description: 'Email subject template with variables in {{variable}} format',
    example: 'Welcome to {{appName}}, {{userName}}!',
  })
  @IsString()
  @IsNotEmpty()
  subject_template!: string;

  @ApiProperty({
    description: 'HTML email template with variables in {{variable}} format',
    example: '<h1>Welcome {{userName}}!</h1><p>Thank you for joining {{appName}}.</p>',
  })
  @IsString()
  @IsNotEmpty()
  html_template!: string;

  @ApiPropertyOptional({
    description: 'Plain text email template (optional)',
    example: 'Welcome {{userName}}! Thank you for joining {{appName}}.',
  })
  @IsString()
  @IsOptional()
  text_template?: string;

  @ApiPropertyOptional({
    description: 'Array of variable names that can be used in templates',
    example: ['userName', 'appName', 'resetUrl'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  variables?: string[];

  @ApiPropertyOptional({
    description: 'Whether the template is active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
