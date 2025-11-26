import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

// In production, use Redis or database for OTP storage
const otpStore = new Map<string, { otp: string; expiresAt: number; role: string }>();

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // Generate 6-digit OTP
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Request OTP for login
  async requestOTP(phone: string, role: 'PATIENT' | 'DOCTOR') {
    // Validate phone format (Bangladesh)
    if (!/^01[3-9]\d{8}$/.test(phone)) {
      throw new BadRequestException('Invalid Bangladesh phone number format');
    }

    const otp = this.generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store OTP (in production, use Redis with TTL)
    otpStore.set(phone, { otp, expiresAt, role });

    // In production, send SMS via gateway (SSL Wireless, Infobip, etc.)
    console.log(`📱 OTP for ${phone}: ${otp} (DEV MODE - would send SMS in production)`);

    return {
      success: true,
      message: 'OTP sent successfully',
      // Remove in production - only for dev testing
      devOtp: process.env.NODE_ENV === 'development' ? otp : undefined,
    };
  }

  // Verify OTP and return JWT
  async verifyOTP(phone: string, otp: string) {
    const stored = otpStore.get(phone);

    if (!stored) {
      throw new UnauthorizedException('No OTP request found. Please request a new OTP.');
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(phone);
      throw new UnauthorizedException('OTP expired. Please request a new OTP.');
    }

    if (stored.otp !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // OTP verified - clear it
    otpStore.delete(phone);

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { phone },
      include: { doctor: true, patient: true },
    });

    if (!user) {
      // Create new user
      user = await this.prisma.user.create({
        data: {
          phone,
          role: stored.role,
          // Create associated profile
          ...(stored.role === 'PATIENT' && {
            patient: {
              create: { name: '' }, // Will be updated on profile completion
            },
          }),
          ...(stored.role === 'DOCTOR' && {
            doctor: {
              create: { 
                name: '', 
                specialty: '', 
                gender: '',
                fee: 0,
              },
            },
          }),
        },
        include: { doctor: true, patient: true },
      });
    }

    // Generate JWT
    const payload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
      doctorId: user.doctor?.id,
      patientId: user.patient?.id,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        doctorId: user.doctor?.id,
        patientId: user.patient?.id,
        name: user.doctor?.name || user.patient?.name || '',
        isProfileComplete: !!(user.doctor?.name || user.patient?.name),
      },
    };
  }

  // Validate JWT payload
  async validateUser(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { doctor: true, patient: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  // Refresh token
  async refreshToken(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { doctor: true, patient: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const payload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
      doctorId: user.doctor?.id,
      patientId: user.patient?.id,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}

