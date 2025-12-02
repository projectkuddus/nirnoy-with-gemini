/**
 * Gemini AI Service - Frontend
 * 
 * All AI calls go through the backend to keep the API key secure.
 * The backend handles all Gemini API communication.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Helper function for API calls
const apiCall = async (endpoint: string, data: any): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE}/ai/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add auth token if available
        ...(localStorage.getItem('nirnoy_token') && {
          'Authorization': `Bearer ${localStorage.getItem('nirnoy_token')}`
        })
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error(`AI API error (${endpoint}):`, error);
    throw error;
  }
};

const apiGet = async (endpoint: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE}/ai/${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('nirnoy_token') && {
          'Authorization': `Bearer ${localStorage.getItem('nirnoy_token')}`
        })
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error(`AI API error (${endpoint}):`, error);
    throw error;
  }
};

// =============================================
// DOCTOR AI FUNCTIONS
// =============================================

/**
 * Doctor's clinical assistant chat
 */
export const chatWithDoctorAssistant = async (
  message: string,
  history: string[],
  contextData?: string
): Promise<string> => {
  try {
    const result = await apiCall('doctor/chat', {
      message,
      history,
      patientContext: contextData,
    });
    return result.response || 'Unable to process query.';
  } catch (error) {
    console.error('Error in doctor chat:', error);
    return 'Connection error. Please try again.';
  }
};

/**
 * Generate clinical plan for a patient case
 */
export const generateClinicalPlan = async (
  chiefComplaint: string,
  history: string
): Promise<string> => {
  try {
    const result = await apiCall('doctor/clinical-plan', {
      chiefComplaint,
      patientHistory: history,
    });
    return JSON.stringify(result.plan);
  } catch (error) {
    console.error('Error generating clinical plan:', error);
    return '{}';
  }
};

/**
 * Analyze drug interactions
 */
export const analyzeDrugInteractions = async (medications: string[]): Promise<string> => {
  try {
    const result = await apiCall('doctor/drug-interactions', { medications });
    return JSON.stringify(result.analysis);
  } catch (error) {
    console.error('Error analyzing interactions:', error);
    return '{}';
  }
};

/**
 * Get medical news/updates
 */
export const getMedicalNews = async (specialty?: string): Promise<string> => {
  try {
    const endpoint = specialty 
      ? `doctor/medical-news?specialty=${encodeURIComponent(specialty)}`
      : 'doctor/medical-news';
    const result = await apiGet(endpoint);
    return JSON.stringify(result.news);
  } catch (error) {
    console.error('Error getting medical news:', error);
    return '[]';
  }
};

// =============================================
// PATIENT AI FUNCTIONS
// =============================================

/**
 * Patient health assistant chat (responds in Bengali)
 */
export const chatWithHealthAssistant = async (
  message: string,
  history: string[],
  patientContext?: string
): Promise<string> => {
  try {
    const result = await apiCall('patient/chat', {
      message,
      history,
      healthContext: patientContext,
    });
    return result.response || 'দুঃখিত, বুঝতে পারলাম না। আবার বলুন?';
  } catch (error) {
    console.error('Error in health chat:', error);
    return 'সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।';
  }
};

/**
 * Generate patient education materials
 */
export const generatePatientEducation = async (
  diagnosis: string,
  meds: string
): Promise<string> => {
  try {
    const result = await apiCall('patient/education', {
      diagnosis,
      medications: meds,
    });
    return result.education || 'Instructions unavailable.';
  } catch (error) {
    console.error('Error generating education:', error);
    return 'Error generating instructions.';
  }
};

/**
 * Triage patient message
 */
export const triagePatientMessage = async (msgText: string): Promise<string> => {
  try {
    const result = await apiCall('triage', { message: msgText });
    return result.category || 'Routine';
  } catch (error) {
    return 'Routine';
  }
};

// =============================================
// LEGACY FUNCTIONS (for backward compatibility)
// =============================================

/**
 * Generate SOAP note from raw input
 */
export const generateSOAPNote = async (rawInput: string, vitals: string): Promise<string> => {
  // This can be implemented later if needed
  console.warn('generateSOAPNote: Not implemented in backend yet');
  return '{}';
};

/**
 * Generate patient summary
 */
export const generatePatientSummary = async (patientData: string): Promise<string> => {
  // This can be implemented later if needed
  console.warn('generatePatientSummary: Not implemented in backend yet');
  return 'Summary not available.';
};

/**
 * Search medical guidelines
 */
export const searchMedicalGuidelines = async (query: string): Promise<string> => {
  // This can be implemented later if needed
  console.warn('searchMedicalGuidelines: Not implemented in backend yet');
  return 'No guidelines found.';
};

/**
 * Analyze patient cohorts
 */
export const analyzePatientCohorts = async (patientsJson: string): Promise<string> => {
  // This can be implemented later if needed
  console.warn('analyzePatientCohorts: Not implemented in backend yet');
  return '[]';
};
