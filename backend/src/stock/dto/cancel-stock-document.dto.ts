import { IsString } from 'class-validator';

export class CancelStockDocumentDto {
  @IsString()
  motivo: string;
}
