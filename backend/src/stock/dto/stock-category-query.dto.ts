import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class StockCategoryQueryDto extends PaginationQueryDto {
  @IsString()
  @IsOptional()
  ativo?: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}
