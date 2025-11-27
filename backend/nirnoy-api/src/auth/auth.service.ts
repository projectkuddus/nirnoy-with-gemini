import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

export interface JwtPayload {
  sub: string;
  phone: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async sendOtp(phone: string): Promise<{ success: boolean; message: string }> {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP (in production, send via SMS)
    // For now, we'll just return success
    console.log(`OTP for ${phone}: ${otp}`);

    return {
      success: true,
      message: 'OTP sent successfully',
    };
  }

  async verifyOtp(phone: string, otp: string): Promise<{ accessToken: string; user: any; isNew: boolean }> {
    // In production, verify OTP from database
    // For demo, accept any 6-digit OTP
    if (otp.length !== 6) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // Check if user exists
    let user = await this.prisma.user.findUnique({
      where: { phone },
      include: {
        patient: true,
        doctor: true,
      },
    });

    const isNew = !user;

    if (!user) {
      // Create new user
      user = await this.prisma.user.create({
        data: {
          phone,
          role: 'PATIENT',
        },
        include: {
          patient: true,
          doctor: true,
        },
      });
    }

    const payload: JwtPayload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user,
      isNew,
    };
  }

  async validateUser(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        patient: true,
        doctor: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }

  async updateProfile(userId: string, data: any) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        patient: {
          upsert: {
            create: {
              dateOfBirth: data.dateOfBirth,
              gender: data.gender,
              bloodGroup: data.bloodGroup,
              emergencyContact: data.emergencyContact,
            },
            update: {
              dateOfBirth: data.dateOfBirth,
              gender: data.gender,
              bloodGroup: data.bloodGroup,
              emergencyContact: data.emergencyContact,
            },
          },
        },
      },
      include: {
        patient: true,
      },
    });
  }
}

