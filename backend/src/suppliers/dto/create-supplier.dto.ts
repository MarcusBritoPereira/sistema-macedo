import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateSupplierDto {
    @IsString()
    nomeFantasia: string;

    @IsString()
    @IsOptional()
    razaoSocial?: string;

    @IsString()
    @IsOptional()
    cnpj?: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    telefone?: string;

    @IsString()
    @IsOptional()
    categoriaDefaultId?: string;

    @IsBoolean()
    @IsOptional()
    ativo?: boolean;
}
