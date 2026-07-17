import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateStockInventoryDto {
  @IsUUID()
  localEstoqueId: string;

  @IsString()
  @IsOptional()
  observacao?: string;
}
