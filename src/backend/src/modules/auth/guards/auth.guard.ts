import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();

    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Không tìm thấy token truy cập');
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      request.user = payload;
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
