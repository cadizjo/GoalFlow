// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AppConfigModule } from 'src/config/config.module';
import { AppConfigService } from 'src/config/config.service';

@Global() // Make the module global so that it can be injected anywhere in the application
@Module({
  imports: [AppConfigModule], // Import AppConfigModule to access environment variables, 
  providers: [
    {
      provide: PrismaService, 
      inject: [AppConfigService], // Inject the AppConfigService into the factory function
      useFactory: (config: AppConfigService) => {
        return new PrismaService(config.databaseUrl); // Create a new instance of PrismaService with the database URL
      },
    }
  ], // Register the PrismaService as a provider
  exports: [PrismaService], // Export the PrismaService so that it can be used in other modules
})
export class PrismaModule {}
