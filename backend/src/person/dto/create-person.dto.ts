import {
  IsEmail,
  Length,
  Matches,
  ValidateIf,
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

  @IsOptional()
  @IsString()
  @MaxLength(60)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  rg?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  rgIssuer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  neighborhood?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  // An empty string clears the field on update.
  @ValidateIf((dto: CreatePersonDto) => dto.state != null && dto.state !== '')
  @IsString()
  @Length(2, 2)
  state?: string;

  @ValidateIf((dto: CreatePersonDto) => dto.postalCode != null && dto.postalCode !== '')
  @Matches(/^\d{5}-?\d{3}$/, { message: 'postalCode must be a CEP like 11000-000' })
  postalCode?: string;
}
