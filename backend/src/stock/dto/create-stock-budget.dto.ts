import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsInt, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class CreateStockBudgetItemDto {
  @IsUUID()
  materialId: string;

  @IsUUID()
  @IsOptional()
  categoriaMaterialId?: string;

  @IsString()
  quantidadeOrcada: string;

  @IsString()
  custoUnitarioOrcado: string;

  @IsString()
  @IsOptional()
  etapaObra?: string;

  @IsUUID()
  @IsOptional()
  centroCustoId?: string;

  @IsString()
  @IsOptional()
  observacao?: string;
}

export class CreateStockBudgetDto {
  @IsUUID()
  obraId: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  versao?: number;

  @IsDateString()
  dataReferencia: string;

  @IsString()
  @IsOptional()
  observacao?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateStockBudgetItemDto)
  items: CreateStockBudgetItemDto[];
}
