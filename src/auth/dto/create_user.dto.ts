import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(50)
  // Could use @Matches to compare agains a regex 
  password: string;

  @IsString()
  @MinLength(1)
  fullName: string;
}
