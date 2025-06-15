export type AuthJwtPayload = {
  sub: string; // user id
  email: string;
  role: string; // Added role property
  iat?: number;
  exp?: number;
};
