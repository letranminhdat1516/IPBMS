import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { timeUtils } from '../../shared/constants/time.constants';

@ApiTags('app')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({
    summary: 'Thông tin API',
    description:
      'Trả về thông tin tổng quan về API Healthcare Vision Backend: tên API, phiên bản, trạng thái, và các endpoint quan trọng.',
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin API đã được trả về thành công',
    schema: {
      example: {
        message: 'Healthcare Vision Backend API',
        version: '1.0.0',
        status: 'running',
        docs: '/api/docs',
        health: '/api/health',
        app: '/api/app',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi hệ thống khi truy xuất thông tin API',
    schema: {
      example: {
        statusCode: 500,
        message: 'Lỗi máy chủ nội bộ',
      },
    },
  })
  getApiInfo() {
    return {
      message: 'Healthcare Vision Backend API',
      version: '1.0.0',
      status: 'running',
      docs: '/api/docs',
      health: '/api/health',
      app: '/api/app',
    };
  }

  @Get('app')
  @ApiOperation({
    summary: 'Thông tin ứng dụng',
    description:
      'Trả về thông tin chi tiết của ứng dụng Healthcare Vision Backend bao gồm tên, phiên bản, môi trường hiện tại và thời gian hệ thống.',
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin ứng dụng đã được trả về thành công',
    schema: {
      example: {
        name: 'Healthcare Vision Backend',
        version: '1.0.0',
        description: 'Backend API for Healthcare Vision system',
        environment: 'development',
        timestamp: '2025-09-07T12:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi hệ thống khi truy xuất thông tin ứng dụng',
    schema: {
      example: {
        statusCode: 500,
        message: 'Lỗi máy chủ nội bộ',
      },
    },
  })
  getAppInfo() {
    const now = new Date();
    return {
      name: 'Healthcare Vision Backend',
      version: '1.0.0',
      description: 'Backend API for Healthcare Vision system',
      environment: process.env.NODE_ENV || 'development',
      timestamp: now.toISOString(),
      timestamp_local: timeUtils.toTimezoneIsoString(now),
    };
  }
}
