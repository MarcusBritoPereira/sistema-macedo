import { IsOptional, IsString } from 'class-validator';

export class PaginationQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  skip?: string;

  @IsString()
  @IsOptional()
  take?: string;
}
