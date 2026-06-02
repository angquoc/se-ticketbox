import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { Role } from '@prisma/client'; // Import Role
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from './guards/auth.guard'; // Import AuthGuard
import { RolesGuard } from './guards/roles.guard'; // Import RolesGuard
import { Roles } from './decorators/roles.decorator'; // Import Roles Decorator

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  // --- API TEST GUARD ---
  @Get('me')
  @UseGuards(AuthGuard, RolesGuard) // Phải có token VÀ phải đúng role
  @Roles(Role.ORGANIZER) // Chỉ cho phép Ban tổ chức
  getProfile(@Request() req: any) {
    return {
      message: 'Xin chào Ban tổ chức, bạn đã lọt qua Guard thành công!',
      user: req.user,
    };
  }
}
