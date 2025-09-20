import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseGuard implements CanActivate {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.getOrThrow<string>('SUPABASE_URL'),
      this.configService.getOrThrow<string>('SUPABASE_ANON_KEY'),
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header = req.headers['authorization'];

    console.log('SupabaseGuard: Authorization header:', header ? 'Present' : 'Missing');

    if (!header) {
      throw new UnauthorizedException('No token provided');
    }

    const token = header.split(' ')[1];
    console.log('SupabaseGuard: Token extracted:', token ? 'Present' : 'Missing');

    try {
      const { data, error } = await this.supabase.auth.getUser(token);

      if (error || !data.user) {
        console.log('SupabaseGuard: Token verification failed:', error);
        throw new UnauthorizedException('Invalid or expired token');
      }

      console.log('SupabaseGuard: User verified:', data.user.email);
      req.user = data.user;
      return true;
    } catch (error) {
      console.log('SupabaseGuard: Authentication failed:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
