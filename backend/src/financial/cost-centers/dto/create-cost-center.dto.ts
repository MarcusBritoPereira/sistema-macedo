import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCostCenterDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsString()
  @IsOptional()
  codigo?: string;

  @IsString()
  @IsOptional()
  descricao?: string;

  @IsString()
  @IsOptional()
  tipo?: any; // Matches TipoCentroCusto enum

  @IsString()
  @IsOptional()
  categoriaFinanceira?: any; // Matches CategoriaFinanceiraCentro enum

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsString()
  @IsOptional()
  obraId?: string;

  @IsString()
  @IsOptional()
  etapaId?: string;

  @IsBoolean()
  @IsOptional()
  ativo?: boolean;

  @IsBoolean()
  @IsOptional()
  aceitaLancamento?: boolean;

  @IsNumber()
  @IsOptional()
  orcamentoPrevisto?: number;

  @IsNumber()
  @IsOptional()
  limiteMaximo?: number;

  @IsBoolean()
  @IsOptional()
  aprovacaoNecessaria?: boolean;

  @IsString()
  @IsOptional()
  responsavelId?: string;

  @IsString()
  @IsOptional()
  planoContaId?: string;

  @IsString()
  @IsOptional()
  categoriaCompra?: string;

  @IsString()
  @IsOptional()
  contaContabil?: string;

  @IsString()
  @IsOptional()
  unidadeMedida?: string;

  @IsNumber()
  @IsOptional()
  metaFisica?: number;

  @IsString()
  @IsOptional()
  tags?: string;

  @IsString()
  @IsOptional()
  cor?: string;
}

