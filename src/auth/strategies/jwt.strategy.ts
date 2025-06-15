/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { JwtValidationResult } from 'src/common/interfaces/jwt.interface';
import { AuthJwtPayload } from 'src/types/jwt-payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('jwt.secret'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: AuthJwtPayload): Promise<JwtValidationResult> {
    console.log('=== JWT Validation ===');
    console.log('Payload received:', payload);
    console.log('JWT Secret:', this.config.get<string>('jwt.secret'));
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role, // Include role in validation result
    };
  }
}
