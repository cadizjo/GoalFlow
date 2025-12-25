import { Injectable } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const url = process.env.DATABASE_URL!;
    if (!url) {
      throw new Error('DATABASE_URL is not defined');
    }

    // PrismaPg expects connection string in 'connectionString' property
    const adapter = new PrismaPg({ connectionString: url });

    // Pass adapter to PrismaClient
    super({ adapter });
  }
}
