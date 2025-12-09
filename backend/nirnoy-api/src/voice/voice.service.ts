import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';

export interface VoiceSessionConfig {
  userId?: string;
  language: 'bn' | 'en';
  voiceGender: 'male' | 'female';
  sessionType: 'patient' | 'doctor';
}

export interface VoiceSession {
  id: string;
  config: VoiceSessionConfig;
  geminiWs: WebSocket | null;
  clientWs: WebSocket;
  createdAt: Date;
  isActive: boolean;
}

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private sessions: Map<string, VoiceSession> = new Map();
  private readonly apiKey: string;

  // Gemini Live API endpoint
  private readonly GEMINI_LIVE_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY not configured - voice relay will not work');
    }
  }

  /**
   * Create a new voice session
   */
  createSession(clientWs: WebSocket, config: VoiceSessionConfig): string {
    const sessionId = this.generateSessionId();
    
    const session: VoiceSession = {
      id: sessionId,
      config,
      geminiWs: null,
      clientWs,
      createdAt: new Date(),
      isActive: true,
    };

    this.sessions.set(sessionId, session);
    this.logger.log(`Created voice session ${sessionId} for ${config.sessionType}`);
    
    return sessionId;
  }

  /**
   * Connect session to Gemini Live API
   */
  async connectToGemini(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.logger.error(`Session ${sessionId} not found`);
      return false;
    }

    if (!this.apiKey) {
      this.logger.error('Cannot connect to Gemini - API key not configured');
      return false;
    }

    try {
      const wsUrl = `${this.GEMINI_LIVE_URL}?key=${this.apiKey}`;
      const geminiWs = new WebSocket(wsUrl);

      geminiWs.on('open', () => {
        this.logger.log(`Gemini connection opened for session ${sessionId}`);
        session.geminiWs = geminiWs;
        
        // Send initial configuration to Gemini
        this.sendGeminiConfig(session);
      });

      geminiWs.on('message', (data: Buffer) => {
        // Forward Gemini response to client
        if (session.clientWs.readyState === WebSocket.OPEN) {
          session.clientWs.send(data);
        }
      });

      geminiWs.on('error', (error) => {
        this.logger.error(`Gemini WebSocket error for session ${sessionId}:`, error);
        this.notifyClientError(session, 'Gemini connection error');
      });

      geminiWs.on('close', () => {
        this.logger.log(`Gemini connection closed for session ${sessionId}`);
        session.geminiWs = null;
        this.notifyClientError(session, 'Gemini connection closed');
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to connect to Gemini for session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Send audio data to Gemini
   */
  sendAudioToGemini(sessionId: string, audioData: Buffer): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.geminiWs || session.geminiWs.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      // Send audio chunk to Gemini
      const message = {
        realtimeInput: {
          mediaChunks: [{
            mimeType: 'audio/pcm;rate=16000',
            data: audioData.toString('base64'),
          }],
        },
      };

      session.geminiWs.send(JSON.stringify(message));
      return true;
    } catch (error) {
      this.logger.error(`Failed to send audio to Gemini for session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Send text message to Gemini
   */
  sendTextToGemini(sessionId: string, text: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.geminiWs || session.geminiWs.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const message = {
        clientContent: {
          turns: [{
            role: 'user',
            parts: [{ text }],
          }],
          turnComplete: true,
        },
      };

      session.geminiWs.send(JSON.stringify(message));
      return true;
    } catch (error) {
      this.logger.error(`Failed to send text to Gemini for session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Close a voice session
   */
  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.isActive = false;

    if (session.geminiWs) {
      session.geminiWs.close();
    }

    this.sessions.delete(sessionId);
    this.logger.log(`Closed voice session ${sessionId}`);
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    return {
      activeSessions: this.sessions.size,
      sessions: Array.from(this.sessions.values()).map(s => ({
        id: s.id,
        type: s.config.sessionType,
        language: s.config.language,
        createdAt: s.createdAt,
        isConnectedToGemini: s.geminiWs !== null,
      })),
    };
  }

  /**
   * Send initial configuration to Gemini
   */
  private sendGeminiConfig(session: VoiceSession) {
    if (!session.geminiWs) return;

    const { language, voiceGender, sessionType } = session.config;

    // System instruction based on session type
    const systemInstruction = sessionType === 'patient'
      ? this.getPatientSystemInstruction(language)
      : this.getDoctorSystemInstruction(language);

    // Voice configuration
    const voiceName = this.getVoiceName(language, voiceGender);

    const setupMessage = {
      setup: {
        model: 'models/gemini-3-pro-preview',
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
        },
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
      },
    };

    session.geminiWs.send(JSON.stringify(setupMessage));
  }

  private getPatientSystemInstruction(language: 'bn' | 'en'): string {
    if (language === 'bn') {
      return `আপনি নির্ণয় স্বাস্থ্য সহায়ক। বাংলায় কথা বলুন। রোগীদের স্বাস্থ্য বিষয়ে সহায়তা করুন।
      
গুরুত্বপূর্ণ:
- সহানুভূতিশীল হন
- সংক্ষেপে উত্তর দিন
- গুরুতর সমস্যায় ডাক্তার দেখাতে বলুন
- নির্ণয় প্ল্যাটফর্মে ডাক্তার খুঁজতে সাহায্য করুন`;
    }
    return `You are Nirnoy Health Assistant. Help patients with health queries.

Important:
- Be empathetic and caring
- Give concise responses
- Recommend seeing a doctor for serious issues
- Help find doctors on the Nirnoy platform`;
  }

  private getDoctorSystemInstruction(language: 'bn' | 'en'): string {
    if (language === 'bn') {
      return `আপনি নির্ণয় ক্লিনিকাল সহায়ক। ডাক্তারদের জন্য চিকিৎসা সংক্রান্ত তথ্য প্রদান করুন।

গুরুত্বপূর্ণ:
- বৈজ্ঞানিক ও প্রমাণ-ভিত্তিক তথ্য দিন
- ওষুধের পার্শ্বপ্রতিক্রিয়া ও মিথস্ক্রিয়া জানান
- ক্লিনিকাল গাইডলাইন অনুসরণ করুন`;
    }
    return `You are Nirnoy Clinical Assistant for doctors.

Important:
- Provide evidence-based medical information
- Include drug interactions and side effects
- Follow clinical guidelines
- Be concise and professional`;
  }

  private getVoiceName(language: 'bn' | 'en', gender: 'male' | 'female'): string {
    // Gemini voice options
    if (gender === 'female') {
      return 'Aoede'; // Female voice
    }
    return 'Charon'; // Male voice
  }

  private notifyClientError(session: VoiceSession, error: string) {
    if (session.clientWs.readyState === WebSocket.OPEN) {
      session.clientWs.send(JSON.stringify({
        type: 'error',
        error,
      }));
    }
  }

  private generateSessionId(): string {
    return `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

