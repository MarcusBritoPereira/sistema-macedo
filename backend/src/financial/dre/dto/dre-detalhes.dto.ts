import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';
import { DRERegime } from './gerar-dre.dto';

export class DREDetalhesDto {
  @IsString()
  categoria: string;

  @IsString()
  @IsOptional()
  subcategoria?: string;

  @IsISO8601()
  dataInicio: string;

  @IsISO8601()
  dataFim: string;

  @IsEnum(DRERegime)
  regime: DRERegime;
}
