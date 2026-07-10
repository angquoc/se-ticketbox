import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * GET /admin/users
   * Returns a paginated list of all users (ADMIN only).
   * Supports filtering by role and full-text search on email and fullName.
   */
  @Get('users')
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  /**
   * GET /admin/system-health
   * Returns an aggregated health status of all subsystems: API, PostgreSQL, Redis, BullMQ.
   */
  @Get('system-health')
  getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  /**
   * GET /admin/dashboard/stats
   * Returns dashboard revenue and attendance stats. Accessible by ADMIN and ORGANIZER.
   */
  @Get('dashboard/stats')
  @Roles(Role.ADMIN, Role.ORGANIZER)
  async getDashboardStats(@CurrentUser() user: AuthUser) {
    return this.adminService.getDashboardStats(user.sub, user.role);
  }
}
