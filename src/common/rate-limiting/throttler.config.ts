import { ThrottlerModuleOptions } from '@nestjs/throttler'

// Limits are driven by environment variables so tests can set them very high
// without disabling the guard itself.
// .env:       THROTTLE_GLOBAL_LIMIT=100   THROTTLE_AUTH_LIMIT=10
// .env.test:  THROTTLE_GLOBAL_LIMIT=10000 THROTTLE_AUTH_LIMIT=10000
export const defaultThrottlerConfig: ThrottlerModuleOptions = {
  throttlers: [
    {
      name: 'default',
      ttl: 60_000,
      limit: parseInt(process.env.THROTTLE_GLOBAL_LIMIT ?? '100', 10),
    },
  ],
}

// Applied via @Throttle() on auth endpoints to override the default limit
export const AUTH_THROTTLE = {
  default: {
    ttl: 60_000,
    limit: parseInt(process.env.THROTTLE_AUTH_LIMIT ?? '10', 10),
  },
}