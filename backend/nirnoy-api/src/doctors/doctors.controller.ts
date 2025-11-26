import { Controller, Get, Patch, Body, Param, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('doctors')
export class DoctorsController {
  constructor(private doctorsService: DoctorsService) {}

  // Public: Search doctors with filters
  @Get()
  async findAll(
    @Query('specialty') specialty?: string,
    @Query('area') area?: string,
    @Query('hospital') hospital?: string,
    @Query('gender') gender?: string,
    @Query('minFee') minFee?: string,
    @Query('maxFee') maxFee?: string,
    @Query('minExperience') minExperience?: string,
    @Query('search') search?: string,
  ) {
    return this.doctorsService.findAll({
      specialty,
      area,
      hospital,
      gender,
      minFee: minFee ? parseInt(minFee) : undefined,
      maxFee: maxFee ? parseInt(maxFee) : undefined,
      minExperience: minExperience ? parseInt(minExperience) : undefined,
      search,
    });
  }

  // Public: Get filter options
  @Get('filters/specialties')
  async getSpecialties() {
    return this.doctorsService.getSpecialties();
  }

  @Get('filters/areas')
  async getAreas() {
    return this.doctorsService.getAreas();
  }

  @Get('filters/hospitals')
  async getHospitals() {
    return this.doctorsService.getHospitals();
  }

  // Public: Get single doctor
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.doctorsService.findOne(id);
  }

  // Protected: Get own profile (for logged-in doctors)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @Get('me/profile')
  async getMyProfile(@Request() req) {
    return this.doctorsService.findByUserId(req.user.id);
  }

  // Protected: Update own profile
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @Patch('me/profile')
  async updateMyProfile(
    @Request() req,
    @Body() data: {
      name?: string;
      specialty?: string;
      gender?: string;
      degrees?: string;
      fee?: number;
      experienceYears?: number;
    },
  ) {
    const doctor = await this.doctorsService.findByUserId(req.user.id);
    return this.doctorsService.update(doctor.id, data);
  }
}

