import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppConfigService } from './config.service'
import { envSchema } from './env.schema'

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ // Load environment variables and validate them against the schema
      isGlobal: true,      // Make ConfigModule globally available so you don't need to import it in every module
      validate: (config: Record<string, unknown>) => {
        const result = envSchema.safeParse(config)

        if (!result.success) {
          const formatted = result.error.issues
            .map(e => `  ${e.path.join('.')}: ${e.message}`)
            .join('\n')
          throw new Error(`Environment validation failed:\n${formatted}`)
        }

        return result.data
      },
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}