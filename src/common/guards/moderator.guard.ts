/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/common/guards/moderator.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class ModeratorGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    console.log('=== Moderator Guard Check ===');
    console.log('User object:', user);
    console.log('User role:', user?.role);

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Check if user has moderator or admin role
    if (user.role !== 'moderator' && user.role !== 'admin') {
      throw new ForbiddenException(
        'Moderator or Admin privileges required to access this resource',
      );
    }

    console.log('✅ Moderator/Admin access granted');
    return true;
  }
}
