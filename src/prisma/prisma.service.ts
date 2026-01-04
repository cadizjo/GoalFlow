import { INestApplication, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService 
  extends PrismaClient 
  implements OnModuleInit, OnModuleDestroy
{
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

  // Connect to the database when the module is initialized
  async onModuleInit() {
    await this.$connect();
  }

  // Disconnect from the database when the module is destroyed
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
