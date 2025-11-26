import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { 
  DoctorRegistrationDto, 
  DoctorProfileUpdateDto,
  DoctorQualificationDto,
  DoctorExperienceDto,
  DoctorChamberDto,
} from './dto/doctor-registration.dto';

@Controller('doctors')
export class DoctorsController {
  constructor(private doctorsService: DoctorsService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  // Search doctors with filters
  @Get()
  async findAll(
    @Query('specialty') specialty?: string,
    @Query('area') area?: string,
    @Query('city') city?: string,
    @Query('hospital') hospital?: string,
    @Query('gender') gender?: string,
    @Query('minFee') minFee?: string,
    @Query('maxFee') maxFee?: string,
    @Query('minExperience') minExperience?: string,
    @Query('minRating') minRating?: string,
    @Query('search') search?: string,
    @Query('online') online?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.doctorsService.findAll({
      specialty,
      area,
      city,
      hospital,
      gender,
      minFee: minFee ? parseInt(minFee) : undefined,
      maxFee: maxFee ? parseInt(maxFee) : undefined,
      minExperience: minExperience ? parseInt(minExperience) : undefined,
      minRating: minRating ? parseFloat(minRating) : undefined,
      search,
      isAvailableForOnline: online === 'true',
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // Get filter options
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

  // Get public doctor profile (by ID or slug)
  @Get('profile/:idOrSlug')
  async getPublicProfile(@Param('idOrSlug') idOrSlug: string) {
    return this.doctorsService.getPublicProfile(idOrSlug);
  }

  // ==================== REGISTRATION (Authenticated) ====================

  // Register as doctor
  @UseGuards(JwtAuthGuard)
  @Post('register')
  async register(
    @Request() req,
    @Body() dto: DoctorRegistrationDto,
  ) {
    return this.doctorsService.register(req.user.id, dto);
  }

  // ==================== OWN PROFILE MANAGEMENT ====================

  // Get own profile (for dashboard)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @Get('me')
  async getOwnProfile(@Request() req) {
    return this.doctorsService.getOwnProfile(req.user.id);
  }

  // Update own profile
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @Patch('me')
  async updateProfile(
    @Request() req,
    @Body() dto: DoctorProfileUpdateDto,
  ) {
    return this.doctorsService.updateProfile(req.user.id, dto);
  }

  // ==================== QUALIFICATIONS ====================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @Post('me/qualifications')
  async addQualification(
    @Request() req,
    @Body() dto: DoctorQualificationDto,
  ) {
    return this.doctorsService.addQualification(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @Patch('me/qualifications/:id')
  async updateQualification(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<DoctorQualificationDto>,
  ) {
    return this.doctorsService.updateQualification(req.user.id, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @Delete('me/qualifications/:id')
  async deleteQualification(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.doctorsService.deleteQualification(req.user.id, id);
  }

  // ==================== EXPERIENCE ====================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @Post('me/experiences')
  async addExperience(
    @Request() req,
    @Body() dto: DoctorExperienceDto,
  ) {
    return this.doctorsService.addExperience(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @Patch('me/experiences/:id')
  async updateExperience(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<DoctorExperienceDto>,
  ) {
    return this.doctorsService.updateExperience(req.user.id, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @Delete('me/experiences/:id')
  async deleteExperience(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.doctorsService.deleteExperience(req.user.id, id);
  }

  // ==================== CHAMBERS ====================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @Post('me/chambers')
  async addChamber(
    @Request() req,
    @Body() dto: DoctorChamberDto,
  ) {
    return this.doctorsService.addChamber(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @Patch('me/chambers/:id')
  async updateChamber(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<DoctorChamberDto>,
  ) {
    return this.doctorsService.updateChamber(req.user.id, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @Delete('me/chambers/:id')
  async deleteChamber(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.doctorsService.deleteChamber(req.user.id, id);
  }
}
