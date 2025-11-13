import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CaregiverInvitationsService } from '../../../application/services/users';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';

@ApiBearerAuth()
@ApiTags('customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly assignmentsService: CaregiverInvitationsService) {}

  @Get(':customer_id/invitations')
  @Roles('admin', 'customer')
  @ApiOperation({
    summary: 'Lấy danh sách lời mời (pending assignments) của customer',
    description: 'Trả về danh sách các assignments đang pending cho customer được chỉ định',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách lời mời pending',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              assignment_id: { type: 'string', example: 'uuid' },
              caregiver_id: { type: 'string', example: 'uuid' },
              customer_id: { type: 'string', example: 'uuid' },
              assigned_at: { type: 'string', format: 'date-time' },
              status: { type: 'string', example: 'pending' },
              assignment_notes: { type: 'string', nullable: true },
              caregiver: {
                type: 'object',
                properties: {
                  user_id: { type: 'string' },
                  full_name: { type: 'string' },
                  phone: { type: 'string' },
                  email: { type: 'string' },
                },
              },
            },
          },
        },
        message: { type: 'string', example: 'Data retrieved successfully' },
      },
    },
  })
  async getInvitations(@Param('customer_id', ParseUUIDPipe) customerId: string) {
    // Get pending assignments for this customer
    const assignments = await this.assignmentsService.listCaregiversOfCustomer(
      customerId,
      'pending',
    );
    return {
      success: true,
      data: assignments,
      message: 'Data retrieved successfully',
    };
  }
}
