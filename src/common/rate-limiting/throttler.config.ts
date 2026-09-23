import { ConfigService } from '@nestjs/config'
import { ThrottlerModuleOptions } from '@nestjs/throttler'

// Used in ThrottlerModule.forRootAsync() — ConfigService is available here
// because NestJS resolves it as a dependency before calling useFactory.
export function buildThrottlerConfig(config: ConfigService): ThrottlerModuleOptions {
  return {
    throttlers: [
      {
        name: 'default',
        ttl: 60_000,
        limit: config.get<number>('THROTTLE_GLOBAL_LIMIT') ?? 100,
      },
    ],
  }
}

// Used in @Throttle() on the auth controller class.
// Decorators run at class definition time — before NestJS initializes
// ConfigService — so we read process.env directly here. This is still
// safe because the decorator factory is called during module compilation,
// which happens after your test's beforeAll has set the env vars.
export function buildAuthThrottle() {
  return {
    default: {
      ttl: 60_000,
      limit: parseInt(process.env.THROTTLE_AUTH_LIMIT ?? '10', 10),
    },
  }
}