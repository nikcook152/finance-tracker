import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';

export class AuthDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
