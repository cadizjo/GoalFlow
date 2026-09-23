import { buildThrottlerConfig, buildAuthThrottle } from './throttler.config'

describe('throttler config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('buildAuthThrottle', () => {
    it('uses THROTTLE_AUTH_LIMIT from env', () => {
      process.env.THROTTLE_AUTH_LIMIT = '5'
      expect(buildAuthThrottle().default.limit).toBe(5)
    })

    it('defaults to 10 when env var is not set', () => {
      delete process.env.THROTTLE_AUTH_LIMIT
      expect(buildAuthThrottle().default.limit).toBe(10)
    })

    it('sets ttl to 60000ms', () => {
      expect(buildAuthThrottle().default.ttl).toBe(60_000)
    })
  })

  describe('buildThrottlerConfig', () => {
    it('uses THROTTLE_GLOBAL_LIMIT from env', () => {
      process.env.THROTTLE_GLOBAL_LIMIT = '50'
      const config = { get: (key: string) => parseInt(process.env[key] ?? '', 10) } as any
      const result = buildThrottlerConfig(config)
      expect(result.throttlers[0].limit).toBe(50)
    })

    it('has one named default throttler', () => {
      const config = { get: () => 100 } as any
      const result = buildThrottlerConfig(config)
      expect(result.throttlers).toHaveLength(1)
      expect(result.throttlers[0].name).toBe('default')
    })
  })
})