
import { Body, Controller, Get, Param, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { BankingIntegrationService } from './banking-integration.service';
import { ConfigureBankingDto } from './dto/configure-banking.dto';

@Controller('financial/banking')
export class BankingIntegrationController {
    constructor(private readonly service: BankingIntegrationService) { }

    @Post('configure')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'certificate', maxCount: 1 },
        { name: 'privateKey', maxCount: 1 },
    ]))
    configure(
        @Body() dto: ConfigureBankingDto,
        @UploadedFiles() files: { certificate?: Express.Multer.File[], privateKey?: Express.Multer.File[] }
    ) {
        console.log('Received Configure Request');
        console.log('DTO:', JSON.stringify(dto));
        if (files) {
            console.log('Files:', Object.keys(files));
            if (files.certificate) console.log('Certificate size:', files.certificate[0].size);
            if (files.privateKey) console.log('PrivateKey size:', files.privateKey[0].size);
        } else {
            console.log('No files received');
        }
        return this.service.configure(dto, files);
    }

    @Get('status/:contaId')
    getStatus(@Param('contaId') contaId: string) {
        return this.service.getStatus(contaId);
    }

}
