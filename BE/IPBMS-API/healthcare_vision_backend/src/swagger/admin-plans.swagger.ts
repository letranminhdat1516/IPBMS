import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger';

export const AdminPlansSwagger = {
  list: applyDecorators(
    ApiOperation({
      summary: 'Lấy danh sách tất cả gói dịch vụ với các phiên bản',
      description:
        'Trả về danh sách plans với option lọc theo phiên bản. Compound key: mỗi plan có thể có nhiều versions với @@unique([code, version])',
    }),
    ApiQuery({
      name: 'withVersions',
      enum: ['current', 'all'],
      required: false,
      description: 'current: chỉ phiên bản hiện tại (is_current=true), all: tất cả phiên bản',
    }),
    ApiQuery({
      name: 'effectiveDate',
      required: false,
      description: 'Ngày hiệu lực để lấy phiên bản active (compound key filtering)',
    }),
    ApiOkResponse({ description: 'Danh sách gói dịch vụ trả về thành công' }),
  ),

  getById: applyDecorators(
    ApiOperation({
      summary: 'Lấy thông tin chi tiết của gói dịch vụ theo ID',
      description: 'Trả về thông tin plan theo ID duy nhất (không phụ thuộc compound key)',
    }),
    ApiOkResponse({ description: 'Chi tiết gói dịch vụ trả về thành công' }),
  ),

  create: applyDecorators(
    ApiOperation({
      summary: 'Tạo mới một gói dịch vụ',
      description:
        'Tạo plan mới với compound key validation. System sẽ tự động deactivate các version cũ và set version mới làm is_current=true',
    }),
    ApiBody({
      type: Object,
      description:
        'Dữ liệu gói dịch vụ (code + version phải unique, chỉ 1 version active per code)',
    }),
    ApiOkResponse({ description: 'Tạo gói dịch vụ thành công' }),
  ),

  update: applyDecorators(
    ApiOperation({
      summary: 'Cập nhật gói dịch vụ theo ID',
      description:
        'Cập nhật plan existing. Lưu ý: không thay đổi được compound key (code, version) sau khi tạo',
    }),
    ApiBody({
      type: Object,
      description: 'Dữ liệu cập nhật (không bao gồm code, version - compound key immutable)',
    }),
    ApiOkResponse({ description: 'Cập nhật gói dịch vụ thành công' }),
  ),

  delete: applyDecorators(
    ApiOperation({
      summary: 'Xóa gói dịch vụ theo ID',
      description:
        'Xóa một version cụ thể của plan. Nếu đây là version active, cần activate version khác trước khi xóa',
    }),
    ApiOkResponse({ description: 'Xóa gói dịch vụ thành công' }),
  ),

  activate: applyDecorators(
    ApiOperation({
      summary: 'Kích hoạt phiên bản plan cụ thể',
      description:
        'Set is_current=true cho version được chọn và is_current=false cho tất cả versions khác của cùng plan code. Compound key management.',
    }),
    ApiOkResponse({ description: 'Kích hoạt phiên bản plan thành công' }),
  ),

  getPlanVersions: applyDecorators(
    ApiOperation({
      summary: 'Lấy danh sách phiên bản của một gói dịch vụ cụ thể',
      description:
        'Trả về tất cả versions của một plan code. Hiển thị compound key relationship với các version khác nhau',
    }),
    ApiOkResponse({ description: 'Danh sách phiên bản của gói dịch vụ trả về thành công' }),
  ),
};
