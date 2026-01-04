import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Cleans up the database by deleting all tables used in tests
export async function cleanDb() {
  await prisma.user.deleteMany();
  await prisma.goal.deleteMany();
}
