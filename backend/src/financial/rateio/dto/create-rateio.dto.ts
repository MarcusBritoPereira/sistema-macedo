import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
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
}

export class CreateRateiosBatchDto {
  rateios: CreateRateioDto[];
}
