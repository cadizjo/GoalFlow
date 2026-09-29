import { envSchema } from './env.schema'

describe('envSchema', () => {

  const validEnv = {
    NODE_ENV: 'development',
    PORT: '3000',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/goalflow',
    JWT_SECRET: 'a-secret-that-is-definitely-at-least-32-chars-long',
    JWT_EXPIRES_IN: '7d',
    BCRYPT_ROUNDS: '10',
    THROTTLE_GLOBAL_LIMIT: '100',
    THROTTLE_AUTH_LIMIT: '10',
  }

  it('accepts a valid environment', () => {
    const result = envSchema.safeParse(validEnv)
    expect(result.success).toBe(true)
  })

  it('coerces PORT to a number', () => {
    const result = envSchema.safeParse(validEnv)
    expect(result.success && result.data.PORT).toBe(3000)
  })

  it('coerces BCRYPT_ROUNDS to a number', () => {
    const result = envSchema.safeParse(validEnv)
    expect(result.success && result.data.BCRYPT_ROUNDS).toBe(10)
  })

  it('applies defaults when optional vars are missing', () => {
    const { JWT_EXPIRES_IN, BCRYPT_ROUNDS, THROTTLE_GLOBAL_LIMIT, THROTTLE_AUTH_LIMIT, PORT, NODE_ENV, ...required } = validEnv
    const result = envSchema.safeParse(required)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.JWT_EXPIRES_IN).toBe('7d')
      expect(result.data.BCRYPT_ROUNDS).toBe(10)
      expect(result.data.THROTTLE_GLOBAL_LIMIT).toBe(100)
      expect(result.data.THROTTLE_AUTH_LIMIT).toBe(10)
      expect(result.data.PORT).toBe(3000)
      expect(result.data.NODE_ENV).toBe('development')
    }
  })

  it('rejects a missing DATABASE_URL', () => {
    const { DATABASE_URL, ...rest } = validEnv
    const result = envSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects an invalid DATABASE_URL', () => {
    const result = envSchema.safeParse({ ...validEnv, DATABASE_URL: 'not-a-url' })
    expect(result.success).toBe(false)
  })

  it('rejects a missing JWT_SECRET', () => {
    const { JWT_SECRET, ...rest } = validEnv
    const result = envSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects a JWT_SECRET shorter than 32 characters', () => {
    const result = envSchema.safeParse({ ...validEnv, JWT_SECRET: 'too-short' })
    const errors = !result.success ? result.error.issues : []
    expect(errors.some(e => e.path.includes('JWT_SECRET'))).toBe(true)
  })

  it('rejects BCRYPT_ROUNDS below 10', () => {
    const result = envSchema.safeParse({ ...validEnv, BCRYPT_ROUNDS: '8' })
    expect(result.success).toBe(false)
  })

  it('rejects BCRYPT_ROUNDS above 14', () => {
    const result = envSchema.safeParse({ ...validEnv, BCRYPT_ROUNDS: '15' })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid NODE_ENV', () => {
    const result = envSchema.safeParse({ ...validEnv, NODE_ENV: 'staging' })
    expect(result.success).toBe(false)
  })
})