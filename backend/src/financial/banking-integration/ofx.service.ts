import { Injectable } from '@nestjs/common';

@Injectable()
export class OfxService {
  constructor() {}

  parseOfx(ofxContent: string): any[] {
    const transactions: any[] = [];
    
    // Normalize line endings to facilitate parsing
    const normalizedContent = ofxContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedContent.split('\n');
    let currentTx: any = null;
    let insideTx = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const upperTrimmed = trimmed.toUpperCase();

      if (upperTrimmed.includes('<STMTTRN>')) {
        // If there's an existing currentTx, push it first (implicit close in SGML)
        if (currentTx) {
          if (!currentTx.id) {
            currentTx.id = `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          }
          transactions.push(currentTx);
        }
        currentTx = {};
        insideTx = true;
      } else if (upperTrimmed.includes('</STMTTRN>')) {
        if (currentTx) {
          if (!currentTx.id) {
            currentTx.id = `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          }
          transactions.push(currentTx);
        }
        insideTx = false;
        currentTx = null;
      } else if (insideTx && currentTx) {
        this.extractField(trimmed, 'TRNTYPE', currentTx, 'type');
        this.extractField(trimmed, 'DTPOSTED', currentTx, 'rawDate');
        this.extractField(trimmed, 'TRNAMT', currentTx, 'rawAmount');
        this.extractField(trimmed, 'FITID', currentTx, 'id');
        this.extractField(trimmed, 'CHECKNUM', currentTx, 'checkNum');
        this.extractField(trimmed, 'MEMO', currentTx, 'memo');
        this.extractField(trimmed, 'NAME', currentTx, 'name');
        this.extractField(trimmed, 'PAYEE', currentTx, 'payee');
        this.extractField(trimmed, 'PAYEEID', currentTx, 'payeeid');
      }
    }

