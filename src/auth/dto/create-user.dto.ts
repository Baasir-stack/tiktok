/* eslint-disable prettier/prettier */
// src/auth/dto/create-user.dto.ts
import {
  IsDateString,
  IsEmail,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @IsString({ message: 'Display name must be a string' })
  @Length(1, 50, {
    message: 'Display name must be between 1 and 50 characters',
  })
  displayName?: string;

  @IsDateString(
    {},
    { message: 'Please provide a valid date of birth (YYYY-MM-DD format)' },
  )
  dateOfBirth: string;
}
