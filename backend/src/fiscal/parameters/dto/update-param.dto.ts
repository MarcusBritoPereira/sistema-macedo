import { PartialType } from '@nestjs/mapped-types';
import { CreateFiscalParamDto } from './create-param.dto';

export class UpdateFiscalParamDto extends PartialType(CreateFiscalParamDto) { }
