import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { AppointmentsService, AppointmentStatus, VisitType, ConsultationType } from './appointments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('appointments')
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  // Patient: Create appointment
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PATIENT')
  @Post()
  async create(
    @Request() req,
    @Body() dto: {
      doctorId: number;
      clinicId: number;
      date: string;
      startTime: string;
      visitType: VisitType;
      consultationType?: ConsultationType;
      patientName?: string;
      patientPhone?: string;
      symptoms?: string;
    },
  ) {
    return this.appointmentsService.create(req.user.patient.id, dto);
  }

  // Patient: Check history with a doctor (for visit type suggestion)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PATIENT')
  @Get('history/:doctorId')
  async checkPatientHistory(
    @Request() req,
    @Param('doctorId', ParseIntPipe) doctorId: number,
  ) {
    return this.appointmentsService.checkPatientHistory(req.user.patient.id, doctorId);
  }

  // Patient: Get my appointments
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PATIENT')
  @Get('my')
  async getMyAppointments(
    @Request() req,
    @Query('status') status?: string,
  ) {
    return this.appointmentsService.findByPatient(req.user.patient.id, status);
  }

  // Doctor: Get appointments
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @Get('doctor')
  async getDoctorAppointments(
    @Request() req,
    @Query('date') date?: string,
    @Query('status') status?: string,
  ) {
    return this.appointmentsService.findByDoctor(req.user.doctor.id, date, status);
  }

  // Doctor: Get today's queue
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @Get('doctor/queue/:clinicId')
  async getTodayQueue(
    @Request() req,
    @Param('clinicId', ParseIntPipe) clinicId: number,
  ) {
    return this.appointmentsService.getTodayQueue(req.user.doctor.id, clinicId);
  }

  // Doctor: Update appointment status
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @Patch(':id/status')
  async updateStatus(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: AppointmentStatus,
  ) {
    return this.appointmentsService.updateStatus(id, req.user.doctor.id, status);
  }

  // Patient/Doctor: Cancel appointment
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async cancel(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.appointmentsService.cancel(id, req.user.id, req.user.role);
  }

  // Public: Get available slots
  @Get('slots/:doctorId/:clinicId')
  async getAvailableSlots(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Param('clinicId', ParseIntPipe) clinicId: number,
    @Query('date') date: string,
  ) {
    return this.appointmentsService.getAvailableSlots(doctorId, clinicId, date);
  }
}

