import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
 
@Module({
  imports: [
    UsersModule, // Import UsersModule to access UsersService
    PassportModule, // Import PassportModule for authentication strategies
    JwtModule.registerAsync({ // Asynchronously configure JwtModule
      imports: [ConfigModule], // Import ConfigModule to access environment variables
      inject: [ConfigService], // Inject ConfigService
      useFactory: (config: ConfigService) => ({ // Factory function to configure JWT
        secret: config.get('JWT_SECRET'), // Get JWT secret from environment variables
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') }, // Set token expiration time
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy], // Register AuthService and JwtStrategy as providers
  controllers: [AuthController], // Register AuthController as controller
})
export class AuthModule {}
