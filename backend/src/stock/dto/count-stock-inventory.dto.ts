import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

export class CountStockInventoryItemDto {
  @IsUUID()
  materialId: string;

  @IsString()
  quantidadeContada: string;

  @IsString()
  @IsOptional()
  justificativa?: string;
}

export class CountStockInventoryDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CountStockInventoryItemDto)
  items: CountStockInventoryItemDto[];
}
