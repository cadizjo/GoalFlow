import { ThrottlerModuleOptions } from '@nestjs/throttler'

// Single named throttler — applied globally via ThrottlerGuard in AppModule
export const defaultThrottlerConfig: ThrottlerModuleOptions = {
  throttlers: [
    { name: 'default', ttl: 60_000, limit: 100 },
  ],
}

// Applied via @Throttle() on the auth controller to override the default 100 req/min
export const AUTH_THROTTLE = { default: { ttl: 60_000, limit: 10 } }