import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export enum AppointmentStatus {
  REQUESTED = 'REQUESTED',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum VisitType {
  NEW = 'NEW',
  FOLLOW_UP = 'FOLLOW_UP',
  REPORT_CHECK = 'REPORT_CHECK',
}

export enum ConsultationType {
  CHAMBER = 'CHAMBER',
  ONLINE = 'ONLINE',
  HOME_VISIT = 'HOME_VISIT',
}

interface CreateAppointmentDto {
  doctorId: number;
  chamberId: number;
  date: string;
  startTime: string;
  visitType: VisitType;
  consultationType?: ConsultationType;
  patientName?: string;
  patientPhone?: string;
  symptoms?: string;
}

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async create(patientId: number, dto: CreateAppointmentDto) {
    // Validate doctor exists and is approved
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: dto.doctorId },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }
    if (doctor.registrationStatus !== 'APPROVED') {
      throw new BadRequestException('Doctor is not available for appointments');
    }

    // Validate chamber exists and belongs to doctor
    const chamber = await this.prisma.doctorChamber.findFirst({
      where: {
        id: dto.chamberId,
        doctorId: dto.doctorId,
        isActive: true,
      },
    });
    if (!chamber) {
      throw new BadRequestException('Chamber not found or not available');
    }

    // Check for slot conflicts
    const existingAppointment = await this.prisma.appointment.findFirst({
      where: {
        doctorId: dto.doctorId,
        chamberId: dto.chamberId,
        date: new Date(dto.date),
        startTime: dto.startTime,
        status: { in: [AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED] },
      },
    });

    if (existingAppointment) {
      throw new BadRequestException('This time slot is already booked');
    }

    // Get serial number for the day
    const dayAppointments = await this.prisma.appointment.count({
      where: {
        doctorId: dto.doctorId,
        chamberId: dto.chamberId,
        date: new Date(dto.date),
        status: { in: [AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED] },
      },
    });
    const serialNumber = dayAppointments + 1;

    // Determine fee based on visit type
    let fee = chamber.consultationFee || doctor.consultationFeeNew;
    if (dto.visitType === VisitType.FOLLOW_UP) {
      fee = chamber.followUpFee || doctor.consultationFeeFollowUp || Math.round(fee * 0.5);
    } else if (dto.visitType === VisitType.REPORT_CHECK) {
      fee = chamber.reportCheckFee || doctor.consultationFeeReport || Math.round(fee * 0.3);
    }

    // Get patient info
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    // Create appointment
    const appointment = await this.prisma.appointment.create({
      data: {
        patientId,
        doctorId: dto.doctorId,
        chamberId: dto.chamberId,
        clinicId: chamber.clinicId,
        date: new Date(dto.date),
        startTime: dto.startTime,
        status: AppointmentStatus.REQUESTED,
        visitType: dto.visitType || VisitType.NEW,
        consultationType: dto.consultationType || ConsultationType.CHAMBER,
        serialNumber,
        patientName: dto.patientName || patient?.name,
        patientPhone: dto.patientPhone,
        patientGender: patient?.gender,
        symptoms: dto.symptoms,
        fee,
      },
      include: {
        doctor: true,
        chamber: true,
        patient: true,
      },
    });

    // Update doctor stats
    await this.prisma.doctor.update({
      where: { id: dto.doctorId },
      data: { totalAppointments: { increment: 1 } },
    });

    return this.formatAppointment(appointment);
  }

  async findByPatient(patientId: number, status?: string) {
    const where: any = { patientId };
    if (status) {
      where.status = status;
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        doctor: { select: { nameEn: true, nameBn: true, primarySpecialty: true, profilePhoto: true } },
        chamber: { select: { name: true, area: true, city: true, address: true } },
      },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    });

    return appointments.map(a => this.formatAppointment(a));
  }

  async findByDoctor(doctorId: number, date?: string, status?: string) {
    const where: any = { doctorId };
    if (date) {
      where.date = new Date(date);
    }
    if (status) {
      where.status = status;
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { name: true, gender: true, bloodGroup: true } },
        chamber: { select: { name: true, area: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return appointments.map(a => this.formatAppointment(a));
  }

  async getTodayQueue(doctorId: number, chamberId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        chamberId,
        date: today,
        status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.REQUESTED, AppointmentStatus.CHECKED_IN] },
      },
      include: {
        patient: { select: { name: true, gender: true } },
      },
      orderBy: { serialNumber: 'asc' },
    });

    const currentIndex = appointments.findIndex(a => a.status === AppointmentStatus.IN_PROGRESS);

    return {
      total: appointments.length,
      current: currentIndex >= 0 ? currentIndex + 1 : 0,
      queue: appointments.map((a, idx) => ({
        id: a.id,
        serial: a.serialNumber,
        patientName: a.patientName || a.patient?.name,
        patientGender: a.patientGender || a.patient?.gender,
        time: a.startTime,
        status: a.status,
        visitType: a.visitType,
        symptoms: a.symptoms,
      })),
    };
  }

  async updateStatus(appointmentId: number, doctorId: number, status: AppointmentStatus) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.doctorId !== doctorId) {
      throw new ForbiddenException('Not authorized to update this appointment');
    }

    const updateData: any = { status };

    // Set timestamps based on status
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        updateData.confirmedAt = new Date();
        break;
      case AppointmentStatus.CHECKED_IN:
        updateData.checkedInAt = new Date();
        break;
      case AppointmentStatus.IN_PROGRESS:
        updateData.startedAt = new Date();
        break;
      case AppointmentStatus.COMPLETED:
        updateData.completedAt = new Date();
        // Update doctor's patient count
        await this.prisma.doctor.update({
          where: { id: doctorId },
          data: { totalPatients: { increment: 1 } },
        });
        break;
      case AppointmentStatus.CANCELLED:
        updateData.cancelledAt = new Date();
        break;
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: updateData,
      include: {
        doctor: true,
        chamber: true,
        patient: true,
      },
    });

    return this.formatAppointment(updated);
  }

  async cancel(appointmentId: number, userId: number, role: string, reason?: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { 
        patient: { include: { user: true } }, 
        doctor: { include: { user: true } } 
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const isPatient = role === 'PATIENT' && appointment.patient.user.id === userId;
    const isDoctor = role === 'DOCTOR' && appointment.doctor.user.id === userId;

    if (!isPatient && !isDoctor) {
      throw new ForbiddenException('Not authorized to cancel this appointment');
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { 
        status: AppointmentStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
      include: {
        doctor: true,
        chamber: true,
        patient: true,
      },
    });

    return this.formatAppointment(updated);
  }

  async getAvailableSlots(doctorId: number, chamberId: number, date: string) {
    const chamber = await this.prisma.doctorChamber.findFirst({
      where: { id: chamberId, doctorId, isActive: true },
      include: { doctor: true },
    });

    if (!chamber) {
      throw new NotFoundException('Chamber not found');
    }

    // Get booked slots
    const bookedAppointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        chamberId,
        date: new Date(date),
        status: { in: [AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED] },
      },
      select: { startTime: true, serialNumber: true },
    });

    const bookedTimes = new Set(bookedAppointments.map(a => a.startTime));
    const maxSerial = bookedAppointments.reduce((max, a) => Math.max(max, a.serialNumber || 0), 0);

    // Generate all possible slots
    const slots: { time: string; available: boolean; serial: number }[] = [];
    const [startHour, startMin] = chamber.startTime.split(':').map(Number);
    const [endHour, endMin] = chamber.endTime.split(':').map(Number);
    const slotMinutes = chamber.slotDuration;

    let currentTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    let serial = 1;

    while (currentTime < endTime) {
      const hours = Math.floor(currentTime / 60);
      const mins = currentTime % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      const isBooked = bookedTimes.has(timeStr);
      
      slots.push({
        time: timeStr,
        available: !isBooked,
        serial: isBooked ? 0 : maxSerial + serial++,
      });

      currentTime += slotMinutes;
    }

    return {
      date,
      doctorId,
      chamberId,
      chamberName: chamber.name,
      schedule: {
        startTime: chamber.startTime,
        endTime: chamber.endTime,
        slotMinutes: chamber.slotDuration,
      },
      fees: {
        new: chamber.consultationFee || chamber.doctor.consultationFeeNew,
        followUp: chamber.followUpFee || chamber.doctor.consultationFeeFollowUp,
        reportCheck: chamber.reportCheckFee || chamber.doctor.consultationFeeReport,
      },
      slots,
    };
  }

  async checkPatientHistory(patientId: number, doctorId: number) {
    const previousVisits = await this.prisma.appointment.findMany({
      where: {
        patientId,
        doctorId,
        status: AppointmentStatus.COMPLETED,
      },
      orderBy: { date: 'desc' },
      take: 5,
    });

    const lastVisit = previousVisits[0];
    const visitCount = previousVisits.length;

    let suggestedVisitType = VisitType.NEW;
    if (visitCount > 0 && lastVisit) {
      const daysSinceLastVisit = Math.floor(
        (Date.now() - new Date(lastVisit.date).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastVisit <= 30) {
        suggestedVisitType = VisitType.FOLLOW_UP;
      } else if (daysSinceLastVisit <= 7) {
        suggestedVisitType = VisitType.REPORT_CHECK;
      }
    }

    return {
      isReturningPatient: visitCount > 0,
      totalVisits: visitCount,
      lastVisitDate: lastVisit?.date,
      suggestedVisitType,
    };
  }

  private formatAppointment(appointment: any) {
    return {
      id: appointment.id,
      date: appointment.date,
      startTime: appointment.startTime,
      status: appointment.status,
      visitType: appointment.visitType,
      consultationType: appointment.consultationType,
      serialNumber: appointment.serialNumber,
      patientName: appointment.patientName,
      patientPhone: appointment.patientPhone,
      patientGender: appointment.patientGender,
      symptoms: appointment.symptoms,
      fee: appointment.fee,
      isPaid: appointment.isPaid,
      createdAt: appointment.createdAt,
      confirmedAt: appointment.confirmedAt,
      completedAt: appointment.completedAt,
      doctor: appointment.doctor ? {
        id: appointment.doctor.id,
        name: appointment.doctor.nameEn,
        nameBn: appointment.doctor.nameBn,
        specialty: appointment.doctor.primarySpecialty,
        photo: appointment.doctor.profilePhoto,
      } : undefined,
      patient: appointment.patient ? {
        id: appointment.patient.id,
        name: appointment.patient.name,
        gender: appointment.patient.gender,
      } : undefined,
      chamber: appointment.chamber ? {
        id: appointment.chamber.id,
        name: appointment.chamber.name,
        area: appointment.chamber.area,
        city: appointment.chamber.city,
        address: appointment.chamber.address,
      } : undefined,
    };
  }
}
