import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

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

export const chatWithDoctorAssistant = async (message: string, history: string[], practiceData?: string): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const systemInstruction = `
      You are an advanced AI Data Analyst & Clinical Assistant for a doctor at Nirnoy Care.
      
      Your Goal: Empower the doctor by deriving insights from their practice data.
      
      Capabilities:
      1. **Practice Analytics**: Analyze the provided mock practice data to answer questions like "What are the top 3 diagnoses this month?" or "Is Hypertension increasing?".
      2. **Clinical Support**: Differential diagnosis, drug interactions (standard medical knowledge).
      3. **Patient Ledger Analysis**: Summarize specific patient histories.
      
      Current Practice Context (Mock Data Summary):
      ${practiceData || 'No aggregate data loaded.'}
      
      Target Audience: Medical Professional (MBBS/FCPS).
      Tone: Professional, analytical, concise.
    `;
    
    const context = history.length > 0 ? `Conversation History:\n${history.join('\n')}\n\nCurrent Query:` : '';

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: `${context} ${message}`,
      config: {
        systemInstruction: systemInstruction
      }
    });

    return response.text || "I couldn't process that medical query.";
  } catch (error) {
    console.error("Error in doctor chat:", error);
    return "System Error: Unable to access medical database right now.";
  }
};