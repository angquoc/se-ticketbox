import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'ticketbox-super-secret', // Khóa bí mật dùng để ký token
      signOptions: { expiresIn: '1d' }, // Token có hiệu lực trong 1 ngày
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}