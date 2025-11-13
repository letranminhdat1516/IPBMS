import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PatientMedicalRecordsService } from '../../../application/services/users';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';

@ApiTags('patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'caregiver', 'customer')
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientMedicalRecordsService: PatientMedicalRecordsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả bệnh nhân' })
  @ApiResponse({ status: 200, description: 'Danh sách bệnh nhân' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    // For now, return medical records as patients
    // In a real implementation, this would be a separate patients table
    const records = await this.patientMedicalRecordsService.getAllRecords();

    // Apply pagination and search
    let filteredRecords = records;
    if (search) {
      filteredRecords = records.filter((record) =>
        record.supplement_id?.toLowerCase().includes(search.toLowerCase()),
      );
    }

    const startIndex = ((page || 1) - 1) * (limit || 20);
    const endIndex = startIndex + (limit || 20);
    const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

    return {
      data: paginatedRecords,
      total: filteredRecords.length,
      page: page || 1,
      limit: limit || 20,
      totalPages: Math.ceil(filteredRecords.length / (limit || 20)),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin bệnh nhân theo ID' })
  @ApiResponse({ status: 200, description: 'Thông tin bệnh nhân' })
  async findById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const record = await this.patientMedicalRecordsService.getRecordById(id);
    if (!record) {
      return { message: 'Patient not found' };
    }
    return record;
  }

  @Get(':id/medical-records')
  @ApiOperation({ summary: 'Lấy hồ sơ y tế của bệnh nhân' })
  @ApiResponse({ status: 200, description: 'Hồ sơ y tế bệnh nhân' })
  async getMedicalRecords(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const record = await this.patientMedicalRecordsService.getRecordById(id);
    if (!record) {
      return { message: 'Medical records not found' };
    }
    return record;
  }
}
