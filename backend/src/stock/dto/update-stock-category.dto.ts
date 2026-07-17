import { PartialType } from '@nestjs/mapped-types';
import { CreateStockCategoryDto } from './create-stock-category.dto';

export class UpdateStockCategoryDto extends PartialType(CreateStockCategoryDto) {}
