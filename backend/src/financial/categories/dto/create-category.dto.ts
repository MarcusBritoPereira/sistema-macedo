import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TipoCategoria, ClassificacaoDRE } from '@prisma/client';

export class CreateCategoryDto {
    @IsString()
    @IsNotEmpty()
    nome: string;

    @IsEnum(TipoCategoria)
    @IsNotEmpty()
    tipo: TipoCategoria;

    @IsString()
    @IsOptional()
    descricao?: string;

    @IsEnum(ClassificacaoDRE)
    @IsOptional()
    classificacao?: ClassificacaoDRE;
    @IsString()
    @IsOptional()
    parentId?: string;
}
