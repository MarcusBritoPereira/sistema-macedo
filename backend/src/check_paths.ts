
import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
    const prisma = new PrismaClient();
    console.log('--- Database Path Verification ---');
    
    const currentDir = process.cwd();
    const oldProjectName = 'Projeto_ERP_Up';
    const newProjectName = 'UP_Fin';
    
    console.log(`Current Working Directory: ${currentDir}`);
    
    const integrations = await prisma.integracaoBancaria.findMany();
    console.log(`Found ${integrations.length} banking integrations.`);
    
    for (const integration of integrations) {
        let updated = false;
        let newCrtFile = integration.crtFile;
        let newKeyFile = integration.keyFile;
        
        if (integration.crtFile && integration.crtFile.includes(oldProjectName)) {
            newCrtFile = integration.crtFile.replace(oldProjectName, newProjectName);
            console.log(`Updating CRT path: ${integration.crtFile} -> ${newCrtFile}`);
            updated = true;
        }
        
        if (integration.keyFile && integration.keyFile.includes(oldProjectName)) {
            newKeyFile = integration.keyFile.replace(oldProjectName, newProjectName);
            console.log(`Updating KEY path: ${integration.keyFile} -> ${newKeyFile}`);
            updated = true;
        }
        
        if (updated) {
            await prisma.integracaoBancaria.update({
                where: { id: integration.id },
                data: {
                    crtFile: newCrtFile,
                    keyFile: newKeyFile
                }
            });
            console.log(`Integration for account ${integration.contaBancariaId} updated successfully.`);
        } else {
            console.log(`Integration for account ${integration.contaBancariaId} is already correct or has no absolute paths.`);
        }
        
        // Final sanity check: do the files exist?
        if (newCrtFile && !fs.existsSync(newCrtFile)) {
            console.warn(`WARNING: CRT file does not exist at path: ${newCrtFile}`);
        }
        if (newKeyFile && !fs.existsSync(newKeyFile)) {
            console.warn(`WARNING: KEY file does not exist at path: ${newKeyFile}`);
        }
    }
    
    await prisma.$disconnect();
    console.log('--- Verification Finished ---');
}

main().catch(e => {
    console.error('Error running maintenance script:', e);
    process.exit(1);
});
