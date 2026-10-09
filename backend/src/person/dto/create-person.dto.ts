import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsBusinessDate } from '../../common/validation/is-business-date.js';

export class CreatePersonDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  document: string;

  @IsBusinessDate()
  birthDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;
}
