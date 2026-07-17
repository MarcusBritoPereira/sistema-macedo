import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

export class ApproveStockRequestItemDto {
  @IsUUID()
  itemId: string;

  @IsString()
  quantidadeAprovada: string;
}

export class ApproveStockRequestDto {
  @IsUUID()
  localReservaId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ApproveStockRequestItemDto)
  items: ApproveStockRequestItemDto[];

  @IsString()
  @IsOptional()
  observacao?: string;
}
