import { IsEnum, IsISO8601, IsOptional, IsBoolean } from 'class-validator';

export enum DRERegime {
  CAIXA = 'caixa',
  COMPETENCIA = 'competencia',
}

export enum DREGranularidade {
  MENSAL = 'mensal',
  TRIMESTRAL = 'trimestral',
  ANUAL = 'anual',
}

export class GerarDreDto {
  @IsEnum(DRERegime)
  regime: DRERegime;

  @IsISO8601()
  dataInicio: string;

  @IsISO8601()
  dataFim: string;

  @IsEnum(DREGranularidade)
  granularidade: DREGranularidade;

  @IsBoolean()
  @IsOptional()
  incluirRateios?: boolean = true;
}
