// auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { IS_PUBLIC_KEY } from 'src/decorators/permission.decorator';

@Injectable()
export class AuthGuard extends JwtAuthGuard {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context); // ← gọi JwtAuthGuard bình thường
  }
}
