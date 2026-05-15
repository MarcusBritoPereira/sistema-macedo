import {
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

@Controller('financial/banking')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class BankingIntegrationController {
  constructor(private readonly service: BankingIntegrationService) {}

  @Post('upload-ofx')
  @RequirePermissions('can_manage_banking')
  @UseInterceptors(FileInterceptor('file'))
  uploadOfx(
    @UploadedFile() file: Express.Multer.File,
    @Body('contaId') contaId: string,
  ) {
    return this.service.importOfx(file.buffer, contaId);
  }

  @Post('configure')
  @RequirePermissions('can_manage_banking')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'certificate', maxCount: 1 },
      { name: 'privateKey', maxCount: 1 },
    ]),
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
