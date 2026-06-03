import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateFiscalParamDto {
  @IsString()
  @IsNotEmpty()
  nome: string; // ex: ALIQUOTA_ISS

  @IsString()
  @IsNotEmpty()
  valor: string; // ex: "5%"

  @IsString()
  @IsOptional()
  descricao?: string;
}
