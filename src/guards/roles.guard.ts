/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from 'src/modules/accounts/enums/user-role.enum';
import { ROLES_KEY } from 'src/decorators/role.decorator';
import { PermissionsService } from 'src/modules/permission/permissions.service';
import {
  MODULE_KEY,
  ACTION_KEY,
  IS_PUBLIC_KEY,
} from 'src/decorators/permission.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService, // ma tran quyen
  ) {}
  // dung de lay metadata tu decorator
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    // ✅ Ưu tiên check @RequireRole trước
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (requiredRoles?.length) {
      const hasRole = requiredRoles.includes(user.role);
      if (!hasRole)
        throw new HttpException(
          'Quyền truy cập bị từ chối.',
          HttpStatus.FORBIDDEN,
        );
      return true; // ← có role đúng thì cho qua luôn, không check matrix
    }

    // 1. Lấy tên Module từ cấp Controller
    const module = this.reflector.getAllAndOverride<string>(MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu API/Controller này không thuộc Module Matrix nào (Ví dụ: API nội bộ cá nhân, Public endpoints) -> Cho qua
    if (!module) return true;

    // Nếu cần kiểm tra permissions nhưng không có user -> Unauthorized
    if (!user)
      throw new HttpException(
        'Quyền truy cập bị từ chối.',
        HttpStatus.UNAUTHORIZED,
      );

    // 2. Xác định Action: Ưu tiên @RequireAction cụ thể ở API, không có thì map theo HTTP Method
    let action = this.reflector.get<string>(ACTION_KEY, context.getHandler());
    if (!action) {
      const method = request.method;
      switch (method) {
        case 'GET':
          action = 'canView';
          break;
        case 'POST':
          action = 'canCreate';
          break;
        case 'PUT':
        case 'PATCH':
          action = 'canEdit';
          break;
        case 'DELETE':
          action = 'canDelete';
          break;
        default:
          action = 'canView';
      }
    }

    // 3. Tra cứu trực tiếp trong RAM Matrix Cache (Đáp ứng < 5ms overhead)
    const matrix = await this.permissionsService.getMatrix();

    // Đọc chính xác cấu hình quyền của Role hiện tại đối với Module hiện tại
    const hasPerm = matrix[user.role]?.[module]?.[action];

    // 4. Nếu Ma trận trả về false hoặc không tồn tại cấu hình -> Chặn ngay lập tức
    if (!hasPerm) {
      throw new HttpException(
        `Quyền truy cập bị từ chối.`,
        HttpStatus.FORBIDDEN,
      );
    }
    return true;
  }
}
