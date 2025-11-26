import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface DoctorSearchFilters {
  specialty?: string;
  area?: string;
  hospital?: string;
  gender?: string;
  minFee?: number;
  maxFee?: number;
  minExperience?: number;
  minRating?: number;
  search?: string;
}

@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  // Get all doctors with filters
  async findAll(filters: DoctorSearchFilters = {}) {
    const where: any = {};

    if (filters.specialty) {
      where.specialty = { contains: filters.specialty, mode: 'insensitive' };
    }

    if (filters.gender) {
      where.gender = filters.gender;
    }

    if (filters.minFee !== undefined || filters.maxFee !== undefined) {
      where.fee = {};
      if (filters.minFee !== undefined) where.fee.gte = filters.minFee;
      if (filters.maxFee !== undefined) where.fee.lte = filters.maxFee;
    }

    if (filters.minExperience !== undefined) {
      where.experienceYears = { gte: filters.minExperience };
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { specialty: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const doctors = await this.prisma.doctor.findMany({
      where,
      include: {
        user: { select: { phone: true } },
        doctorClinics: {
          include: {
            clinic: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Filter by area/hospital if specified (requires join filtering)
    let results = doctors;

    if (filters.area) {
      results = results.filter(d => 
        d.doctorClinics.some(dc => dc.clinic.area === filters.area)
      );
    }

    if (filters.hospital) {
      results = results.filter(d => 
        d.doctorClinics.some(dc => dc.clinic.name === filters.hospital)
      );
    }

    return results.map(d => this.formatDoctor(d));
  }

  // Get single doctor by ID
  async findOne(id: number) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: {
        user: { select: { phone: true } },
        doctorClinics: {
          include: {
            clinic: true,
          },
        },
      },
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }

    return this.formatDoctor(doctor);
  }

  // Get doctor by user ID
  async findByUserId(userId: number) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId },
      include: {
        user: { select: { phone: true } },
        doctorClinics: {
          include: {
            clinic: true,
          },
        },
      },
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor profile not found`);
    }

    return this.formatDoctor(doctor);
  }

  // Update doctor profile
  async update(id: number, data: {
    name?: string;
    specialty?: string;
    gender?: string;
    degrees?: string;
    fee?: number;
    experienceYears?: number;
  }) {
    const doctor = await this.prisma.doctor.update({
      where: { id },
      data,
      include: {
        user: { select: { phone: true } },
        doctorClinics: {
          include: {
            clinic: true,
          },
        },
      },
    });

    return this.formatDoctor(doctor);
  }

  // Get all unique specialties
  async getSpecialties() {
    const doctors = await this.prisma.doctor.findMany({
      select: { specialty: true },
      distinct: ['specialty'],
    });
    return doctors.map(d => d.specialty).filter(Boolean).sort();
  }

  // Get all unique areas
  async getAreas() {
    const clinics = await this.prisma.clinic.findMany({
      select: { area: true },
      distinct: ['area'],
    });
    return clinics.map(c => c.area).sort();
  }

  // Get all hospitals/clinics
  async getHospitals() {
    const clinics = await this.prisma.clinic.findMany({
      select: { id: true, name: true, area: true },
      distinct: ['name'],
      orderBy: { name: 'asc' },
    });
    return clinics;
  }

  // Format doctor response
  private formatDoctor(doctor: any) {
    return {
      id: doctor.id,
      name: doctor.name,
      specialty: doctor.specialty,
      gender: doctor.gender,
      degrees: doctor.degrees,
      fee: doctor.fee,
      experienceYears: doctor.experienceYears,
      phone: doctor.user?.phone,
      clinics: doctor.doctorClinics?.map((dc: any) => ({
        id: dc.clinic.id,
        name: dc.clinic.name,
        area: dc.clinic.area,
        city: dc.clinic.city,
        address: dc.clinic.address,
        schedule: {
          daysOfWeek: dc.daysOfWeek,
          startTime: dc.startTime,
          endTime: dc.endTime,
          slotMinutes: dc.slotMinutes,
        },
      })) || [],
    };
  }
}

