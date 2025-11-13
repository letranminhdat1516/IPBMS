import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { SwaggerEndpoint } from '../shared/decorators/swagger.decorator';
import { CreateCaregiverDto } from '../application/dto/caregiver/create-caregiver.dto';
import { UserDto } from '../application/dto/user/user.dto';

export const CaregiversSwagger = {
  create: applyDecorators(
    SwaggerEndpoint({
      summary: 'Tạo caregiver mới',
      responses: [
        { status: 201, description: 'Tạo thành công', type: UserDto },
        { status: 400, description: 'Dữ liệu không hợp lệ' },
      ],
    }),
    ApiBody({
      type: CreateCaregiverDto,
      examples: {
        default: {
          value: {
            username: 'caregiver_user1',
            email: 'care1@email.com',
            phone_number: '0865081427',
            pin: '123456',
            full_name: 'Nguyen Van B',
          },
        },
      },
    }),
  ),
  getAll: SwaggerEndpoint({
    summary: 'Lấy danh sách caregiver',
    responses: [
      {
        status: 200,
        description: 'Danh sách caregiver',
        type: UserDto,
        isArray: true,
      },
    ],
  }),
  search: applyDecorators(
    SwaggerEndpoint({
      summary: 'Tìm kiếm caregiver theo từ khoá',
      responses: [
        {
          status: 200,
          description: 'Danh sách caregiver',
          type: UserDto,
          isArray: true,
        },
        { status: 400, description: 'Dữ liệu không hợp lệ' },
      ],
    }),
    ApiOkResponse({
      description: 'Ví dụ phản hồi hiển thị trạng thái phân công (assignment status)',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
            full_name: { type: 'string' },
            email: { type: 'string' },
            assignment_status: { type: 'string', example: 'assigned' },
          },
        },
      },
    }),
  ),
  update: applyDecorators(
    SwaggerEndpoint({
      summary: 'Cập nhật caregiver',
      responses: [
        { status: 200, description: 'Cập nhật thành công', type: UserDto },
        { status: 400, description: 'Dữ liệu không hợp lệ' },
      ],
    }),
    ApiBody({ type: CreateCaregiverDto }),
  ),
  delete: SwaggerEndpoint({
    summary: 'Xoá caregiver',
    responses: [
      { status: 204, description: 'Xoá thành công' },
      { status: 400, description: 'Dữ liệu không hợp lệ' },
    ],
  }),
  getById: SwaggerEndpoint({
    summary: 'Lấy thông tin caregiver theo ID',
    responses: [
      { status: 200, description: 'Thông tin caregiver', type: UserDto },
      { status: 404, description: 'Caregiver không tồn tại' },
    ],
  }),
};
