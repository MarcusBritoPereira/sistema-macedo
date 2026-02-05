import { Injectable } from '@nestjs/common';

@Injectable()
export class OfxService {

    constructor() { }

    parseOfx(ofxContent: string): any[] {
        // Simple manual parsing or use library if available.
        // For robustness without deps, regex is often used for OFX headers, but body is cleaning XML.
        // OFX is often SGML (no closing tags) or XML.
        // Requested logic: Read <MEMO> or <NAME> for beneficiary.

        const transactions: any[] = [];

        // 1. Normalize content (remove headers, fix tags)
        // This is a simplified parser for the specific requirement

        const lines = ofxContent.split('\n');
        let currentTx: any = {};
        let insideTx = false;

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('<STMTTRN>')) {
                currentTx = {};
                insideTx = true;
            } else if (trimmed.startsWith('</STMTTRN>')) {
                if (currentTx.id) {
                    transactions.push(currentTx);
                }
                insideTx = false;
            } else if (insideTx) {
                // Parse fields
                this.extractField(trimmed, 'TRNTYPE', currentTx, 'type');
                this.extractField(trimmed, 'DTPOSTED', currentTx, 'date');
                this.extractField(trimmed, 'TRNAMT', currentTx, 'amount');
                this.extractField(trimmed, 'FITID', currentTx, 'id');
                this.extractField(trimmed, 'CHECKNUM', currentTx, 'checkNum');
                this.extractField(trimmed, 'MEMO', currentTx, 'memo');
                this.extractField(trimmed, 'NAME', currentTx, 'name');
            }
        }

        return transactions.map(t => {
            // "Ao importar Boleto... ler o nome do beneficiário no XML (campo MEMO ou NAME)"
            // Improved Logic: Concatenate NAME and MEMO to ensure no info is lost, 
            // as sometimes Beneficiary is in NAME and details in MEMO, or vice versa.
            // Avoid duplicates and filter generic/empty.

            const parts = [];
            if (t.name) parts.push(t.name);
            if (t.memo && t.memo !== t.name) parts.push(t.memo);

            const fullDesc = parts.join(' - ');

            return {
                ...t,
                // If the combined description is too long, we might want to truncate, but for now full is better.
                descricao: fullDesc || 'Sem descrição',
                rawMemo: t.memo,
                rawName: t.name
            };
        });
    }

    private extractField(line: string, tag: string, target: any, targetKey: string) {
        // Matches <TAG>Value or <TAG>Value</TAG>
        const regex = new RegExp(`<${tag}>(.*?)($|</${tag}>)`);
        const match = line.match(regex);
        if (match) {
            target[targetKey] = match[1].trim();
        }
    }
}
