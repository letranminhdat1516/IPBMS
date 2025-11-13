import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
  Post,
  Put,
  Delete,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UpdateConfirmStatusDto } from '../../../application/dto/events/update-confirm-status.dto';
import { CreateEventDto } from '../../../application/dto/events/create-event.dto';
import { UpdateEventDto } from '../../../application/dto/events/update-event.dto';
import { EventDetectionsService } from '../../../application/services/events';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { Public } from '../../../shared/decorators/public.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { SharedPermission } from '../../../shared/decorators/shared-permission.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { SharedPermissionGuard } from '../../../shared/guards/shared-permission.guard';
import { EventDetectionsSwagger } from '../../../swagger/event-detections.swagger';

@ApiTags('event-detections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'caregiver', 'customer')
@Controller('event-detections')
export class EventDetectionsController {
  constructor(private readonly _eventDetections: EventDetectionsService) {}

  @Get()
  @EventDetectionsSwagger.list
  async list(
    @Req() req: any,
    @Query('camera_id') camera_id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('orderBy') orderBy?: 'detected_at' | 'confidence_score',
    @Query('order') order?: 'ASC' | 'DESC',
  ) {
    const user_id = req.user?.user_id;
    return this._eventDetections.listEvents(camera_id, user_id, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      dateFrom,
      dateTo,
      status: status ? status.split(',') : undefined,
      type: type ? type.split(',') : undefined,
      severity: severity ? (severity.split(',') as any) : undefined,
      orderBy: orderBy || 'detected_at',
      order: order || 'DESC',
    });
  }

  @Post()
  @EventDetectionsSwagger.create
  @UseGuards(SharedPermissionGuard)
  @SharedPermission('alert:edit')
  @LogActivity({
    action: 'create_event_detection',
    action_enum: ActivityAction.CREATE,
    message: 'Tạo sự kiện phát hiện',
    resource_type: 'event_detection',
    resource_name: 'event_detection',
    severity: ActivitySeverity.MEDIUM,
  })
  @ApiResponse({ status: 201, description: 'Created' })
  async create(@Body() dto: CreateEventDto, @Req() req: any) {
    const user_id = req.user?.user_id;
    return this._eventDetections.createEvent({ ...(dto as any), user_id } as any);
  }

  @Put(':event_id')
  @EventDetectionsSwagger.update
  @UseGuards(SharedPermissionGuard)
  @SharedPermission('alert:update')
  @LogActivity({
    action: 'update_event_detection',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật sự kiện phát hiện',
    resource_type: 'event_detection',
    resource_name: 'event_detection',
    resource_id: 'event_id',
    severity: ActivitySeverity.MEDIUM,
  })
  @ApiResponse({ status: 200, description: 'Updated' })
  async update(@Param('event_id') event_id: string, @Body() dto: UpdateEventDto, @Req() req: any) {
    const user_id = req.user?.user_id;
    return this._eventDetections.updateEvent(event_id, dto as any, user_id);
  }

  @Delete(':event_id')
  @EventDetectionsSwagger.remove
  @UseGuards(SharedPermissionGuard)
  @SharedPermission('alert:edit')
  @LogActivity({
    action: 'delete_event_detection',
    action_enum: ActivityAction.DELETE,
    message: 'Xóa sự kiện phát hiện',
    resource_type: 'event_detection',
    resource_name: 'event_detection',
    resource_id: 'event_id',
    severity: ActivitySeverity.MEDIUM,
  })
  @ApiResponse({ status: 200, description: 'Deleted' })
  async remove(@Param('event_id') event_id: string, @Req() req: any) {
    const user_id = req.user?.user_id;
    return this._eventDetections.deleteEvent(event_id, user_id);
  }

  @Get('patient-habits')
  @EventDetectionsSwagger.patientHabits
  @Public()
  async fetchPatientHabitsForEvents(
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('eventFields') eventFields?: string,
    @Query('habitFields') habitFields?: string,
    @Query('saveToFile') saveToFile?: string,
    @Query('filename') filename?: string,
    @Query('mock') mock?: string,
  ) {
    // 'to' is optional ISO date; service will interpret as noon of that date
    const opts: any = {
      limit: limit ? Number(limit) : undefined,
      page: page ? Number(page) : undefined,
      eventFields: eventFields ? eventFields.split(',') : undefined,
      habitFields: habitFields ? habitFields.split(',') : undefined,
      saveToFile: saveToFile === 'true' || saveToFile === '1',
      filename: filename,
    };

    // If mock=true, return a canned full-field response for testing
    if (mock === 'true') {
      const sampleEvents = [
        {
          event_id: 'evt_1',
          snapshot_id: 'snap_1',
          user_id: 'user_1',
          camera_id: 'cam_1',
          event_type: 'fall',
          event_description: 'Detected fall near bed',
          detection_data: { modelVersion: 'v1.2', score: 0.98 },
          ai_analysis_result: { label: 'fall', confidence: 0.98 },
          confidence_score: 0.98,
          bounding_boxes: [{ x: 10, y: 20, w: 100, h: 200 }],
          context_data: { room: 'A101' },
          detected_at: '2025-10-04T06:15:00.000Z',
          verified_at: null,
          verified_by: null,
          acknowledged_at: null,
          acknowledged_by: null,
          dismissed_at: null,
          created_at: '2025-10-04T06:16:00.000Z',
          confirm_status: false,
          status: 'new',
          notes: 'Mock event detection record',
        },
        {
          event_id: 'evt_2',
          snapshot_id: 'snap_2',
          user_id: 'user_2',
          camera_id: 'cam_2',
          event_type: 'abnormal_behavior',
          event_description: 'Unusual movement pattern',
          detection_data: { modelVersion: 'v1.2', score: 0.85 },
          ai_analysis_result: { label: 'abnormal_behavior', confidence: 0.85 },
          confidence_score: 0.85,
          bounding_boxes: [{ x: 5, y: 10, w: 50, h: 80 }],
          context_data: { area: 'living_room' },
          detected_at: '2025-10-04T08:30:00.000Z',
          verified_at: '2025-10-04T09:00:00.000Z',
          verified_by: 'admin_1',
          acknowledged_at: null,
          acknowledged_by: null,
          dismissed_at: null,
          created_at: '2025-10-04T08:31:00.000Z',
          confirm_status: true,
          status: 'reviewed',
          notes: 'Mock reviewed event',
        },
      ];

      const sampleHabits = [
        {
          habit_id: 'hbt_1',
          supplement_id: null,
          habit_type: 'activity',
          habit_name: 'Morning walk',
          description: 'Walk in the park',
          sleep_start: '07:00:00',
          sleep_end: null,
          frequency: 'daily',
          days_of_week: ['mon', 'tue', 'wed', 'thu', 'fri'],
          notes: 'Sample habit for user 1',
          is_active: true,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-09-01T00:00:00.000Z',
        },
        {
          habit_id: 'hbt_2',
          supplement_id: null,
          habit_type: 'medication',
          habit_name: 'Evening medication',
          description: 'Blood pressure med',
          sleep_start: null,
          sleep_end: null,
          frequency: 'daily',
          days_of_week: null,
          // location removed
          notes: 'Sample habit for user 2',
          is_active: true,
          created_at: '2024-05-05T00:00:00.000Z',
          updated_at: '2025-08-20T00:00:00.000Z',
        },
      ];

      const mockResult = {
        'event-detections': sampleEvents,
        'patient-habits': sampleHabits,
        meta: {
          start: '2025-10-04T05:00:00.000Z',
          end: '2025-10-05T05:00:00.000Z',
          eventsCount: sampleEvents.length,
          habitsCount: sampleHabits.length,
          page: opts.page || 1,
          limit: opts.limit || sampleEvents.length,
        },
      };

      return mockResult;
    }

    return this._eventDetections.fetchEventsAndPatientHabits(to, opts);
  }

  @Get(':event_id')
  @UseGuards(SharedPermissionGuard)
  @SharedPermission('alert:read')
  async getById(@Param('event_id') event_id: string, @Req() req: any) {
    const user_id = req.user?.user_id;
    return this._eventDetections.getEventById(event_id, user_id);
  }

  @Patch(':event_id/confirm-status')
  @UseGuards(SharedPermissionGuard)
  @SharedPermission('alert:ack')
  @EventDetectionsSwagger.confirmStatus
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - không có quyền' })
  @ApiResponse({ status: 404, description: 'Not Found - event không tồn tại' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @LogActivity({
    action: 'update_confirm_status',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật trạng thái xác nhận sự kiện',
    resource_type: 'event_detection',
    resource_name: 'event_detection',
    resource_id: 'event_id',
    severity: ActivitySeverity.MEDIUM,
  })
  async updateConfirmStatus(
    @Param('event_id') event_id: string,
    @Body() dto: UpdateConfirmStatusDto,
    @Req() req: any,
  ) {
    const user_id = req.user?.user_id;
    return this._eventDetections.updateConfirmStatus(
      event_id,
      dto.confirm_status,
      dto.notes,
      user_id,
    );
  }
}
