import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateStockCategoryDto {
  @IsString()
  nome: string;

  @IsString()
  @IsOptional()
  descricao?: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;

  @IsUUID()
  @IsOptional()
  categoriaFinanceiraId?: string;

  @IsUUID()
  @IsOptional()
  centroCustoPadraoId?: string;

  @IsBoolean()
  @IsOptional()
  ativo?: boolean;
}
