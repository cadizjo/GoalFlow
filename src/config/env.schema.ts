import { z } from 'zod'
import type { StringValue } from 'ms'

// Validated environment schema — app refuses to start if any required value
// is missing or the wrong type. All values are typed after parsing.
export const envSchema = z.object({

  // ─── App ───────────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // ─── Database ──────────────────────────────────────────────────────────────
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // ─── Auth ──────────────────────────────────────────────────────────────────
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for security'),
  JWT_EXPIRES_IN: z
    .string()
    .default('7d')
    .transform(v => v as StringValue), // cast to ms.StringValue for JwtModule
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(10),

  // ─── Throttler ─────────────────────────────────────────────────────────────
  THROTTLE_GLOBAL_LIMIT: z.coerce.number().int().positive().default(100),
  THROTTLE_AUTH_LIMIT: z.coerce.number().int().positive().default(10),
})

export type Env = z.infer<typeof envSchema>