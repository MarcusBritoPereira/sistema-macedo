import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { UnidadeMedidaMaterial } from '@prisma/client';

export class CreateStockMaterialDto {
  @IsString()
  codigo: string;

  @IsString()
  nome: string;

  @IsString()
  @IsOptional()
  descricao?: string;

  @IsUUID()
  categoriaMaterialId: string;

  @IsEnum(UnidadeMedidaMaterial)
  unidade: UnidadeMedidaMaterial;

  @IsString()
  @IsOptional()
  codigoBarras?: string;

  @IsString()
  @IsOptional()
  referenciaFornecedor?: string;

  @IsString()
  @IsOptional()
  marca?: string;

  @IsString()
  @IsOptional()
  fabricante?: string;

  @IsString()
  @IsOptional()
  estoqueMinimo?: string;

  @IsString()
  @IsOptional()
  estoqueMaximo?: string;

  @IsString()
  @IsOptional()
  pontoReposicao?: string;

  @IsString()
  @IsOptional()
  custoPadrao?: string;

  @IsBoolean()
  @IsOptional()
  permiteFracionado?: boolean;

  @IsBoolean()
  @IsOptional()
  ativo?: boolean;

  @IsString()
  @IsOptional()
  observacoes?: string;
}
