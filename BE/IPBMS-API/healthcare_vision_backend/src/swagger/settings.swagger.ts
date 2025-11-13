import { ApiProperty } from '@nestjs/swagger';

export class UserSettingSwagger {
  @ApiProperty({ example: 'theme', description: 'Tên key của setting' })
  key!: string;

  @ApiProperty({ example: 'dark', description: 'Giá trị của setting' })
  value!: string;

  @ApiProperty({ example: 'user-uuid', description: 'ID của user' })
  user_id!: string;

  @ApiProperty({ example: '2025-08-21T12:00:00Z', description: 'Thời gian cập nhật' })
  updated_at!: string;

  @ApiProperty({ example: 'admin-uuid', description: 'Người cập nhật' })
  updated_by!: string;

  @ApiProperty({ example: true, description: 'Có phải giá trị mặc định không' })
  isDefault?: boolean;
}

export class SetUserSettingDto {
  @ApiProperty({ example: 'theme', description: 'Tên key của setting' })
  key!: string;

  @ApiProperty({ example: 'dark', description: 'Giá trị mới' })
  value!: string;
}

export class AdminSetUserSettingDto {
  @ApiProperty({ example: 'user-uuid', description: 'ID của user cần chỉnh' })
  userId!: string;

  @ApiProperty({ example: 'theme', description: 'Tên key của setting' })
  key!: string;

  @ApiProperty({ example: 'dark', description: 'Giá trị mới' })
  value!: string;
}
