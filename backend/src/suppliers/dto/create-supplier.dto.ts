import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSupplierDto {
  @IsString()
  nomeFantasia: string;

  @IsString()
  @IsOptional()
  razaoSocial?: string;

  @IsString()
  @IsOptional()
  cnpj?: string;

  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  telefone?: string;

  @IsString()
  @IsOptional()
  categoriaDefaultId?: string;

  @IsBoolean()
  @IsOptional()
  ativo?: boolean;

  @IsString()
  @IsOptional()
  observacoes?: string;
}
