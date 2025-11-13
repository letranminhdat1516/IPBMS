import { ApiProperty } from '@nestjs/swagger';

export class AdminSystemInfoDto {
  @ApiProperty() createdAt!: Date;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ required: false }) lastLogin?: Date;
  @ApiProperty({ required: false }) lastLoginIp?: string;
  @ApiProperty({ required: false }) device?: string;
}

export class UserActivityLogDto {
  @ApiProperty() id!: string;
  @ApiProperty() type!: string;
  @ApiProperty() message!: string;
  @ApiProperty() createdAt!: Date;
}

export class AdminResponseDto {
  @ApiProperty({ type: AdminSystemInfoDto }) system!: AdminSystemInfoDto;
  @ApiProperty({ type: UserActivityLogDto, isArray: true })
  activities!: UserActivityLogDto[];
}
