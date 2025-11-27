
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Initialize Gemini Client - Use Vite's import.meta.env for environment variables
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const generatePatientSummary = async (patientData: string): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      Analyze the following patient medical history and current visit notes. 
      Provide a concise bullet-point summary for the doctor.
      
      Patient Data: ${patientData}
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "Unable to generate summary.";
  } catch (error) {
    console.error("Error generating summary:", error);
    return "Error generating AI summary. Please try again.";
  }
};

export const chatWithHealthAssistant = async (message: string, history: string[], patientContext?: string): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const systemInstruction = `
      You are "Nirnoy AI", a personal health intelligence assistant.
      
      Your Goal: Empower the patient by helping them understand their OWN health data.
      
      Context Available:
      ${patientContext || 'No specific patient history provided.'}
      
      Instructions:
      1. Use the patient's history (provided in context) to give personalized answers.
      2. If they ask about their BP or medications, cite previous records.
      3. Analyze trends. If they mention a symptom, check if it's recurrent in their history.
      4. Tone: Empathetic, clear, and data-driven.
      5. Disclaimer: Always state you are an AI and they should see a doctor for treatment.
    `;
    
    // Combine history for context
    const fullContext = history.length > 0 ? `Chat History:\n${history.join('\n')}\n\nUser Query:` : 'User Query:';

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: `${fullContext} ${message}`,
      config: {
        systemInstruction: systemInstruction
      }
    });

    return response.text || "I couldn't understand that.";
  } catch (error) {
    console.error("Error in chat:", error);
    return "I'm having trouble connecting right now.";
  }
};

export const chatWithDoctorAssistant = async (message: string, history: string[], contextData?: string): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const systemInstruction = `
      You are "Nirnoy Copilot", an advanced AI Clinical & Practice Assistant for doctors in Bangladesh.
      
      Current Mode/Context:
      ${contextData || 'General Medical Support'}
      
      Roles:
      1. **Clinical Copilot**: Differential diagnosis, drug interactions, patient summaries.
      2. **Business Copilot**: Analyze practice revenue, patient retention, and scheduling efficiency.
      3. **Learning Copilot**: Summarize medical guidelines (e.g., NICE, AHA) and papers.
      
      Constraints:
      - Be concise, professional, and evidence-based.
      - For clinical queries, always add a disclaimer that you are an AI support tool.
      - If asked about practice stats, use the provided context data.
    `;
    
    const context = history.length > 0 ? `Conversation History:\n${history.join('\n')}\n\nCurrent Query:` : '';

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: `${context} ${message}`,
      config: {
        systemInstruction: systemInstruction
      }
    });

    return response.text || "I couldn't process that query.";
  } catch (error) {
    console.error("Error in doctor chat:", error);
    return "System Error: Unable to access Nirnoy intelligence.";
  }
};

export const generateClinicalPlan = async (chiefComplaint: string, history: string): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      Act as a Senior Clinical Assistant.
      Patient Complaint: ${chiefComplaint}
      Patient History: ${history}
      
      Output valid JSON with the following keys:
      - "differentials": list of 3 potential diagnoses
      - "investigations": list of recommended lab/imaging tests for BD context
      - "redFlags": string warning if any emergency signs exist
      - "treatmentDraft": string, a short draft prescription plan (generic names)
    `;
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    
    return response.text || "{}";
  } catch (e) {
    console.error(e);
    return "{}";
  }
};

export const generateSOAPNote = async (rawInput: string, vitals: string): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      Convert the following raw doctor's notes and vitals into a structured SOAP Note format (Subjective, Objective, Assessment, Plan).
      Raw Notes: "${rawInput}"
      Vitals: "${vitals}"
      
      Output valid JSON with keys: subjective, objective, assessment, plan.
    `;
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return response.text || "{}";
  } catch (e) { return "{}"; }
};

export const generatePatientEducation = async (diagnosis: string, meds: string): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      Write simple patient instructions in Bengali (Bangla) for a patient diagnosed with ${diagnosis}.
      Medications: ${meds}.
      Include: 
      1. What is the condition (very simple).
      2. How to take meds.
      3. Diet/Lifestyle advice (Dos and Don'ts).
      4. When to come back or call doctor.
      
      Format: Plain text, friendly tone.
    `;
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text || "Instructions unavailable.";
  } catch (e) { return "Error generating instructions."; }
};

export const triagePatientMessage = async (msgText: string): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      Classify this patient message into one of 3 categories: 'Emergency', 'Clarification', 'Admin'.
      Message: "${msgText}"
      Return ONLY the category name.
    `;
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text?.trim() || "Clarification";
  } catch (e) { return "Clarification"; }
};

export const searchMedicalGuidelines = async (query: string): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      Provide a concise summary of the latest standard medical guidelines for: "${query}".
      Focus on management and first-line treatment. Use bullet points.
    `;
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text || "No guidelines found.";
  } catch (e) { return "Error retrieving guidelines."; }
};

export const analyzePatientCohorts = async (patientsJson: string): Promise<string> => {
   try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      Analyze this list of patients and group them into 3 high-value cohorts for the doctor to focus on.
      Examples: "Uncontrolled Diabetics", "Overdue for Follow-up", "High Frequency Visitors".
      
      Patients: ${patientsJson}
      
      Output valid JSON: array of objects { id, name, count, description, action }.
    `;
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return response.text || "[]";
   } catch (e) { return "[]"; }
}
