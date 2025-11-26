import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // Dashboard
  @Get('dashboard')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // List pending doctors
  @Get('doctors/pending')
  async getPendingDoctors(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getPendingDoctors(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // Get doctor details for review
  @Get('doctors/:id')
  async getDoctorForReview(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getDoctorForReview(id);
  }

  // Start reviewing a doctor
  @Post('doctors/:id/review')
  async startReview(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.adminService.startReview(req.user.admin.id, id);
  }

  // Approve doctor
  @Post('doctors/:id/approve')
  async approveDoctor(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body('notes') notes?: string,
  ) {
    return this.adminService.approveDoctor(req.user.admin.id, id, notes);
  }

  // Reject doctor
  @Post('doctors/:id/reject')
  async rejectDoctor(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
  ) {
    return this.adminService.rejectDoctor(req.user.admin.id, id, reason);
  }

  // Suspend doctor
  @Post('doctors/:id/suspend')
  async suspendDoctor(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
  ) {
    return this.adminService.suspendDoctor(req.user.admin.id, id, reason);
  }

  // Reactivate doctor
  @Post('doctors/:id/reactivate')
  async reactivateDoctor(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body('notes') notes?: string,
  ) {
    return this.adminService.reactivateDoctor(req.user.admin.id, id, notes);
  }
}

