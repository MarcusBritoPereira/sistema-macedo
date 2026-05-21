import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsBoolean } from 'class-validator';
import { StatusObra } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateObraDto {
  @IsString()
  nome: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataPrevisaoFim?: string;

  @IsOptional()
  @IsDateString()
  dataConclusao?: string;

  @IsOptional()
  @IsEnum(StatusObra)
  status?: StatusObra;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : value))
  orcamentoPrevisto?: number;

  @IsOptional()
  @IsString()
  endereco?: string;

  @IsOptional()
  @IsString()
  clienteId?: string;

  @IsOptional()
  @IsString()
  centroCustoId?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
