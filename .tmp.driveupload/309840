
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    const integration = await prisma.integracaoBancaria.findFirst({
        where: { status: 'CONNECTED' }
    });

    if (!integration) {
        console.error('No connected integration found.');
        return;
    }

    console.log(`Using integration for account: ${integration.contaBancariaId}`);

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

    // 2. Fetch last 7 days to get a recent transaction
    const today = new Date();
    const startLimit = new Date();
    startLimit.setDate(today.getDate() - 30); // 30 days back

    const dataInicio = startLimit.toISOString().split('T')[0];
    const dataFim = today.toISOString().split('T')[0];

    console.log(`Fetching from ${dataInicio} to ${dataFim}...`);
    const url = `https://cdpj.partners.bancointer.com.br/banking/v2/extrato?dataInicio=${dataInicio}&dataFim=${dataFim}&tamanhoPagina=50`;

    const response = await axios.get(url, {
        httpsAgent: agent,
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const trans = response.data.transacoes || [];
    console.log(`\nFound ${trans.length} transactions.`);

    if (trans.length > 0) {
        console.log('\n--- FULL TRANSACTION OBJECT (First Item) ---');
        console.log(JSON.stringify(trans[0], null, 2));
    } else {
        console.log('No transactions found in this period.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
