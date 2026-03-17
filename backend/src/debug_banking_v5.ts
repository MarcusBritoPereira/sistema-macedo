import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as https from 'https';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const accountId = 'c92621b6-06e0-422e-bb24-fb45be78879b';
  const integration = await prisma.integracaoBancaria.findUnique({
    where: { contaBancariaId: accountId },
  });

  const certContent = fs.readFileSync(integration!.crtFile!);
  const keyContent = fs.readFileSync(integration!.keyFile!);
  const agent = new https.Agent({
    cert: certContent,
    key: keyContent,
    rejectUnauthorized: false,
  });

  // Auth
  const params = new URLSearchParams();
  params.append('client_id', integration!.clientId!);
  params.append('client_secret', integration!.clientSecret!);
  params.append('scope', 'extrato.read saldo.read'); // Added saldo.read just in case
  params.append('grant_type', 'client_credentials');

  const authRes = await axios.post(
    'https://cdpj.partners.bancointer.com.br/oauth/v2/token',
    params,
    {
      httpsAgent: agent,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    },
  );
  const token = authRes.data.access_token;

  const dataInicio = '2026-01-26';
  const dataFim = '2026-01-28';

  console.log(`\n--- [DEBUG] Testing Jan 26-28 with various approaches ---`);

  // 1. Try to find the account number in the BALANCE response headers or body
  const resBalance = await axios.get(
    'https://cdpj.partners.bancointer.com.br/banking/v2/saldo',
    {
      httpsAgent: agent,
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  console.log('Balance Body:', JSON.stringify(resBalance.data, null, 2));

  // 2. Try to fetch transactions for Jan 26-28 again
  const urlStd = `https://cdpj.partners.bancointer.com.br/banking/v2/extrato?dataInicio=${dataInicio}&dataFim=${dataFim}`;
  const resStd = await axios.get(urlStd, {
    httpsAgent: agent,
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(
    `Standard Extract (Jan 26-28) count: ${resStd.data.transacoes?.length || 0}`,
  );

  // if empty, try to fetch the WHOLE MONTH to see if they are shifted or have different dataEntrada
  const urlMonth = `https://cdpj.partners.bancointer.com.br/banking/v2/extrato?dataInicio=2026-01-01&dataFim=2026-01-28&tamanhoPagina=1000`;
  const resMonth = await axios.get(urlMonth, {
    httpsAgent: agent,
    headers: { Authorization: `Bearer ${token}` },
  });
  const recent =
    resMonth.data.transacoes?.filter(
      (t: any) => t.dataEntrada >= '2026-01-25',
    ) || [];
  console.log(
    `Total transactions in Jan: ${resMonth.data.transacoes?.length || 0}`,
  );
  console.log(`Transactions on/after Jan 25: ${recent.length}`);
  if (recent.length > 0) {
    console.log(
      'Details of items on/after 25th:',
      JSON.stringify(recent, null, 2),
    );
  }

  // 3. Try to use a common mistake: account number in header x-inter-conta-corrente
  // But we don't know it. The user might have it.
}

main().catch((err) => {
  console.error('API Error:', err.response?.data || err.message);
});
