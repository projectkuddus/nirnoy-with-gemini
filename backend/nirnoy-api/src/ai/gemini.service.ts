import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Gemini AI Service
 * 
 * This service handles all Gemini AI calls on the backend,
 * keeping the API key secure and not exposed to the frontend.
 */
@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI | null = null;

  // System instructions
  private readonly MEDICAL_SYSTEM_INSTRUCTION = `You are "Nirnoy Medical AI" - an advanced clinical decision support system designed for healthcare professionals in Bangladesh.

EXPERTISE AREAS:
- Internal Medicine, Cardiology, Endocrinology, Gastroenterology
- Latest medical guidelines (WHO, AHA, ESC, NICE, ACC)
- Drug interactions and pharmacology
- Differential diagnosis and clinical reasoning
- Evidence-based medicine

BEHAVIOR:
- Provide concise, actionable clinical insights
- Reference latest guidelines when applicable
- Consider Bangladesh healthcare context (available medications, cost)
- Always include relevant warnings and contraindications
- Use medical terminology appropriately
- Be direct and professional

LIMITATIONS:
- You are an AI assistant, not a replacement for clinical judgment
- Always recommend verification with current literature
- Flag any uncertainty clearly`;

  private readonly PATIENT_SYSTEM_INSTRUCTION = `You are "নির্ণয় এআই" (Nirnoy AI) - a friendly health assistant for Bangladeshi patients.

CRITICAL RULES:
1. ALWAYS respond in Bengali (বাংলা) - this is MANDATORY
2. Be warm, empathetic, and conversational like a caring friend  
3. NEVER prescribe medications or give specific treatment advice
4. Ask follow-up questions to understand the problem better
5. When appropriate, suggest seeing a doctor through Nirnoy platform
6. Keep responses short (2-4 sentences) and easy to understand
7. Use emojis sparingly to be friendly

Remember: You help identify problems and guide to doctors. You do NOT diagnose or prescribe.`;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    
    if (!apiKey) {
      this.logger.warn('⚠️ GEMINI_API_KEY not configured');
      return;
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.logger.log('✅ Gemini AI service initialized');
  }

  /**
   * Doctor's clinical assistant chat
   */
  async chatWithDoctorAssistant(
    message: string,
    history: string[],
    contextData?: string
  ): Promise<string> {
    if (!this.genAI) {
      return 'AI service not configured.';
    }

    try {
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-3-pro-preview',
        systemInstruction: `${this.MEDICAL_SYSTEM_INSTRUCTION}

CURRENT PATIENT CONTEXT:
${contextData || 'No specific patient context provided.'}

CONVERSATION MODE: Clinical consultation support. Provide evidence-based recommendations.`,
      });

      const conversationContext = history.length > 0 
        ? `Previous discussion:\n${history.slice(-6).join('\n')}\n\nDoctor's query:` 
        : 'Doctor\'s query:';

      const result = await model.generateContent(`${conversationContext} ${message}`);
      const response = result.response;
      return response.text() || 'Unable to process query.';
    } catch (error) {
      this.logger.error('Error in doctor chat:', error);
      return 'Connection error. Please try again.';
    }
  }

  /**
   * Patient health assistant chat (in Bengali)
   */
  async chatWithHealthAssistant(
    message: string,
    history: string[],
    patientContext?: string
  ): Promise<string> {
    if (!this.genAI) {
      return 'দুঃখিত, সিস্টেমে সমস্যা হয়েছে।';
    }

    try {
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-3-pro-preview',
        systemInstruction: `${this.PATIENT_SYSTEM_INSTRUCTION}

PATIENT INFO: ${patientContext || 'No specific health data'}`,
      });

      const context = history.length > 0 
        ? `Previous chat:\n${history.slice(-4).join('\n')}\n\nPatient says:` 
        : 'Patient says:';

      const result = await model.generateContent(`${context} ${message}`);
      const response = result.response;
      return response.text() || 'দুঃখিত, বুঝতে পারলাম না। আবার বলুন?';
    } catch (error) {
      this.logger.error('Error in health chat:', error);
      return 'সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।';
    }
  }

  /**
   * Generate clinical plan for a patient case
   */
  async generateClinicalPlan(chiefComplaint: string, history: string): Promise<any> {
    if (!this.genAI) {
      return { error: 'AI service not configured' };
    }

    try {
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-3-pro-preview',
        generationConfig: { responseMimeType: 'application/json' }
      });

      const prompt = `As a clinical decision support system, analyze this case:

Chief Complaint: ${chiefComplaint}
Patient History: ${history}

Provide a structured clinical assessment in JSON format:
{
  "differentials": ["Primary diagnosis", "Alternative 1", "Alternative 2"],
  "investigations": ["Test 1", "Test 2", "Test 3"],
  "redFlags": "Any emergency signs or warnings",
  "treatmentDraft": "Initial management plan with generic drug names",
  "followUp": "Recommended follow-up timeline"
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      // Try to parse as JSON
      try {
        return JSON.parse(text);
      } catch {
        return { raw: text };
      }
    } catch (error) {
      this.logger.error('Error generating clinical plan:', error);
      return { error: 'Failed to generate clinical plan' };
    }
  }

  /**
   * Analyze drug interactions
   */
  async analyzeDrugInteractions(medications: string[]): Promise<any> {
    if (!this.genAI) {
      return { error: 'AI service not configured' };
    }

    try {
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-3-pro-preview',
        generationConfig: { responseMimeType: 'application/json' }
      });

      const prompt = `Analyze potential drug interactions for this medication list:
