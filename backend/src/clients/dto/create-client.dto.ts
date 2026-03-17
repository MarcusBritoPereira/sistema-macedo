import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsJSON,
  IsNotEmpty,
} from 'class-validator';

export class CreateClientDto {
  @IsString({ message: 'A razão social deve ser uma string' })
  @IsNotEmpty({ message: 'A razão social é obrigatória' })
  razaoSocial: string;

  @IsString({ message: 'O nome fantasia deve ser uma string' })
  @IsOptional()
  nomeFantasia?: string;

  @IsString({ message: 'O CNPJ deve ser uma string' })
  @IsOptional()
  cnpj?: string;

  @IsString({ message: 'A inscrição estadual deve ser uma string' })
  @IsOptional()
  inscricaoEstadual?: string;

  @IsString({ message: 'O CPF deve ser uma string' })
  @IsOptional()
  cpf?: string;

  @IsEmail({}, { message: 'Formato de e-mail inválido' })
  @IsOptional()
  email?: string;

  @IsString({ message: 'O telefone deve ser uma string' })
  @IsOptional()
  telefone?: string;

  @IsString({ message: 'O endereço deve ser uma string' })
  @IsOptional()
  endereco?: string;

  @IsString({ message: 'O nome do representante deve ser uma string' })
  @IsOptional()
  representanteNome?: string;

  @IsString({ message: 'O CPF do representante deve ser uma string' })
  @IsOptional()
  representanteCpf?: string;

  @IsString({ message: 'O cargo do representante deve ser uma string' })
  @IsOptional()
  representanteCargo?: string;

  @IsEmail({}, { message: 'Formato de e-mail do representante inválido' })
  @IsOptional()
  representanteEmail?: string;

  @IsString({ message: 'O telefone do representante deve ser uma string' })
  @IsOptional()
  representanteTelefone?: string;

  @IsString({ message: 'O nome do financeiro deve ser uma string' })
  @IsOptional()
  financeiroNome?: string;

  @IsEmail({}, { message: 'Formato de e-mail do financeiro inválido' })
  @IsOptional()
  financeiroEmail?: string;

  @IsString({ message: 'O Whatsapp do financeiro deve ser uma string' })
  @IsOptional()
  financeiroWhatsapp?: string;

  @IsString({ message: 'A preferência de contato deve ser uma string' })
  @IsOptional()
  financeiroPreferenciaContato?: string;

  @IsOptional()
  redesSociais?: any;

  @IsString({ message: 'Os usuários admins devem ser uma string' })
  @IsOptional()
  usuariosAdmins?: string;

  @IsOptional()
  linksUteis?: any;

  @IsString({ message: 'O nicho deve ser uma string' })
  @IsOptional()
  nicho?: string;

  @IsString({ message: 'A quantidade de conteúdo deve ser uma string' })
  @IsOptional()
  qtdConteudo?: string;

  @IsString({ message: 'A consultora deve ser uma string' })
  @IsOptional()
  consultora?: string;

  @IsBoolean({ message: 'Emissão de NF deve ser booleano' })
  @IsOptional()
  emissaoNf?: boolean;

  @IsEmail({}, { message: 'E-mail para NF inválido' })
  @IsOptional()
  emailNf?: string;

  @IsString({ message: 'Observações fiscais devem ser uma string' })
  @IsOptional()
  obsFiscais?: string;

  @IsString({ message: 'O foro deve ser uma string' })
  @IsOptional()
  foro?: string;

  @IsBoolean({ message: 'LGPD aceito deve ser booleano' })
  @IsOptional()
  lgpdAceito?: boolean;

  @IsBoolean({ message: 'Aceite eletrônico deve ser booleano' })
  @IsOptional()
  aceiteEletronico?: boolean;

  @IsBoolean({ message: 'Status ativo deve ser booleano' })
  @IsOptional()
  ativo?: boolean;
}
