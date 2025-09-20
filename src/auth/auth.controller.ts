import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RolesGuard } from './guards/roles.guard';
import { SupabaseGuard } from './guards/auth.guard';
import { Roles } from './roles.decorator';
import { CreateUserDto } from './dto/auth.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Controller('auth')
export class AuthController {
  logger = new Logger(AuthController.name);
  constructor(private readonly prisma: PrismaService) {}

  @Get('test')
  @UseGuards(SupabaseGuard, RolesGuard)
  @Roles()
  async getUser(@Req() req) {
    return {
      message: 'Test route accessed successfully!',
      user: {
        id: req.user.sub,
        email: req.user.email,
      },
    };
  }

  // ✅ Create user profile (after Supabase signup)
  @Post('createUser')
  @UseGuards(SupabaseGuard)
  async createUser(@Body() body: CreateUserDto, @Req() req) {
    const supabaseUser = req.user;
    console.log('Backend createUser called with:', { body, supabaseUser });
    try {
      // ✅ Check if user profile already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: supabaseUser.email },
      });

      if (existingUser) {
        this.logger.log('User already exists');
        return {
          success: true,
          data: existingUser,
          message: 'User profile already exists',
        };
      }

      const user = await this.prisma.user.create({
        data: {
          email: supabaseUser.email,
          role: body.role,
          name: body.name,
          loginid: body.loginid,
        },
      });
      this.logger.log('User created!');

      const { ...userResponse } = user;
      return {
        success: true,
        data: userResponse,
        message: 'User profile created successfully',
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('User profile already exists');
      }
      throw new BadRequestException(`Failed to create user: ${error.message}`);
    }
  }

  @Get('admin-test')
  @UseGuards(SupabaseGuard, RolesGuard)
  async adminTest() {
    return { message: 'Admin only route accessed!' };
  }

  @Get('profile')
  @UseGuards(SupabaseGuard)
  async getProfile(@Req() req) {
    const supabaseUser = req.user;

    const userProfile = await this.prisma.user.findUnique({
      where: { email: supabaseUser.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!userProfile) {
      throw new BadRequestException(
        'User profile not found. Please create profile first.',
      );
    }

    return {
      success: true,
      data: userProfile,
    };
  }
}
