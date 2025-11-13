import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  BadRequestException,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { AdminPlansService } from '../../../application/services/admin';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { AdminPlansSwagger } from '../../../swagger/admin-plans.swagger';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { ActivitySeverity, ActivityAction } from '../../../core/entities/activity_logs.entity';
import {
  CreatePlanDto,
  UpdatePlanDto,
  CreatePlanVersionDto,
  UpdatePlanVersionDto,
} from '../../../application/dto/plans';
import { GetPlansQueryDto } from '../../../application/dto/plans/get-plans-query.dto';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiTags('admin')
@Controller('admin/plans')
export class AdminPlansController {
  private readonly logger = new Logger(AdminPlansController.name);
  constructor(private readonly _adminPlansService: AdminPlansService) {}

  // Helper to map thrown errors to appropriate HTTP responses while preserving
  // explicit HttpExceptions thrown by services/repositories.
  private handleControllerError(error: any, prefixMessage: string) {
    if (error instanceof HttpException) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
    throw new BadRequestException(`${prefixMessage}: ${errorMessage}`);
  }

  @Get()
  @ApiQuery({
    name: 'withVersions',
    required: false,
    description: 'Set to "all" to include all versions',
  })
  @AdminPlansSwagger.list
  async getPlans(@Query() query: GetPlansQueryDto) {
    try {
      const result = await this._adminPlansService.getPlans({
        includeAllVersions: query.withVersions === 'all',
      });
      return {
        success: true,
        data: result,
        message: 'Lấy danh sách plans thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleControllerError(error, 'Lấy danh sách plans thất bại');
    }
  }

  @Get('active')
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Target date (YYYY-MM-DD) to check active plans',
  })
  @AdminPlansSwagger.list
  async getActivePlans(@Query('date') date?: string) {
    try {
      const targetDate = date ? new Date(date) : undefined;
      const result = await this._adminPlansService.getActivePlans(targetDate);
      return {
        success: true,
        data: result,
        message: 'Lấy danh sách plans đang hoạt động thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleControllerError(error, 'Lấy danh sách plans đang hoạt động thất bại');
    }
  }

  @Get('recommended')
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Target date (YYYY-MM-DD) to recommend a plan',
  })
  @AdminPlansSwagger.list
  async getRecommendedPlan(@Query('date') date?: string) {
    try {
      const targetDate = date ? new Date(date) : undefined;
      const result = await this._adminPlansService.getRecommendedPlan(targetDate);
      return {
        success: true,
        data: result,
        message: 'Lấy plan được khuyến nghị thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleControllerError(error, 'Lấy plan được khuyến nghị thất bại');
    }
  }

  @Get('subscription/available')
  @AdminPlansSwagger.list
  async getAvailablePlansForSubscription() {
    try {
      const result = await this._adminPlansService.getAvailablePlansForSubscription();
      return {
        success: true,
        data: result,
        message: 'Lấy danh sách plans available cho subscription thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleControllerError(error, 'Lấy danh sách plans available thất bại');
    }
  }

  @Get(':planCode')
  @AdminPlansSwagger.getById
  async getPlan(@Param('planCode') planCode: string) {
    try {
      const result = await this._adminPlansService.getPlanWithCurrentVersion(planCode);
      return {
        success: true,
        data: result,
        message: 'Lấy thông tin plan thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleControllerError(error, 'Lấy thông tin plan thất bại');
    }
  }

  @Post()
  @AdminPlansSwagger.create
  @LogActivity({
    action: 'create_plan',
    action_enum: ActivityAction.CREATE,
    message: 'Admin tạo plan mới',
    resource_type: 'plan',
    resource_name: 'admin_plan',
    resource_id: '@result.id',
    severity: ActivitySeverity.INFO,
  })
  async createPlan(@Body() createPlanDto: CreatePlanDto) {
    try {
      const result = await this._adminPlansService.createPlan(createPlanDto);
      return {
        success: true,
        data: result,
        message: 'Tạo plan thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleControllerError(error, 'Tạo plan thất bại');
    }
  }

  @Put(':planCode')
  @AdminPlansSwagger.update
  @LogActivity({
    action: 'update_plan',
    action_enum: ActivityAction.UPDATE,
    message: 'Admin cập nhật plan',
    resource_type: 'plan',
    resource_name: 'admin_plan',
    resource_id: 'param.planCode',
    severity: ActivitySeverity.MEDIUM,
  })
  async updatePlan(@Param('planCode') planCode: string, @Body() updatePlanDto: UpdatePlanDto) {
    try {
      const result = await this._adminPlansService.updatePlan(planCode, updatePlanDto);
      return {
        success: true,
        data: result,
        message: 'Cập nhật plan thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleControllerError(error, 'Cập nhật plan thất bại');
    }
  }

  @Delete(':planCode')
  @AdminPlansSwagger.delete
  @LogActivity({
    action: 'delete_plan',
    action_enum: ActivityAction.DELETE,
    message: 'Admin xóa plan',
    resource_type: 'plan',
    resource_name: 'admin_plan',
    resource_id: 'param.planCode',
    severity: ActivitySeverity.HIGH,
  })
  async deletePlan(@Param('planCode') planCode: string) {
    try {
      const result = await this._adminPlansService.deletePlan(planCode);
      return {
        success: true,
        data: result,
        message: 'Xóa plan thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleControllerError(error, 'Xóa plan thất bại');
    }
  }

  // Plan Versions endpoints
  @Get(':planCode/versions')
  @AdminPlansSwagger.getPlanVersions
  async getPlanVersions(@Param('planCode') planCode: string) {
    try {
      const result = await this._adminPlansService.getPlanVersions(planCode);
      return {
        success: true,
        data: result,
        message: 'Lấy danh sách phiên bản plan thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleControllerError(error, 'Lấy danh sách phiên bản plan thất bại');
    }
  }

  @Get(':planCode/versions/current')
  @AdminPlansSwagger.getById
  async getCurrentPlanVersion(@Param('planCode') planCode: string) {
    try {
      const result = await this._adminPlansService.getCurrentPlanVersion(planCode);
      return {
        success: true,
        data: result,
        message: 'Lấy phiên bản plan hiện tại thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleControllerError(error, 'Lấy phiên bản plan hiện tại thất bại');
    }
  }

  @Post(':planCode/versions')
  @AdminPlansSwagger.create
  @LogActivity({
    action: 'create_plan_version',
    action_enum: ActivityAction.CREATE,
    message: 'Admin tạo plan version mới',
    resource_type: 'plan_version',
    resource_name: 'admin_plan_version',
    resource_id: '@result.id',
    severity: ActivitySeverity.INFO,
  })
  async createPlanVersion(
    @Param('planCode') planCode: string,
    @Body() createPlanVersionDto: CreatePlanVersionDto,
  ) {
    try {
      const bodyWithPlanCode = { ...createPlanVersionDto, plan_code: planCode };
      const result = await this._adminPlansService.createPlanVersion(bodyWithPlanCode);
      return {
        success: true,
        data: result,
        message: 'Tạo phiên bản plan thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleControllerError(error, 'Tạo phiên bản plan thất bại');
    }
  }

  @Put('versions/:id')
  @AdminPlansSwagger.update
  @LogActivity({
    action: 'update_plan_version',
    action_enum: ActivityAction.UPDATE,
    message: 'Admin cập nhật plan version',
    resource_type: 'plan_version',
    resource_name: 'admin_plan_version',
    resource_id: 'param.id',
    severity: ActivitySeverity.MEDIUM,
  })
  async updatePlanVersion(
    @Param('id') id: string,
    @Body() updatePlanVersionDto: UpdatePlanVersionDto,
  ) {
    try {
      const result = await this._adminPlansService.updatePlanVersion(id, updatePlanVersionDto);
      return {
        success: true,
        data: result,
        message: 'Cập nhật phiên bản plan thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleControllerError(error, 'Cập nhật phiên bản plan thất bại');
    }
  }

  @Delete('versions/:id')
  @AdminPlansSwagger.delete
  @LogActivity({
    action: 'delete_plan_version',
    action_enum: ActivityAction.DELETE,
    message: 'Admin xóa plan version',
    resource_type: 'plan_version',
    resource_name: 'admin_plan_version',
    resource_id: 'param.id',
    severity: ActivitySeverity.HIGH,
  })
  async deletePlanVersion(@Param('id') id: string) {
    try {
      const result = await this._adminPlansService.deletePlanVersion(id);
      return {
        success: true,
        data: result,
        message: 'Xóa phiên bản plan thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleControllerError(error, 'Xóa phiên bản plan thất bại');
    }
  }

  @Post('versions/:id/activate')
  @AdminPlansSwagger.activate
  @LogActivity({
    action: 'activate_plan_version',
    action_enum: ActivityAction.UPDATE,
    message: 'Admin kích hoạt plan version',
    resource_type: 'plan_version',
    resource_name: 'admin_plan_version',
    resource_id: 'param.id',
    severity: ActivitySeverity.MEDIUM,
  })
  async activatePlanVersion(@Param('id') id: string) {
    try {
      const result = await this._adminPlansService.activatePlanVersion(id);
      return {
        success: true,
        data: result,
        message: 'Kích hoạt phiên bản plan thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleControllerError(error, 'Kích hoạt phiên bản plan thất bại');
    }
  }

  @Post('versions/:id/deactivate')
  @LogActivity({
    action: 'deactivate_plan_version',
    action_enum: ActivityAction.UPDATE,
    message: 'Deactivate plan version',
    resource_type: 'plan_version',
    resource_name: 'admin_plan_version',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async deactivatePlanVersion(@Param('id') id: string) {
    try {
      const result = await this._adminPlansService.deactivatePlanVersion(id);
      return {
        success: true,
        data: result,
        message: 'Deactivate phiên bản plan thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleControllerError(error, 'Deactivate phiên bản plan thất bại');
    }
  }

  @Get(':planCode/with-current-version')
  @AdminPlansSwagger.getById
  async getPlanWithCurrentVersion(@Param('planCode') planCode: string) {
    try {
      const result = await this._adminPlansService.getPlanWithCurrentVersion(planCode);
      return {
        success: true,
        data: result,
        message: 'Lấy plan với phiên bản hiện tại thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleControllerError(error, 'Lấy plan với phiên bản hiện tại thất bại');
    }
  }

  @Get(':planCode/version-by-date')
  @AdminPlansSwagger.getById
  @ApiQuery({
    name: 'date',
    required: true,
    description: 'Effective date (YYYY-MM-DD) for version lookup',
  })
  async getPlanVersionByEffectiveDate(
    @Param('planCode') planCode: string,
    @Query('date') date: string,
  ) {
    try {
      if (!date) {
        throw new BadRequestException('Tham số date là bắt buộc');
      }
      const result = await this._adminPlansService.getPlanVersionByEffectiveDate(planCode, date);
      return {
        success: true,
        data: result,
        message: 'Lấy phiên bản plan theo ngày hiệu lực thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleControllerError(error, 'Lấy phiên bản plan theo ngày hiệu lực thất bại');
    }
  }

  @Get('versions/compare')
  @AdminPlansSwagger.getById
  async comparePlanVersions(
    @Query('version1') versionId1: string,
    @Query('version2') versionId2: string,
  ) {
    try {
      if (!versionId1 || !versionId2) {
        throw new BadRequestException('Cả hai tham số version1 và version2 đều bắt buộc');
      }
      const result = await this._adminPlansService.comparePlanVersions(versionId1, versionId2);
      return {
        success: true,
        data: result,
        message: 'So sánh phiên bản plan thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleControllerError(error, 'So sánh phiên bản plan thất bại');
    }
  }

  @Get('statistics/usage')
  @AdminPlansSwagger.getById
  async getPlanUsageStatistics(@Query('years') years?: number) {
    try {
      const yearsParam = years || 10;
      const result = await this._adminPlansService.getPlanUsageStatistics(yearsParam);
      return {
        success: true,
        data: result,
        message: 'Lấy thống kê sử dụng plan thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleControllerError(error, 'Lấy thống kê sử dụng plan thất bại');
    }
  }

  @Get(':planCode/statistics/trends')
  @AdminPlansSwagger.getById
  async getPlanTrends(@Param('planCode') planCode: string, @Query('years') years?: number) {
    try {
      const yearsParam = years || 10;
      const result = await this._adminPlansService.getPlanTrends(planCode, yearsParam);
      return {
        success: true,
        data: result,
        message: 'Lấy xu hướng plan thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleControllerError(error, 'Lấy xu hướng plan thất bại');
    }
  }

  @Get('statistics/comparison')
  @AdminPlansSwagger.getById
  async getPlanComparison() {
    try {
      const result = await this._adminPlansService.getPlanComparison();
      return {
        success: true,
        data: result,
        message: 'Lấy so sánh plan thành công',
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleControllerError(error, 'Lấy so sánh plan thất bại');
    }
  }

  @Get('tier/:tier')
  @AdminPlansSwagger.list
  async getPlansByTier(@Param('tier') tier: string, @Query('date') date?: string) {
    try {
      const tierNumber = parseInt(tier, 10);
      if (isNaN(tierNumber)) {
        throw new BadRequestException('Tier phải là số');
      }

      const targetDate = date ? new Date(date) : undefined;
      const result = await this._adminPlansService.getPlansByTier(tierNumber, targetDate);
      return {
        success: true,
        data: result,
        message: `Lấy danh sách plans tier ${tier} thành công`,
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleControllerError(error, 'Lấy danh sách plans theo tier thất bại');
    }
  }

  @Get(':planCode/is-active')
  @AdminPlansSwagger.list
  async checkPlanActive(@Param('planCode') planCode: string, @Query('date') date?: string) {
    try {
      const targetDate = date ? new Date(date) : undefined;
      const isActive = await this._adminPlansService.isPlanActive(planCode, targetDate);
      return {
        success: true,
        data: { planCode, isActive },
        message: `Kiểm tra trạng thái plan ${planCode} thành công`,
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleControllerError(error, 'Kiểm tra trạng thái plan thất bại');
    }
  }

  @Get(':planCode/subscription/validate')
  @AdminPlansSwagger.list
  async validatePlanForSubscription(@Param('planCode') planCode: string) {
    try {
      const result = await this._adminPlansService.validatePlanForSubscription(planCode);
      return {
        success: true,
        data: result,
        message: `Validate plan ${planCode} cho subscription thành công`,
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleControllerError(error, 'Validate plan cho subscription thất bại');
    }
  }
}
