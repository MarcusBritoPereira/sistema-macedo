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
  params.append('scope', 'extrato.read');
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

  // Check Balance
  console.log('\n--- Fetching BALANCE ---');
  const urlBalance = `https://cdpj.partners.bancointer.com.br/banking/v2/saldo`;

  const resBalance = await axios.get(urlBalance, {
    httpsAgent: agent,
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Balance:', JSON.stringify(resBalance.data, null, 2));
}

main().catch((err) => console.error(err));
