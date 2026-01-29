
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as https from 'https';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const accountId = 'c92621b6-06e0-422e-bb24-fb45be78879b';
    const integration = await prisma.integracaoBancaria.findUnique({
        where: { contaBancariaId: accountId },
        include: { contaBancaria: true }
    });

    const certContent = fs.readFileSync(integration!.crtFile!);
    const keyContent = fs.readFileSync(integration!.keyFile!);
    const agent = new https.Agent({ cert: certContent, key: keyContent, rejectUnauthorized: false });

    // Auth
    const params = new URLSearchParams();
    params.append('client_id', integration!.clientId!);
    params.append('client_secret', integration!.clientSecret!);
    params.append('scope', 'extrato.read saldo.read');
    params.append('grant_type', 'client_credentials');

    const authRes = await axios.post('https://cdpj.partners.bancointer.com.br/oauth/v2/token', params, {
        httpsAgent: agent,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const token = authRes.data.access_token;

    const headers: any = { 'Authorization': `Bearer ${token}` };
    if (integration!.contaBancaria?.conta) {
        headers['x-inter-conta-corrente'] = integration!.contaBancaria.conta;
        console.log('Using header x-inter-conta-corrente:', integration!.contaBancaria.conta);
    }

    // 1. Balance
    const resBalance = await axios.get('https://cdpj.partners.bancointer.com.br/banking/v2/saldo', {
        httpsAgent: agent,
        headers: headers
    });
    console.log('Balance (with header):', JSON.stringify(resBalance.data, null, 2));

    // 2. Enriched Extract (Jan 24-28)
    const dataInicio = '2026-01-24';
    const dataFim = '2026-01-28';
    console.log(`\n--- Fetching ENRICHED from ${dataInicio} to ${dataFim} ---`);
    const urlEnriched = `https://cdpj.partners.bancointer.com.br/banking/v2/extrato/enriquecido?dataInicio=${dataInicio}&dataFim=${dataFim}`;

    try {
        const resEnriched = await axios.get(urlEnriched, {
            httpsAgent: agent,
            headers: headers
        });
        console.log(`Enriched returned ${resEnriched.data.transacoes?.length || 0} items.`);
        if (resEnriched.data.transacoes?.length > 0) {
            console.log('Last Enriched Item:', JSON.stringify(resEnriched.data.transacoes.slice(-1)[0], null, 2));
        }
    } catch (e: any) {
        console.log('Enriched failed:', e.message);
        if (e.response) console.log(e.response.data);
    }
}

main().catch(err => console.error(err));
