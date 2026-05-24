import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends PassportAuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    console.log('=== RolesGuard ===');
    console.log('user:', request.user); // null hay có giá trị?
    console.log('path:', request.path);
    console.log('method:', request.method);
    return super.canActivate(context);
  }
}
