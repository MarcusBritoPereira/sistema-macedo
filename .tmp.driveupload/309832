import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Checking all ImportacaoBancaria records ===');
  
  const imports = await prisma.importacaoBancaria.findMany({
    orderBy: {
      importedAt: 'desc',
    },
    include: {
      _count: {
        select: {
          extratos: true,
        },
      },
      contaBancaria: true,
    },
  });

  console.log(`Found ${imports.length} imports:`);
  console.log(JSON.stringify(imports, null, 2));

  // Let's also check the count of all extratos by sourceType
  const sourceTypes = await prisma.extratoBancario.groupBy({
    by: ['sourceType'],
    _count: true,
  });
  console.log('\nExtratoBancario counts by sourceType:', JSON.stringify(sourceTypes, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
