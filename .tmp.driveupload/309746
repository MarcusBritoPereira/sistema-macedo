import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsBoolean } from 'class-validator';
import { StatusObra } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateObraDto {
  @IsString()
  nome: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' || value === 'null' ? undefined : value))
  descricao?: string;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value === '' || value === 'null' ? undefined : value))
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value === '' || value === 'null' ? undefined : value))
  dataPrevisaoFim?: string;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value === '' || value === 'null' ? undefined : value))
  dataConclusao?: string;

  @IsOptional()
  @IsEnum(StatusObra)
  status?: StatusObra;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value === '' || value === 'null' ? undefined : (value ? Number(value) : value)))
  orcamentoPrevisto?: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' || value === 'null' ? undefined : value))
  endereco?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' || value === 'null' ? undefined : value))
  clienteId?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' || value === 'null' ? undefined : value))
  centroCustoId?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
