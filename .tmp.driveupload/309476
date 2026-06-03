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

  // Auth with PIX scope
  const params = new URLSearchParams();
  params.append('client_id', integration!.clientId!);
  params.append('client_secret', integration!.clientSecret!);
  params.append('scope', 'extrato.read pix.read'); // pix.read for received pix
  params.append('grant_type', 'client_credentials');

  console.log('Authenticating with extrato.read and pix.read...');
  try {
    const authRes = await axios.post(
      'https://cdpj.partners.bancointer.com.br/oauth/v2/token',
      params,
      {
        httpsAgent: agent,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );
    const token = authRes.data.access_token;
    console.log('Auth successful.');

    const inicio = new Date('2026-01-26T00:00:00Z').toISOString();
    const fim = new Date('2026-01-28T23:59:59Z').toISOString();

    console.log(
      `\n--- [PIX] Fetching RECEIVED PIX from ${inicio} to ${fim} ---`,
    );
    const urlPix = `https://cdpj.partners.bancointer.com.br/pix/v2/pix?inicio=${inicio}&fim=${fim}`;

    const resPix = await axios.get(urlPix, {
      httpsAgent: agent,
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`Pix Received count: ${resPix.data.pix?.length || 0}`);
    if (resPix.data.pix?.length > 0) {
      console.log('Sample Pix:', JSON.stringify(resPix.data.pix[0], null, 2));
    }
  } catch (e: any) {
    console.error('Pix API Error:', e.response?.data || e.message);
  }
}

main().catch((err) => console.error(err));
