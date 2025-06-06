// src/common/utils/jwt-utils.ts
import { JwtService } from '@nestjs/jwt';

export async function generateTokens(
  userId: string,
  email: string,
  jwtService: JwtService,
) {
  console.log(userId, email);
  const payload = { sub: userId, email };
  console.log('payload', payload);

  const [accessToken, refreshToken] = await Promise.all([
    jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRE_IN,
    }),
    jwtService.signAsync(payload, {
      secret: process.env.REFRESH_JWT_SECRET,
      expiresIn: process.env.REFRESH_JWT_EXPIRE_IN,
    }),
  ]);

  return {
    accessToken,
    refreshToken,
  };
}
