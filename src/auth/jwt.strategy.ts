import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../config/config.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    
  constructor(config: AppConfigService) {

    const secret = config.jwtSecret;

    // Configure the JWT strategy
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Extract JWT from Authorization header as Bearer token
      secretOrKey: secret, // Use the retrieved secret for verifying the token
      ignoreExpiration: false, // Do not ignore token expiration
    });
  }

  // Validate method to extract user info from JWT payload
  async validate(payload: any) {
    // Return user information to be attached to the request object (req.user)
    return {
      userId: payload.sub,
      email: payload.email,
    };
  }
}
