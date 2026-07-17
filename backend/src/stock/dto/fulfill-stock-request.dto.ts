import { IsOptional, IsString, IsUUID } from 'class-validator';

export class FulfillStockRequestDto {
  @IsUUID()
  localOrigemId: string;

  @IsString()
  @IsOptional()
  observacao?: string;
}
