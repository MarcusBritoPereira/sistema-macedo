import { IsOptional, IsString } from 'class-validator';

export class CashFlowFilterDto {
    @IsOptional()
    @IsString()
    startDate?: string;

    @IsOptional()
    @IsString()
    endDate?: string;
}
