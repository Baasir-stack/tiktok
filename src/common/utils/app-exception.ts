/* eslint-disable prettier/prettier */
// src/common/utils/app-exception.ts
export class AppException extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
  ) {
    super(message);
  }
}
