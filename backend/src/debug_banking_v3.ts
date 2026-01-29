
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as https from 'https';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const accountId = 'c92621b6-06e0-422e-bb24-fb45be78879b';
    const integration = await prisma.integracaoBancaria.findUnique({
        where: { contaBancariaId: accountId }
    });

    const certContent = fs.readFileSync(integration!.crtFile!);
    const keyContent = fs.readFileSync(integration!.keyFile!);
    const agent = new https.Agent({ cert: certContent, key: keyContent, rejectUnauthorized: false });

    // Auth
    const params = new URLSearchParams();
    params.append('client_id', integration!.clientId!);
    params.append('client_secret', integration!.clientSecret!);
    params.append('scope', 'extrato.read');
    params.append('grant_type', 'client_credentials');

    const authRes = await axios.post('https://cdpj.partners.bancointer.com.br/oauth/v2/token', params, {
        httpsAgent: agent,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const token = authRes.data.access_token;

    // Try ENRICHED extract
    const dataInicio = '2026-01-24';
    const dataFim = '2026-01-28';

    console.log(`\n--- Fetching ENRICHED from ${dataInicio} to ${dataFim} ---`);
    const urlEnriched = `https://cdpj.partners.bancointer.com.br/banking/v2/extrato/enriquecido?dataInicio=${dataInicio}&dataFim=${dataFim}`;

    try {
        const resEnriched = await axios.get(urlEnriched, {
            httpsAgent: agent,
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`Enriched returned ${resEnriched.data.transacoes?.length || 0} items.`);
        if (resEnriched.data.transacoes?.length > 0) {
            console.log('Sample Enriched Item (First):', JSON.stringify(resEnriched.data.transacoes[0], null, 2));
            console.log('Sample Enriched Item (Last):', JSON.stringify(resEnriched.data.transacoes.slice(-1)[0], null, 2));
        }
    } catch (e: any) {
        console.log('Enriched failed or not supported:', e.message);
        if (e.response) console.log(e.response.data);
    }

    // Standard extract again for safety check
    console.log(`\n--- Fetching STANDARD from ${dataInicio} to ${dataFim} ---`);
    const urlStd = `https://cdpj.partners.bancointer.com.br/banking/v2/extrato?dataInicio=${dataInicio}&dataFim=${dataFim}`;
    const resStd = await axios.get(urlStd, {
        httpsAgent: agent,
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`Standard returned ${resStd.data.transacoes?.length || 0} items.`);
    if (resStd.data.transacoes?.length > 0) {
        const last = resStd.data.transacoes.slice(-1)[0];
        console.log('Last Standard Item:', JSON.stringify(last, null, 2));
    }
}

main().catch(err => console.error(err));
