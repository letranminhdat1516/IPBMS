import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PatientSupplementsService } from '../../../application/services/users';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { SharedPermissionGuard } from '../../../shared/guards/shared-permission.guard';

@ApiTags('patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, SharedPermissionGuard)
@Controller('users/:id/supplements')
export class PatientSupplementsController {
  constructor(private readonly svc: PatientSupplementsService) {}

  @Get()
  @ApiOperation({ summary: 'List supplements for a customer' })
  async list(@Param('id') id: string, @Req() req: any) {
    return this.svc.listForCustomer(req.user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create supplement for a customer' })
  async create(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.svc.createForCustomer(req.user, id, body);
  }

  @Get(':supplementId')
  @ApiOperation({ summary: 'Get a supplement by id' })
  async getOne(
    @Param('id') id: string,
    @Param('supplementId') supplementId: string,
    @Req() req: any,
  ) {
    return this.svc.getById(req.user, id, supplementId);
  }

  @Put(':supplementId')
  @ApiOperation({ summary: 'Update supplement' })
  async update(
    @Param('id') id: string,
    @Param('supplementId') supplementId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.svc.updateById(req.user, id, supplementId, body);
  }

  @Delete(':supplementId')
  @ApiOperation({ summary: 'Delete supplement' })
  async remove(
    @Param('id') id: string,
    @Param('supplementId') supplementId: string,
    @Req() req: any,
  ) {
    return this.svc.removeById(req.user, id, supplementId);
  }
}
