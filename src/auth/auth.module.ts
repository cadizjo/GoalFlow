import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { AppConfigModule } from 'src/config/config.module';
import { AppConfigService } from 'src/config/config.service';
 
@Module({
  imports: [
    UsersModule, // Import UsersModule to access UsersService
    PassportModule, // Import PassportModule for authentication strategies
    AppConfigModule, // Import AppConfigModule to access environment variables
    JwtModule.registerAsync({ // Asynchronously configure JwtModule
      imports: [AppConfigModule], 
      inject: [AppConfigService], 
      useFactory: (config: AppConfigService) => ({ // Factory function to configure JWT
        secret: config.jwtSecret, // Get JWT secret from environment variables
        signOptions: { expiresIn: config.jwtExpiresIn }, // Set token expiration time
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy], // Register AuthService and JwtStrategy as providers
  controllers: [AuthController], // Register AuthController as controller
})
export class AuthModule {}
