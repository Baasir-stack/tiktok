export interface JwtValidationResult {
  id: string; // user id (uuid)
  email: string;
  role: string; // Added role property
  iat?: number;
  exp?: number;
}
