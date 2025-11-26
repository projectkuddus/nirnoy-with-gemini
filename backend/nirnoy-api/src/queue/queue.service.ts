import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueGateway } from './queue.gateway';

interface QueuePosition {
  appointmentId: number;
  serialNumber: number;
  patientId: number;
  patientName: string;
  status: string;
  estimatedTime: Date;
}

@Injectable()
export class QueueService {
  private logger = new Logger('QueueService');

  constructor(
    private prisma: PrismaService,
    private queueGateway: QueueGateway,
  ) {}

  /**
   * Get today's queue for a specific chamber
   */
  async getTodayQueue(chamberId: number): Promise<QueuePosition[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        chamberId,
        date: {
          gte: today,
          lt: tomorrow,
        },
        status: {
          in: ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'],
        },
      },
      orderBy: {
        serialNumber: 'asc',
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return appointments.map((apt, index) => ({
      appointmentId: apt.id,
      serialNumber: apt.serialNumber || index + 1,
      patientId: apt.patient.id,
      patientName: apt.patient.name,
      status: apt.status,
      estimatedTime: this.calculateEstimatedTime(apt.startTime, index),
    }));
  }

  /**
   * Update current patient being served
   */
  async updateCurrentPatient(chamberId: number, serialNumber: number) {
    // Update the queue status via WebSocket
    this.queueGateway.server
      .to(`chamber:${chamberId}`)
      .emit('queue:status', {
        chamberId: chamberId.toString(),
        currentSerial: serialNumber,
        lastUpdated: new Date(),
      });

    // Check if any patient is 2 positions away
    const queue = await this.getTodayQueue(chamberId);
    const upcomingPatients = queue.filter(p => p.serialNumber > serialNumber && p.serialNumber <= serialNumber + 3);
    
    for (const patient of upcomingPatients) {
      const patientsAhead = patient.serialNumber - serialNumber - 1;
      if (patientsAhead <= 2) {
        await this.queueGateway.notifyTurnApproaching(
          patient.appointmentId.toString(),
          patientsAhead,
        );
      }
    }

    this.logger.log(`Queue updated for chamber ${chamberId}: Serial ${serialNumber}`);
  }

  /**
   * Announce delay to all waiting patients
   */
  async announceDelay(chamberId: number, delayMinutes: number, message?: string) {
    // Update all waiting appointments' estimated times
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const waitingAppointments = await this.prisma.appointment.findMany({
      where: {
        chamberId,
        date: {
          gte: today,
          lt: tomorrow,
        },
        status: {
          in: ['CONFIRMED', 'CHECKED_IN'],
        },
      },
    });

    // Send delay notification
    this.queueGateway.server
      .to(`chamber:${chamberId}`)
      .emit('queue:delay', {
        chamberId: chamberId.toString(),
        delayMinutes,
        message: message || `${delayMinutes} মিনিট দেরি হচ্ছে`,
        messageEn: `Delay of ${delayMinutes} minutes`,
        timestamp: new Date(),
      });

    this.logger.log(`Delay announced for chamber ${chamberId}: ${delayMinutes} minutes`);
  }

  /**
   * Start consultation for a patient
   */
  async startConsultation(appointmentId: number) {
    const appointment = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
      include: {
        chamber: true,
      },
    });

    // Notify patient
    this.queueGateway.server
      .to(`appointment:${appointmentId}`)
      .emit('queue:your_turn', {
        appointmentId: appointmentId.toString(),
        message: 'আপনার পালা! দয়া করে ডাক্তারের কক্ষে আসুন।',
        messageEn: "It's your turn! Please proceed to the doctor's room.",
        timestamp: new Date(),
      });

    // Update queue status
    if (appointment.serialNumber) {
      await this.updateCurrentPatient(appointment.chamberId, appointment.serialNumber);
    }

    return appointment;
  }

  /**
   * Complete consultation for a patient
   */
  async completeConsultation(appointmentId: number) {
    const appointment = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      include: {
        chamber: true,
      },
    });

    // Notify patient
    this.queueGateway.server
      .to(`appointment:${appointmentId}`)
      .emit('queue:completed', {
        appointmentId: appointmentId.toString(),
        message: 'আপনার পরামর্শ সম্পন্ন হয়েছে।',
        messageEn: 'Your consultation is complete.',
        timestamp: new Date(),
      });

    // Update queue for next patient
    if (appointment.serialNumber) {
      await this.updateCurrentPatient(appointment.chamberId, appointment.serialNumber);
    }

    return appointment;
  }

  /**
   * Check-in a patient (they've arrived)
   */
  async checkInPatient(appointmentId: number) {
    const appointment = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: new Date(),
      },
    });

    return appointment;
  }

  /**
   * Mark patient as no-show
   */
  async markNoShow(appointmentId: number) {
    const appointment = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'NO_SHOW',
      },
    });

    // Update queue
    if (appointment.serialNumber) {
      await this.updateCurrentPatient(appointment.chamberId, appointment.serialNumber);
    }

    return appointment;
  }

  /**
   * Get estimated wait time for a specific appointment
   */
  async getEstimatedWaitTime(appointmentId: number): Promise<{ minutes: number; estimatedTime: Date }> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        chamber: true,
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    const queue = await this.getTodayQueue(appointment.chamberId);
    const currentServing = queue.find(q => q.status === 'IN_PROGRESS');
    const currentSerial = currentServing?.serialNumber || 0;
    
    const patientsAhead = Math.max(0, (appointment.serialNumber || 0) - currentSerial - 1);
    const avgConsultTime = appointment.chamber.slotDuration || 10;
    const waitMinutes = patientsAhead * avgConsultTime;

    const estimatedTime = new Date();
    estimatedTime.setMinutes(estimatedTime.getMinutes() + waitMinutes);

    return {
      minutes: waitMinutes,
      estimatedTime,
    };
  }

  private calculateEstimatedTime(startTime: string, position: number): Date {
    const [hours, minutes] = startTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes + (position * 10), 0, 0); // Assuming 10 min per patient
    return date;
  }
}

