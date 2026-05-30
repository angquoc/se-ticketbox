import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(data: any) { // Tạm thời sử dụng kiểu any, sau này sẽ thay bằng DTO
    // 1. Kiểm tra email đã tồn tại hay chưa
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng');
    }

    // 2. Mã hóa mật khẩu với độ phức tạp (salt rounds) là 10
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    // 3. Lưu thông tin người dùng mới xuống PostgreSQL
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        role: data.role || 'CUSTOMER',
      },
    });

    return { message: 'Đăng ký thành công', userId: user.id };
  }

  async login(data: any) {
    // 1. Tìm người dùng theo email
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedException('Sai email hoặc mật khẩu');
    }

    // 2. So sánh mật khẩu bản rõ với hash trong database
    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Sai email hoặc mật khẩu');
    }

    // 3. Cấp phát JWT
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}