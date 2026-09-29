import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';

export async function cleanDb(app: INestApplication) {

  // Get PrismaService instance
  const prisma = app.get(PrismaService);

  // Delete data in proper order to avoid foreign key constraints
  await prisma.eventLog.deleteMany();
  await prisma.scheduleBlock.deleteMany();
  await prisma.taskDependency.deleteMany();
  await prisma.task.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.user.deleteMany();
}
