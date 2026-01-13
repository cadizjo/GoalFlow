import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' }); 

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function cleanDb() {
  await prisma.taskDependency.deleteMany();
  await prisma.task.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.user.deleteMany();
}
