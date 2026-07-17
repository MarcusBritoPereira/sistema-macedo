import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { PrioridadeSolicitacaoMaterial } from '@prisma/client';

export class CreateStockRequestItemDto {
  @IsUUID()
  materialId: string;

  @IsString()
  quantidadeSolicitada: string;

  @IsString()
  @IsOptional()
  observacao?: string;
}

export class CreateStockRequestDto {
  @IsUUID()
  obraId: string;

  @IsUUID()
  @IsOptional()
  localDestinoId?: string;

  @IsEnum(PrioridadeSolicitacaoMaterial)
  @IsOptional()
  prioridade?: PrioridadeSolicitacaoMaterial;

  @IsDateString()
  @IsOptional()
  dataNecessidade?: string;

  @IsString()
  @IsOptional()
  justificativa?: string;

  @IsString()
  @IsOptional()
  observacao?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateStockRequestItemDto)
  items: CreateStockRequestItemDto[];
}