    // Push the last one if file ended without closing tag
    if (currentTx) {
      if (!currentTx.id) {
        currentTx.id = `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      transactions.push(currentTx);
    }

    return transactions.map((t) => {
      // Parse Amount
      let amount = 0;
      if (t.rawAmount) {
        let cleanedAmt = t.rawAmount.trim();
        // Handle trailing signs
        if (cleanedAmt.endsWith('-')) {
          cleanedAmt = '-' + cleanedAmt.slice(0, -1);
        } else if (cleanedAmt.endsWith('+')) {
          cleanedAmt = cleanedAmt.slice(0, -1);
        }
        
        // Handle decimals and thousands separator
        if (cleanedAmt.includes(',') && cleanedAmt.includes('.')) {
          if (cleanedAmt.indexOf(',') > cleanedAmt.indexOf('.')) {
            cleanedAmt = cleanedAmt.replace(/\,/g, '');
          } else {
            cleanedAmt = cleanedAmt.replace(/\./g, '').replace(',', '.');
          }
        } else if (cleanedAmt.includes(',')) {
          cleanedAmt = cleanedAmt.replace(',', '.');
        }
        amount = parseFloat(cleanedAmt);
        if (isNaN(amount)) amount = 0;
      }

      // Parse Date (OFX format: YYYYMMDDHHMMSS[-TZ] or YYYYMMDD)
      let date = new Date();
      if (t.rawDate) {
        const cleanedDate = t.rawDate.replace(/\D/g, ''); // strip non-digits
        if (cleanedDate.length >= 8) {
          const y = parseInt(cleanedDate.substring(0, 4), 10);
          const m = parseInt(cleanedDate.substring(4, 6), 10) - 1;
          const d = parseInt(cleanedDate.substring(6, 8), 10);
          // Set to noon to avoid timezone shifting issues
          date = new Date(Date.UTC(y, m, d, 12, 0, 0));
        }
      }

      const cleanDesc = this.cleanupDescription(
        t.name,
        t.memo,
        t.payee,
        t.payeeid,
      );

      const isCredit = (t.type || '').toUpperCase() === 'CREDIT' || 
                       (t.type || '').toUpperCase() === 'DEP' || 
                       amount >= 0;

      return {
        id: t.id,
        date: date,
        amount: amount,
        type: isCredit ? 'CREDIT' : 'DEBIT',
        descricao: cleanDesc,
        rawMemo: t.memo || t.payee || '',
        rawName: t.name || t.payeeid || '',
      };
    });
  }

  private cleanupDescription(
    name: string | undefined,
    memo: string | undefined,
    payee: string | undefined,
    payeeid: string | undefined,
  ): string {
    const n = (name || '').trim();
    const m = (memo || '').trim();
    const p = (payee || payeeid || '').trim(); // Fallback cascade
    const nUpper = n.toUpperCase();

    // 1. Identify if Name is too generic
    const genericPrefixes = [
      'PAGAMENTO',
      'PAGTO',
      'PGTO',
      'PAG ',
      'ENVIO',
      'TED',
      'DOC',
      'TRANSF',
      'COMPRA',
      'DEBITO',
      'SAQUE',
      'EXTRATO',
      'SALDO',
      'LANCAMENTO',
      'RESGATE',
      'APLICACAO',
      'LIQUIDACAO',
      'TITULO',
      'COBRANCA',
      'CREDITO',
      'DEP',
      'DEPOSITO',
      'PIX',
      'TARIFA',
    ];

    // Specific noise to strip to find the real entity
    const prefixesToRemove = [
      'PAGAMENTO DE BOLETO',
      'PAGAMENTO BOLETO',
      'PAG BOLETO',
      'PAG. BOLETO',
      'PGTO TITULO',
      'PGTO TIT',
      'PAGAMENTO CONTA',
      'PGTO CONTA',
      'ENVIO TED',
      'DOC ELET',
      'TED D',
      'COMPRA CARTAO',
      'COMPRA ELO',
      'COMPRA VISA',
      'COMPRA MC',
      'DEB VISA',
      'DEB MASTER',
      'DEBITO AUTOMATICO',
      'DEB AUT',
      'TRANSFERENCIA PARA',
      'TRANSF. PARA',
      'TRANSFERENCIA RECEBIDA',
      'TRANSF RECEBIDA',
      'LIQUIDACAO COBRANCA',
      'LIQ COBRANCA',
      'TITULO BAIXADO',
      'PAGAMENTO DE TITULO',
      'PIX ENVIADO',
      'PIX RECEBIDO',
      'PIX QRD',
      'PIX TRANSF',
      'PIX - ',
      'PAGTO ',
      'PAGAMENTO ',
      'PGTO ',
      'PAG ',
    ];

    let candidate = n;

    // Strategy: If name starts with generic term (or is very short), try Payee first, then Memo.
    const nameIsGeneric =
      genericPrefixes.some((pref) => nUpper.includes(pref)) || n.length < 5;

    if (nameIsGeneric) {
      if (p.length > 2 && /[a-zA-Z]/.test(p)) {
        candidate = p; // Prefer PAYEE tag if it exists and has letters
      } else if (
        m.length > 2 &&
        m.toUpperCase() !== nUpper &&
        /[a-zA-Z]/.test(m)
      ) {
        // For some banks (like Inter), they append the beneficiary name to the memo after a specific keyword or dash.
        const memoParts = m.split(/ - | PARA |:/);
        if (memoParts.length > 1) {
          candidate = memoParts[memoParts.length - 1].trim(); // Get the last part typically the name
        } else {
          candidate = m; // Fallback to full memo
        }
      }
    }

    // 2. Cleaning the chosen candidate
    let cleaned = candidate
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();

    // Remove known prefixes
    for (const prefix of prefixesToRemove) {
      if (cleaned.startsWith(prefix)) {
        cleaned = cleaned.substring(prefix.length).trim();
        break; // Only remove one matching prefix
      }
    }

    // Remove leading prepositions (DE, DO, DA, PARA, EM, A) and non-alphanumeric noise
    cleaned = cleaned.replace(/^(DE|DO|DA|PARA|EM|A)\s+/g, '').trim();
    cleaned = cleaned.replace(/^[\d\-\.:\s]+/g, '').trim();
    cleaned = cleaned.replace(/^(DE|DO|DA|PARA|EM|A)\s+/g, '').trim(); // run once more just in case

    // 3. Fallback: If we stripped perfectly good info or it became empty, combine
    if (cleaned.length < 3) {
      const combined = `${n} ${m}`.trim();
      if (combined.length > cleaned.length) return combined;
    }

    return cleaned || n || m || 'Sem descrição';
  }

  private extractField(
    line: string,
    tag: string,
    target: any,
    targetKey: string,
  ) {
    const regex = new RegExp(`<${tag}>([^<\\n\\r]*)`, 'i');
    const match = line.match(regex);
    if (match) {
      target[targetKey] = match[1].trim();
    }
  }
}
