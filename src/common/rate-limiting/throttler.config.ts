import { ThrottlerModuleOptions } from '@nestjs/throttler'
import { AppConfigService } from '../../config/config.service'

// Used in ThrottlerModule.forRootAsync() — AppConfigService is injected
// by NestJS before useFactory is called, so values are fully validated.
export function buildThrottlerConfig(config: AppConfigService): ThrottlerModuleOptions {
  return {
    throttlers: [
      {
        name: 'default',
        ttl: 60_000,
        limit: config.throttleGlobal,
      },
    ],
  }
}

// Used in @Throttle() on auth controller. Class decorators run at definition
// time before NestJS DI is available, so process.env is read directly here.
// This is safe because buildAuthThrottle() is called during module compilation,
// which happens after .env.test has been loaded by dotenv.
export function buildAuthThrottle() {
  return {
    default: {
      ttl: 60_000,
      limit: parseInt(process.env.THROTTLE_AUTH_LIMIT ?? '10', 10),
    },
  }
}