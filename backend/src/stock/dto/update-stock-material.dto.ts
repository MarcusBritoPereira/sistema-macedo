import { PartialType } from '@nestjs/mapped-types';
import { CreateStockMaterialDto } from './create-stock-material.dto';

export class UpdateStockMaterialDto extends PartialType(CreateStockMaterialDto) {}
