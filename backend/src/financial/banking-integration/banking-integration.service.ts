import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import axios from 'axios';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigureBankingDto } from './dto/configure-banking.dto';

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

import { OfxService } from './ofx.service';
import { ReconciliationService } from '../reconciliation/reconciliation.service';

@Injectable()
export class BankingIntegrationService {
  private readonly INTER_AUTH_URL =
    'https://cdpj.partners.bancointer.com.br/oauth/v2/token';
  private readonly INTER_API_URL =
    'https://cdpj.partners.bancointer.com.br/banking/v2/extrato';
  private readonly INTER_SALDO_URL =
    'https://cdpj.partners.bancointer.com.br/banking/v2/saldo';
  private readonly CERTS_DIR = path.resolve(process.cwd(), 'secure', 'certs');

  constructor(
    private prisma: PrismaService,
    private ofxService: OfxService,
    private reconciliationService: ReconciliationService,
  ) {
    // Ensure secure directory exists
    if (!fs.existsSync(this.CERTS_DIR)) {
      fs.mkdirSync(this.CERTS_DIR, { recursive: true });
    }
  }

  async configure(
    dto: ConfigureBankingDto,
    files?: { certificate?: any[]; privateKey?: any[] },
  ) {
    console.log('Service: configure started');
    try {
      let accountId = dto.contaBancariaId;

      // If no account ID provided, find or create one based on the Bank Name
      if (!accountId) {
        console.log('Service: No accountId, finding/creating account...');
        const bankName = dto.banco || 'Banco Inter';
        const existing = await this.prisma.contaBancaria.findFirst({
          where: { banco: bankName },
          include: { integracao: true },
        });

        if (existing) {
          if (existing.integracao) {
            throw new BadRequestException(
              'Esta conta já possui uma integração vinculada.',
            );
          }
          console.log(
            'Service: Found existing account (unlinked):',
            existing.id,
          );
          accountId = existing.id;
        } else {
          console.log('Service: Creating new account...');
          const newAcc = await this.prisma.contaBancaria.create({
            data: {
              nome: `Conta ${bankName}`,
              banco: bankName,
              agencia: dto.agencia,
              conta: dto.conta,
              codigoBanco: dto.codigoBanco,
              saldoInicial: 0,
            },
          });
          console.log('Service: Created new account:', newAcc.id);
          accountId = newAcc.id;
        }
      } else {
        console.log(
          'Service: Updating provided accountId identification fields:',
          accountId,
        );
        await this.prisma.contaBancaria.update({
          where: { id: accountId },
          data: {
            agencia: dto.agencia,
            conta: dto.conta,
            codigoBanco: dto.codigoBanco,
          },
        });
      }

      const updateData: any = {
        banco: dto.banco,
        status: 'CONNECTED',
        lastSync: new Date(),
      };

      if (dto.clientId && dto.clientId !== '******') {
        updateData.clientId = dto.clientId;
      }

      if (dto.clientSecret && dto.clientSecret !== '******') {
        updateData.clientSecret = dto.clientSecret;
      }

      // Handle File Uploads
      if (files) {
        console.log('Service: Processing files...');
        const certFile = files.certificate?.[0];
        const keyFile = files.privateKey?.[0];

        if (certFile) {
          const certPath = path.join(this.CERTS_DIR, `${accountId}_cert.crt`);
          console.log('Service: Writing cert to', certPath);
          fs.writeFileSync(certPath, certFile.buffer);
          updateData.crtFile = certPath;
        }

        if (keyFile) {
          const keyPath = path.join(this.CERTS_DIR, `${accountId}_key.key`);
          console.log('Service: Writing key to', keyPath);
          fs.writeFileSync(keyPath, keyFile.buffer);
          updateData.keyFile = keyPath;
        }
      }

      console.log('Service: Upserting integration for account', accountId);
      // Upsert Integration
      const result = await this.prisma.integracaoBancaria.upsert({
        where: { contaBancariaId: accountId },
        update: updateData,
        create: {
          ...updateData,
          contaBancariaId: accountId,
        },
      });
      return result;
    } catch (error) {
      console.error('CRITICAL Error in configure:', error);
      // Log full error details
      if (error instanceof Error) {
        console.error('Stack:', error.stack);
      }
      throw error;
    }
  }

