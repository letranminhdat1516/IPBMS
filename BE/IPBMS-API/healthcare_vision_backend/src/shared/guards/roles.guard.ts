// CanActivate: Interface để tạo ra một guard tùy chỉnh trong NestJS
// ExecutionContext: Cung cấp ngữ cảnh thực thi hiện tại (HTTP, WebSocket, RPC...)
// Injectable: Cho phép NestJS quản lý guard này như một provider
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

// Reflector: Dùng để truy xuất metadata (dữ liệu chú thích) từ decorators
import { Reflector } from '@nestjs/core';

// ROLES_KEY: key metadata lưu thông tin roles cần thiết cho route
// Role: kiểu dữ liệu định nghĩa các role có thể có (ví dụ: 'admin', 'user', ...)
import { ROLES_KEY, Role } from '../decorators/roles.decorator';

@Injectable() // Để NestJS có thể inject guard này
export class RolesGuard implements CanActivate {
  // Inject Reflector để đọc metadata từ decorators
  constructor(private _reflector: Reflector) {}

  // canActivate: hàm bắt buộc phải có khi implements CanActivate
  // Trả về true → cho phép truy cập, false → chặn truy cập
  canActivate(ctx: ExecutionContext): boolean {
    // Allow OPTIONS requests for CORS preflight
    const request = ctx.switchToHttp().getRequest();
    if (request.method === 'OPTIONS') {
      return true;
    }

    // If route is marked as public, skip role checks
    const isPublic = this._reflector.get<boolean>('isPublic', ctx.getHandler());
    if (isPublic) return true;

    // Lấy danh sách role yêu cầu từ metadata @Roles(...)
    // getAllAndOverride: đọc metadata từ handler (method) trước, nếu không có thì đọc từ class
    const required = this._reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(), // Method hiện tại
      ctx.getClass(), // Class chứa method đó
    ]);

    // Nếu route không yêu cầu role → ai cũng có thể truy cập
    if (!required || required.length === 0) return true;

    // Lấy request HTTP hiện tại
    const req = ctx.switchToHttp().getRequest();

    // Lấy thông tin user từ request (được gắn ở bước xác thực JWT)
    const user = req.user;

    // Chỉ cho phép nếu:
    // - Có user
    // - user có thuộc tính role
    // - role của user nằm trong danh sách required
    return !!user && !!user.role && required.includes(user.role);
  }
}
