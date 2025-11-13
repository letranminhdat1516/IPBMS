import { ApiProperty } from '@nestjs/swagger';

export class PreferenceDto {
  @ApiProperty({
    description: 'ID của cài đặt (preference) trong hệ thống',
    example: 'pref-1',
  })
  id!: string;

  @ApiProperty({
    description: 'ID người dùng mà cài đặt áp dụng',
    example: 'user-1',
  })
  user_id!: string;

  @ApiProperty({
    description: 'Chủ đề của preference (ở đây là "suggestions")',
    example: 'suggestions',
  })
  category!: string;

  @ApiProperty({
    description: "Khóa cài đặt, ví dụ: 'mute:all' hoặc 'mute:type:fallRisk'",
    example: 'mute:type:fallRisk',
  })
  setting_key!: string;

  @ApiProperty({
    description:
      'Giá trị cài đặt (thường là object). Ví dụ: { until: ISO8601|null, reason: string }',
  })
  setting_value!: Record<string, any>;

  @ApiProperty({
    description: 'ISO8601 thời gian tạo preference',
    example: '2025-10-01T00:00:00Z',
  })
  created_at!: string;

  @ApiProperty({
    description: 'ISO8601 thời gian cập nhật preference gần nhất',
    example: '2025-10-01T00:00:00Z',
  })
  updated_at!: string;
}