  async getStatus(contaBancariaId: string) {
    const integration = await this.prisma.integracaoBancaria.findUnique({
      where: { contaBancariaId },
    });

    if (!integration) return { status: 'NOT_CONFIGURED' };

    return {
      status: integration.status,
      lastSync: integration.lastSync,
      banco: integration.banco,
    };
  }

  async syncStatements(contaBancariaId: string) {
    const integration = await this.prisma.integracaoBancaria.findUnique({
      where: { contaBancariaId },
      include: { contaBancaria: true },
    });

    if (!integration || integration.status !== 'CONNECTED') {
      throw new BadRequestException(
        'Integração não configurada ou desconectada',
      );
    }

    const logFile = path.join(this.CERTS_DIR, 'banking_debug.log');
    const log = (msg: string) => {
      const timestamp = new Date().toISOString();
      try {
        fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`);
      } catch (e) {
        console.error('Failed to write to log file:', e);
      }
      console.log(msg);
    };

    try {
      log(`[Sync] Starting sync for account ${contaBancariaId}...`);

      if (
        !fs.existsSync(integration.crtFile!) ||
        !fs.existsSync(integration.keyFile!)
      ) {
        throw new BadRequestException(
          'Certificados não encontrados no servidor.',
        );
      }

      const certContent = fs.readFileSync(integration.crtFile!);
      const keyContent = fs.readFileSync(integration.keyFile!);

      // 1. Authenticate (mTLS + OAuth)
      const accessToken = await this.getAccessToken(
        integration.clientId!,
        integration.clientSecret!,
        certContent,
        keyContent,
      );

      log('[Sync] Authenticated. Fetching pages...');

      // Range: 60 days to cover a full history and within the 90-day bank limit
      const today = new Date();
      const startLimit = new Date();
      startLimit.setDate(today.getDate() - 60);

      const dataInicio = startLimit.toISOString().split('T')[0];
      const dataFim = today.toISOString().split('T')[0];

      let allStatements: any[] = [];
      let currentPage = 0;
      let hasMore = true;

      while (hasMore) {
        log(
          `[Sync] Fetching page ${currentPage} (Window: ${dataInicio} to ${dataFim})...`,
        );

        let responseData;
        let retries = 0;
        while (retries < 3) {
          try {
            responseData = await this.fetchInterStatements(
              accessToken,
              dataInicio,
              dataFim,
              certContent,
              keyContent,
              currentPage,
              integration.contaBancaria?.conta,
            );
            break;
          } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 429) {
              retries++;
              log(`[Sync] Rate limited (429). Retrying in ${retries * 2}s...`);
              await new Promise((resolve) =>
                setTimeout(resolve, retries * 2000),
              );
            } else {
              throw err;
            }
          }
        }

        if (!responseData)
          throw new Error('API do banco não respondeu após várias tentativas.');

        const pageTrans = responseData.transacoes || [];
        allStatements = [...allStatements, ...pageTrans];
        log(`[Sync] Page ${currentPage} returned ${pageTrans.length} items.`);

        // Check pagination
        // If fewer items than requested (1000), it's the last page.
        // Also check totalPaginas if provided.
        const pageSize = 1000;
        if (
          pageTrans.length < pageSize ||
          (responseData.totalPaginas !== undefined &&
            currentPage >= responseData.totalPaginas - 1)
        ) {
          hasMore = false;
        } else {
          currentPage++;
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 1s cooldown
        }

        if (currentPage > 50) hasMore = false;
      }

      log(
        `[Sync] Fetched total of ${allStatements.length} transactions across ${currentPage + 1} pages.`,
      );

      let importedCount = 0;
      let duplicatesCount = 0;
      const newStatementIds: string[] = [];

      const importLog = await this.prisma.importacaoBancaria.create({
        data: {
          filename: `API Inter ${new Date().toISOString().split('T')[0]}`,
          fileType: 'MANUAL',
          contaBancariaId: contaBancariaId,
          status: 'COMPLETED',
        },
      });

      for (const t of allStatements) {
        // TIMEZONE FIX: Store as ISO string with 12:00:00Z to avoid day-back shift in BRT
        const middayDate = new Date(`${t.dataEntrada}T12:00:00Z`);
        const valor = parseFloat(t.valor);
        const cleanDesc = (t.descricao || '').replace(/\s+/g, ' ').trim();

        // Use the middayDate ISO string for a stable hash regardless of local execution TZ
        const hashDateStr = middayDate.toISOString().split('T')[0];
        const hash = `INTER-${hashDateStr}-${t.tipoOperacao || ''}-${t.titulo}-${t.valor}-${cleanDesc.substring(0, 100)}`;

        const exists = await this.prisma.extratoBancario.findUnique({
          where: { hash },
        });

        if (!exists) {
          const tituloNorm = (t.titulo || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ');
          const descNorm = cleanDesc.toLowerCase().replace(/\s+/g, ' ');
          const finalDesc = descNorm.startsWith(tituloNorm)
            ? cleanDesc.trim()
            : `${t.titulo} - ${cleanDesc}`.trim();

          const created = await this.prisma.extratoBancario.create({
            data: {
              data: middayDate,
              descricao: finalDesc,
              valor: Math.abs(valor),
              tipo:
                t.tipoTransacao === 'CREDITO' || t.tipoOperacao === 'C'
                  ? 'CREDIT'
                  : 'DEBIT',
              hash: hash,
              conciliado: false,
              importacaoId: importLog.id,
            },
          });
          newStatementIds.push(created.id);
          importedCount++;
        } else {
          duplicatesCount++;
        }
      }

      log(
        `[Sync] Import done: ${importedCount} imported, ${duplicatesCount} duplicates.`,
      );

      await this.prisma.integracaoBancaria.update({
        where: { id: integration.id },
        data: { lastSync: new Date() },
      });

      // Find auto-suggestions for newly imported statements
      let suggestions: any[] = [];
      try {
        suggestions =
          await this.reconciliationService.findAutoSuggestions(newStatementIds);
      } catch (e) {
        log(`[Sync] Warning: auto-suggestion failed: ${e.message}`);
      }

      return {
        success: true,
        imported: importedCount,
        suggestions,
        message:
          suggestions.length > 0
            ? `Sincronização concluída! ${importedCount} importados. ${suggestions.length} podem ser conciliados.`
            : `Sincronização concluída! ${importedCount} importados.`,
      };
    } catch (error) {
      log(`[ERROR] ${error.message}`);
      if (axios.isAxiosError(error)) {
        log(`[AXIOS DATA] ${JSON.stringify(error.response?.data)}`);
        log(`[AXIOS STATUS] ${JSON.stringify(error.response?.status)}`);
      }
      if (
        error.message &&
        (error.message.includes('autenticação') ||
          error.message.includes('certificado'))
      ) {
        await this.prisma.integracaoBancaria.update({
          where: { id: integration.id },
          data: { status: 'ERROR' },
        });
      }
      throw new BadRequestException(`Erro na sincronização: ${error.message}`);
    }
  }

  async getAccountBalance(contaBancariaId: string): Promise<number> {
    const integration = await this.prisma.integracaoBancaria.findUnique({
      where: { contaBancariaId },
      include: { contaBancaria: true },
    });

    if (!integration || integration.status !== 'CONNECTED') {
      throw new BadRequestException(
        'Integração não configurada ou desconectada',
      );
    }

    if (
      !fs.existsSync(integration.crtFile!) ||
      !fs.existsSync(integration.keyFile!)
    ) {
      throw new BadRequestException(
        'Certificados não encontrados no servidor.',
      );
    }

    const certContent = fs.readFileSync(integration.crtFile!);
    const keyContent = fs.readFileSync(integration.keyFile!);

    const accessToken = await this.getAccessToken(
      integration.clientId!,
      integration.clientSecret!,
      certContent,
      keyContent,
      'extrato.read'
    );

    const responseData = await this.fetchInterBalance(
      accessToken,
      certContent,
      keyContent,
      integration.contaBancaria?.conta,
    );

    return parseFloat(responseData.disponivel || '0');
  }

  async fetchInterCards(token: string, cert: Buffer, key: Buffer) {
    const agent = new https.Agent({ cert, key, rejectUnauthorized: false });
    const url = 'https://cdpj.partners.bancointer.com.br/cartoes/v1/cartoes';
    const response = await axios.get(url, {
      httpsAgent: agent,
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }

  async fetchInterCreditCardTransactions(token: string, cardId: string, startDate: string, endDate: string, cert: Buffer, key: Buffer) {
    const agent = new https.Agent({ cert, key, rejectUnauthorized: false });
    // Using V1 expanded transactions if possible or matching V2
    const url = `https://cdpj.partners.bancointer.com.br/cartoes/v1/cartoes/${cardId}/transacoes?dataInicio=${startDate}&dataFim=${endDate}`;
    const response = await axios.get(url, {
      httpsAgent: agent,
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }

  async getAccessToken(
    clientId: string,
    clientSecret: string,
    cert: Buffer,
    key: Buffer,
    scope: string = 'extrato.read'
  ): Promise<string> {
    const agent = new https.Agent({
      cert: cert,
      key: key,
      rejectUnauthorized: false,
    });

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('scope', scope);
    params.append('grant_type', 'client_credentials');

    try {
      const response = await axios.post(this.INTER_AUTH_URL, params, {
        httpsAgent: agent,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      return response.data.access_token;
    } catch (error) {
      if (error.response) {
        console.error('Inter Auth Error Response:', JSON.stringify(error.response.data));
        throw new BadRequestException(
          `Falha ao autenticar com Banco Inter: ${error.response.data?.title || error.message} (${error.response.status})`,
        );
      }
      throw new BadRequestException(
        `Falha ao autenticar com Banco Inter: ${error.message}`,
      );
    }
  }

  async importOfx(fileBuffer: Buffer, contaId: string) {
    const ofxContent = fileBuffer.toString('utf-8');
    const transactions = this.ofxService.parseOfx(ofxContent);

    const importLog = await this.prisma.importacaoBancaria.create({
      data: {
        filename: `Upload OFX ${new Date().toISOString()}`,
        fileType: 'OFX',
        contaBancariaId: contaId,
        status: 'COMPLETED',
      },
    });

    let importedCount = 0;
    let duplicatesCount = 0;

    for (const t of transactions) {
      // TIMEZONE FIX: Use the date as parsed by OfxService (already noon UTC)
      const valor = t.amount;
      const cleanDesc = (t.descricao || '').replace(/\s+/g, ' ').trim();

      const hashDateStr = t.date.toISOString().split('T')[0];
      const hash = `OFX-${hashDateStr}-${t.type}-${t.id}-${t.amount}-${cleanDesc.substring(0, 50)}`;

      const exists = await this.prisma.extratoBancario.findUnique({
        where: { hash },
      });

      if (!exists) {
        await this.prisma.extratoBancario.create({
          data: {
            data: t.date,
            descricao: cleanDesc,
            valor: Math.abs(valor),
            tipo: valor < 0 ? 'DEBIT' : 'CREDIT',
            hash: hash,
            conciliado: false,
            importacaoId: importLog.id,
          },
        });
        importedCount++;
      } else {
        duplicatesCount++;
      }
    }

    return {
      success: true,
      imported: importedCount,
      duplicates: duplicatesCount,
      message: `Importação concluída: ${importedCount} novos, ${duplicatesCount} duplicados.`,
    };
  }

  private async fetchInterStatements(
    token: string,
    dataInicio: string,
    dataFim: string,
    cert: Buffer,
    key: Buffer,
    pagina: number = 0,
    accountNumber?: string | null,
  ) {
    const agent = new https.Agent({ cert, key, rejectUnauthorized: false });

    // Inter V2 API Pagination: pagina (starting at 0) and tamanhoPagina (max 1000)
    const url = `${this.INTER_API_URL}?dataInicio=${dataInicio}&dataFim=${dataFim}&pagina=${pagina}&tamanhoPagina=1000`;

    const headers: any = {
      Authorization: `Bearer ${token}`,
    };

    if (accountNumber) {
      headers['x-inter-conta-corrente'] = accountNumber;
    }

    const response = await axios.get(url, {
      httpsAgent: agent,
      headers: headers,
    });

    return response.data;
  }

  private async fetchInterBalance(
    token: string,
    cert: Buffer,
    key: Buffer,
    accountNumber?: string | null,
  ) {
    const agent = new https.Agent({ cert, key, rejectUnauthorized: false });
    const url = this.INTER_SALDO_URL;

    const headers: any = {
      Authorization: `Bearer ${token}`,
    };

    if (accountNumber) {
      headers['x-inter-conta-corrente'] = accountNumber;
    }

    const response = await axios.get(url, {
      httpsAgent: agent,
      headers: headers,
    });

    return response.data;
  }
}
