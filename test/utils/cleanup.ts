import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Cleans up the database by deleting all tables used in tests
export async function cleanDb() {
  await prisma.task.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.user.deleteMany();
}
