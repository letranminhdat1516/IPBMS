import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';

export const MeSwagger = {
  getProfile: applyDecorators(
    ApiOperation({ summary: 'Lấy thông tin hồ sơ người dùng hiện tại' }),
    ApiResponse({
      status: 200,
      schema: {
        example: {
          username: 'nguyenvana',
          email: 'nguyen@example.com',
          bio: 'Kỹ sư phần mềm',
          urls: [{ value: 'https://github.com/nguyenvana' }],
        },
      },
    }),
  ),

  putProfile: applyDecorators(
    ApiOperation({ summary: 'Cập nhật thông tin hồ sơ người dùng' }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          bio: { type: 'string', example: 'Tôi yêu lập trình' },
          urls: {
            type: 'array',
            items: {
              oneOf: [
                { type: 'string' },
                { type: 'object', properties: { value: { type: 'string' } } },
              ],
            },
            example: ['https://twitter.com/dev', { value: 'https://github.com/me' }],
          },
        },
      },
    }),
    ApiResponse({ status: 200 }),
  ),

  getAccount: applyDecorators(
    ApiOperation({ summary: 'Lấy thông tin tài khoản người dùng' }),
    ApiResponse({
      status: 200,
      schema: {
        example: {
          name: 'Nguyễn Văn A',
          dob: '1990-01-01',
          language: 'vi',
        },
      },
    }),
  ),

  putAccount: applyDecorators(
    ApiOperation({ summary: 'Cập nhật thông tin tài khoản người dùng' }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Nguyễn Văn A' },
          dob: { type: 'string', format: 'date', example: '1990-01-01' },
          language: { type: 'string', example: 'vi' },
        },
      },
    }),
    ApiResponse({ status: 200 }),
  ),

  getAppearance: applyDecorators(
    ApiOperation({ summary: 'Lấy cài đặt giao diện người dùng' }),
    ApiResponse({
      status: 200,
      schema: { example: { theme: 'light', font: 'Inter' } },
    }),
  ),

  putAppearance: applyDecorators(
    ApiOperation({ summary: 'Cập nhật cài đặt giao diện người dùng' }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          theme: { type: 'string', enum: ['light', 'dark'], example: 'dark' },
          font: { type: 'string', example: 'Inter' },
        },
      },
    }),
    ApiResponse({ status: 200 }),
  ),

  getNotifications: applyDecorators(
    ApiOperation({ summary: 'Lấy cài đặt thông báo người dùng' }),
    ApiResponse({
      status: 200,
      schema: {
        example: {
          type: 'all',
          mobile: true,
          communication_emails: true,
          social_emails: false,
          marketing_emails: false,
          security_emails: true,
        },
      },
    }),
  ),

  putNotifications: applyDecorators(
    ApiOperation({ summary: 'Cập nhật cài đặt thông báo người dùng' }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['all', 'mentions', 'none'] },
          mobile: { type: 'boolean' },
          communication_emails: { type: 'boolean' },
          social_emails: { type: 'boolean' },
          marketing_emails: { type: 'boolean' },
          security_emails: { type: 'boolean' },
        },
      },
    }),
    ApiResponse({ status: 200 }),
  ),

  getDisplay: applyDecorators(
    ApiOperation({ summary: 'Lấy cấu hình hiển thị giao diện' }),
    ApiResponse({
      status: 200,
      schema: { example: { items: ['dashboard', 'alerts'] } },
    }),
  ),

  putDisplay: applyDecorators(
    ApiOperation({ summary: 'Cập nhật cấu hình hiển thị giao diện' }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { type: 'string' },
            example: ['dashboard', 'reports', 'alerts'],
          },
        },
      },
    }),
    ApiResponse({ status: 200 }),
  ),
};
