import { Injectable } from '@nestjs/common';

@Injectable()
export class OfxService {
  constructor() {}

  parseOfx(ofxContent: string): any[] {
    // Simple manual parsing or use library if available.
    // For robustness without deps, regex is often used for OFX headers, but body is cleaning XML.
    // OFX is often SGML (no closing tags) or XML.
    // Requested logic: Read <MEMO> or <NAME> for beneficiary.

    const transactions: any[] = [];
    const lines = ofxContent.split('\n');
    let currentTx: any = null;
    let insideTx = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('<STMTTRN>')) {
        currentTx = {};
        insideTx = true;
      } else if (trimmed.startsWith('</STMTTRN>')) {
        if (currentTx && currentTx.id) {
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

    return transactions.map((t) => {
      // Parse Amount
      const amount = t.rawAmount
        ? parseFloat(t.rawAmount.replace(',', '.'))
        : 0;

      // Parse Date (OFX format: YYYYMMDDHHMMSS[-TZ] or YYYYMMDD)
      let date = new Date();
      if (t.rawDate && t.rawDate.length >= 8) {
        const y = parseInt(t.rawDate.substring(0, 4));
        const m = parseInt(t.rawDate.substring(4, 6)) - 1;
        const d = parseInt(t.rawDate.substring(6, 8));
        // Set to noon to avoid timezone shifting issues
        date = new Date(Date.UTC(y, m, d, 12, 0, 0));
      }

      const cleanDesc = this.cleanupDescription(
        t.name,
        t.memo,
        t.payee,
        t.payeeid,
      );

      return {
        id: t.id,
        date: date,
        amount: amount,
        type: (t.type || '').toUpperCase(),
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
      'LIQUIDACAO COBRANCA',
      'LIQ COBRANCA',
      'TITULO BAIXADO',
      'PAGAMENTO DE TITULO',
      'PIX ENVIADO',
      'PIX RECEBIDO',
      'PIX QRD',
      'PIX TRANSF',
      'PIX - ',
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
    let cleaned = candidate.toUpperCase();

    // Remove known prefixes
    for (const prefix of prefixesToRemove) {
      if (cleaned.startsWith(prefix)) {
        cleaned = cleaned.substring(prefix.length).trim();
        break; // Only remove one matching prefix
      }
    }

    // Remove leading non-alphanumeric chars (e.g. "- ", ": ", "000123 ")
    cleaned = cleaned.replace(/^[\d\-\.:\s]+/, '');

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
    // Matches <TAG>Value or <TAG>Value</TAG>
    const regex = new RegExp(`<${tag}>(.*?)($|</${tag}>)`);
    const match = line.match(regex);
    if (match) {
      target[targetKey] = match[1].trim();
    }
  }
}
