import { ApiProperty } from '@nestjs/swagger';

class ErrorDetailDto {
  @ApiProperty({ example: 'FORBIDDEN' })
  code!: string;

  @ApiProperty({ example: 'Access denied' })
  message!: string;

  @ApiProperty({ example: null, required: false })
  details?: any;
}

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success!: boolean;
  @ApiProperty({ example: 500 })
  status!: number;

  @ApiProperty({ type: ErrorDetailDto })
  error!: ErrorDetailDto;

  @ApiProperty({ example: '2023-10-27T10:00:00.000Z' })
  timestamp!: string;
}
