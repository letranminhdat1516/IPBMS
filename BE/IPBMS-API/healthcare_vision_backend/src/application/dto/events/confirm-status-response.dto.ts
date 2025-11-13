import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for confirm status update operation
 * Returns the complete updated event with confirm_status and related fields
 */
export class ConfirmStatusResponseDto {
  @ApiProperty({
    description: `UUID của event detection.
    
**Format:** UUID v4 string
**Example:** "550e8400-e29b-41d4-a716-446655440000"

**Usage:**
- Primary key để identify event
- Dùng trong các API endpoints khác (GET, PATCH, DELETE)
- Reference trong notifications và activity logs`,
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
    format: 'uuid',
  })
  event_id!: string;

  @ApiProperty({
    description: `Trạng thái xác nhận sau khi cập nhật.

**Values:**
- **true:** Event đã được xác nhận là chính xác/hợp lệ
- **false:** Event bị từ chối/không chính xác
- **null:** Chưa được xác nhận (initial state)

**Synchronized Fields (khi true):**
- acknowledged_at: Được set tự động
- acknowledged_by: Được set = user_id

**Not Updated (khi false):**
- acknowledged_at: Giữ nguyên giá trị cũ
- acknowledged_by: Giữ nguyên giá trị cũ`,
    example: true,
    type: Boolean,
    nullable: true,
  })
  confirm_status!: boolean | null;

  @ApiProperty({
    description: `Thời điểm sự kiện được xác nhận (ISO 8601 timestamp).

**Behavior:**
- **Set automatically** khi confirm_status = true
- **NOT updated** khi confirm_status = false
- **Null** nếu chưa từng được confirm

**Use Cases:**
- Tính response time (acknowledged_at - detected_at)
- SLA monitoring
- Performance metrics
- Audit trail

**Format:** ISO 8601 datetime string với timezone
**Example:** "2025-10-10T10:30:00.000Z"`,
    example: '2025-10-10T10:30:00.000Z',
    type: String,
    format: 'date-time',
    required: false,
    nullable: true,
  })
  acknowledged_at?: Date | null;

  @ApiProperty({
    description: `UUID của user đã xác nhận sự kiện.

**Set automatically khi:**
- confirm_status = true
- User thực hiện action được lấy từ JWT token

**Roles có thể acknowledge:**
- **Customer:** User ID của customer owner
- **Caregiver:** User ID của caregiver
- **Admin:** User ID của admin

**Use Cases:**
- Traceability: Ai đã xác nhận
- Accountability: Trách nhiệm quyết định
- Audit log: Lịch sử hành động
- Relationship tracking: Customer vs Caregiver confirmations

**Relationships:**
- Join với users table để lấy full_name, email
- Filter events by acknowledger
- Statistics by user role`,
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
    format: 'uuid',
    required: false,
    nullable: true,
  })
  acknowledged_by?: string | null;

  @ApiProperty({
    description: `Ghi chú chi tiết về việc xác nhận/từ chối từ request.

**Content Guidelines:**
- **Max length:** 1000 characters
- **Supports:** Unicode, emoji, special characters
- **Recommended:** Always provide notes for reject (confirm_status = false)
- **Optional but helpful:** Provide context for approve

**Common Patterns:**

**Confirmation notes (confirm_status = true):**
- "Đã xác minh tại chỗ, người dùng an toàn"
- "Fall event chính xác, đã gọi cấp cứu"
- "Confirmed after caregiver visit"

**Rejection notes (confirm_status = false):**
- "False positive - không phải sự kiện ngã"
- "Camera bị che khuất, không rõ"
- "Người dùng chỉ đang ngồi xuống"

**Use Cases:**
- User communication
- AI model training
- Quality assurance
- Legal documentation`,
    example: 'Sự kiện chính xác, đã xác minh và hỗ trợ người dùng',
    type: String,
    required: false,
    nullable: true,
    maxLength: 1000,
  })
  notes?: string | null;

  @ApiProperty({
    description: `Thời điểm record được cập nhật lần cuối (auto-updated).

**Behavior:**
- Automatically set bởi database/ORM
- Updated on every PATCH/PUT operation
- Includes timezone information

**Use Cases:**
- Conflict detection trong concurrent updates
- Change tracking
- Sync operations với mobile apps
- Data freshness validation

**Format:** ISO 8601 datetime string
**Timezone:** UTC (coordinated universal time)`,
    example: '2025-10-10T10:30:00.000Z',
    type: String,
    format: 'date-time',
  })
  updated_at!: Date;

