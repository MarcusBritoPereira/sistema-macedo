import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ReportGenerationFiltersDto {
    @IsString()
    period: string;

    @IsString()
    @IsOptional()
    startDate?: string | null;

    @IsString()
    @IsOptional()
    endDate?: string | null;

    @IsString()
    @IsOptional()
    accountId?: string | null;

    @IsString()
    @IsOptional()
    costCenterId?: string | null;

    @IsBoolean()
    @IsOptional()
    includeProvisional?: boolean;
}

export class ReportGenerationRequestDto {
    @IsArray()
    @IsString({ each: true })
    reportIds: string[];

    @ValidateNested()
    @Type(() => ReportGenerationFiltersDto)
    filters: ReportGenerationFiltersDto;
}
