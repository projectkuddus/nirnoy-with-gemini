import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ==================== DOCTOR VERIFICATION ====================

  async getPendingDoctors(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [doctors, total] = await Promise.all([
      this.prisma.doctor.findMany({
        where: {
          registrationStatus: { in: ['PENDING', 'UNDER_REVIEW'] },
        },
        include: {
          user: { select: { phone: true, email: true, createdAt: true } },
          qualifications: true,
          verifications: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.doctor.count({
        where: { registrationStatus: { in: ['PENDING', 'UNDER_REVIEW'] } },
      }),
    ]);

    return {
      doctors: doctors.map(d => this.formatDoctorForAdmin(d)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDoctorForReview(doctorId: number) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        user: { select: { phone: true, email: true, createdAt: true } },
        qualifications: true,
        experiences: true,
        chambers: true,
        verifications: { orderBy: { createdAt: 'desc' }, include: { approvedBy: true } },
      },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return this.formatDoctorForAdmin(doctor, true);
  }

  async startReview(adminId: number, doctorId: number) {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) throw new ForbiddenException('Admin not found');

    const doctor = await this.prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    if (doctor.registrationStatus !== 'PENDING') {
      throw new BadRequestException('Doctor is not in pending status');
    }

    await this.prisma.$transaction([
      this.prisma.doctor.update({
        where: { id: doctorId },
        data: { registrationStatus: 'UNDER_REVIEW' },
      }),
      this.prisma.doctorVerification.create({
        data: {
          doctorId,
          action: 'UNDER_REVIEW',
          notes: 'Review started',
          approvedById: adminId,
        },
      }),
    ]);

    return { success: true, message: 'Review started' };
  }

  async approveDoctor(adminId: number, doctorId: number, notes?: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) throw new ForbiddenException('Admin not found');

    const doctor = await this.prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    if (!['PENDING', 'UNDER_REVIEW'].includes(doctor.registrationStatus)) {
      throw new BadRequestException('Doctor cannot be approved in current status');
    }

    await this.prisma.$transaction([
      this.prisma.doctor.update({
        where: { id: doctorId },
        data: {
          registrationStatus: 'APPROVED',
          bmdcVerified: true,
          bmdcVerifiedAt: new Date(),
          approvedAt: new Date(),
        },
      }),
      this.prisma.doctorVerification.create({
        data: {
          doctorId,
          action: 'APPROVED',
          notes: notes || 'Application approved',
          approvedById: adminId,
        },
      }),
      // Update user role to DOCTOR if not already
      this.prisma.user.update({
        where: { id: doctor.userId },
        data: { role: 'DOCTOR' },
      }),
    ]);

    // TODO: Send SMS/Email notification to doctor

    return { success: true, message: 'Doctor approved successfully' };
  }

  async rejectDoctor(adminId: number, doctorId: number, reason: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) throw new ForbiddenException('Admin not found');

    const doctor = await this.prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    if (!reason) {
      throw new BadRequestException('Rejection reason is required');
    }

    await this.prisma.$transaction([
      this.prisma.doctor.update({
        where: { id: doctorId },
        data: {
          registrationStatus: 'REJECTED',
          rejectionReason: reason,
        },
      }),
      this.prisma.doctorVerification.create({
        data: {
          doctorId,
          action: 'REJECTED',
          reason,
          notes: `Rejected by admin: ${reason}`,
          approvedById: adminId,
        },
      }),
    ]);

    // TODO: Send SMS/Email notification to doctor with reason

    return { success: true, message: 'Doctor rejected' };
  }

  async suspendDoctor(adminId: number, doctorId: number, reason: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) throw new ForbiddenException('Admin not found');

    const doctor = await this.prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    if (doctor.registrationStatus !== 'APPROVED') {
      throw new BadRequestException('Only approved doctors can be suspended');
    }

    await this.prisma.$transaction([
      this.prisma.doctor.update({
        where: { id: doctorId },
        data: {
          registrationStatus: 'SUSPENDED',
          suspendedAt: new Date(),
          suspensionReason: reason,
        },
      }),
      this.prisma.doctorVerification.create({
        data: {
          doctorId,
          action: 'SUSPENDED',
          reason,
          notes: `Suspended: ${reason}`,
          approvedById: adminId,
        },
      }),
    ]);

    return { success: true, message: 'Doctor suspended' };
  }

  async reactivateDoctor(adminId: number, doctorId: number, notes?: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) throw new ForbiddenException('Admin not found');

    const doctor = await this.prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    if (doctor.registrationStatus !== 'SUSPENDED') {
      throw new BadRequestException('Only suspended doctors can be reactivated');
    }

    await this.prisma.$transaction([
      this.prisma.doctor.update({
        where: { id: doctorId },
        data: {
          registrationStatus: 'APPROVED',
          suspendedAt: null,
          suspensionReason: null,
        },
      }),
      this.prisma.doctorVerification.create({
        data: {
          doctorId,
          action: 'REACTIVATED',
          notes: notes || 'Account reactivated',
          approvedById: adminId,
        },
      }),
    ]);

    return { success: true, message: 'Doctor reactivated' };
  }

  // ==================== DASHBOARD STATS ====================

  async getDashboardStats() {
    const [
      totalDoctors,
      pendingDoctors,
      approvedDoctors,
      suspendedDoctors,
      totalPatients,
      totalAppointments,
      todayAppointments,
    ] = await Promise.all([
      this.prisma.doctor.count(),
      this.prisma.doctor.count({ where: { registrationStatus: 'PENDING' } }),
      this.prisma.doctor.count({ where: { registrationStatus: 'APPROVED' } }),
      this.prisma.doctor.count({ where: { registrationStatus: 'SUSPENDED' } }),
      this.prisma.patient.count(),
      this.prisma.appointment.count(),
      this.prisma.appointment.count({
        where: {
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
    ]);

    return {
      doctors: {
        total: totalDoctors,
        pending: pendingDoctors,
        approved: approvedDoctors,
        suspended: suspendedDoctors,
      },
      patients: {
        total: totalPatients,
      },
      appointments: {
        total: totalAppointments,
        today: todayAppointments,
      },
    };
  }

  // ==================== HELPERS ====================

  private formatDoctorForAdmin(doctor: any, detailed = false) {
    const result: any = {
      id: doctor.id,
      nameEn: doctor.nameEn,
      nameBn: doctor.nameBn,
      gender: doctor.gender,
      dateOfBirth: doctor.dateOfBirth,
      profilePhoto: doctor.profilePhoto,
      primarySpecialty: doctor.primarySpecialty,
      
      // Verification Info
      bmdcNumber: doctor.bmdcNumber,
      bmdcCertificateUrl: doctor.bmdcCertificateUrl,
      nidNumber: doctor.nidNumber,
      nidFrontUrl: doctor.nidFrontUrl,
      nidBackUrl: doctor.nidBackUrl,
      
      // Status
      registrationStatus: doctor.registrationStatus,
      rejectionReason: doctor.rejectionReason,
      
      // Contact
      phone: doctor.user?.phone,
      email: doctor.user?.email,
      
      // Timestamps
      createdAt: doctor.createdAt,
      lastVerification: doctor.verifications?.[0],
      
      // Qualifications
      qualifications: doctor.qualifications?.map((q: any) => ({
        degree: q.degree,
        institution: q.institution,
        yearOfCompletion: q.yearOfCompletion,
        certificateUrl: q.certificateUrl,
      })),
    };

    if (detailed) {
      result.experiences = doctor.experiences;
      result.chambers = doctor.chambers;
      result.verificationHistory = doctor.verifications;
    }

    return result;
  }
}