${medications.join(', ')}

Provide JSON response:
{
  "interactions": [
    { "drugs": ["Drug A", "Drug B"], "severity": "High/Moderate/Low", "effect": "Description", "recommendation": "Action" }
  ],
  "warnings": ["General warnings"],
  "safe": true/false
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      try {
        return JSON.parse(text);
      } catch {
        return { raw: text };
      }
    } catch (error) {
      this.logger.error('Error analyzing interactions:', error);
      return { error: 'Failed to analyze interactions' };
    }
  }

  /**
   * Get medical news/updates
   */
  async getMedicalNews(specialty?: string): Promise<any[]> {
    if (!this.genAI) {
      return [];
    }

    try {
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-3-pro-preview',
        generationConfig: { responseMimeType: 'application/json' }
      });

      const prompt = `As a medical information system, provide a summary of recent important developments in ${specialty || 'general medicine'} from the past month.

Format as JSON array:
[
  {
    "title": "Article/Study title",
    "source": "Journal/Organization name",
    "date": "Publication date",
    "summary": "2-3 sentence summary",
    "category": "Research/Guideline/Drug/Technology",
    "relevance": "Why this matters for clinicians"
  }
]

Include 5-7 recent, significant items.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      try {
        return JSON.parse(text);
      } catch {
        return [];
      }
    } catch (error) {
      this.logger.error('Error getting medical news:', error);
      return [];
    }
  }

  /**
   * Triage patient message
   */
  async triageMessage(message: string): Promise<string> {
    if (!this.genAI) {
      return 'Routine';
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' });
      
      const prompt = `Classify this patient message: "${message}"
Categories: Emergency, Urgent, Routine, Administrative
Return ONLY the category name.`;

      const result = await model.generateContent(prompt);
      return result.response.text()?.trim() || 'Routine';
    } catch (error) {
      return 'Routine';
    }
  }

  /**
   * Generate patient education in Bengali
   */
  async generatePatientEducation(diagnosis: string, medications: string): Promise<string> {
    if (!this.genAI) {
      return 'Information not available.';
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' });

      const prompt = `Write patient education in Bengali for:
Diagnosis: ${diagnosis}
Medications: ${medications}

Include:
1. রোগ সম্পর্কে সহজ ভাষায় (Simple explanation)
2. ওষুধ খাওয়ার নিয়ম (How to take medications)
3. খাবার ও জীবনযাপন (Diet & lifestyle)
4. কখন ডাক্তারের কাছে যাবেন (Warning signs)

Use friendly, simple Bengali.`;

      const result = await model.generateContent(prompt);
      return result.response.text() || 'Instructions unavailable.';
    } catch (error) {
      this.logger.error('Error generating education:', error);
      return 'Error generating instructions.';
    }
  }
}
