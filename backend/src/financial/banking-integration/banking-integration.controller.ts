import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { BankingIntegrationService } from './banking-integration.service';
import { ConfigureBankingDto } from './dto/configure-banking.dto';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions } from '../../auth/permissions.decorator';

const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024;

function assertImportFile(
  file: Express.Multer.File | undefined,
  allowedExtensions: string[],
) {
  if (!file?.buffer?.length) {
    throw new BadRequestException('Arquivo obrigatório');
  }

  if (file.size > MAX_IMPORT_FILE_SIZE) {
    throw new BadRequestException('Arquivo excede o limite de 5MB');
  }

  const originalName = file.originalname?.toLowerCase() || '';
  const isAllowed = allowedExtensions.some((extension) =>
    originalName.endsWith(extension),
  );
  if (!isAllowed) {
    throw new BadRequestException(
      `Formato inválido. Envie arquivo ${allowedExtensions.join(' ou ')}`,
    );
  }
}

@Controller('financial/banking')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class BankingIntegrationController {
  constructor(private readonly service: BankingIntegrationService) {}

  @Post('upload-ofx')
  @RequirePermissions('can_reconcile')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_FILE_SIZE } }),
  )
  uploadOfx(
    @UploadedFile() file: Express.Multer.File,
    @Body('contaId') contaId: string,
  ) {
    assertImportFile(file, ['.ofx']);
    if (!contaId) throw new BadRequestException('contaId é obrigatório');
    return this.service.importOfx(file.buffer, contaId);
  }

  @Post('upload-csv')
  @RequirePermissions('can_reconcile')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_FILE_SIZE } }),
  )
  uploadCsv(
    @UploadedFile() file: Express.Multer.File,
    @Body('contaId') contaId: string,
  ) {
    assertImportFile(file, ['.csv']);
    if (!contaId) throw new BadRequestException('contaId é obrigatório');
    return this.service.importCsv(file.buffer, contaId);
  }

  @Post('configure')
  @RequirePermissions('can_manage_banking')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'certificate', maxCount: 1 },
        { name: 'privateKey', maxCount: 1 },
      ],
      { limits: { fileSize: MAX_IMPORT_FILE_SIZE } },
    ),
  )
  configure(
    @Body() dto: ConfigureBankingDto,
    @UploadedFiles()
    files: {
      certificate?: Express.Multer.File[];
      privateKey?: Express.Multer.File[];
    },
  ) {
    return this.service.configure(dto, files);
  }

  @Get('status/:contaId')
  @RequirePermissions('can_manage_banking')
  getStatus(@Param('contaId') contaId: string) {
    return this.service.getStatus(contaId);
  }

  @Post('sync/:contaId')
  @RequirePermissions('can_manage_banking')
  sync(@Param('contaId') contaId: string) {
    return this.service.syncStatements(contaId);
  }
}
