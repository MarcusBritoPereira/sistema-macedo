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
import { CryptoService } from '../../shared/crypto.service';

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
    private cryptoService: CryptoService,
  ) {
    // Ensure secure directory exists
    if (!fs.existsSync(this.CERTS_DIR)) {
      fs.mkdirSync(this.CERTS_DIR, { recursive: true });
    }
  }

  // Roda todos os dias às 06:00 da manhã no fuso local
  @Cron('0 6 * * *')
  async handleDailySync() {
    console.log('[Cron] Iniciando rotina de sincronização bancária diária...');
    try {
      const integrations = await this.prisma.integracaoBancaria.findMany({
        where: { status: 'CONNECTED' },
      });

      for (const integration of integrations) {
        console.log(`[Cron] Sincronizando conta: ${integration.contaBancariaId}`);
        try {
          await this.syncStatements(integration.contaBancariaId);
          console.log(`[Cron] Sucesso ao sincronizar conta: ${integration.contaBancariaId}`);
        } catch (error) {
          console.error(`[Cron] Erro ao sincronizar conta: ${integration.contaBancariaId}`, error.message || error);
        }
      }
      console.log('[Cron] Rotina de sincronização bancária finalizada.');
    } catch (error) {
      console.error('[Cron] Falha ao executar rotina de sincronização bancária:', error);
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
        updateData.clientId = this.cryptoService.encrypt(dto.clientId);
      }

      if (dto.clientSecret && dto.clientSecret !== '******') {
        updateData.clientSecret = this.cryptoService.encrypt(dto.clientSecret);
      }

      if (dto.dataInicioAutomacao) {
        updateData.dataInicioAutomacao = new Date(dto.dataInicioAutomacao);
      } else if (dto.dataInicioAutomacao === '') {
        updateData.dataInicioAutomacao = null;
      }

      if ((dto as any).apiKey && (dto as any).apiKey !== '******') {
        updateData.apiKey = this.cryptoService.encrypt((dto as any).apiKey);
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
      dataInicioAutomacao: integration.dataInicioAutomacao,
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
        this.tryDecrypt(integration.clientId!),
        this.tryDecrypt(integration.clientSecret!),
        certContent,
        keyContent,
      );

      log('[Sync] Authenticated. Fetching pages...');

      // Range: Use dataInicioAutomacao if configured, fallback to 60 days to cover a full history and within the 90-day bank limit
      const today = new Date();
      let startLimit = new Date();
      if (integration.dataInicioAutomacao) {
        startLimit = new Date(integration.dataInicioAutomacao);
      } else {
        startLimit.setDate(today.getDate() - 60);
      }

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
      this.tryDecrypt(integration.clientId!),
      this.tryDecrypt(integration.clientSecret!),
      certContent,
      keyContent,
      'extrato.read',
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
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }

  async fetchInterCreditCardTransactions(
    token: string,
    cardId: string,
    startDate: string,
    endDate: string,
    cert: Buffer,
    key: Buffer,
  ) {
    const agent = new https.Agent({ cert, key, rejectUnauthorized: false });
    // Using V1 expanded transactions if possible or matching V2
    const url = `https://cdpj.partners.bancointer.com.br/cartoes/v1/cartoes/${cardId}/transacoes?dataInicio=${startDate}&dataFim=${endDate}`;
    const response = await axios.get(url, {
      httpsAgent: agent,
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }

  async getAccessToken(
    clientId: string,
    clientSecret: string,
    cert: Buffer,
    key: Buffer,
    scope: string = 'extrato.read',
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
        console.error(
          'Inter Auth Error Response:',
          JSON.stringify(error.response.data),
        );
        throw new BadRequestException(
          `Falha ao autenticar com Banco Inter: ${error.response.data?.title || error.message} (${error.response.status})`,
        );
      }
      throw new BadRequestException(
        `Falha ao autenticar com Banco Inter: ${error.message}`,
      );
    }
  }

  private tryDecrypt(value: string): string {
    try {
      return this.cryptoService.decrypt(value);
    } catch {
      return value;
    }
  }

  async importOfx(fileBuffer: Buffer, contaId: string) {
    // Smart encoding detection (UTF-8 with fatal flag first, fallback to Windows-1252)
    let ofxContent = '';
    try {
      const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
      ofxContent = utf8Decoder.decode(fileBuffer);
    } catch {
      const winDecoder = new TextDecoder('windows-1252');
      ofxContent = winDecoder.decode(fileBuffer);
    }

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

      let dateObj = t.date;
      if (!dateObj || isNaN(dateObj.getTime())) {
        dateObj = new Date();
      }

      const hashDateStr = dateObj.toISOString().split('T')[0];
      const hash = `OFX-${hashDateStr}-${t.type}-${t.id}-${t.amount}-${cleanDesc.substring(0, 50)}`;

      const exists = await this.prisma.extratoBancario.findUnique({
        where: { hash },
      });

      if (!exists) {
        await this.prisma.extratoBancario.create({
          data: {
            data: dateObj,
            descricao: cleanDesc,
            valor: Math.abs(valor),
            tipo: valor < 0 ? 'DEBIT' : 'CREDIT',
            hash: hash,
            conciliado: false,
            importacaoId: importLog.id,
            fitid: t.id,
            sourceType: 'OFX',
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

  async importCsv(fileBuffer: Buffer, contaId: string) {
    // 1. Decode buffer using smart encoding detection (UTF-8 with fatal flag first, fallback to Windows-1252)
    let csvContent = '';
    try {
      const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
      csvContent = utf8Decoder.decode(fileBuffer);
    } catch {
      const winDecoder = new TextDecoder('windows-1252');
      csvContent = winDecoder.decode(fileBuffer);
    }

    // 2. Parse lines
    const rawLines = csvContent.split(/\r?\n/);
    const cleanedLines = rawLines
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (cleanedLines.length === 0) {
      throw new BadRequestException('O arquivo CSV está vazio.');
    }

    // 3. Detect Separator (check first line or a line containing semicolons/commas)
    // Excel in Portuguese uses semicolons
    let sep = ',';
    const sampleLine = cleanedLines[0];
    const semicolonCount = (sampleLine.match(/;/g) || []).length;
    const commaCount = (sampleLine.match(/,/g) || []).length;
    if (semicolonCount > commaCount) {
      sep = ';';
    }

    // Helper: Split CSV row taking care of quotes
    const splitCsvLine = (line: string, separator: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === separator && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result.map((val) => {
        if (val.startsWith('"') && val.endsWith('"')) {
          return val.slice(1, -1).trim();
        }
        return val;
      });
    };

    // Helper: Parse Date (noon UTC to avoid TZ day shift)
    const parseBrazilianDate = (dateStr: string): Date | null => {
      if (!dateStr) return null;
      const cleaned = dateStr.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        const d = new Date(`${cleaned}T12:00:00Z`);
        return isNaN(d.getTime()) ? null : d;
      }
      const match = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
      if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const year = parseInt(match[3], 10);
        return new Date(Date.UTC(year, month, day, 12, 0, 0));
      }
      const matchShort = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/);
      if (matchShort) {
        const day = parseInt(matchShort[1], 10);
        const month = parseInt(matchShort[2], 10) - 1;
        let year = parseInt(matchShort[3], 10);
        year += year < 50 ? 2000 : 1900;
        return new Date(Date.UTC(year, month, day, 12, 0, 0));
      }
      const parsed = new Date(cleaned);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    // Helper: Parse Value
    const parseBrazilianValue = (valStr: string): number | null => {
      if (!valStr) return null;
      let cleaned = valStr.trim().replace('R$', '').replace(/\s+/g, '');
      if (cleaned === '' || cleaned === '-') return null;
      let isNegative = false;
      if (cleaned.endsWith('-')) {
        isNegative = true;
        cleaned = cleaned.slice(0, -1);
      }
      if (cleaned.startsWith('-')) {
        isNegative = true;
        cleaned = cleaned.slice(1);
      }
      if (cleaned.startsWith('+')) {
        cleaned = cleaned.slice(1);
      }
      const hasComma = cleaned.includes(',');
      const hasDot = cleaned.includes('.');
      if (hasComma && hasDot) {
        if (cleaned.indexOf('.') < cleaned.indexOf(',')) {
          cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else {
          cleaned = cleaned.replace(/,/g, '');
        }
      } else if (hasComma) {
        cleaned = cleaned.replace(',', '.');
      }
      const numValue = parseFloat(cleaned);
      if (isNaN(numValue)) return null;
      return isNegative ? -numValue : numValue;
    };

    // 4. Find the header row dynamically
    let headerIdx = -1;
    let colMap = {
      dateIdx: -1,
      descIdx: -1,
      valueIdx: -1,
      typeIdx: -1,
      creditIdx: -1,
      debitIdx: -1,
    };

    for (let i = 0; i < cleanedLines.length; i++) {
      const cols = splitCsvLine(cleanedLines[i], sep);
      const normalizedCols = cols.map((c) =>
        c
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim(),
      );

      const hasDate = normalizedCols.some(
        (c) =>
          c.includes('data') || c.includes('date') || c === 'dt' || c === 'dt.',
      );
      const hasValue = normalizedCols.some(
        (c) =>
          c === 'valor' ||
          c === 'value' ||
          c === 'amount' ||
          c.includes('valor (') ||
          c === 'val' ||
          c.includes('lancamento') ||
          c === 'entrada' ||
          c === 'saida' ||
          c.includes('credito') ||
          c.includes('debito'),
      );

      if (hasDate && hasValue) {
        headerIdx = i;
        for (let j = 0; j < normalizedCols.length; j++) {
          const col = normalizedCols[j];
          if (
            col.includes('data') ||
            col.includes('date') ||
            col === 'dt' ||
            col === 'dt.'
          ) {
            colMap.dateIdx = j;
          } else if (
            col.includes('descricao') ||
            col.includes('historico') ||
            col.includes('detalhe') ||
            col.includes('description') ||
            col.includes('motivo')
          ) {
            colMap.descIdx = j;
          } else if (
            col === 'valor' ||
            col === 'value' ||
            col === 'amount' ||
            col.includes('valor (') ||
            col === 'val' ||
            col.includes('lancamento')
          ) {
            colMap.valueIdx = j;
          } else if (
            col === 'tipo' ||
            col === 'type' ||
            col === 'c/d' ||
            col.includes('operacao')
          ) {
            colMap.typeIdx = j;
          } else if (col === 'entrada' || col.includes('credito')) {
            colMap.creditIdx = j;
          } else if (col === 'saida' || col.includes('debito')) {
            colMap.debitIdx = j;
          }
        }
        break;
      }
    }

    if (headerIdx === -1) {
      colMap = {
        dateIdx: 0,
        descIdx: 1,
        valueIdx: 2,
        typeIdx: 3,
        creditIdx: -1,
        debitIdx: -1,
      };
      headerIdx = -1;
    }

    const startRowIdx = headerIdx + 1;
    const parsedTransactions: Array<{
      date: Date;
      description: string;
      value: number;
      type: 'DEBIT' | 'CREDIT';
    }> = [];

    for (let i = startRowIdx; i < cleanedLines.length; i++) {
      const cols = splitCsvLine(cleanedLines[i], sep);
      if (
        cols.length <= Math.max(colMap.dateIdx, colMap.descIdx, colMap.valueIdx)
      ) {
        continue;
      }

      const rawDate = cols[colMap.dateIdx];
      const parsedDate = parseBrazilianDate(rawDate);
      if (!parsedDate) continue;

      const description =
        colMap.descIdx !== -1 ? cols[colMap.descIdx] : 'Lançamento CSV';

      let value = 0;
      let isDebit = false;

      if (colMap.creditIdx !== -1 && colMap.debitIdx !== -1) {
        const credVal = parseBrazilianValue(cols[colMap.creditIdx]);
        const debVal = parseBrazilianValue(cols[colMap.debitIdx]);
        if (credVal !== null && credVal !== 0) {
          value = Math.abs(credVal);
          isDebit = false;
        } else if (debVal !== null && debVal !== 0) {
          value = Math.abs(debVal);
          isDebit = true;
        } else {
          continue;
        }
      } else {
        const val = parseBrazilianValue(cols[colMap.valueIdx]);
        if (val === null) continue;
        value = val;

        if (colMap.typeIdx !== -1) {
          const typeStr = cols[colMap.typeIdx].toUpperCase().trim();
          if (
            typeStr.startsWith('D') ||
            typeStr.includes('SAIDA') ||
            typeStr.includes('DEBIT')
          ) {
            isDebit = true;
          } else if (
            typeStr.startsWith('C') ||
            typeStr.includes('ENTRADA') ||
            typeStr.includes('CREDIT')
          ) {
            isDebit = false;
          } else {
            isDebit = value < 0;
          }
        } else {
          isDebit = value < 0;
        }
      }

      parsedTransactions.push({
        date: parsedDate,
        description: description || 'Lançamento Sem Descrição',
        value: Math.abs(value),
        type: isDebit ? 'DEBIT' : 'CREDIT',
      });
    }

    if (parsedTransactions.length === 0) {
      throw new BadRequestException(
        'Nenhuma transação válida foi encontrada no arquivo CSV.',
      );
    }

    const importLog = await this.prisma.importacaoBancaria.create({
      data: {
        filename: `Upload CSV ${new Date().toISOString()}`,
        fileType: 'CSV',
        contaBancariaId: contaId,
        status: 'COMPLETED',
      },
    });

    let importedCount = 0;
    let duplicatesCount = 0;

    for (const t of parsedTransactions) {
      const cleanDesc = t.description.replace(/\s+/g, ' ').trim();
      const hashDateStr = t.date.toISOString().split('T')[0];
      const signVal = t.type === 'DEBIT' ? -t.value : t.value;
      const hash = `CSV-${hashDateStr}-${t.type}-${signVal}-${cleanDesc.substring(0, 50)}`;

      const exists = await this.prisma.extratoBancario.findUnique({
        where: { hash },
      });

      if (!exists) {
        await this.prisma.extratoBancario.create({
          data: {
            data: t.date,
            descricao: cleanDesc,
            valor: t.value,
            tipo: t.type as any,
            hash: hash,
            conciliado: false,
            importacaoId: importLog.id,
            sourceType: 'CSV',
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
