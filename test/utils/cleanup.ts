import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Cleans up the database by deleting all users
export async function cleanDb() {
  await prisma.user.deleteMany();
}
