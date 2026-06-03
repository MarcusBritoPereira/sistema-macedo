import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  StatusLancamento,
  TipoClassificacaoLancamento,
  TipoCustoLancamento,
  TipoLancamento,
} from '@prisma/client';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  descricao: string;

  @Type(() => Number)
  @IsNumber()
  valor: number;

  @IsDateString()
  dataVencimento: string;

  @IsDateString()
  @IsOptional()
  dataPagamento?: string;

  @IsDateString()
  @IsOptional()
  dataCompetencia?: string;

  @IsEnum(TipoLancamento)
  tipo: TipoLancamento;

  @IsEnum(StatusLancamento)
  @IsOptional()
  status?: StatusLancamento;

  @IsString()
  @IsOptional()
  observacoes?: string;

  @IsUUID()
  @IsOptional()
  contaBancariaId?: string;

  @IsUUID()
  @IsOptional()
  categoriaId?: string;

  @IsUUID()
  @IsOptional()
  centroCustoId?: string;

  @IsUUID()
  @IsOptional()
  contratoId?: string;

  @IsUUID()
  @IsOptional()
  clienteId?: string;

  @IsUUID()
  @IsOptional()
  fornecedorId?: string;

  @IsEnum(TipoClassificacaoLancamento)
  @IsOptional()
  tipoLancamento?: TipoClassificacaoLancamento;

  @IsEnum(TipoCustoLancamento)
  @IsOptional()
  tipoCusto?: TipoCustoLancamento;

  @IsString()
  @IsOptional()
  categoriaCusto?: string;

  @IsUUID()
  @IsOptional()
  obraId?: string;

}
