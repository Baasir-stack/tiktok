// src/common/utils/jwt-utils.ts
import { JwtService } from '@nestjs/jwt';

export async function generateTokens(
  userId: string,
  email: string,
  role: string, // Added role parameter
  jwtService: JwtService,
) {
  console.log(userId, email, role);
  const payload = { sub: userId, email, role }; // Include role in payload
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
