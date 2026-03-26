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
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@Controller('financial/banking')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class BankingIntegrationController {
  constructor(private readonly service: BankingIntegrationService) {}

  @Post('upload-ofx')
  @Roles('ADMIN', 'FINANCEIRO')
  @UseInterceptors(FileInterceptor('file'))
  uploadOfx(
    @UploadedFile() file: Express.Multer.File,
    @Body('contaId') contaId: string,
  ) {
    return this.service.importOfx(file.buffer, contaId);
  }

  @Post('configure')
  @Roles('ADMIN', 'FINANCEIRO')
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
  @Roles('ADMIN', 'FINANCEIRO')
  getStatus(@Param('contaId') contaId: string) {
    return this.service.getStatus(contaId);
  }

  @Post('sync/:contaId')
  @Roles('ADMIN', 'FINANCEIRO')
  sync(@Param('contaId') contaId: string) {
    return this.service.syncStatements(contaId);
  }
}
