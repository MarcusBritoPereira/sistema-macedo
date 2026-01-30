import { IsEmail, IsString, MinLength, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    nome: string;

    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    senha: string;

    @IsString()
    @IsNotEmpty()
    perfil: string;

    @IsOptional()
    ativo?: boolean;
}
