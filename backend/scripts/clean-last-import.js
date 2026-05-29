const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function clean() {
  const importId = "2a315d19-041b-4bae-b246-02f1d1db2ff6";
  console.log(`Starting clean for import ID: ${importId}`);
  
  const result = await prisma.$transaction(async (tx) => {
    // Delete ExtratoBancario records
    const extratosDeleted = await tx.extratoBancario.deleteMany({
      where: {
        importacaoId: importId
      }
    });
    
    // Delete ImportacaoBancaria record
    const importDeleted = await tx.importacaoBancaria.delete({
      where: {
        id: importId
      }
    });
    
    return { extratosDeletedCount: extratosDeleted.count, importDeleted };
  });
  
  console.log("SUCCESSFULLY DELETED:");
  console.log(`- Extratos bancarios: ${result.extratosDeletedCount}`);
  console.log(`- Importacao: ${result.importDeleted.filename} (${result.importDeleted.id})`);
}

clean()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
