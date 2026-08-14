import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class AdjustStockBalanceDto {
  @IsUUID()
  materialId: string;

  @IsUUID()
  localEstoqueId: string;

  @IsNumber()
  quantidade: number;

  @IsNumber()
  @IsOptional()
  custoUnitario?: number;

  @IsString()
  @IsOptional()
  observacao?: string;

  @IsBoolean()
  @IsOptional()
  permitirSaldoNegativo?: boolean;

  @IsString()
  @IsOptional()
  justificativaSaldoNegativo?: string;
}
