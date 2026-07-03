import { IsOptional, IsString, IsDateString } from 'class-validator';

export class DashboardFilterDto {
  @IsOptional()
  @IsString()
  obraId?: string;

  @IsOptional()
  @IsString()
  centroCustoId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
