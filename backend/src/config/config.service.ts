import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Env } from './env.schema'

// Typed wrapper around ConfigService so every config value is fully typed
// and you never need to pass a generic or fallback at the call site.
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get nodeEnv()          { return this.config.get('NODE_ENV', { infer: true }) }
  get port()             { return this.config.get('PORT', { infer: true }) }
  get databaseUrl()      { return this.config.get('DATABASE_URL', { infer: true }) }
  get jwtSecret()        { return this.config.get('JWT_SECRET', { infer: true }) }
  get jwtExpiresIn()     { return this.config.get('JWT_EXPIRES_IN', { infer: true }) }
  get bcryptRounds()     { return this.config.get('BCRYPT_ROUNDS', { infer: true }) }
  get throttleGlobal()   { return this.config.get('THROTTLE_GLOBAL_LIMIT', { infer: true }) }
  get throttleAuth()     { return this.config.get('THROTTLE_AUTH_LIMIT', { infer: true }) }
}