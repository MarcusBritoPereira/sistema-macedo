
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    const accountId = 'c92621b6-06e0-422e-bb24-fb45be78879b';
    const integration = await prisma.integracaoBancaria.findUnique({
        where: { contaBancariaId: accountId }
    });

    if (!integration) {
        console.error('Integration not found');
        return;
    }

    const certContent = fs.readFileSync(integration.crtFile!);
    const keyContent = fs.readFileSync(integration.keyFile!);

    const agent = new https.Agent({ cert: certContent, key: keyContent, rejectUnauthorized: false });

    // 1. Auth
    const params = new URLSearchParams();
    params.append('client_id', integration.clientId!);
    params.append('client_secret', integration.clientSecret!);
    params.append('scope', 'extrato.read');
    params.append('grant_type', 'client_credentials');

    console.log('Authenticating...');
    const authRes = await axios.post('https://cdpj.partners.bancointer.com.br/oauth/v2/token', params, {
        httpsAgent: agent,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const token = authRes.data.access_token;

    // 2. Fetch with metadata
    const today = new Date();
    const startLimit = new Date();
    startLimit.setDate(today.getDate() - 60);

    const dataInicio = startLimit.toISOString().split('T')[0];
    const dataFim = today.toISOString().split('T')[0];

    console.log(`Fetching from ${dataInicio} to ${dataFim}...`);
    const url = `https://cdpj.partners.bancointer.com.br/banking/v2/extrato?dataInicio=${dataInicio}&dataFim=${dataFim}`;

    const response = await axios.get(url, {
        httpsAgent: agent,
        headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('\n--- API Payload Metadata ---');
    const metadata = { ...response.data };
    delete metadata.transacoes;
    console.log(metadata);

    const trans = response.data.transacoes || [];
    console.log(`\nTotal Transactions in this response: ${trans.length}`);

    if (trans.length > 0) {
        console.log('\nFirst 3 Transactions:');
        trans.slice(0, 3).forEach((t: any, i: number) => {
            console.log(`${i + 1}. Date: ${t.dataEntrada} | Titulo: ${t.titulo} | Valor: ${t.valor}`);
        });

        console.log('\nLast 3 Transactions:');
        trans.slice(-3).forEach((t: any, i: number) => {
            console.log(`${trans.length - 2 + i}. Date: ${t.dataEntrada} | Titulo: ${t.titulo} | Valor: ${t.valor}`);
        });
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
