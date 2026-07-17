import { IsString } from 'class-validator';

export class RejectStockRequestDto {
  @IsString()
  motivo: string;
}
