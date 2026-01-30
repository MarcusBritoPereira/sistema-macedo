
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const INTER_AUTH_URL = 'https://cdpj.partners.bancointer.com.br/oauth/v2/token';
const INTER_SALDO_URL = 'https://cdpj.partners.bancointer.com.br/banking/v2/saldo';

async function getAccessToken(clientId: string, clientSecret: string, cert: Buffer, key: Buffer): Promise<string> {
    const agent = new https.Agent({
        cert: cert,
        key: key,
        rejectUnauthorized: false
    });

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('scope', 'extrato.read'); // 'saldo.read' might be required? Usually 'extrato.read' or 'banking.read' covers it. Let's try 'extrato.read' first as used in service, or 'saldo.read' if available. 
    // Actually for V2 banking it is often 'boleto-cobranca.read' etc. For banking it is 'extrato.read'. 
    // To be safe let's try 'extrato.read' first as that is what the service uses.
    params.append('grant_type', 'client_credentials');

    try {
        const response = await axios.post(INTER_AUTH_URL, params, {
            httpsAgent: agent,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return response.data.access_token;
    } catch (error: any) {
        console.error('Auth Error:', error.response?.data || error.message);
        throw error;
    }
}

async function main() {
    console.log('🔍 Looking for active bank integrations...');

    // Debug: List all integrations first
    const all = await prisma.integracaoBancaria.findMany({
        include: { contaBancaria: true }
    });
    console.log('--- All Integrations ---');
    all.forEach(i => {
        console.log(`- Bank: ${i.banco}, Status: ${i.status}, Account: ${i.contaBancaria.nome}`);
    });
    console.log('------------------------');

    const integration = await prisma.integracaoBancaria.findFirst({
        where: { status: 'CONNECTED' },
        include: { contaBancaria: true }
    });

    if (!integration) {
        console.error('❌ No Banco Inter integration found (regardless of status).');
        return;
    }

    if (integration.status !== 'CONNECTED') {
        console.warn(`⚠️ Integration found but status is ${integration.status}. Attempting anyway...`);
    }

    console.log(`✅ Found integration for: ${integration.contaBancaria.nome}`);

    if (!integration.crtFile || !integration.keyFile) {
        console.error('❌ Certificate paths missing in database.');
        return;
    }

    // Adjust paths if necessary - assuming script runs from backend root
    // DB stores absolute paths usually? Let's check service logic.
    // Service: path.join(this.CERTS_DIR...
    // If paths in DB are absolute, we are good.

    if (!fs.existsSync(integration.crtFile) || !fs.existsSync(integration.keyFile)) {
        console.error(`❌ Certificates not found on disk.`);
        console.error(`CRT: ${integration.crtFile}`);
        console.error(`KEY: ${integration.keyFile}`);
        return;
    }

    const cert = fs.readFileSync(integration.crtFile);
    const key = fs.readFileSync(integration.keyFile);

    console.log('🔑 Authenticating...');
    try {
        const token = await getAccessToken(integration.clientId!, integration.clientSecret!, cert, key);
        console.log('🔓 Authenticated! Token received.');

        console.log('💰 Fetching Balance (Live)...');

        const agent = new https.Agent({ cert, key, rejectUnauthorized: false });
        const headers: any = { 'Authorization': `Bearer ${token}` };

        // Header specific for Inter if account number is needed? 
        // Service uses 'x-inter-conta-corrente' if available.
        if (integration.contaBancaria.conta) {
            headers['x-inter-conta-corrente'] = integration.contaBancaria.conta;
        }

        // Try getting balance
        // Note: For scope, if extrato.read is not enough for saldo, we might fail here.
        // But commonly checking 'saldo' requires 'extrato.read' scope in some versions.
        // Let's verify scope if it fails.

        const response = await axios.get(INTER_SALDO_URL, {
            httpsAgent: agent,
            headers: headers
        });

        console.log('\n=============================');
        console.log('💳 LIVE BALANCE RESPONSE');
        console.log('=============================');
        console.log(JSON.stringify(response.data, null, 2));
        console.log('=============================\n');

    } catch (e: any) {
        console.error('\n❌ Request Failed');
        if (e.response) {
            console.error(`Status: ${e.response.status}`);
            console.error('Data:', JSON.stringify(e.response.data, null, 2));
            if (e.response.status === 403) {
                console.log('Hint: Check API Scopes. Maybe "saldo.read" is needed?');
            }
        } else {
            console.error(e.message);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
