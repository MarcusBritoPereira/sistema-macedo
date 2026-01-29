
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ConfigureBankingDto {
    @IsString()
    @IsOptional()
    contaBancariaId?: string;

    @IsString()
    @IsNotEmpty()
    banco: string;

    @IsString()
    @IsOptional()
    agencia?: string;

    @IsString()
    @IsOptional()
    conta?: string;

    @IsString()
    @IsOptional()
    codigoBanco?: string;

    @IsString()
    @IsOptional()
    clientId?: string;

    @IsString()
    @IsOptional()
    clientSecret?: string;

    @IsString()
    @IsOptional()
    certificate?: string; // Content of .crt/.pfx

    @IsString()
    @IsOptional()
    privateKey?: string; // Content of .key
}
