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
    it('reads THROTTLE_AUTH_LIMIT from env', () => {
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
    // AppConfigService uses named getters, not config.get(key)
    // so the mock just needs to match the getter interface

    it('uses throttleGlobal from AppConfigService', () => {
      const config = { throttleGlobal: 50 } as any
      const result = buildThrottlerConfig(config)
      expect(result.throttlers[0].limit).toBe(50)
    })

    it('has one named default throttler', () => {
      const config = { throttleGlobal: 100 } as any
      const result = buildThrottlerConfig(config)
      expect(result.throttlers).toHaveLength(1)
      expect(result.throttlers[0].name).toBe('default')
    })

    it('sets ttl to 60000ms', () => {
      const config = { throttleGlobal: 100 } as any
      const result = buildThrottlerConfig(config)
      expect(result.throttlers[0].ttl).toBe(60_000)
    })
  })
})