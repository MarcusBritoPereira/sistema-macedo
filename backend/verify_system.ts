
import { Logger } from '@nestjs/common';

const BASE_URL = 'http://localhost:3000';
const logger = new Logger('SystemVerification');

async function runVerification() {
    logger.log('🚀 Starting System Verification...');

    let token = '';

    // 1. Authentication
    try {
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@erp.com', senha: 'admin123' }),
        });

        if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.statusText}`);
        const loginData = await loginRes.json();
        token = loginData.access_token;
        logger.log('✅ Authentication - Login Provider: Success');
    } catch (error) {
        logger.error('❌ Authentication Failed', error);
        return;
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // Helper for requests
    const request = async (method: string, endpoint: string, body?: any) => {
        const res = await fetch(`${BASE_URL}/${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`${method} ${endpoint} failed (${res.status}): ${text}`);
        }
        return method === 'DELETE' ? null : res.json();
    };

    // 2. Users Module
    try {
        logger.log('Payment User - Testing CRUD...');
        // Create
        const userPayload = {
            nome: 'Test User',
            email: `testuser_${Date.now()}@erp.com`,
            senha: 'password123',
            // Assuming we need a profile ID, let's fetch one first or assume 1 if we can't search. 
            // In the seed, we have profiles. Let's try to get them first on a real scenario, but for now passing a standard one or null if optional? 
            // Looking at seed, profiles are created with IDs. We need a profileId.
            // Let's list users to get a profileId from an existing user? Or just skip user creation if too complex?
            // Actually, let's fetch profiles if there is an endpoint. If not, we might fail user creation. 
            // Checking task.md... "Users" module.
            // Let's guess we need to fetch a valid profile ID. 
            // Or maybe just skip User creation if we don't have an endpoint for profiles.
            // Let's try to fetch users and grab a profileId from the first one.
        };

        // List Users to get a profile ID
        const users = await request('GET', 'users');
        if (users.length > 0 && users[0].perfil) {
            // Update payload to use connect for relation
            const profileId = users[0].perfil.id;
            const finalUserPayload = {
                ...userPayload,
                perfil: { connect: { id: profileId } }
            };

            // Create
            const newUser = await request('POST', 'users', finalUserPayload);
            logger.log('  ✅ Create User: Success');

            // Update
            await request('PATCH', `users/${newUser.id}`, { nome: 'Test User Updated' });
            logger.log('  ✅ Update User: Success');

            // Delete
            await request('DELETE', `users/${newUser.id}`);
            logger.log('  ✅ Delete User: Success');
        } else {
            logger.warn('  ⚠️ Skipping User Create - No users/profile found to copy');
        }

    } catch (e) { logger.error(`  ❌ Users Module Error: ${e.message}`); }

    // 3. Clients Module
    try {
        logger.log('Clients Module - Testing CRUD...');
        const clientPayload = {
            razaoSocial: 'Test Client Ltd',
            nomeFantasia: 'TestClient',
            cnpj: `99${Date.now().toString().slice(-12)}`, // Fake CNPJ
            email: 'test@client.com'
        };

        // Create
        const newClient = await request('POST', 'clients', clientPayload);
        logger.log('  ✅ Create Client: Success');

        // Update (Testing PATCH)
        await request('PATCH', `clients/${newClient.id}`, { nomeFantasia: 'TestClient Updated' });
        logger.log('  ✅ Update Client (PATCH): Success');

        // Delete
        await request('DELETE', `clients/${newClient.id}`);
        logger.log('  ✅ Delete Client: Success');

    } catch (e) { logger.error(`  ❌ Clients Module Error: ${e.message}`); }

    // 4. Financial Module
    try {
        logger.log('Financial Module - Testing CRUD...');

        // Get Categories & Cost Centers
        const cats = await request('GET', 'financial/categories');
        const ccs = await request('GET', 'financial/cost-centers');

        if (cats.length > 0 && ccs.length > 0) {
            const finPayload = {
                descricao: 'Test Financial Record',
                valor: 100.50,
                vencimento: new Date().toISOString(),
                status: 'ABERTO',
                categoriaId: cats[0].id,
                centroCustoId: ccs[0].id
            };

            // Create Receivable
            const newRec = await request('POST', 'financial/receivables', finPayload);
            logger.log('  ✅ Create Receivable: Success');

            // Update
            await request('PATCH', `financial/receivables/${newRec.id}`, { valor: 200.00 });
            logger.log('  ✅ Update Receivable: Success');

            // Delete
            await request('DELETE', `financial/receivables/${newRec.id}`);
            logger.log('  ✅ Delete Receivable: Success');

        } else {
            logger.warn('  ⚠️ Skipping Financial CRUD - Missing Categories or Cost Centers');
        }

    } catch (e) { logger.error(`  ❌ Financial Module Error: ${e.message}`); }

    // 5. Contracts Module
    try {
        logger.log('Contracts Module - Testing CRUD...');

        // Need a client for contract
        const clients = await request('GET', 'clients');
        if (clients.length > 0) {
            const contractPayload = {
                descricao: 'Test Contract',
                valorMensal: 1500.00,
                dataInicio: new Date().toISOString(),
                ativo: true,
                status: 'ATIVO',
                clienteId: clients[0].id
            };

            // Create
            const newContract = await request('POST', 'contracts', contractPayload);
            logger.log('  ✅ Create Contract: Success');

            // Update
            await request('PATCH', `contracts/${newContract.id}`, { descricao: 'Test Contract Updated' });
            logger.log('  ✅ Update Contract: Success');

            // Delete
            await request('DELETE', `contracts/${newContract.id}`);
            logger.log('  ✅ Delete Contract: Success');
        } else {
            logger.warn('  ⚠️ Skipping Contracts CRUD - No clients available');
        }

    } catch (e) { logger.error(`  ❌ Contracts Module Error: ${e.message}`); }

    logger.log('🏁 Verification Completed');
}

runVerification();
