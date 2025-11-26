import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export enum AppointmentStatus {
  REQUESTED = 'REQUESTED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum VisitType {
  NEW = 'NEW',           // First time patient
  FOLLOW_UP = 'FOLLOW_UP', // Returning for same issue
  REPORT_CHECK = 'REPORT_CHECK', // Coming to show test reports
}

export enum ConsultationType {
  CHAMBER = 'CHAMBER',
  ONLINE = 'ONLINE',
}

interface CreateAppointmentDto {
  doctorId: number;
  clinicId: number;
  date: string; // ISO date string
  startTime: string; // HH:mm
  visitType: VisitType;
  consultationType?: ConsultationType;
  patientName?: string;
  patientPhone?: string;
  symptoms?: string;
}

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  // Create new appointment (patient)
  async create(patientId: number, dto: CreateAppointmentDto) {
    // Validate doctor exists
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: dto.doctorId },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    // Validate clinic exists and doctor practices there
    const doctorClinic = await this.prisma.doctorClinic.findFirst({
      where: {
        doctorId: dto.doctorId,
        clinicId: dto.clinicId,
      },
    });
    if (!doctorClinic) {
      throw new BadRequestException('Doctor does not practice at this clinic');
    }

    // Check for slot conflicts
    const existingAppointment = await this.prisma.appointment.findFirst({
      where: {
        doctorId: dto.doctorId,
        clinicId: dto.clinicId,
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
        clinicId: dto.clinicId,
        date: new Date(dto.date),
        status: { in: [AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED] },
      },
    });
    const serialNumber = dayAppointments + 1;

    // Determine fee based on visit type
    let fee = doctor.fee;
    if (dto.visitType === VisitType.FOLLOW_UP) {
      fee = Math.round(doctor.fee * 0.5); // 50% for follow-up
    } else if (dto.visitType === VisitType.REPORT_CHECK) {
      fee = Math.round(doctor.fee * 0.3); // 30% for report check
    }

    // Create appointment
    const appointment = await this.prisma.appointment.create({
      data: {
        patientId,
        doctorId: dto.doctorId,
        clinicId: dto.clinicId,
        date: new Date(dto.date),
        startTime: dto.startTime,
        status: AppointmentStatus.REQUESTED,
        visitType: dto.visitType || VisitType.NEW,
        consultationType: dto.consultationType || ConsultationType.CHAMBER,
        serialNumber,
        patientName: dto.patientName,
        patientPhone: dto.patientPhone,
        symptoms: dto.symptoms,
        fee,
      },
      include: {
        doctor: true,
        clinic: true,
        patient: true,
      },
    });

    return this.formatAppointment(appointment);
  }

  // Check if patient has visited this doctor before
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

    // Suggest visit type based on history
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

  // Get appointments for a patient
  async findByPatient(patientId: number, status?: string) {
    const where: any = { patientId };
    if (status) {
      where.status = status;
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        doctor: true,
        clinic: true,
      },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    });

    return appointments.map(a => this.formatAppointment(a));
  }

  // Get appointments for a doctor
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
        patient: true,
        clinic: true,
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return appointments.map(a => this.formatAppointment(a));
  }

  // Get today's queue for a doctor at a clinic
  async getTodayQueue(doctorId: number, clinicId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        clinicId,
        date: today,
        status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.REQUESTED] },
      },
      include: {
        patient: true,
      },
      orderBy: { startTime: 'asc' },
    });

    return {
      total: appointments.length,
      current: appointments.findIndex(a => a.status === AppointmentStatus.CONFIRMED) + 1,
      queue: appointments.map((a, idx) => ({
        serial: idx + 1,
        patientName: a.patient.name,
        time: a.startTime,
        status: a.status,
      })),
    };
  }

  // Update appointment status (doctor)
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

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status },
      include: {
        doctor: true,
        clinic: true,
        patient: true,
      },
    });

    return this.formatAppointment(updated);
  }

  // Cancel appointment (patient or doctor)
  async cancel(appointmentId: number, userId: number, role: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: { include: { user: true } }, doctor: { include: { user: true } } },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check authorization
    const isPatient = role === 'PATIENT' && appointment.patient.user.id === userId;
    const isDoctor = role === 'DOCTOR' && appointment.doctor.user.id === userId;

    if (!isPatient && !isDoctor) {
      throw new ForbiddenException('Not authorized to cancel this appointment');
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.CANCELLED },
      include: {
        doctor: true,
        clinic: true,
        patient: true,
      },
    });

    return this.formatAppointment(updated);
  }

  // Get available slots for a doctor on a date
  async getAvailableSlots(doctorId: number, clinicId: number, date: string) {
    const doctorClinic = await this.prisma.doctorClinic.findFirst({
      where: { doctorId, clinicId },
    });

    if (!doctorClinic) {
      throw new NotFoundException('Doctor does not practice at this clinic');
    }

    // Get booked slots
    const bookedAppointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        clinicId,
        date: new Date(date),
        status: { in: [AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED] },
      },
      select: { startTime: true },
    });

    const bookedTimes = new Set(bookedAppointments.map(a => a.startTime));

    // Generate all possible slots
    const slots: { time: string; available: boolean }[] = [];
    const [startHour, startMin] = doctorClinic.startTime.split(':').map(Number);
    const [endHour, endMin] = doctorClinic.endTime.split(':').map(Number);
    const slotMinutes = doctorClinic.slotMinutes;

    let currentTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    while (currentTime < endTime) {
      const hours = Math.floor(currentTime / 60);
      const mins = currentTime % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      
      slots.push({
        time: timeStr,
        available: !bookedTimes.has(timeStr),
      });

      currentTime += slotMinutes;
    }

    return {
      date,
      doctorId,
      clinicId,
      schedule: {
        startTime: doctorClinic.startTime,
        endTime: doctorClinic.endTime,
        slotMinutes: doctorClinic.slotMinutes,
      },
      slots,
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
      symptoms: appointment.symptoms,
      fee: appointment.fee,
      createdAt: appointment.createdAt,
      doctor: appointment.doctor ? {
        id: appointment.doctor.id,
        name: appointment.doctor.name,
        specialty: appointment.doctor.specialty,
        fee: appointment.doctor.fee,
      } : undefined,
      patient: appointment.patient ? {
        id: appointment.patient.id,
        name: appointment.patient.name,
      } : undefined,
      clinic: appointment.clinic ? {
        id: appointment.clinic.id,
        name: appointment.clinic.name,
        area: appointment.clinic.area,
        address: appointment.clinic.address,
      } : undefined,
    };
  }
}