  @ApiProperty({
    description: `Snapshot ID liên kết với event (optional extended field).

**Purpose:**
- Reference đến snapshot image của event
- Join với snapshots table để lấy image URL
- Display evidence trong UI

**Format:** UUID v4 string
**Nullable:** Yes (old events có thể không có snapshot)`,
    example: '660f9511-f39c-51e5-b827-557766551111',
    type: String,
    format: 'uuid',
    required: false,
    nullable: true,
  })
  snapshot_id?: string | null;

  @ApiProperty({
    description: `User ID của người dùng bị ảnh hưởng bởi event (patient/customer).

**Usage:**
- Identify event owner
- Filter events by user
- Authorization checks
- Notification routing

**Relationships:**
- Join với users table
- Link với patient profiles
- Connect với camera ownership`,
    example: '770g0622-g40d-62f6-c938-668877662222',
    type: String,
    format: 'uuid',
    required: false,
  })
  user_id?: string;

  @ApiProperty({
    description: `Camera ID nơi event được phát hiện.

**Usage:**
- Identify detection source
- Location context
- Camera-specific settings
- Multi-camera correlation

**Relationships:**
- Join với cameras table
- Get camera location, name
- Filter by room/area`,
    example: '880h1733-h51e-73g7-d049-779988773333',
    type: String,
    format: 'uuid',
    required: false,
  })
  camera_id?: string;

  @ApiProperty({
    description: `Loại sự kiện được phát hiện.

**Common Types:**
- **fall:** Phát hiện ngã
- **abnormal_behavior:** Hành vi bất thường
- **wandering:** Đi lang thang
- **inactivity:** Không hoạt động
- **emergency:** Khẩn cấp

**Usage:**
- Event categorization
- UI display logic
- Notification routing
- Statistics grouping`,
    example: 'fall',
    type: String,
    enum: ['fall', 'abnormal_behavior', 'wandering', 'inactivity', 'emergency', 'other'],
    required: false,
  })
  event_type?: string;

  @ApiProperty({
    description: `Mô tả chi tiết về sự kiện (human-readable).

**Content:**
- AI-generated description
- Context information
- Location details

**Example Descriptions:**
- "Phát hiện ngã tại phòng khách lúc 10:25 AM"
- "Detected fall near bed area"
- "Abnormal movement pattern in bathroom"`,
    example: 'Phát hiện ngã tại phòng khách',
    type: String,
    required: false,
    nullable: true,
  })
  event_description?: string | null;

  @ApiProperty({
    description: `Độ tin cậy của AI detection (0.0 - 1.0).

**Ranges:**
- **0.9 - 1.0:** Very high confidence (reliable)
- **0.7 - 0.9:** High confidence (likely correct)
- **0.5 - 0.7:** Medium confidence (review recommended)
- **0.0 - 0.5:** Low confidence (likely false positive)

**Usage:**
- Auto-confirmation thresholds
- UI priority indicators
- Alert routing logic
- AI model evaluation`,
    example: 0.95,
    type: Number,
    format: 'float',
    minimum: 0,
    maximum: 1,
    required: false,
    nullable: true,
  })
  confidence_score?: number | null;

  @ApiProperty({
    description: `Thời điểm sự kiện được phát hiện (canonical timestamp).

**Importance:**
- **Primary timestamp** cho business logic
- Used in 48-hour access window calculations
- Sorting và filtering events
- SLA calculations

**Format:** ISO 8601 datetime với timezone
**Source:** Camera/AI detection system
**Immutable:** Không thay đổi sau khi tạo`,
    example: '2025-10-10T10:25:00.000Z',
    type: String,
    format: 'date-time',
    required: false,
  })
  detected_at?: Date;

  @ApiProperty({
    description: `Trạng thái xử lý của event.

**Status Values:**
- **new:** Mới phát hiện, chưa xem
- **reviewed:** Đã xem nhưng chưa xử lý
- **normal:** Không cần xử lý
- **warning:** Cảnh báo, cần theo dõi
- **critical:** Nghiêm trọng, cần xử lý ngay

**Workflow:**
new → reviewed → (normal|warning|critical)

**Different from confirm_status:**
- status: Mức độ nghiêm trọng/ưu tiên
- confirm_status: Xác thực tính chính xác`,
    example: 'normal',
    type: String,
    enum: ['new', 'reviewed', 'normal', 'warning', 'critical'],
    required: false,
  })
  status?: string;

  @ApiProperty({
    description: `Thời điểm event record được tạo trong database.

**Note:** Different from detected_at
- **detected_at:** Khi AI phát hiện (from camera)
- **created_at:** Khi record được lưu vào DB

**Usage:**
- Database audit
- System performance metrics
- Data ingestion delay tracking`,
    example: '2025-10-10T10:25:05.000Z',
    type: String,
    format: 'date-time',
    required: false,
  })
  created_at?: Date;
}
