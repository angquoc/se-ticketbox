import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { EmailService } from '../notification/services/email.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async register(data: RegisterDto) {
    const email = data.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: data.fullName,
        role: 'CUSTOMER',
      },
    });

    // Tự động cấp token sau khi đăng ký
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async login(data: LoginDto) {
    const email = data.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Sai email hoặc mật khẩu');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Sai email hoặc mật khẩu');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }

  async updateProfile(userId: string, data: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        fullName: data.fullName,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }

  async changePassword(userId: string, data: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }

    const isMatch = await bcrypt.compare(
      data.currentPassword,
      user.passwordHash,
    );

    if (!isMatch) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }

    if (data.currentPassword === data.newPassword) {
      throw new ConflictException('Mật khẩu mới phải khác mật khẩu hiện tại');
    }

    const salt = await bcrypt.genSalt(10);

    const passwordHash = await bcrypt.hash(data.newPassword, salt);

    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        passwordHash,
      },
    });

    return {
      message: 'Mật khẩu đã được thay đổi thành công',
    };
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản với email này');
    }

    // Tạo mật khẩu ngẫu nhiên dài 8 ký tự
    const generatedPassword = Math.random().toString(36).substring(2, 10);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(generatedPassword, salt);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Gửi email mật khẩu mới
    try {
      await this.emailService.sendForgotPasswordEmail({
        to: user.email,
        newPassword: generatedPassword,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `Không thể gửi email khôi phục mật khẩu: ${errorMessage}. Vui lòng kiểm tra lại cấu hình các biến môi trường SMTP (EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_SECURE) trong cấu hình của Render.`
      );
    }

    return {
      message: 'Mật khẩu mới đã được gửi về email của bạn',
    };
  }
}
