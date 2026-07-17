import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { TipoMovimentoEstoque, UnidadeMedidaMaterial } from '@prisma/client';

export class ExecuteStockMovementDto {
  @IsEnum(TipoMovimentoEstoque)
  tipo: TipoMovimentoEstoque;

  @IsUUID()
  materialId: string;

  @IsUUID()
  @IsOptional()
  localOrigemId?: string;

  @IsUUID()
  @IsOptional()
  localDestinoId?: string;

  @IsUUID()
  @IsOptional()
  obraId?: string;

  @IsUUID()
  @IsOptional()
  fornecedorId?: string;

  @IsString()
  quantidade: string;

  @IsEnum(UnidadeMedidaMaterial)
  unidade: UnidadeMedidaMaterial;

  @IsString()
  @IsOptional()
  custoUnitario?: string;

  @IsString()
  @IsOptional()
  documentoTipo?: string;

  @IsString()
  @IsOptional()
  documentoNumero?: string;

  @IsString()
  @IsOptional()
  notaFiscalNumero?: string;

  @IsString()
  @IsOptional()
  notaFiscalChave?: string;

  @IsString()
  @IsOptional()
  observacao?: string;

  @IsString()
  @IsOptional()
  justificativaSaldoNegativo?: string;

  @IsBoolean()
  @IsOptional()
  permitirSaldoNegativo?: boolean;

  @IsDateString()
  @IsOptional()
  dataMovimento?: string;
}
