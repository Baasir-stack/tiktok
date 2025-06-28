/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  ValidateIf,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

// Custom validator to ensure either email or username is provided
function IsEitherEmailOrUsername(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isEitherEmailOrUsername',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const obj = args.object as any;
          return !!(obj.email || obj.username);
        },
        defaultMessage(args: ValidationArguments) {
          return 'Either email or username must be provided';
        },
      },
    });
  };
}

export class LoginUserDto {
  @IsOptional()
  @ValidateIf((o) => !o.username)
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsEitherEmailOrUsername({
    message: 'Either email or username must be provided',
  })
  email?: string;

  @IsOptional()
  @ValidateIf((o) => !o.email)
  @IsString()
  @IsNotEmpty({ message: 'Username cannot be empty' })
  username?: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
