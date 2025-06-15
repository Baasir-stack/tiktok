/* eslint-disable @typescript-eslint/no-unsafe-return */
// src/common/guards/optional-jwt.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override handleRequest to make auth optional
  handleRequest(err: any, user: any) {
    // If there's an error or no user, just return null (don't throw)
    if (err || !user) {
      return null;
    }
    return user;
  }

  // Override canActivate to always return true
  canActivate(context: ExecutionContext) {
    // Always return true, but still process the JWT if present
    return super.canActivate(context);
  }
}
