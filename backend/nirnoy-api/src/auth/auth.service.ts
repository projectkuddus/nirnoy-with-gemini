import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../supabase/supabase.service';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;  // UUID from Supabase
  phone: string;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly isDev: boolean;
  
  // In-memory OTP store for development (in production, use Redis or DB)
  private otpStore: Map<string, { code: string; expiresAt: Date; attempts: number }> = new Map();

  constructor(
    private supabase: SupabaseService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.isDev = this.configService.get('NODE_ENV') !== 'production';
  }

  async sendOtp(phone: string, role: 'PATIENT' | 'DOCTOR' = 'PATIENT'): Promise<{ success: boolean; message: string; devOtp?: string }> {
    // Validate phone format (Bangladesh: 01XXXXXXXXX)
    const phoneRegex = /^01[3-9]\d{8}$/;
    if (!phoneRegex.test(phone)) {
      throw new BadRequestException('Invalid phone number format. Use 01XXXXXXXXX');
    }

    // Rate limit check
    const existingOtp = this.otpStore.get(phone);
    if (existingOtp && existingOtp.expiresAt > new Date()) {
      // Allow resend after 1 minute
      const timeSinceCreation = Date.now() - (existingOtp.expiresAt.getTime() - 5 * 60 * 1000);
      if (timeSinceCreation < 60 * 1000) {
        throw new BadRequestException('Please wait 1 minute before requesting another OTP');
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP
    this.otpStore.set(phone, {
      code: otp,
      expiresAt,
      attempts: 0,
    });

    // TODO: Send via SMS (GreenWeb BD or similar)
    // In production, integrate with SMS gateway
    this.logger.log(`[OTP] Generated for ${phone}: ${otp}`);

    const response: { success: boolean; message: string; devOtp?: string } = {
      success: true,
      message: 'OTP sent successfully',
    };

    // Only return OTP in development mode for testing
    if (this.isDev) {
      response.devOtp = otp;
    }

    return response;
  }

  async verifyOtp(phone: string, otp: string): Promise<{ accessToken: string; user: any; isNew: boolean }> {
    // Validate input
    if (!otp || otp.length !== 6) {
      throw new UnauthorizedException('Invalid OTP format');
    }

    // Get stored OTP
    const storedOtp = this.otpStore.get(phone);

    if (!storedOtp) {
      throw new UnauthorizedException('OTP not found. Please request a new one.');
    }

    if (storedOtp.expiresAt < new Date()) {
      this.otpStore.delete(phone);
      throw new UnauthorizedException('OTP expired. Please request a new one.');
    }

    // Check attempt limit (max 5 wrong attempts)
    if (storedOtp.attempts >= 5) {
      this.otpStore.delete(phone);
      throw new UnauthorizedException('Too many failed attempts. Please request a new OTP.');
    }

    // Verify OTP
    if (storedOtp.code !== otp) {
      storedOtp.attempts++;
      throw new UnauthorizedException('Invalid OTP');
    }

    // Clear OTP after successful verification
    this.otpStore.delete(phone);

    // Check if user exists in Supabase profiles
    let profile = await this.supabase.getProfileByPhone(phone);
    const isNew = !profile;

    if (!profile) {
      // Use Supabase Auth to create user, or create profile directly
      // For now, we'll create a profile directly (user should use Supabase Auth in production)
      try {
        // Create a new profile with a generated UUID
        const { data: newProfile, error } = await this.supabase.admin
          .from('profiles')
          .insert({
            phone,
            role: 'patient',
            is_verified: false,
            is_active: true,
          })
          .select()
          .single();

        if (error) {
          // If insert fails (likely due to foreign key constraint), 
          // the user needs to use Supabase Auth first
          this.logger.warn(`Profile creation failed: ${error.message}`);
          
          // For development, return a temporary user
          if (this.isDev) {
            profile = {
              id: `dev-${Date.now()}`,
              phone,
              role: 'patient',
              name: null,
              is_verified: false,
              is_active: true,
            };
          } else {
            throw new BadRequestException('Please sign up using the app first');
          }
        } else {
          profile = newProfile;
        }
      } catch (e) {
        this.logger.error('Error creating profile', e);
        // Fallback for development
        if (this.isDev) {
          profile = {
            id: `dev-${Date.now()}`,
            phone,
            role: 'patient',
            name: null,
            is_verified: false,
            is_active: true,
          };
        } else {
          throw e;
        }
      }
      
      this.logger.log(`[Auth] New user created: ${phone}`);
    }

    const payload: JwtPayload = {
      sub: profile.id,
      phone: profile.phone,
      role: profile.role,
    };

    this.logger.log(`[Auth] User logged in: ${phone} (${profile.role})`);

    return {
      accessToken: this.jwtService.sign(payload),
      user: this.formatUser(profile),
      isNew,
    };
  }

  private formatUser(profile: any) {
    return {
      id: profile.id,
      phone: profile.phone,
      role: profile.role,
      email: profile.email,
      name: profile.name || profile.name_bn || '',
      isActive: profile.is_active,
      isVerified: profile.is_verified,
      avatarUrl: profile.avatar_url,
    };
  }

  async validateUser(payload: JwtPayload) {
    try {
      const profile = await this.supabase.getProfileById(payload.sub);

      if (!profile || !profile.is_active) {
        throw new UnauthorizedException('User not found or inactive');
      }

      return this.formatUser(profile);
    } catch (error) {
      // For development, allow dev users
      if (this.isDev && payload.sub.startsWith('dev-')) {
        return {
          id: payload.sub,
          phone: payload.phone,
          role: payload.role,
          name: 'Dev User',
          isActive: true,
          isVerified: false,
        };
      }
      throw new UnauthorizedException('User not found');
    }
  }

  async getMe(userId: string) {
    try {
      const profile = await this.supabase.getProfileById(userId);

      if (!profile) {
        throw new UnauthorizedException('User not found');
      }

      // Also get patient or doctor details if available
      let additionalData = {};

      if (profile.role === 'patient') {
        const { data: patient } = await this.supabase.admin
          .from('patients')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (patient) {
          additionalData = { patient };
        }
      } else if (profile.role === 'doctor') {
        const { data: doctor } = await this.supabase.admin
          .from('doctors')
          .select('*, chambers(*)')
          .eq('user_id', userId)
          .single();
        
        if (doctor) {
          additionalData = { doctor };
        }
      }

      return {
        ...this.formatUser(profile),
        ...additionalData,
      };
    } catch (error) {
      throw new UnauthorizedException('User not found');
    }
  }

  async updateProfile(userId: string, data: {
    name?: string;
    name_bn?: string;
    email?: string;
    date_of_birth?: string;
    gender?: string;
    blood_group?: string;
    address?: string;
    city?: string;
  }) {
    const updatedProfile = await this.supabase.createOrUpdateProfile(userId, {
      ...data,
      updated_at: new Date().toISOString(),
    });

    return this.formatUser(updatedProfile);
  }

  async refreshToken(userId: string): Promise<{ accessToken: string }> {
    const profile = await this.supabase.getProfileById(userId);

    if (!profile || !profile.is_active) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const payload: JwtPayload = {
      sub: profile.id,
      phone: profile.phone,
      role: profile.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
