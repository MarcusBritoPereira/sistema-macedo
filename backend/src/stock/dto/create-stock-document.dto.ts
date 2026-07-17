import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class CreateStockDocumentItemDto {
  @IsUUID()
  materialId: string;

  @IsString()
  quantidade: string;

  @IsString()
  @IsOptional()
  custoUnitario?: string;

  @IsString()
  @IsOptional()
  lote?: string;

  @IsDateString()
  @IsOptional()
  dataValidade?: string;

  @IsString()
  @IsOptional()
  observacao?: string;
}

export class CreateStockDocumentDto {
  @IsString()
  @IsOptional()
  numero?: string;

  @IsUUID()
  @IsOptional()
  fornecedorId?: string;

  @IsUUID()
  @IsOptional()
  obraId?: string;

  @IsUUID()
  @IsOptional()
  localOrigemId?: string;

  @IsUUID()
  @IsOptional()
  localDestinoId?: string;

  @IsDateString()
  @IsOptional()
  dataDocumento?: string;

  @IsString()
  @IsOptional()
  documentoFiscal?: string;

  @IsString()
  @IsOptional()
  observacao?: string;

  @IsUUID()
  @IsOptional()
  transacaoFinanceiraId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateStockDocumentItemDto)
  items: CreateStockDocumentItemDto[];
}
