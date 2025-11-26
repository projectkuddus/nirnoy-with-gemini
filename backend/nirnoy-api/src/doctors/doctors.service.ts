import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  DoctorRegistrationDto, 
  DoctorProfileUpdateDto,
  DoctorQualificationDto,
  DoctorExperienceDto,
  DoctorChamberDto,
  DoctorAchievementDto,
  DoctorPublicationDto,
  DoctorMembershipDto,
  DoctorTrainingDto,
  DoctorServiceDto,
  DoctorFAQDto
} from './dto/doctor-registration.dto';

@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  // ==================== REGISTRATION ====================

  async register(userId: number, dto: DoctorRegistrationDto) {
    // Check if user already has a doctor profile
    const existingDoctor = await this.prisma.doctor.findUnique({
      where: { userId },
    });

    if (existingDoctor) {
      throw new BadRequestException('Doctor profile already exists for this user');
    }

    // Check if BMDC number is already registered
    if (dto.bmdcNumber) {
      const existingBmdc = await this.prisma.doctor.findUnique({
        where: { bmdcNumber: dto.bmdcNumber },
      });
      if (existingBmdc) {
        throw new BadRequestException('This BMDC number is already registered');
      }
    }

    // Generate slug from name
    const slug = this.generateSlug(dto.nameEn);

    // Create doctor profile
    const doctor = await this.prisma.doctor.create({
      data: {
        userId,
        nameEn: dto.nameEn,
        nameBn: dto.nameBn,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        primarySpecialty: dto.primarySpecialty,
        slug,
        bmdcNumber: dto.bmdcNumber,
        bmdcCertificateUrl: dto.bmdcCertificateUrl,
        nidNumber: dto.nidNumber,
        nidFrontUrl: dto.nidFrontUrl,
        nidBackUrl: dto.nidBackUrl,
        profilePhoto: dto.profilePhotoUrl,
        registrationStatus: 'PENDING',
        consultationFeeNew: 0,
        
        // Create primary qualification
        qualifications: {
          create: {
            degree: dto.primaryDegree,
            institution: dto.primaryInstitution,
            yearOfCompletion: dto.primaryYearOfCompletion,
            displayOrder: 0,
          },
        },
        
        // Create verification record
        verifications: {
          create: {
            action: 'SUBMITTED',
            notes: 'Initial registration submitted',
          },
        },
      },
      include: {
        qualifications: true,
        verifications: true,
      },
    });

    // Update user email if provided
    if (dto.email) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { email: dto.email },
      });
    }

    return {
      success: true,
      message: 'Registration submitted successfully. Your profile is under review.',
      doctor: this.formatDoctorBasic(doctor),
    };
  }

  // ==================== SEARCH & DISCOVERY ====================

  async findAll(filters: {
    specialty?: string;
    area?: string;
    city?: string;
    hospital?: string;
    gender?: string;
    minFee?: number;
    maxFee?: number;
    minExperience?: number;
    minRating?: number;
    search?: string;
    isAvailableForOnline?: boolean;
    page?: number;
    limit?: number;
  } = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      registrationStatus: 'APPROVED', // Only show approved doctors
    };

    if (filters.specialty) {
      where.OR = [
        { primarySpecialty: { contains: filters.specialty } },
        { specializations: { some: { name: { contains: filters.specialty } } } },
      ];
    }

    if (filters.gender) {
      where.gender = filters.gender;
    }

    if (filters.minFee !== undefined || filters.maxFee !== undefined) {
      where.consultationFeeNew = {};
      if (filters.minFee !== undefined) where.consultationFeeNew.gte = filters.minFee;
      if (filters.maxFee !== undefined) where.consultationFeeNew.lte = filters.maxFee;
    }

    if (filters.minExperience !== undefined) {
      where.experienceYears = { gte: filters.minExperience };
    }

    if (filters.minRating !== undefined) {
      where.averageRating = { gte: filters.minRating };
    }

    if (filters.isAvailableForOnline) {
      where.isAvailableForOnline = true;
    }

    if (filters.search) {
      where.OR = [
        { nameEn: { contains: filters.search } },
        { nameBn: { contains: filters.search } },
        { primarySpecialty: { contains: filters.search } },
        { bmdcNumber: { contains: filters.search } },
      ];
    }

    const [doctors, total] = await Promise.all([
      this.prisma.doctor.findMany({
        where,
        include: {
          qualifications: { orderBy: { displayOrder: 'asc' }, take: 3 },
          specializations: { where: { isPrimary: true } },
          chambers: { where: { isActive: true }, take: 2 },
        },
        orderBy: [
          { averageRating: 'desc' },
          { totalPatients: 'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.doctor.count({ where }),
    ]);

    // Filter by area/hospital if specified (requires chamber filtering)
    let results = doctors;
    if (filters.area) {
      results = results.filter(d => 
        d.chambers.some(c => c.area.toLowerCase().includes(filters.area!.toLowerCase()))
      );
    }
    if (filters.hospital) {
      results = results.filter(d => 
        d.chambers.some(c => c.name.toLowerCase().includes(filters.hospital!.toLowerCase()))
      );
    }

    return {
      doctors: results.map(d => this.formatDoctorCard(d)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== DOCTOR PROFILE (Public) ====================

  async getPublicProfile(idOrSlug: string) {
    const isNumeric = /^\d+$/.test(idOrSlug);
    
    const doctor = await this.prisma.doctor.findFirst({
      where: isNumeric 
        ? { id: parseInt(idOrSlug), registrationStatus: 'APPROVED' }
        : { slug: idOrSlug, registrationStatus: 'APPROVED' },
      include: {
        qualifications: { orderBy: { displayOrder: 'asc' } },
        specializations: true,
        experiences: { orderBy: { startDate: 'desc' } },
        chambers: { where: { isActive: true }, orderBy: { isPrimary: 'desc' } },
        achievements: { orderBy: { year: 'desc' } },
        publications: { orderBy: { year: 'desc' }, take: 10 },
        memberships: { where: { isActive: true } },
        trainings: { orderBy: { year: 'desc' } },
        services: { where: { isAvailable: true } },
        faqs: { where: { isPublished: true }, orderBy: { displayOrder: 'asc' } },
        reviews: { 
          where: { isPublished: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { patient: { select: { name: true } } },
        },
      },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return this.formatDoctorFullProfile(doctor);
  }

  // ==================== DOCTOR PROFILE (Own - For Dashboard) ====================

  async getOwnProfile(userId: number) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId },
      include: {
        qualifications: { orderBy: { displayOrder: 'asc' } },
        specializations: true,
        experiences: { orderBy: { startDate: 'desc' } },
        chambers: { orderBy: { isPrimary: 'desc' } },
        achievements: { orderBy: { year: 'desc' } },
        publications: { orderBy: { year: 'desc' } },
        memberships: true,
        trainings: { orderBy: { year: 'desc' } },
        services: true,
        faqs: { orderBy: { displayOrder: 'asc' } },
        verifications: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    return this.formatDoctorFullProfile(doctor, true);
  }

  // ==================== PROFILE UPDATE ====================

  async updateProfile(userId: number, dto: DoctorProfileUpdateDto) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    const updateData: any = {};

    // Map DTO fields to database fields
    if (dto.nameEn !== undefined) updateData.nameEn = dto.nameEn;
    if (dto.nameBn !== undefined) updateData.nameBn = dto.nameBn;
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.profilePhoto !== undefined) updateData.profilePhoto = dto.profilePhoto;
    if (dto.coverPhoto !== undefined) updateData.coverPhoto = dto.coverPhoto;
    if (dto.bioEn !== undefined) updateData.bioEn = dto.bioEn;
    if (dto.bioBn !== undefined) updateData.bioBn = dto.bioBn;
    if (dto.tagline !== undefined) updateData.tagline = dto.tagline;
    if (dto.consultationFeeNew !== undefined) updateData.consultationFeeNew = dto.consultationFeeNew;
    if (dto.consultationFeeFollowUp !== undefined) updateData.consultationFeeFollowUp = dto.consultationFeeFollowUp;
    if (dto.consultationFeeReport !== undefined) updateData.consultationFeeReport = dto.consultationFeeReport;
    if (dto.onlineConsultationFee !== undefined) updateData.onlineConsultationFee = dto.onlineConsultationFee;
    if (dto.avgConsultationTime !== undefined) updateData.avgConsultationTime = dto.avgConsultationTime;
    if (dto.isAvailableForOnline !== undefined) updateData.isAvailableForOnline = dto.isAvailableForOnline;
    if (dto.isAvailableForHomeVisit !== undefined) updateData.isAvailableForHomeVisit = dto.isAvailableForHomeVisit;
    if (dto.homeVisitFee !== undefined) updateData.homeVisitFee = dto.homeVisitFee;
    if (dto.homeVisitAreas !== undefined) updateData.homeVisitAreas = JSON.stringify(dto.homeVisitAreas);
    if (dto.languages !== undefined) updateData.languages = dto.languages.join(',');
    if (dto.professionalEmail !== undefined) updateData.professionalEmail = dto.professionalEmail;
    if (dto.professionalPhone !== undefined) updateData.professionalPhone = dto.professionalPhone;
    if (dto.websiteUrl !== undefined) updateData.websiteUrl = dto.websiteUrl;
    if (dto.linkedinUrl !== undefined) updateData.linkedinUrl = dto.linkedinUrl;
    if (dto.facebookUrl !== undefined) updateData.facebookUrl = dto.facebookUrl;
    if (dto.twitterUrl !== undefined) updateData.twitterUrl = dto.twitterUrl;
    if (dto.youtubeUrl !== undefined) updateData.youtubeUrl = dto.youtubeUrl;
    if (dto.researchGateUrl !== undefined) updateData.researchGateUrl = dto.researchGateUrl;
    if (dto.showPhonePublicly !== undefined) updateData.showPhonePublicly = dto.showPhonePublicly;
    if (dto.showEmailPublicly !== undefined) updateData.showEmailPublicly = dto.showEmailPublicly;
    if (dto.acceptNewPatients !== undefined) updateData.acceptNewPatients = dto.acceptNewPatients;

    const updated = await this.prisma.doctor.update({
      where: { userId },
      data: updateData,
    });

    return { success: true, message: 'Profile updated successfully' };
  }

  // ==================== QUALIFICATIONS CRUD ====================

  async addQualification(userId: number, dto: DoctorQualificationDto) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const qualification = await this.prisma.doctorQualification.create({
      data: {
        doctorId: doctor.id,
        degree: dto.degree,
        field: dto.field,
        institution: dto.institution,
        institutionCity: dto.institutionCity,
        institutionCountry: dto.institutionCountry || 'Bangladesh',
        yearOfCompletion: dto.yearOfCompletion,
        certificateUrl: dto.certificateUrl,
      },
    });

    return qualification;
  }

  async updateQualification(userId: number, qualId: number, dto: Partial<DoctorQualificationDto>) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const qual = await this.prisma.doctorQualification.findFirst({
      where: { id: qualId, doctorId: doctor.id },
    });
    if (!qual) throw new NotFoundException('Qualification not found');

    return this.prisma.doctorQualification.update({
      where: { id: qualId },
      data: dto,
    });
  }

  async deleteQualification(userId: number, qualId: number) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const qual = await this.prisma.doctorQualification.findFirst({
      where: { id: qualId, doctorId: doctor.id },
    });
    if (!qual) throw new NotFoundException('Qualification not found');

    await this.prisma.doctorQualification.delete({ where: { id: qualId } });
    return { success: true };
  }

  // ==================== EXPERIENCE CRUD ====================

  async addExperience(userId: number, dto: DoctorExperienceDto) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const experience = await this.prisma.doctorExperience.create({
      data: {
        doctorId: doctor.id,
        position: dto.position,
        department: dto.department,
        institution: dto.institution,
        institutionType: dto.institutionType,
        city: dto.city,
        country: dto.country || 'Bangladesh',
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isCurrent: dto.isCurrent || false,
        description: dto.description,
      },
    });

    // Update experience years
    await this.updateExperienceYears(doctor.id);

    return experience;
  }

  async updateExperience(userId: number, expId: number, dto: Partial<DoctorExperienceDto>) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const exp = await this.prisma.doctorExperience.findFirst({
      where: { id: expId, doctorId: doctor.id },
    });
    if (!exp) throw new NotFoundException('Experience not found');

    const updateData: any = { ...dto };
    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);

    const updated = await this.prisma.doctorExperience.update({
      where: { id: expId },
      data: updateData,
    });

    await this.updateExperienceYears(doctor.id);
    return updated;
  }

  async deleteExperience(userId: number, expId: number) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    await this.prisma.doctorExperience.delete({ where: { id: expId } });
    await this.updateExperienceYears(doctor.id);
    return { success: true };
  }

  // ==================== CHAMBER CRUD ====================

  async addChamber(userId: number, dto: DoctorChamberDto) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const chamber = await this.prisma.doctorChamber.create({
      data: {
        doctorId: doctor.id,
        name: dto.name,
        type: dto.type,
        address: dto.address,
        area: dto.area,
        city: dto.city,
        district: dto.district || dto.city,
        postalCode: dto.postalCode,
        landmark: dto.landmark,
        googleMapsUrl: dto.googleMapsUrl,
        phone: dto.phone,
        daysOfWeek: dto.daysOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        slotDuration: dto.slotDuration || 15,
        maxPatients: dto.maxPatients,
        consultationFee: dto.consultationFee,
        followUpFee: dto.followUpFee,
        reportCheckFee: dto.reportCheckFee,
        isPrimary: dto.isPrimary || false,
        hasParking: dto.hasParking || false,
        hasWheelchairAccess: dto.hasWheelchairAccess || false,
        hasAC: dto.hasAC !== undefined ? dto.hasAC : true,
      },
    });

    return chamber;
  }

  async updateChamber(userId: number, chamberId: number, dto: Partial<DoctorChamberDto>) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const chamber = await this.prisma.doctorChamber.findFirst({
      where: { id: chamberId, doctorId: doctor.id },
    });
    if (!chamber) throw new NotFoundException('Chamber not found');

    return this.prisma.doctorChamber.update({
      where: { id: chamberId },
      data: dto,
    });
  }

  async deleteChamber(userId: number, chamberId: number) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    await this.prisma.doctorChamber.delete({ where: { id: chamberId } });
    return { success: true };
  }

  // ==================== FILTER OPTIONS ====================

  async getSpecialties() {
    const specialties = await this.prisma.specialty.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    if (specialties.length === 0) {
      // Return from doctors if no master list
      const doctors = await this.prisma.doctor.findMany({
        select: { primarySpecialty: true },
        distinct: ['primarySpecialty'],
      });
      return doctors.map(d => d.primarySpecialty).filter(Boolean).sort();
    }

    return specialties;
  }

  async getAreas() {
    const chambers = await this.prisma.doctorChamber.findMany({
      select: { area: true, city: true },
      distinct: ['area'],
      where: { isActive: true },
    });
    return chambers.map(c => ({ area: c.area, city: c.city }));
  }

  async getHospitals() {
    const chambers = await this.prisma.doctorChamber.findMany({
      select: { name: true, area: true, city: true },
      distinct: ['name'],
      where: { isActive: true, type: 'HOSPITAL' },
      orderBy: { name: 'asc' },
    });
    return chambers;
  }

  // ==================== HELPER METHODS ====================

  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return `${base}-${Date.now().toString(36)}`;
  }

  private async updateExperienceYears(doctorId: number) {
    const experiences = await this.prisma.doctorExperience.findMany({
      where: { doctorId },
    });

    let totalMonths = 0;
    const now = new Date();

    for (const exp of experiences) {
      const start = new Date(exp.startDate);
      const end = exp.isCurrent ? now : (exp.endDate || now);
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      totalMonths += Math.max(0, months);
    }

    const years = Math.floor(totalMonths / 12);

    await this.prisma.doctor.update({
      where: { id: doctorId },
      data: { experienceYears: years },
    });
  }

  // ==================== FORMATTERS ====================

  private formatDoctorBasic(doctor: any) {
    return {
      id: doctor.id,
      nameEn: doctor.nameEn,
      nameBn: doctor.nameBn,
      slug: doctor.slug,
      registrationStatus: doctor.registrationStatus,
      bmdcNumber: doctor.bmdcNumber,
      bmdcVerified: doctor.bmdcVerified,
    };
  }

  private formatDoctorCard(doctor: any) {
    const primaryChamber = doctor.chambers?.find((c: any) => c.isPrimary) || doctor.chambers?.[0];
    const degrees = doctor.qualifications?.map((q: any) => q.degree).join(', ') || '';

    return {
      id: doctor.id,
      slug: doctor.slug,
      title: doctor.title,
      nameEn: doctor.nameEn,
      nameBn: doctor.nameBn,
      profilePhoto: doctor.profilePhoto,
      primarySpecialty: doctor.primarySpecialty,
      specializations: doctor.specializations?.map((s: any) => s.name) || [],
      degrees,
      experienceYears: doctor.experienceYears,
      consultationFee: doctor.consultationFeeNew,
      averageRating: doctor.averageRating,
      totalReviews: doctor.totalReviews,
      totalPatients: doctor.totalPatients,
      bmdcVerified: doctor.bmdcVerified,
      isAvailableForOnline: doctor.isAvailableForOnline,
      acceptNewPatients: doctor.acceptNewPatients,
      primaryChamber: primaryChamber ? {
        name: primaryChamber.name,
        area: primaryChamber.area,
        city: primaryChamber.city,
        daysOfWeek: primaryChamber.daysOfWeek,
        startTime: primaryChamber.startTime,
        endTime: primaryChamber.endTime,
      } : null,
    };
  }

  private formatDoctorFullProfile(doctor: any, includePrivate = false) {
    const result: any = {
      id: doctor.id,
      slug: doctor.slug,
      
      // Basic Info
      title: doctor.title,
      nameEn: doctor.nameEn,
      nameBn: doctor.nameBn,
      gender: doctor.gender,
      profilePhoto: doctor.profilePhoto,
      coverPhoto: doctor.coverPhoto,
      
      // Professional
      primarySpecialty: doctor.primarySpecialty,
      tagline: doctor.tagline,
      bioEn: doctor.bioEn,
      bioBn: doctor.bioBn,
      experienceYears: doctor.experienceYears,
      languages: doctor.languages?.split(',') || [],
      
      // Verification
      bmdcNumber: doctor.bmdcNumber,
      bmdcVerified: doctor.bmdcVerified,
      registrationStatus: doctor.registrationStatus,
      
      // Consultation
      consultationFeeNew: doctor.consultationFeeNew,
      consultationFeeFollowUp: doctor.consultationFeeFollowUp,
      consultationFeeReport: doctor.consultationFeeReport,
      onlineConsultationFee: doctor.onlineConsultationFee,
      avgConsultationTime: doctor.avgConsultationTime,
      
      // Availability
      isAvailableForOnline: doctor.isAvailableForOnline,
      isAvailableForHomeVisit: doctor.isAvailableForHomeVisit,
      homeVisitFee: doctor.homeVisitFee,
      acceptNewPatients: doctor.acceptNewPatients,
      
      // Stats
      averageRating: doctor.averageRating,
      totalReviews: doctor.totalReviews,
      totalPatients: doctor.totalPatients,
      
      // Social
      websiteUrl: doctor.websiteUrl,
      linkedinUrl: doctor.linkedinUrl,
      facebookUrl: doctor.facebookUrl,
      researchGateUrl: doctor.researchGateUrl,
      
      // Related data
      qualifications: doctor.qualifications?.map((q: any) => ({
        id: q.id,
        degree: q.degree,
        field: q.field,
        institution: q.institution,
        institutionCity: q.institutionCity,
        institutionCountry: q.institutionCountry,
        yearOfCompletion: q.yearOfCompletion,
        isVerified: q.isVerified,
      })) || [],
      
      specializations: doctor.specializations?.map((s: any) => ({
        id: s.id,
        name: s.name,
        isPrimary: s.isPrimary,
        yearsOfPractice: s.yearsOfPractice,
      })) || [],
      
      experiences: doctor.experiences?.map((e: any) => ({
        id: e.id,
        position: e.position,
        department: e.department,
        institution: e.institution,
        institutionType: e.institutionType,
        city: e.city,
        country: e.country,
        startDate: e.startDate,
        endDate: e.endDate,
        isCurrent: e.isCurrent,
        description: e.description,
      })) || [],
      
      chambers: doctor.chambers?.map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        address: c.address,
        area: c.area,
        city: c.city,
        landmark: c.landmark,
        googleMapsUrl: c.googleMapsUrl,
        phone: c.phone,
        daysOfWeek: c.daysOfWeek,
        startTime: c.startTime,
        endTime: c.endTime,
        slotDuration: c.slotDuration,
        consultationFee: c.consultationFee || doctor.consultationFeeNew,
        followUpFee: c.followUpFee || doctor.consultationFeeFollowUp,
        reportCheckFee: c.reportCheckFee || doctor.consultationFeeReport,
        isPrimary: c.isPrimary,
        isActive: c.isActive,
        hasParking: c.hasParking,
        hasWheelchairAccess: c.hasWheelchairAccess,
        hasAC: c.hasAC,
      })) || [],
      
      achievements: doctor.achievements?.map((a: any) => ({
        id: a.id,
        title: a.title,
        type: a.type,
        organization: a.organization,
        year: a.year,
        description: a.description,
      })) || [],
      
      publications: doctor.publications?.map((p: any) => ({
        id: p.id,
        title: p.title,
        type: p.type,
        journal: p.journal,
        year: p.year,
        authors: p.authors,
        doi: p.doi,
        url: p.url,
        citationCount: p.citationCount,
      })) || [],
      
      memberships: doctor.memberships?.map((m: any) => ({
        id: m.id,
        organization: m.organization,
        membershipType: m.membershipType,
        joinedYear: m.joinedYear,
        isActive: m.isActive,
      })) || [],
      
      trainings: doctor.trainings?.map((t: any) => ({
        id: t.id,
        title: t.title,
        type: t.type,
        institution: t.institution,
        country: t.country,
        year: t.year,
        duration: t.duration,
      })) || [],
      
      services: doctor.services?.map((s: any) => ({
        id: s.id,
        name: s.name,
        nameBn: s.nameBn,
        description: s.description,
        fee: s.fee,
        duration: s.duration,
      })) || [],
      
      faqs: doctor.faqs?.map((f: any) => ({
        id: f.id,
        question: f.question,
        questionBn: f.questionBn,
        answer: f.answer,
        answerBn: f.answerBn,
      })) || [],
      
      reviews: doctor.reviews?.map((r: any) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        patientName: r.patient?.name?.charAt(0) + '***', // Privacy
        createdAt: r.createdAt,
        doctorReply: r.doctorReply,
      })) || [],
    };

    // Include private data for own profile
    if (includePrivate) {
      result.nidNumber = doctor.nidNumber;
      result.nidVerified = doctor.nidVerified;
      result.professionalEmail = doctor.professionalEmail;
      result.professionalPhone = doctor.professionalPhone;
      result.showPhonePublicly = doctor.showPhonePublicly;
      result.showEmailPublicly = doctor.showEmailPublicly;
      result.verifications = doctor.verifications;
      result.rejectionReason = doctor.rejectionReason;
    } else {
      // Only show contact if allowed
      if (doctor.showPhonePublicly) {
        result.professionalPhone = doctor.professionalPhone;
      }
      if (doctor.showEmailPublicly) {
        result.professionalEmail = doctor.professionalEmail;
      }
    }

    return result;
  }
}
