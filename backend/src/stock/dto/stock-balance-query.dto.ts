import { IsOptional, IsString, IsUUID } from 'class-validator';

export class StockBalanceQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsUUID()
  @IsOptional()
  materialId?: string;

  @IsUUID()
  @IsOptional()
  localEstoqueId?: string;

  @IsUUID()
  @IsOptional()
  obraId?: string;

  @IsUUID()
  @IsOptional()
  categoriaMaterialId?: string;

  @IsString()
  @IsOptional()
  situacao?: 'NORMAL' | 'BAIXO' | 'CRITICO' | 'ZERADO' | 'NEGATIVO';

  @IsString()
  @IsOptional()
  skip?: string;

  @IsString()
  @IsOptional()
  take?: string;
}
