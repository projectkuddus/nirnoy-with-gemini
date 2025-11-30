import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Initialize Gemini Client
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Usage tracking for finance war room
const USAGE_KEYS = {
  AI_CONVERSATIONS: 'nirnoy_ai_conversations',
  AI_TOKENS: 'nirnoy_ai_tokens_used',
};

const trackAIUsage = (estimatedTokens: number = 500) => {
  try {
    const currentConvs = parseInt(localStorage.getItem(USAGE_KEYS.AI_CONVERSATIONS) || '0');
    const currentTokens = parseInt(localStorage.getItem(USAGE_KEYS.AI_TOKENS) || '0');
    localStorage.setItem(USAGE_KEYS.AI_CONVERSATIONS, (currentConvs + 1).toString());
    localStorage.setItem(USAGE_KEYS.AI_TOKENS, (currentTokens + estimatedTokens).toString());
  } catch (e) {
    console.warn('Could not track AI usage:', e);
  }
};

// Use the most capable model for medical queries
const MEDICAL_MODEL = 'gemini-2.0-flash-exp';
const FAST_MODEL = 'gemini-2.0-flash-exp';

// Enhanced Medical System Instruction
const MEDICAL_SYSTEM_INSTRUCTION = `You are "Nirnoy Medical AI" - an advanced clinical decision support system designed for healthcare professionals in Bangladesh.

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

export const chatWithDoctorAssistant = async (message: string, history: string[], contextData?: string): Promise<string> => {
  try {
    const systemInstruction = `${MEDICAL_SYSTEM_INSTRUCTION}

CURRENT PATIENT CONTEXT:
${contextData || 'No specific patient context provided.'}

CONVERSATION MODE: Clinical consultation support. Provide evidence-based recommendations.`;
    
    const conversationContext = history.length > 0 
      ? `Previous discussion:\n${history.slice(-6).join('\n')}\n\nDoctor's query:` 
      : 'Doctor\'s query:';

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MEDICAL_MODEL,
      contents: `${conversationContext} ${message}`,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3, // Lower temperature for more precise medical responses
      }
    });

    trackAIUsage(800); return response.text || "Unable to process query.";
  } catch (error) {
    console.error("Error in doctor chat:", error);
    return "Connection error. Please try again.";
  }
};

export const generateClinicalPlan = async (chiefComplaint: string, history: string): Promise<string> => {
  try {
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
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MEDICAL_MODEL,
      contents: prompt,
      config: { 
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });
    
    return response.text || "{}";
  } catch (e) {
    console.error(e);
    return "{}";
  }
};

export const generateSOAPNote = async (rawInput: string, vitals: string): Promise<string> => {
  try {
    const prompt = `Convert these clinical notes into a structured SOAP format:

Raw Notes: "${rawInput}"
Vitals: "${vitals}"

Output JSON with: { subjective, objective, assessment, plan }
Be concise but comprehensive.`;

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return response.text || "{}";
  } catch (e) { return "{}"; }
};

export const generatePatientSummary = async (patientData: string): Promise<string> => {
  try {
    const prompt = `Summarize this patient's medical profile for quick clinical review:

${patientData}

Provide:
1. Key diagnoses and risk factors
2. Current medications (check for interactions)
3. Recent trends (vitals, lab values)
4. Clinical alerts or concerns`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MEDICAL_MODEL,
      contents: prompt,
    });

    return response.text || "Unable to generate summary.";
  } catch (error) {
    console.error("Error generating summary:", error);
    return "Error generating AI summary.";
  }
};

export const chatWithHealthAssistant = async (message: string, history: string[], patientContext?: string): Promise<string> => {
  try {
    const systemInstruction = `You are "Nirnoy Health Assistant" - a patient-facing AI that helps people understand their health.

RULES:
- Explain medical terms in simple Bengali/English
- Be empathetic and reassuring
- Never diagnose - always recommend seeing a doctor
- Use the patient's history to personalize responses
- Keep responses concise and actionable

Patient Context: ${patientContext || 'General health query'}`;
    
    const context = history.length > 0 ? `Chat:\n${history.slice(-4).join('\n')}\n\nUser:` : 'User:';

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: `${context} ${message}`,
      config: { systemInstruction }
    });

    trackAIUsage(500); return response.text || "I couldn't understand that.";
  } catch (error) {
    console.error("Error in chat:", error);
    return "Connection issue. Please try again.";
  }
};

export const generatePatientEducation = async (diagnosis: string, meds: string): Promise<string> => {
  try {
    const prompt = `Write patient education in Bengali for:
Diagnosis: ${diagnosis}
Medications: ${meds}

Include:
1. রোগ সম্পর্কে সহজ ভাষায় (Simple explanation)
2. ওষুধ খাওয়ার নিয়ম (How to take medications)
3. খাবার ও জীবনযাপন (Diet & lifestyle)
4. কখন ডাক্তারের কাছে যাবেন (Warning signs)

Use friendly, simple Bengali.`;

    const response = await ai.models.generateContent({ model: FAST_MODEL, contents: prompt });
    return response.text || "Instructions unavailable.";
  } catch (e) { return "Error generating instructions."; }
};

export const searchMedicalGuidelines = async (query: string): Promise<string> => {
  try {
    const prompt = `Provide the latest evidence-based guidelines for: "${query}"

Include:
- Source (WHO/AHA/ESC/NICE if applicable)
- First-line treatment
- Key recommendations
- Recent updates (2023-2024)

Format as clear bullet points.`;

    const response = await ai.models.generateContent({ model: MEDICAL_MODEL, contents: prompt });
    return response.text || "No guidelines found.";
  } catch (e) { return "Error retrieving guidelines."; }
};

export const getMedicalNews = async (specialty?: string): Promise<string> => {
  try {
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

Include 5-7 recent, significant items. Focus on:
- New drug approvals
- Updated guidelines
- Major clinical trials
- Practice-changing research`;

    const response = await ai.models.generateContent({
      model: MEDICAL_MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return response.text || "[]";
  } catch (e) { 
    console.error(e);
    return "[]"; 
  }
};

export const analyzeDrugInteractions = async (medications: string[]): Promise<string> => {
  try {
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

    const response = await ai.models.generateContent({
      model: MEDICAL_MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return response.text || "{}";
  } catch (e) { return "{}"; }
};

export const triagePatientMessage = async (msgText: string): Promise<string> => {
  try {
    const prompt = `Classify this patient message: "${msgText}"
Categories: Emergency, Urgent, Routine, Administrative
Return ONLY the category name.`;
    const response = await ai.models.generateContent({ model: FAST_MODEL, contents: prompt });
    return response.text?.trim() || "Routine";
  } catch (e) { return "Routine"; }
};

export const analyzePatientCohorts = async (patientsJson: string): Promise<string> => {
  try {
    const prompt = `Analyze these patients and identify high-priority cohorts:
${patientsJson}

Output JSON array of cohorts:
[{ "id": "cohort_id", "name": "Cohort Name", "count": number, "description": "Why important", "action": "Recommended action" }]`;

    const response = await ai.models.generateContent({
      model: MEDICAL_MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return response.text || "[]";
  } catch (e) { return "[]"; }
};
