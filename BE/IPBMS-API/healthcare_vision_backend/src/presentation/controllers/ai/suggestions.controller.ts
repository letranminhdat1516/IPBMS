import { Roles } from '@/shared/decorators/roles.decorator';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Body, Controller, Get, Logger, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ToggleSkipDto } from '../../../application/dto/suggestions/toggle-skip.dto';
import { SuggestionsService } from '../../../application/services/ai/suggestions.service';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { timeUtils } from '../../../shared/constants/time.constants';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import type { AuthenticatedRequest } from '../../../shared/types/auth.types';
import { getUserIdFromReq } from '../../../shared/utils/auth.util';

@ApiTags('suggestions')
@Controller('suggestions')
@ApiBearerAuth()
@Roles('admin', 'caregiver', 'customer')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuggestionsController {
  private readonly logger = new Logger(SuggestionsController.name);
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @Post(':id/toggle-skip')
  @ApiOperation({
    summary: 'Bật/tắt bỏ qua / hoãn / bỏ bỏ qua cho một gợi ý (theo item)',
    description: `Áp dụng hành động cho 1 gợi ý cụ thể (scope = item). Sử dụng khi bạn muốn bỏ qua, hoãn hoặc hủy bỏ trạng thái bỏ qua cho một gợi ý riêng lẻ. Gửi 'scope: "item"' cùng 'action' mong muốn.

Giải thích các trường chính:
- action (skip | unskip | snooze):
  - skip: đặt gợi ý vào trạng thái bỏ qua cho đến thời điểm xác định (server lưu một trường until).
  - unskip: huỷ trạng thái bỏ qua (server sẽ đặt until = null / xoá mute trên item).
  - snooze: tạm hoãn nhắc lại trong một khoảng ngắn; tương tự skip nhưng ngữ cảnh là hoãn ngắn hạn.
- duration (15m, 1h, 8h, 24h, 2d, 7d, 30d, until_change, until_date):
  - Các mã dạng thời lượng (ví dụ '15m', '1h', '7d') sẽ được server chuyển thành một thời điểm until = now + duration.
  - until_change: bỏ qua cho đến khi người dùng chủ động thay đổi lại (server lưu until = null để biểu thị "until change").
  - until_date: yêu cầu cung cấp trường 'until_date' (ISO8601). Server sẽ lưu chính xác thời điểm đó làm until.
- scope (item | type | all):
  - item: chỉ tác động lên gợi ý có ID được truyền (endpoint này là item-level).
  - type: tác động lên tất cả gợi ý cùng loại (khi dùng scope = 'type' phải cung cấp trường 'type'). Server sẽ lưu một preference dạng 'mute:type:<type>'.
  - all: tác động lên tất cả gợi ý của người dùng; server sẽ lưu preference 'mute:all'.
- type: danh sách các loại gợi ý thông dụng (ví dụ, không giới hạn): fallRisk, medicationReminder, hydrationReminder, activityReminder, vitalsAbnormal, medicationMissed. (Đây là ví dụ và có thể mở rộng theo nhu cầu.)

Khi gửi payload, nếu duration = 'until_date' thì bắt buộc có 'until_date' (ISO8601). Ví dụ payload nằm trong 'example'.
`,
  })
  @ApiParam({ name: 'id', description: 'ID của gợi ý cần thao tác' })
  @ApiBody({
    type: ToggleSkipDto,
    schema: {
      example: {
        action: 'skip',
        duration: '7d',
        scope: 'item',
        reason: 'Tạm thời không muốn nhận thông báo',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về gợi ý đã cập nhật hoặc thông tin mute tương ứng',
    schema: {
      properties: {
        id: { type: 'string', description: 'ID nội bộ của gợi ý' },
        user_id: { type: 'string', description: 'ID người dùng sở hữu gợi ý' },
        type: { type: 'string', description: 'Loại gợi ý (ví dụ: fallRisk, medicationReminder)' },
        title: { type: 'string', description: 'Tiêu đề ngắn cho gợi ý' },
        message: { type: 'string', description: 'Nội dung chi tiết của gợi ý' },
        skip_until: {
          type: 'string',
          nullable: true,
          description: 'ISO8601 datetime khi gợi ý được bỏ qua tới (null nếu không bị bỏ qua)',
        },
        next_notify_at: {
          type: 'string',
          nullable: true,
          description: 'ISO8601 thời điểm dự kiến gửi nhắc lần tiếp theo (null nếu không có lịch)',
        },
        last_notified_at: {
          type: 'string',
          nullable: true,
          description: 'ISO8601 thời điểm đã gửi nhắc lần cuối (null nếu chưa gửi)',
        },
        metadata: {
          type: 'object',
          description:
            'Đối tượng metadata tuỳ biến chứa thông tin bổ sung (ví dụ: severity, source)',
        },
        created_at: { type: 'string', description: 'ISO8601 thời gian tạo bản ghi' },
        updated_at: { type: 'string', description: 'ISO8601 thời gian cập nhật bản ghi gần nhất' },
      },
      example: {
        id: 'sug-1',
        user_id: 'user-1',
        type: 'fallRisk',
        title: 'Cảnh báo nguy cơ té ngã',
        message: 'Người dùng có nguy cơ té ngã cao, xem xét kiểm tra',
        skip_until: '2025-12-01T00:00:00Z',
        next_notify_at: null,
        last_notified_at: '2025-10-01T00:00:00Z',
        metadata: { severity: 'high' },
        created_at: '2025-10-01T00:00:00Z',
        updated_at: '2025-10-01T00:00:00Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Dữ liệu gửi lên không hợp lệ' })
  @ApiUnauthorizedResponse({ description: 'Không được ủy quyền' })
  @LogActivity({
    action: 'suggestion_skip_item',
    action_enum: ActivityAction.UPDATE,
    message: 'Thực hiện skip/unskip/snooze cho 1 gợi ý (item-level)',
    resource_type: 'suggestion',
    resource_id: 'param.id',
    severity: ActivitySeverity.INFO,
  })
  async toggleSkipItem(
    @Param('id') id: string,
    @Body() body: ToggleSkipDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = getUserIdFromReq(req as any);
    this.logger.log(
      JSON.stringify({
        event: 'toggleSkipItem_called',
        userId,
        suggestionId: id,
        action: body.action,
        scope: body.scope,
      }),
    );
    const result = await this.suggestionsService.toggleSkip(body, userId, id);
    this.logger.log(`toggleSkipItem result for suggestion=${id}: status=${result?.status}`);
    return result;
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách suggestion (active, không bị skip)',
    description:
      'Trả về các suggestion đang có hiệu lực (không bị skip). Hỗ trợ lọc theo type, phân trang bằng page/limit.',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Lọc theo loại suggestion (ví dụ: fallRisk)',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Trang (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Số item/trang', example: 50 })
  @ApiQuery({
    name: 'includeMuted',
    required: false,
    description:
      'Nếu true trả về cả các item bị muted kèm trường muted/mute_reason để UI hiển thị (default: false)',
    example: 'true',
  })
  @ApiResponse({
    status: 200,
    description:
      'Danh sách gợi ý (mặc định trả về only-active; set includeMuted=true để lấy cả muted items)',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          user_id: { type: 'string' },
          type: { type: 'string' },
          title: { type: 'string', nullable: true },
          message: { type: 'string', nullable: true },
          skip_until: { type: 'string', nullable: true },
          next_notify_at: { type: 'string', nullable: true },
          last_notified_at: { type: 'string', nullable: true },
          muted: {
            type: 'boolean',
            description: 'Nếu true thì item đang muted theo preference hoặc item-level skip',
          },
          mute_reason: {
            type: 'string',
            nullable: true,
            description: 'Lý do/nguồn của mute (từ preference hoặc item skip_reason)',
          },
          created_at: { type: 'string' },
          updated_at: { type: 'string' },
        },
        example: {
          id: 'sug-1',
          user_id: 'user-1',
          type: 'fallRisk',
          title: 'Cảnh báo nguy cơ té ngã',
          message: 'Người dùng có nguy cơ té ngã cao, xem xét kiểm tra',
          skip_until: '2025-12-01T00:00:00Z',
          next_notify_at: null,
          last_notified_at: '2025-10-01T00:00:00Z',
          muted: true,
          mute_reason: 'user muted all',
          created_at: '2025-10-01T00:00:00Z',
          updated_at: '2025-10-01T00:00:00Z',
        },
      },
    },
  })
  async listSuggestions(
    @Query('type') type: string | undefined,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('includeMuted') includeMuted: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = getUserIdFromReq(req as any);
    const p = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const l = limit ? Math.max(1, parseInt(limit, 10) || 50) : 50;
    const includeMutedBool = includeMuted === 'true' || includeMuted === '1';
    this.logger.log(
      JSON.stringify({
        event: 'listSuggestions_called',
        userId,
        type: type || '-',
        page: p,
        limit: l,
        includeMuted: includeMutedBool,
      }),
    );
    const items = await this.suggestionsService.list(userId, {
      type,
      page: p,
      limit: l,
      includeMuted: includeMutedBool,
    });
    this.logger.log(`listSuggestions returned ${items.length} items for user=${userId}`);

    const mapped = items.map((it: any) => ({
      ...it,
      skip_until_local: timeUtils.toTimezoneIsoString(it.skip_until),
      next_notify_at_local: timeUtils.toTimezoneIsoString(it.next_notify_at),
      last_notified_at_local: timeUtils.toTimezoneIsoString(it.last_notified_at),
      created_at_local: timeUtils.toTimezoneIsoString(it.created_at),
      updated_at_local: timeUtils.toTimezoneIsoString(it.updated_at),
      created_at_vn: timeUtils.toVnLocalString(it.created_at),
      updated_at_vn: timeUtils.toVnLocalString(it.updated_at),
    }));

    return mapped;
  }

  @Post()
  @ApiOperation({ summary: 'Tạo suggestion mới (dùng bởi hệ thống AI hoặc dịch vụ backend)' })
  @ApiBody({
    schema: {
      example: {
        user_id: 'user-1',
        resource_type: 'room',
        resource_id: 'cam-1',
        type: 'fallRisk',
        title: 'Kiểm tra thảm trơn',
        message: 'AI phát hiện nhiều cảnh báo té ngã ở khu vực',
        priority: 'normal',
      },
    },
  })
  async createSuggestion(@Body() body: any) {
    // Expect body: { user_id, resource_type, resource_id, type, title?, message?, meta?, priority? }
    const userId = body.user_id;
    if (!userId) throw new Error('user_id is required');
    const created = await this.suggestionsService.ingestSuggestion(userId, {
      resource_type: body.resource_type,
      resource_id: body.resource_id,
      type: body.type,
      title: body.title,
      message: body.message,
      meta: body.meta,
      priority: body.priority,
    });
    return created;
  }

  @Post('bulk')
  @ApiOperation({
    summary: 'Tạo nhiều suggestion (bulk) — dùng bởi hệ thống AI hoặc dịch vụ backend',
  })
  @ApiBody({
    schema: {
      example: [
        {
          user_id: 'user-1',
          resource_type: 'room',
          resource_id: 'cam-1',
          type: 'fallRisk',
          title: 'Kiểm tra thảm trơn phòng khách',
          message: 'AI ghi nhận nhiều cảnh báo té ở một vị trí.',
          meta: {
            bullets: [
              'Giảm 40–60% nguy cơ té ngã.',
              'Giảm cảnh báo sai.',
              'AI nhận diện hành vi chính xác hơn.',
            ],
          },
        },
        {
          user_id: 'user-1',
          resource_type: 'hall',
          resource_id: 'cam-2',
          type: 'fallRisk',
          title: 'Sắp lại đồ đạc khu vực hành lang',
          message: 'Phát hiện 8 cảnh báo bất thường trong 3 ngày qua ở hành lang.',
          meta: {
            bullets: [
              'Tạo lối đi rõ ràng, an toàn hơn.',
              'Giảm vật cản gây nguy hiểm.',
              'Cải thiện độ chính xác của AI.',
            ],
          },
        },
        {
          user_id: 'user-1',
          resource_type: 'room',
          resource_id: 'cam-3',
          type: 'fallRisk',
          title: 'Tăng ánh sáng buổi tối',
          message: 'Nhiều cảnh báo xảy ra trong điều kiện thiếu sáng.',
          meta: {
            bullets: [
              'Giảm nguy cơ té khi di chuyển ban đêm.',
              'Giúp AI nhận diện chính xác hơn.',
              'Người chăm sóc dễ quan sát hơn.',
            ],
          },
        },
        {
          user_id: 'user-1',
          resource_type: 'room',
          resource_id: 'cam-4',
          type: 'deviceCheck',
          title: 'Cải thiện ánh sáng phòng ngủ',
          message: 'AI confidence thấp do thiếu sáng, chỉ đạt 62%.',
          meta: {
            bullets: [
              'Tăng độ chính xác lên 85-95%.',
              'Giảm false alarm đáng kể.',
              'Phát hiện bất thường nhanh hơn.',
            ],
          },
        },
        {
          user_id: 'user-1',
          resource_type: 'bedroom',
          resource_id: 'cam-5',
          type: 'sleepQuality',
          title: 'Ngủ thêm 1-2 giờ mỗi đêm',
          message: 'Thời gian ngủ trung bình chỉ 5.2 giờ/đêm trong tuần qua.',
          meta: {
            bullets: [
              'Thiếu ngủ làm giảm khả năng phản ứng.',
              'Tăng nguy cơ ngã và tai nạn.',
              'Suy giảm trí nhớ và miễn dịch.',
            ],
          },
        },
      ],
    },
  })
  async createSuggestionsBulk(@Body() body: any) {
    // Accept either an array of suggestion objects, or { user_id, items: [...] }
    let items: any[] = [];
    if (Array.isArray(body)) items = body;
    else if (body && Array.isArray(body.items)) items = body.items;
    else throw new Error('Expect an array of suggestions or { items: [...] }');

    const results = [] as any[];
    for (const it of items) {
      const userId = it.user_id || body.user_id;
      if (!userId)
        throw new Error('Each suggestion must include user_id, or provide top-level user_id');
      const created = await this.suggestionsService.ingestSuggestion(userId, {
        resource_type: it.resource_type,
        resource_id: it.resource_id,
        type: it.type,
        title: it.title,
        message: it.message,
        meta: it.meta,
        priority: it.priority,
      });
      results.push(created);
    }
    return results;
  }

  //   @Post('toggle-skip/global')
  //   @ApiOperation({
  //     summary: 'Bật/tắt bỏ qua / hoãn / bỏ bỏ qua cho gợi ý (theo loại hoặc toàn bộ)',
  //     description: `Áp dụng hành động theo phạm vi rộng hơn (scope = 'type' hoặc 'all'). Dùng endpoint này để cập nhật preference (mute) chứ không phải chỉ 1 item.

  // Giải thích hành vi (tổng quát):
  // - action:
  //   - skip: đặt mute/skip theo phạm vi được chỉ định.
  //   - unskip: xoá mute/skip ở phạm vi đó.
  //   - snooze: tạm hoãn theo khoảng thời gian nhỏ (thường dùng cho nhắc nhở ngắn hạn).
  // - duration:
  //   - Các mã '15m', '1h', '8h', '24h', '2d', '7d', '30d' sẽ được server quy về một giá trị until = now + duration.
  //   - 'until_change' có nghĩa là mute tồn tại cho đến khi người dùng chủ động thay đổi (server lưu until = null để biểu thị 'until change').
  //   - 'until_date' yêu cầu trường 'until_date' (ISO8601) để server lưu chính xác thời điểm kết thúc.
  // - scope:
  //   - type: áp dụng cho tất cả gợi ý cùng loại; khi dùng scope = 'type' phải truyền 'type'. Server lưu preference với key: 'mute:type:<type>'.
  //   - all: áp dụng cho toàn bộ gợi ý của user; server lưu preference với key: 'mute:all'.

  // Ví dụ các loại 'type' thông dụng (ví dụ): fallRisk, medicationReminder, hydrationReminder, activityReminder, vitalsAbnormal, medicationMissed. Bạn có thể mở rộng danh sách này theo yêu cầu nghiệp vụ.

  // Lưu ý: server ưu tiên mute theo thứ tự: 'mute:all' > 'mute:type:<type>' > item-level skip (skip_until). Khi gửi request, nếu duration = 'until_date' phải kèm 'until_date' (ISO8601).`,
  //   })
  //   @ApiBody({
  //     type: ToggleSkipDto,
  //     schema: {
  //       example: {
  //         action: 'snooze',
  //         duration: 'until_date',
  //         until_date: '2025-12-01T00:00:00Z',
  //         scope: 'type',
  //         type: 'fallRisk',
  //         reason: 'Đang nghỉ dưỡng',
  //       },
  //     },
  //   })
  //   @ApiResponse({
  //     status: 200,
  //     description: 'Trả về cài đặt mute đã cập nhật hoặc danh sách gợi ý bị ảnh hưởng',
  //     schema: {
  //       properties: {
  //         id: { type: 'string', description: 'ID của cài đặt (preference) trong hệ thống' },
  //         user_id: { type: 'string', description: 'ID người dùng mà cài đặt áp dụng' },
  //         category: { type: 'string', description: 'Chủ đề của preference (ở đây là "suggestions")' },
  //         setting_key: {
  //           type: 'string',
  //           description: "Khóa cài đặt, ví dụ: 'mute:all' hoặc 'mute:type:fallRisk'",
  //         },
  //         setting_value: {
  //           type: 'object',
  //           description:
  //             'Giá trị cài đặt (thường là object). Ví dụ: { until: ISO8601|null, reason: string }',
  //         },
  //         created_at: {
  //           type: 'string',
  //           description: 'ISO8601 thời gian tạo preference',
  //         },
  //         updated_at: {
  //           type: 'string',
  //           description: 'ISO8601 thời gian cập nhật preference gần nhất',
  //         },
  //       },
  //       example: {
  //         id: 'pref-1',
  //         user_id: 'user-1',
  //         category: 'suggestions',
  //         setting_key: 'mute:type:fallRisk',
  //         setting_value: { until: '2025-12-01T00:00:00Z', reason: 'Đang nghỉ dưỡng' },
  //         created_at: '2025-10-01T00:00:00Z',
  //         updated_at: '2025-10-01T00:00:00Z',
  //       },
  //     },
  //   })
  //   @ApiBadRequestResponse({ description: 'Dữ liệu gửi lên không hợp lệ' })
  //   @ApiUnauthorizedResponse({ description: 'Không được ủy quyền' })
  //   @LogActivity({
  //     action: 'suggestion_skip_global',
  //     action_enum: ActivityAction.UPDATE,
  //     message: 'Thực hiện skip/unskip/snooze cho nhiều gợi ý (type/all)',
  //     resource_type: 'preference',
  //     resource_id: 'literal:global',
  //     severity: ActivitySeverity.INFO,
  //   })
  //   async toggleSkipGlobal(@Body() body: ToggleSkipDto, @Req() req: AuthenticatedRequest) {
  //     const userId = getUserIdFromReq(req as any);
  //     this.logger.log(
  //       JSON.stringify({
  //         event: 'toggleSkipGlobal_called',
  //         userId,
  //         action: body.action,
  //         scope: body.scope,
  //         type: body.type || '-',
  //         duration: body.duration,
  //       }),
  //     );
  //     const result = await this.suggestionsService.toggleSkip(body, userId);
  //     this.logger.log(`toggleSkipGlobal result for user=${userId}: status=${result?.status}`);
  //     return result;
  //   }
}
