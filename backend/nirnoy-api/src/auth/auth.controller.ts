import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

class RequestOTPDto {
  phone: string;
  role: 'PATIENT' | 'DOCTOR';
}

class VerifyOTPDto {
  phone: string;
  otp: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('request-otp')
  async requestOTP(@Body() dto: RequestOTPDto) {
    return this.authService.requestOTP(dto.phone, dto.role);
  }

  @Post('verify-otp')
  async verifyOTP(@Body() dto: VerifyOTPDto) {
    return this.authService.verifyOTP(dto.phone, dto.otp);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req) {
    return {
      id: req.user.id,
      phone: req.user.phone,
      role: req.user.role,
      doctorId: req.user.doctor?.id,
      patientId: req.user.patient?.id,
      name: req.user.doctor?.name || req.user.patient?.name,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refreshToken(@Request() req) {
    return this.authService.refreshToken(req.user.id);
  }
}

