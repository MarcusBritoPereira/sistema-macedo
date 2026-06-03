import { Test, TestingModule } from '@nestjs/testing';
import { OfxService } from './ofx.service';

describe('OfxService', () => {
  let service: OfxService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OfxService],
    }).compile();

    service = module.get<OfxService>(OfxService);
  });

  it('should successfully parse a standard OFX with standard closing tags', () => {
    const ofxContent = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKTRANLIST>
<DTSTART>20260501120000
<DTEND>20260519120000
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260519120000[-3:BRT]
<TRNAMT>-150,00
<FITID>tx-001
<CHECKNUM>001
<MEMO>Tarifa Mensal de Servicos
<NAME>BANCO INTER S.A.
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260518120000
<TRNAMT>500.00
<FITID>tx-002
<NAME>PIX RECEBIDO DE MARIA
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
    `;

    const txs = service.parseOfx(ofxContent);
    expect(txs.length).toBe(2);

    expect(txs[0]).toEqual({
      id: 'tx-001',
      date: new Date(Date.UTC(2026, 4, 19, 12, 0, 0)),
      amount: -150.00,
      type: 'DEBIT',
      descricao: 'BANCO INTER S.A.',
      rawMemo: 'Tarifa Mensal de Servicos',
      rawName: 'BANCO INTER S.A.',
    });

    expect(txs[1]).toEqual({
      id: 'tx-002',
      date: new Date(Date.UTC(2026, 4, 18, 12, 0, 0)),
      amount: 500.00,
      type: 'CREDIT',
      descricao: 'MARIA',
      rawMemo: '',
      rawName: 'PIX RECEBIDO DE MARIA',
    });
  });

  it('should robustly parse OFX without closing </STMTTRN> tags (SGML implicit closing)', () => {
    const ofxContent = `
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260515120000
<TRNAMT>-100.50
<FITID>tx-003
<NAME>PAGTO FORNECEDOR ABC
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260516120000
<TRNAMT>1500,75
<FITID>tx-004
<NAME>Transferência Recebida Joao
    `;

    const txs = service.parseOfx(ofxContent);
    expect(txs.length).toBe(2);

    expect(txs[0].id).toBe('tx-003');
    expect(txs[0].amount).toBe(-100.50);
    expect(txs[0].descricao).toBe('FORNECEDOR ABC');

    expect(txs[1].id).toBe('tx-004');
    expect(txs[1].amount).toBe(1500.75);
    expect(txs[1].descricao).toBe('JOAO');
  });

  it('should parse lowercase tags and attributes inside lines', () => {
    const ofxContent = `
<stmttrn>
  <trntype>credit</trntype>
  <dtposted>2026-05-17
  <trnamt>100.00+
  <fitid>tx-005
  <name>Compra Reversao
</stmttrn>
    `;

    const txs = service.parseOfx(ofxContent);
    expect(txs.length).toBe(1);
    expect(txs[0].id).toBe('tx-005');
    expect(txs[0].amount).toBe(100.00);
    expect(txs[0].type).toBe('CREDIT');
  });

  it('should auto-generate ID if FITID is missing to prevent transaction loss', () => {
    const ofxContent = `
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260510120000
<TRNAMT>-30.00
<NAME>SAQUE BANCO24HORAS
</STMTTRN>
    `;

    const txs = service.parseOfx(ofxContent);
    expect(txs.length).toBe(1);
    expect(txs[0].id).toBeDefined();
    expect(txs[0].id.startsWith('gen-')).toBe(true);
    expect(txs[0].amount).toBe(-30.00);
  });
});
