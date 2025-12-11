import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { IsString, IsOptional, IsArray } from 'class-validator';
import { AiService } from './ai.service';
import { GeminiService } from './gemini.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// =============================================
// DTOs
// =============================================

class DoctorChatDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  history?: string[];

  @IsOptional()
  @IsString()
  patientContext?: string;
}

class PatientChatDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  history?: string[];

  @IsOptional()
  @IsString()
  healthContext?: string;
}

class ClinicalPlanDto {
  @IsString()
  chiefComplaint: string;

  @IsOptional()
  @IsString()
  patientHistory?: string;
}

class DrugInteractionDto {
  @IsArray()
  @IsString({ each: true })
  medications: string[];
}

class PatientEducationDto {
  @IsString()
  diagnosis: string;

  @IsOptional()
  @IsString()
  medications?: string;
}

class TriageDto {
  @IsString()
  message: string;
}

class SOAPNoteDto {
  @IsString()
  chiefComplaint: string;

  @IsOptional()
  @IsString()
  vitals?: string;

  @IsOptional()
  @IsString()
  examination?: string;
}

class MedicalCalculatorDto {
  @IsString()
  calculationType: string;

  parameters: Record<string, any>;
}

class DifferentialDiagnosisDto {
  @IsArray()
  @IsString({ each: true })
  symptoms: string[];

  @IsOptional()
  @IsString()
  patientInfo?: string;
}

class GuidelinesSearchDto {
  @IsString()
  condition: string;

  @IsOptional()
  @IsString()
  specialty?: string;
}

class PrescriptionSuggestionDto {
  @IsString()
  diagnosis: string;

  @IsOptional()
  @IsString()
  patientInfo?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contraindications?: string[];
}

class SaveConversationDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  conversationType: string;

  @IsArray()
  messages: any[];

  @IsOptional()
  context?: any;
}

// =============================================
// Controller
// =============================================

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly geminiService: GeminiService,
  ) {}

  // =============================================
  // DOCTOR AI ENDPOINTS
  // =============================================

  /**
   * POST /api/ai/doctor/chat
   * Doctor's clinical assistant chat
   */
  @Post('doctor/chat')
  async doctorChat(@Body() dto: DoctorChatDto) {
    const response = await this.geminiService.chatWithDoctorAssistant(
      dto.message,
      dto.history || [],
      dto.patientContext,
    );
    return { response };
  }

  /**
   * POST /api/ai/doctor/clinical-plan
   * Generate clinical plan for a case
   */
  @Post('doctor/clinical-plan')
  async clinicalPlan(@Body() dto: ClinicalPlanDto) {
    const plan = await this.geminiService.generateClinicalPlan(
      dto.chiefComplaint,
      dto.patientHistory || '',
    );
    return { plan };
  }

  /**
   * POST /api/ai/doctor/drug-interactions
   * Analyze drug interactions
   */
  @Post('doctor/drug-interactions')
  async drugInteractions(@Body() dto: DrugInteractionDto) {
    const analysis = await this.geminiService.analyzeDrugInteractions(dto.medications);
    return { analysis };
  }

  /**
   * GET /api/ai/doctor/medical-news
   * Get recent medical news
   */
  @Get('doctor/medical-news')
  async medicalNews(@Query('specialty') specialty?: string) {
    const news = await this.geminiService.getMedicalNews(specialty);
    return { news };
  }

  /**
   * POST /api/ai/doctor/soap-note
   * Generate SOAP note from clinical input
   */
  @Post('doctor/soap-note')
  async generateSOAPNote(@Body() dto: SOAPNoteDto) {
    const soapNote = await this.geminiService.generateSOAPNote(
      dto.chiefComplaint,
      dto.vitals || '',
      dto.examination || '',
    );
    return { soapNote };
  }

  /**
   * POST /api/ai/doctor/medical-calculator
   * Perform medical calculations (GFR, BMI, CHADS2-VASc, etc.)
   */
  @Post('doctor/medical-calculator')
  async medicalCalculator(@Body() dto: MedicalCalculatorDto) {
    const result = await this.geminiService.calculateMedical(
      dto.calculationType,
      dto.parameters,
    );
    return { result };
  }

  /**
   * POST /api/ai/doctor/differential-diagnosis
   * Get differential diagnoses for symptoms
   */
  @Post('doctor/differential-diagnosis')
  async differentialDiagnosis(@Body() dto: DifferentialDiagnosisDto) {
    const differentials = await this.geminiService.getDifferentialDiagnosis(
      dto.symptoms,
      dto.patientInfo || '',
    );
    return { differentials };
  }

  /**
   * POST /api/ai/doctor/guidelines
   * Search treatment guidelines
   */
  @Post('doctor/guidelines')
  async searchGuidelines(@Body() dto: GuidelinesSearchDto) {
    const guidelines = await this.geminiService.searchGuidelines(
      dto.condition,
      dto.specialty,
    );
    return { guidelines };
  }

  /**
   * POST /api/ai/doctor/prescription-suggestion
   * Get prescription suggestions for a diagnosis
   */
  @Post('doctor/prescription-suggestion')
  async prescriptionSuggestion(@Body() dto: PrescriptionSuggestionDto) {
    const suggestions = await this.geminiService.suggestPrescription(
      dto.diagnosis,
      dto.patientInfo || '',
      dto.contraindications,
    );
    return { suggestions };
  }

  // =============================================
  // PATIENT AI ENDPOINTS
  // =============================================

  /**
   * POST /api/ai/patient/chat
   * Patient health assistant chat (responds in Bengali)
   */
  @Post('patient/chat')
  async patientChat(@Body() dto: PatientChatDto) {
    const response = await this.geminiService.chatWithHealthAssistant(
      dto.message,
      dto.history || [],
      dto.healthContext,
    );
    return { response };
  }

  /**
   * POST /api/ai/patient/education
   * Generate patient education materials
   */
  @Post('patient/education')
  async patientEducation(@Body() dto: PatientEducationDto) {
    const education = await this.geminiService.generatePatientEducation(
      dto.diagnosis,
      dto.medications || '',
    );
    return { education };
  }

  /**
   * POST /api/ai/triage
   * Triage a patient message
   */
  @Post('triage')
  async triage(@Body() dto: TriageDto) {
    const category = await this.geminiService.triageMessage(dto.message);
    return { category };
  }

  // =============================================
  // CONVERSATION STORAGE ENDPOINTS
  // =============================================

  /**
   * POST /api/ai/conversations
   * Save AI conversation to database
   */
  @Post('conversations')
  async saveConversation(@Body() dto: SaveConversationDto) {
    return this.aiService.createConversation({
      userId: dto.userId || '',
      userRole: 'PATIENT',
      conversationType: dto.conversationType,
      messages: dto.messages,
      context: dto.context,
    });
  }

  /**
   * GET /api/ai/conversations/:userId
   * Get user's conversation history
   */
  @Get('conversations/:userId')
  async getConversations(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.aiService.getUserConversations(userId, limit ? parseInt(limit, 10) : 10);
  }
}
