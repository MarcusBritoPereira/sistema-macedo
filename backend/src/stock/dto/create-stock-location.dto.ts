import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { TipoLocalEstoque } from '@prisma/client';

export class CreateStockLocationDto {
  @IsString()
  nome: string;

  @IsString()
  codigo: string;

  @IsEnum(TipoLocalEstoque)
  tipo: TipoLocalEstoque;

  @IsUUID()
  @IsOptional()
  obraId?: string;

  @IsUUID()
  @IsOptional()
  responsavelId?: string;

  @IsString()
  @IsOptional()
  endereco?: string;

  @IsBoolean()
  @IsOptional()
  permiteSaldoNegativo?: boolean;

  @IsBoolean()
  @IsOptional()
  ativo?: boolean;
}
