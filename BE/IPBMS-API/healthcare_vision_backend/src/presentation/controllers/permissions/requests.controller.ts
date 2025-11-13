import { Body, Controller, Get, Post, Param, UseGuards, Req, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { PermissionRequestsService } from '../../../application/services/permission-requests.service';
import { PermissionRequestsSwagger } from '../../../swagger/permission-requests.swagger';
import {
  CreatePermissionRequestDto,
  ApprovePermissionRequestDto,
  RejectPermissionRequestDto,
  BulkDecisionDto,
} from '../../../application/dto/shared-permissions/permission-request.dto';

@ApiBearerAuth()
@ApiTags('permissions')
@Controller('permission-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PermissionRequestsController {
  constructor(private readonly service: PermissionRequestsService) {}

  // Caregiver gửi request
  @Post()
  @Roles('caregiver', 'admin')
  @PermissionRequestsSwagger.create
  create(@Body() dto: CreatePermissionRequestDto, @Req() req: any) {
    return this.service.create(dto, req?.user);
  }

  // Bulk duyệt/từ chối nhiều request
  @Post('bulk/approve')
  @Roles('customer', 'admin')
  @PermissionRequestsSwagger.bulkApprove
  bulkApprove(@Body() body: BulkDecisionDto, @Req() req: any) {
    return this.service.bulkApprove(body, req?.user);
  }

  @Post('bulk/reject')
  @Roles('customer', 'admin')
  @PermissionRequestsSwagger.bulkReject
  bulkReject(@Body() body: BulkDecisionDto, @Req() req: any) {
    return this.service.bulkReject(body, req?.user);
  }

  // Customer duyệt
  @Post(':id/approve')
  @Roles('customer', 'admin')
  @PermissionRequestsSwagger.approve
  approve(@Param('id') id: string, @Body() dto: ApprovePermissionRequestDto, @Req() req: any) {
    return this.service.approve(id, dto, req?.user);
  }

  // Customer từ chối
  @Post(':id/reject')
  @Roles('customer', 'admin')
  @PermissionRequestsSwagger.reject
  reject(@Param('id') id: string, @Body() dto: RejectPermissionRequestDto, @Req() req: any) {
    return this.service.reject(id, dto, req?.user);
  }

  // Customer xem các request đang pending
  @Get('customers/:customerId/pending')
  @Roles('customer', 'admin')
  @PermissionRequestsSwagger.listPending
  listPending(@Param('customerId') customerId: string) {
    return this.service.listByCustomer(customerId, 'PENDING');
  }

  // Customer xem danh sách request đã được DUYỆT
  @Get('customers/:customerId/approved')
  @Roles('customer', 'admin')
  @PermissionRequestsSwagger.listApproved
  listApproved(@Param('customerId') customerId: string) {
    return this.service.listByCustomer(customerId, 'APPROVED');
  }

  // Customer xem danh sách request bị TỪ CHỐI
  @Get('customers/:customerId/rejected')
  @Roles('customer', 'admin')
  @PermissionRequestsSwagger.listRejected
  listRejected(@Param('customerId') customerId: string) {
    return this.service.listByCustomer(customerId, 'REJECTED');
  }
  // C: Detail
  @Get(':id')
  @Roles('customer', 'admin', 'caregiver')
  @ApiOperation({ summary: 'Xem chi tiết một permission request (kèm history)' })
  @ApiQuery({
    name: 'expand_limit',
    required: false,
    schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
    description:
      'Số phần tử trong `changes` trả về cho mỗi history entry khi mở rộng. Mặc định 20, tối đa 100. Giá trị >100 sẽ bị clamp về 100. Giá trị <=0 hoặc không phải integer sẽ trả HTTP 400.',
  })
  @ApiParam({ name: 'id', required: true, description: 'UUID của permission request' })
  @ApiResponse({
    status: 200,
    description:
      'Chi tiết request. Nếu request có lịch sử thay đổi (history), phần `history` có thể được mở rộng để kèm `change_count` và `changes[]` (per-field diffs). Sử dụng query param `expand_limit` để giới hạn số phần tử `changes` trên mỗi entry (default=20, max=100).',
  })
  getOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() req: any) {
    return this.service.getOneWithHistory(id, req?.user);
  }

  // D: Reopen
  @Post(':id/reopen')
  @Roles('customer', 'admin')
  @ApiOperation({ summary: 'Mở lại (reopen) một permission request' })
  @ApiParam({ name: 'id', required: true, description: 'UUID của permission request' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { reason: { type: 'string', example: 'Bổ sung thông tin' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Reopen thành công' })
  reopen(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.service.reopen(id, req?.user, reason);
  }

  // A: ALL
  @Get('customers/:customerId/all')
  @Roles('customer', 'admin')
  @ApiOperation({ summary: 'Lấy tất cả permission requests của customer' })
  @ApiParam({ name: 'customerId', required: true, description: 'UUID của Customer' })
  @ApiResponse({ status: 200, description: 'Danh sách tất cả request' })
  listAll(@Param('customerId') customerId: string) {
    return this.service.listAllByCustomer(customerId);
  }

  // B: DECIDED
  @Get('customers/:customerId/decided')
  @Roles('customer', 'admin')
  @ApiOperation({ summary: 'Lấy các permission requests đã xử lý của customer' })
  @ApiParam({ name: 'customerId', required: true, description: 'UUID của Customer' })
  @ApiResponse({ status: 200, description: 'Danh sách các request đã xử lý' })
  listDecided(@Param('customerId') customerId: string) {
    return this.service.listDecidedByCustomer(customerId);
  }
}
