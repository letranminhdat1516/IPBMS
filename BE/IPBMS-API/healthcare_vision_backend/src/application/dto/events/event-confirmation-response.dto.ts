import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO cho response của event confirmation
 */
export class EventConfirmationResponseDto {
  @ApiProperty({
    description: 'ID của event',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: true,
  })
  event_id!: string;

  @ApiProperty({
    description: 'Trạng thái xác nhận',
    enum: ['DETECTED', 'CAREGIVER_UPDATED', 'CONFIRMED_BY_CUSTOMER', 'REJECTED_BY_CUSTOMER'],
    example: 'CAREGIVER_UPDATED',
    required: true,
  })
  confirmation_state!: string;

  @ApiPropertyOptional({ description: 'Trạng thái hiện tại của event', example: 'danger' })
  status?: string;

  @ApiPropertyOptional({ description: 'Loại event', example: 'fall' })
  event_type?: string;

  @ApiPropertyOptional({ description: 'Trạng thái được đề xuất', example: 'normal' })
  proposed_status?: string;

  @ApiPropertyOptional({ description: 'Loại event được đề xuất', example: 'normal_activity' })
  proposed_event_type?: string;

  @ApiPropertyOptional({ description: 'Trạng thái trước khi thay đổi', example: 'danger' })
  previous_status?: string;

  @ApiPropertyOptional({ description: 'Loại event trước khi thay đổi', example: 'fall' })
  previous_event_type?: string;

  @ApiPropertyOptional({
    description: 'Thời hạn phản hồi (ISO datetime string)',
    example: '2025-10-12T10:00:00Z',
    type: String,
  })
  pending_until?: string;

  @ApiPropertyOptional({
    description:
      'Derived state for UI: pending|approved|rejected|none (computed server-side from confirmation_state + last history action)',
    enum: ['pending', 'approved', 'rejected', 'none'],
    example: 'pending',
  })
  proposal_state?: string;

  @ApiProperty({
    description: 'Whether a pending proposal is already expired (now() > pending_until)',
    example: false,
    required: true,
  })
  pending_expired!: boolean;

  @ApiPropertyOptional({
    description: 'Lý do đề xuất thay đổi',
    example: 'False positive detection',
  })
  pending_reason?: string;

  @ApiPropertyOptional({
    description: 'ID người đề xuất (caregiver)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  proposed_by?: string;

  @ApiPropertyOptional({
    description: 'ID người xác nhận (customer)',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  acknowledged_by?: string;

  @ApiPropertyOptional({
    description: 'Thời gian xác nhận (ISO datetime string)',
    example: '2025-10-10T15:30:00Z',
    type: String,
  })
  acknowledged_at?: string;

  @ApiProperty({
    description: 'Thời gian phát hiện sự kiện (ISO datetime string)',
    example: '2025-10-10T10:00:00Z',
    required: true,
    type: String,
  })
  detected_at!: string;

  @ApiPropertyOptional({
    description: 'Thông tin camera',
    example: { camera_name: 'Camera 1', location_in_room: 'Phòng ngủ' },
  })
  camera_info?: {
    camera_name: string;
    location_in_room: string;
  };

  @ApiPropertyOptional({ description: 'URL snapshot của sự kiện' })
  snapshot_url?: string;

  @ApiPropertyOptional({
    description: 'ID của snapshot liên quan đến event',
    example: '550e8400-e29b-41d4-a716-446655440010',
  })
  snapshot_id?: string | null;

  @ApiPropertyOptional({
    description: 'Thông tin người đề xuất',
    example: { user_id: 'uuid', full_name: 'Nguyễn Văn A', username: 'caregiver_a' },
  })
  caregiver_info?: {
    user_id: string;
    full_name: string;
    username: string;
  };

  @ApiPropertyOptional({
    description: 'Thông tin customer',
    example: { user_id: 'uuid', full_name: 'Trần Thị B', username: 'customer_b' },
  })
  customer_info?: {
    user_id: string;
    full_name: string;
    username: string;
  };
}

/**
 * DTO cho danh sách pending proposals
 */
export class PendingProposalsResponseDto {
  @ApiProperty({ description: 'Tổng số proposals', example: 5 })
  total!: number;

  @ApiProperty({ description: 'Danh sách proposals', type: [EventConfirmationResponseDto] })
  proposals!: EventConfirmationResponseDto[];
}

/**
 * General proposals response used by GET /events/proposals (may include pending and terminal states)
 */
export class ProposalsResponseDto extends PendingProposalsResponseDto {}

/**
 * DTO cho confirmation history
 */
export class ConfirmationHistoryItemDto {
  @ApiProperty({ description: 'ID của event', example: '550e8400-e29b-41d4-a716-446655440000' })
  event_id!: string;

  @ApiProperty({
    description: 'Hành động',
    // NOTE: 'auto_approved' existed historically. Current runtime policy disables automatic
    // approval (silence != consent); expired proposals are treated as rejected. Historical audit
    // entries may still reference 'auto_approved'.
    enum: ['proposed', 'confirmed', 'rejected', 'cancelled', 'auto_rejected', 'auto_approved'],
    example: 'confirmed',
  })
  action!: string;

  @ApiProperty({
    description: 'ID người thực hiện',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  actor_id!: string;

  @ApiProperty({ description: 'Tên người thực hiện', example: 'Nguyễn Văn A' })
  actor_name!: string;

  @ApiProperty({
    description: 'Vai trò',
    enum: ['customer', 'caregiver', 'system'],
    example: 'customer',
  })
  actor_role!: string;

  @ApiProperty({ description: 'Thời gian thực hiện', example: '2025-10-10T15:30:00Z' })
  timestamp!: Date;

  @ApiPropertyOptional({ description: 'Chi tiết thay đổi' })
  details?: {
    from_status?: string;
    to_status?: string;
    from_event_type?: string;
    to_event_type?: string;
    reason?: string;
  };
}

export class ConfirmationHistoryResponseDto {
  @ApiProperty({ description: 'ID của event', example: '550e8400-e29b-41d4-a716-446655440000' })
  event_id!: string;

  @ApiProperty({ description: 'Lịch sử các hành động', type: [ConfirmationHistoryItemDto] })
  history!: ConfirmationHistoryItemDto[];
}

/**
 * Combined response for a proposal details view (proposal + timeline)
 */
export class ProposalDetailsResponseDto {
  @ApiProperty({ description: 'Proposal info', type: EventConfirmationResponseDto })
  proposal!: EventConfirmationResponseDto;

  @ApiProperty({ description: 'Timeline history', type: [ConfirmationHistoryItemDto] })
  history!: ConfirmationHistoryItemDto[];
}

/**
 * DTO cho thống kê confirmation
 */
export class ConfirmationStatsDto {
  @ApiProperty({ description: 'Tổng số proposals', example: 100 })
  total_proposals!: number;

  @ApiProperty({ description: 'Số lượng đã approve', example: 70 })
  approved!: number;

  @ApiProperty({ description: 'Số lượng đã reject', example: 20 })
  rejected!: number;

  @ApiProperty({ description: 'Số lượng auto-approve', example: 10 })
  auto_approved!: number;

  @ApiProperty({ description: 'Số lượng đã cancel', example: 5 })
  cancelled!: number;

  @ApiProperty({ description: 'Thời gian phản hồi trung bình (giờ)', example: 12.5 })
  avg_response_time_hours!: number;

  @ApiProperty({ description: 'Tỷ lệ approve (%)', example: 70.0 })
  approval_rate!: number;
}
