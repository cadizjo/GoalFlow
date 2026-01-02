import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService, // Inject UsersService to access user data
    private jwtService: JwtService, // Inject JwtService to handle JWT operations
  ) {}

  // User signup method
  async signup(email: string, password: string, name?: string) {

    // Hash and salt the password before storing it
    const password_hash = await bcrypt.hash(password, 10); 

    // Create the user in the database
    const user = await this.usersService.createUser({
      email,
      name,
      password_hash,
    });

    // Return a signed JWT token for the newly created user
    return this.signToken(user.id, user.email);
  }

  // User login method
  async login(email: string, password: string) {

    // Retrieve the user by email
    const user = await this.usersService.user({ email });

    // If user not found or password hash is missing, throw an error
    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compare the provided password with the stored password hash 
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Return a signed JWT token for the authenticated user
    return this.signToken(user.id, user.email);
  }

  // Method to sign a JWT token
  async signToken(userId: string, email: string) {

    // Create the payload with user ID and email
    const payload = { sub: userId, email };

    // Sign and return the JWT token
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
