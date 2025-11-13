import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthenticatedRequest } from '../../../shared/types/auth.types';
import { timeUtils } from '../../../shared/constants/time.constants';
import { EmergencyContactsService } from '../../../application/services/users';
import {
  ContactCreateDto,
  ContactUpdateDto,
} from '../../../application/dto/patient-info/medical-info.dto';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';

import { getUserIdFromReq } from '../../../shared/utils/auth.util';

@ApiTags('emergency-contacts')
@ApiBearerAuth()
@Controller('users/:userId/emergency-contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'caregiver', 'customer')
export class EmergencyContactsController {
  constructor(private readonly emergencyContactsService: EmergencyContactsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách liên hệ khẩn cấp',
    description: 'Lấy tất cả liên hệ khẩn cấp của user với phân loại theo mức ưu tiên',
  })
  @ApiParam({ name: 'userId', description: 'ID của user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Danh sách liên hệ khẩn cấp',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              user_id: { type: 'string' },
              name: { type: 'string' },
              relation: { type: 'string' },
              phone: { type: 'string' },
              alert_level: { type: 'number' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
            },
          },
        },
        message: { type: 'string', example: 'Operation successful' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Không có quyền truy cập',
  })
  async getEmergencyContacts(@Param('userId') userId: string, @Req() req: AuthenticatedRequest) {
    // Check if user can access this data
    const currentUserId = getUserIdFromReq(req);
    if (req.user?.role === 'customer' && currentUserId !== userId) {
      throw new Error('Không có quyền truy cập dữ liệu của user khác');
    }

    const contacts = await this.emergencyContactsService.getEmergencyContacts(userId);

    const now = new Date();
    return {
      success: true,
      data: contacts,
      message: 'Lấy danh sách liên hệ khẩn cấp thành công',
      timestamp: now.toISOString(),
      timestamp_local: timeUtils.toTimezoneIsoString(now),
    };
  }

  @Get(':contactId')
  @ApiOperation({
    summary: 'Lấy chi tiết liên hệ khẩn cấp',
    description: 'Lấy thông tin chi tiết của một liên hệ khẩn cấp',
  })
  @ApiParam({ name: 'userId', description: 'ID của user' })
  @ApiParam({ name: 'contactId', description: 'ID của liên hệ khẩn cấp' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chi tiết liên hệ khẩn cấp',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            user_id: { type: 'string' },
            name: { type: 'string' },
            relation: { type: 'string' },
            phone: { type: 'string' },
            alert_level: { type: 'number' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string', example: 'Operation successful' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy liên hệ khẩn cấp',
  })
  async getEmergencyContactById(
    @Param('userId') userId: string,
    @Param('contactId') contactId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    // Check if user can access this data
    const currentUserId = getUserIdFromReq(req);
    if (req.user?.role === 'customer' && currentUserId !== userId) {
      throw new Error('Không có quyền truy cập dữ liệu của user khác');
    }

    const contact = await this.emergencyContactsService.getEmergencyContactById(contactId, userId);

    const now = new Date();
    return {
      success: true,
      data: contact,
      message: 'Lấy chi tiết liên hệ khẩn cấp thành công',
      timestamp: now.toISOString(),
      timestamp_local: timeUtils.toTimezoneIsoString(now),
    };
  }

  @Post()
  @ApiOperation({
    summary: 'Tạo liên hệ khẩn cấp mới',
    description: 'Tạo một liên hệ khẩn cấp mới cho user (tối đa 2 liên hệ)',
  })
  @ApiParam({ name: 'userId', description: 'ID của user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Liên hệ khẩn cấp đã được tạo',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            user_id: { type: 'string' },
            name: { type: 'string' },
            relation: { type: 'string' },
            phone: { type: 'string' },
            alert_level: { type: 'number' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string', example: 'Emergency contact created successfully' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dữ liệu không hợp lệ hoặc đã đạt giới hạn số liên hệ',
  })
  async createEmergencyContact(
    @Param('userId') userId: string,
    @Body() createDto: ContactCreateDto,
    @Req() req: AuthenticatedRequest,
  ) {
    // Check if user can modify this data
    const currentUserId = getUserIdFromReq(req);
    if (req.user?.role === 'customer' && currentUserId !== userId) {
      throw new Error('Không có quyền tạo liên hệ cho user khác');
    }

    const contact = await this.emergencyContactsService.createEmergencyContact(userId, createDto);

    const now = new Date();
    return {
      success: true,
      data: contact,
      message: 'Tạo liên hệ khẩn cấp thành công',
      timestamp: now.toISOString(),
      timestamp_local: timeUtils.toTimezoneIsoString(now),
    };
  }

  @Put(':contactId')
  @ApiOperation({
    summary: 'Cập nhật liên hệ khẩn cấp',
    description: 'Cập nhật thông tin của một liên hệ khẩn cấp',
  })
  @ApiParam({ name: 'userId', description: 'ID của user' })
  @ApiParam({ name: 'contactId', description: 'ID của liên hệ khẩn cấp' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Liên hệ khẩn cấp đã được cập nhật',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            user_id: { type: 'string' },
            name: { type: 'string' },
            relation: { type: 'string' },
            phone: { type: 'string' },
            alert_level: { type: 'number' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string', example: 'Emergency contact updated successfully' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy liên hệ khẩn cấp',
  })
  async updateEmergencyContact(
    @Param('userId') userId: string,
    @Param('contactId') contactId: string,
    @Body() updateDto: ContactUpdateDto,
    @Req() req: AuthenticatedRequest,
  ) {
    // Check if user can modify this data
    const currentUserId = getUserIdFromReq(req);
    if (req.user?.role === 'customer' && currentUserId !== userId) {
      throw new Error('Không có quyền cập nhật liên hệ của user khác');
    }

    const contact = await this.emergencyContactsService.updateEmergencyContact(
      contactId,
      userId,
      updateDto,
    );

    const now = new Date();
    return {
      success: true,
      data: contact,
      message: 'Cập nhật liên hệ khẩn cấp thành công',
      timestamp: now.toISOString(),
      timestamp_local: timeUtils.toTimezoneIsoString(now),
    };
  }

  @Delete(':contactId')
  @ApiOperation({
    summary: 'Xóa liên hệ khẩn cấp',
    description: 'Xóa một liên hệ khẩn cấp (soft delete)',
  })
  @ApiParam({ name: 'userId', description: 'ID của user' })
  @ApiParam({ name: 'contactId', description: 'ID của liên hệ khẩn cấp' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Liên hệ khẩn cấp đã được xóa',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { type: 'null' },
        message: { type: 'string', example: 'Emergency contact deleted successfully' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy liên hệ khẩn cấp',
  })
  async deleteEmergencyContact(
    @Param('userId') userId: string,
    @Param('contactId') contactId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    // Check if user can modify this data
    const currentUserId = getUserIdFromReq(req);
    if (req.user?.role === 'customer' && currentUserId !== userId) {
      throw new Error('Không có quyền xóa liên hệ của user khác');
    }

    const result = await this.emergencyContactsService.deleteEmergencyContact(contactId, userId);

    const now = new Date();
    return {
      success: true,
      data: null,
      message: result.message,
      timestamp: now.toISOString(),
      timestamp_local: timeUtils.toTimezoneIsoString(now),
    };
  }
}
