import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsIn,
  Min,
} from 'class-validator';

export class CreateRateioDto {
  @IsNumber()
  @Min(0)
  valor: number;

  @IsBoolean()
  @IsOptional()
  recorrente?: boolean;

  @IsString()
  @IsOptional()
  observacao?: string;

  @IsString()
  @IsNotEmpty()
  categoria: string;

  @IsString()
  @IsOptional()
  subcategoria?: string;

  @IsString()
  @IsOptional()
  categoriaFinanceiraId?: string;

  @IsString()
  @IsOptional()
  obraId?: string;

  @IsString()
  @IsOptional()
  centroCustoId?: string;

  @IsIn(['OBRA', 'CENTRO_CUSTO'])
  @IsOptional()
  tipoDestino?: 'OBRA' | 'CENTRO_CUSTO';

  @IsIn(['MATERIAL', 'MAO_DE_OBRA', 'SERVICO', 'EQUIPAMENTO', 'OUTROS'])
  @IsOptional()
  tipoCusto?: 'MATERIAL' | 'MAO_DE_OBRA' | 'SERVICO' | 'EQUIPAMENTO' | 'OUTROS';

  @IsString()
  @IsOptional()
  categoriaCusto?: string;

  @IsString()
  @IsOptional()
  descricaoItem?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  quantidade?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  valorUnitario?: number;
}

export class CreateRateiosBatchDto {
  rateios: CreateRateioDto[];
}
