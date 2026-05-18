import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT;`
  );
  console.log("✓  notes kolonu eklendi (veya zaten vardı)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
