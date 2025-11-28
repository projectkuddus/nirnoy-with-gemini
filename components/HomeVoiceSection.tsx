import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { GoogleGenAI, Modality } from '@google/genai';
import { MOCK_DOCTORS } from '../data/mockData';

// ============ CONFIGURATION ============
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const hasValidApiKey = GEMINI_API_KEY && GEMINI_API_KEY.length > 10;

const DEBUG = true;
const log = (...args: any[]) => { if (DEBUG) console.log('[VoiceAgent]', ...args); };
const logError = (...args: any[]) => console.error('[VoiceAgent ERROR]', ...args);

// ============ BROWSER SPEECH SYNTHESIS (FALLBACK) ============
class BrowserSpeaker {
  private synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private isSpeaking = false;
  private onSpeakStart?: () => void;
  private onSpeakEnd?: () => void;

  constructor() {
    this.synth = window.speechSynthesis;
    this.loadVoices();
    
    // Voices may load asynchronously
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  private loadVoices() {
    this.voices = this.synth.getVoices();
    log('Loaded', this.voices.length, 'voices');
  }

  private getBengaliVoice(): SpeechSynthesisVoice | null {
    // Try to find Bengali voice
    const bengaliVoice = this.voices.find(v => 
      v.lang.includes('bn') || v.lang.includes('hi') || v.name.toLowerCase().includes('bengali')
    );
    if (bengaliVoice) return bengaliVoice;
    
    // Fallback to any available voice
    return this.voices.find(v => v.lang.includes('en')) || this.voices[0] || null;
  }

  speak(text: string, onStart?: () => void, onEnd?: () => void): void {
    if (!text || this.isSpeaking) return;
    
    // Cancel any ongoing speech
    this.synth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = this.getBengaliVoice();
    
    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => {
      this.isSpeaking = true;
      onStart?.();
      log('Speaking:', text.substring(0, 50) + '...');
    };
    
    utterance.onend = () => {
      this.isSpeaking = false;
      onEnd?.();
      log('Finished speaking');
    };
    
    utterance.onerror = (e) => {
      this.isSpeaking = false;
      logError('Speech error:', e);
      onEnd?.();
    };
    
    this.synth.speak(utterance);
  }

  stop(): void {
    this.synth.cancel();
    this.isSpeaking = false;
  }

  isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }
}

// ============ SPEECH RECOGNITION ============
class SpeechRecognizer {
  private recognition: any = null;
  private isListening = false;
  private onResult?: (text: string) => void;
  private onListeningChange?: (isListening: boolean) => void;

  constructor() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = 'bn-BD'; // Bengali
      
      this.recognition.onresult = (event: any) => {
        const last = event.results.length - 1;
        const text = event.results[last][0].transcript;
        log('Recognized:', text);
        this.onResult?.(text);
      };
      
      this.recognition.onerror = (event: any) => {
        logError('Recognition error:', event.error);
        if (event.error !== 'no-speech') {
          this.isListening = false;
          this.onListeningChange?.(false);
        }
      };
      
      this.recognition.onend = () => {
        // Auto-restart if still supposed to be listening
        if (this.isListening) {
          try {
            this.recognition.start();
          } catch (e) {}
        }
      };
    }
  }

  isSupported(): boolean {
    return this.recognition !== null;
  }

  start(onResult: (text: string) => void, onListeningChange?: (isListening: boolean) => void): boolean {
    if (!this.recognition) return false;
    
    this.onResult = onResult;
    this.onListeningChange = onListeningChange;
    
    try {
      this.recognition.start();
      this.isListening = true;
      this.onListeningChange?.(true);
      log('Speech recognition started');
      return true;
    } catch (e) {
      logError('Failed to start recognition:', e);
      return false;
    }
  }

  stop(): void {
    if (this.recognition) {
      this.isListening = false;
      this.recognition.stop();
      this.onListeningChange?.(false);
      log('Speech recognition stopped');
    }
  }
}

// ============ GEMINI TEXT CHAT (WORKS WITH FREE API) ============
async function chatWithGemini(
  client: GoogleGenAI,
  message: string,
  agentName: string,
  conversationHistory: { role: string; content: string }[]
): Promise<string> {
  try {
    const hour = new Date().getHours();
    let greeting = 'শুভ সন্ধ্যা';
    if (hour >= 5 && hour < 12) greeting = 'সুপ্রভাত';
    else if (hour >= 12 && hour < 17) greeting = 'শুভ দুপুর';
    else if (hour >= 20) greeting = 'শুভ রাত্রি';

    const doctorList = MOCK_DOCTORS.slice(0, 5).map(d => 
      `- ${d.name}: ${d.specialties[0]}, ফি ৳${d.chambers[0]?.fee || 500}`
    ).join('\n');

    const systemPrompt = `আপনি "${agentName}" - নির্ণয় হেলথ এর AI স্বাস্থ্য সহকারী।

📢 যদি এটি প্রথম বার্তা হয়, বলুন: "আসসালামু আলাইকুম! ${greeting}! আমি ${agentName}। কীভাবে সাহায্য করতে পারি?"

📋 নিয়ম:
- শুধু বাংলায় উত্তর দিন
- ছোট উত্তর দিন (১-২ বাক্য)
- বিনয়ী হোন
- "জ্বী", "আচ্ছা", "বুঝেছি" ব্যবহার করুন

👨‍⚕️ ডাক্তার:
${doctorList}

🚨 জরুরি = "999 এ কল করুন!"`;

    // Build conversation
    const messages = [
      { role: 'user', parts: [{ text: systemPrompt + '\n\nUser: ' + message }] }
    ];

    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: messages,
    });

    return response.text || 'দুঃখিত, উত্তর দিতে পারছি না।';
  } catch (e: any) {
    logError('Gemini chat error:', e);
    throw e;
  }
}

// ============ TYPES ============
type AgentStatus = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';

// ============ VOICE AGENT CARD ============
interface VoiceAgentCardProps {
  name: string;
  gender: 'male' | 'female';
  status: AgentStatus;
  isActive: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  error?: string | null;
  transcript?: string;
}

const VoiceAgentCard: React.FC<VoiceAgentCardProps> = ({ 
  name, gender, status, isActive, onConnect, onDisconnect, error, transcript 
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const getStatusText = () => {
    switch (status) {
      case 'connecting': return isBn ? 'শুরু হচ্ছে...' : 'Starting...';
      case 'listening': return isBn ? 'শুনছি... বলুন' : 'Listening... Speak';
      case 'thinking': return isBn ? 'চিন্তা করছি...' : 'Thinking...';
      case 'speaking': return isBn ? 'বলছে...' : 'Speaking...';
      case 'error': return error || (isBn ? 'ত্রুটি' : 'Error');
      default: return isBn ? 'প্রস্তুত' : 'Ready';
    }
  };

  const bgGradient = gender === 'male' 
    ? 'from-blue-500 to-indigo-600' 
    : 'from-pink-500 to-rose-600';

  return (
    <div className={`bg-white rounded-2xl p-6 border-2 transition-all duration-300 ${
      isActive 
        ? 'border-blue-500 shadow-xl shadow-blue-500/20' 
        : 'border-slate-200 hover:border-slate-300 hover:shadow-lg'
    }`}>
      {/* Avatar & Name */}
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${bgGradient} flex items-center justify-center shadow-lg`}>
          <span className="text-white text-2xl font-bold">
            {name.charAt(0)}
          </span>
        </div>
        <div>
          <h3 className="font-bold text-lg text-slate-800">{name}</h3>
          <p className="text-sm text-slate-500">
            {gender === 'male' ? (isBn ? 'পুরুষ সহকারী' : 'Male Assistant') : (isBn ? 'মহিলা সহকারী' : 'Female Assistant')}
          </p>
        </div>
      </div>

      {/* Status & Visualization */}
      {isActive && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm mb-3">
            <div className={`w-2.5 h-2.5 rounded-full ${
              status === 'speaking' ? 'bg-purple-500 animate-pulse' :
              status === 'listening' ? 'bg-green-500 animate-pulse' : 
              status === 'thinking' ? 'bg-yellow-500 animate-pulse' :
              status === 'connecting' ? 'bg-blue-500 animate-pulse' :
              status === 'error' ? 'bg-red-500' : 'bg-slate-400'
            }`}></div>
            <span className={`font-medium ${status === 'error' ? 'text-red-500' : 'text-slate-600'}`}>
              {getStatusText()}
            </span>
          </div>
          
          {/* Audio Visualization */}
          {(status === 'speaking' || status === 'listening') && (
            <div className="flex items-center justify-center gap-1 h-14 bg-slate-50 rounded-xl">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 rounded-full transition-all duration-100 ${
                    status === 'speaking' 
                      ? 'bg-gradient-to-t from-purple-500 to-pink-400' 
                      : 'bg-gradient-to-t from-green-500 to-emerald-400'
                  }`}
                  style={{ 
                    height: `${12 + Math.random() * 30}px`,
                    animation: `pulse ${0.3 + i * 0.08}s ease-in-out infinite alternate`
                  }}
                ></div>
              ))}
            </div>
          )}

          {/* Thinking Animation */}
          {status === 'thinking' && (
            <div className="flex items-center justify-center gap-2 h-14 bg-slate-50 rounded-xl">
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          )}

          {/* Transcript */}
          {transcript && (
            <div className="mt-3 p-3 bg-slate-100 rounded-xl text-sm text-slate-700 max-h-20 overflow-y-auto">
              {transcript}
            </div>
          )}
        </div>
      )}

      {/* Action Button */}
      {isActive ? (
        <button 
          onClick={onDisconnect} 
          className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-red-500/25"
        >
          <i className="fas fa-phone-slash"></i>
          {isBn ? 'শেষ করুন' : 'End Call'}
        </button>
      ) : (
        <button 
          onClick={onConnect} 
          disabled={!hasValidApiKey}
          className={`w-full py-3.5 font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
            hasValidApiKey 
              ? `bg-gradient-to-r ${bgGradient} hover:opacity-90 text-white shadow-lg` 
              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
          }`}
        >
          <i className="fas fa-microphone"></i>
          {isBn ? 'কথা বলুন' : 'Talk Now'}
        </button>
      )}
    </div>
  );
};

// ============ MAIN COMPONENT ============
const HomeVoiceSection: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  
  const [activeAgent, setActiveAgent] = useState<'male' | 'female' | null>(null);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);

  // Refs
  const aiClientRef = useRef<GoogleGenAI | null>(null);
  const speakerRef = useRef<BrowserSpeaker | null>(null);
  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const isActiveRef = useRef(false);

  // Initialize
  useEffect(() => {
    if (hasValidApiKey) {
      aiClientRef.current = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      log('GoogleGenAI initialized');
    }
    speakerRef.current = new BrowserSpeaker();
    recognizerRef.current = new SpeechRecognizer();
    
    return () => {
      speakerRef.current?.stop();
      recognizerRef.current?.stop();
    };
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    log('Cleaning up...');
    isActiveRef.current = false;
    speakerRef.current?.stop();
    recognizerRef.current?.stop();
    setActiveAgent(null);
    setStatus('idle');
    setError(null);
    setTranscript('');
    setConversationHistory([]);
  }, []);

  // Handle user speech
  const handleUserSpeech = useCallback(async (text: string, agentName: string) => {
    if (!aiClientRef.current || !isActiveRef.current) return;
    
    log('User said:', text);
    setTranscript(`আপনি: ${text}`);
    setStatus('thinking');
    
    // Stop listening while processing
    recognizerRef.current?.stop();
    
    try {
      // Get response from Gemini
      const response = await chatWithGemini(
        aiClientRef.current,
        text,
        agentName,
        conversationHistory
      );
      
      log('AI response:', response);
      
      // Update conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: text },
        { role: 'assistant', content: response }
      ]);
      
      // Speak the response
      setTranscript(`${agentName}: ${response}`);
      setStatus('speaking');
      
      speakerRef.current?.speak(
        response,
        () => setStatus('speaking'),
        () => {
          if (isActiveRef.current) {
            setStatus('listening');
            // Resume listening
            recognizerRef.current?.start(
              (newText) => handleUserSpeech(newText, agentName),
              (isListening) => {
                if (!isListening && isActiveRef.current) {
                  setStatus('error');
                  setError('মাইক বন্ধ হয়ে গেছে');
                }
              }
            );
          }
        }
      );
    } catch (e: any) {
      logError('Chat error:', e);
      setError('উত্তর দিতে সমস্যা হচ্ছে');
      setStatus('error');
    }
  }, [conversationHistory]);

  // Connect handler
  const handleConnect = async (gender: 'male' | 'female') => {
    if (!hasValidApiKey || !aiClientRef.current) {
      setError('API Key নেই');
      return;
    }

    if (!recognizerRef.current?.isSupported()) {
      setError('ব্রাউজার সাপোর্ট করে না');
      return;
    }

    cleanup();
    setActiveAgent(gender);
    setStatus('connecting');
    isActiveRef.current = true;
    
    const agentName = gender === 'male' ? 'স্বাস্থ্য' : 'সেবা';
    
    // Initial greeting
    const greeting = `আসসালামু আলাইকুম! আমি ${agentName}। আপনার স্বাস্থ্য বিষয়ে কীভাবে সাহায্য করতে পারি?`;
    
    setTranscript(`${agentName}: ${greeting}`);
    setStatus('speaking');
    
    speakerRef.current?.speak(
      greeting,
      () => setStatus('speaking'),
      () => {
        if (isActiveRef.current) {
          setStatus('listening');
          // Start listening
          const started = recognizerRef.current?.start(
            (text) => handleUserSpeech(text, agentName),
            (isListening) => {
              if (!isListening && isActiveRef.current) {
                // Try to restart
                setTimeout(() => {
                  if (isActiveRef.current) {
                    recognizerRef.current?.start(
                      (text) => handleUserSpeech(text, agentName),
                      () => {}
                    );
                  }
                }, 500);
              }
            }
          );
          
          if (!started) {
            setError('মাইক্রোফোন পারমিশন দিন');
            setStatus('error');
          }
        }
      }
    );
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 border border-slate-700/50 shadow-2xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold mb-4 border border-green-500/30">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
          </span>
          24/7 {isBn ? 'সক্রিয়' : 'Active'}
        </div>
        
        <h3 className="text-2xl md:text-3xl font-black text-white mb-3">
          {isBn ? 'AI স্বাস্থ্য সহকারী' : 'AI Health Assistant'}
        </h3>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          {isBn 
            ? 'বাংলায় কথা বলে স্বাস্থ্য পরামর্শ নিন, ডাক্তার খুঁজুন' 
            : 'Speak in Bangla to get health advice, find doctors'}
        </p>
        
        {!hasValidApiKey && (
          <div className="mt-4 bg-amber-500/20 text-amber-400 px-4 py-2 rounded-lg text-sm inline-flex items-center gap-2 border border-amber-500/30">
            <i className="fas fa-exclamation-triangle"></i>
            {isBn ? 'API Key প্রয়োজন' : 'API Key required'}
          </div>
        )}
      </div>

      {/* Voice Agent Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <VoiceAgentCard
          name="স্বাস্থ্য"
          gender="male"
          onConnect={() => handleConnect('male')}
          onDisconnect={cleanup}
          status={activeAgent === 'male' ? status : 'idle'}
          isActive={activeAgent === 'male'}
          error={activeAgent === 'male' ? error : null}
          transcript={activeAgent === 'male' ? transcript : undefined}
        />
        <VoiceAgentCard
          name="সেবা"
          gender="female"
          onConnect={() => handleConnect('female')}
          onDisconnect={cleanup}
          status={activeAgent === 'female' ? status : 'idle'}
          isActive={activeAgent === 'female'}
          error={activeAgent === 'female' ? error : null}
          transcript={activeAgent === 'female' ? transcript : undefined}
        />
      </div>

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-slate-500 text-xs flex items-center justify-center gap-2">
          <i className="fas fa-shield-alt"></i>
          {isBn ? 'নিরাপদ ও গোপনীয় • সম্পূর্ণ বিনামূল্যে' : 'Safe & Private • Completely Free'}
        </p>
        <p className="text-slate-600 text-xs mt-2">
          {isBn ? '🎤 Chrome/Edge ব্রাউজারে সবচেয়ে ভালো কাজ করে' : '🎤 Works best in Chrome/Edge browser'}
        </p>
      </div>

      {/* Debug */}
      {DEBUG && (
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-600">
            API: {hasValidApiKey ? '✅' : '❌'} | 
            Speech: {recognizerRef.current?.isSupported() ? '✅' : '❌'}
          </p>
        </div>
      )}
    </div>
  );
};

export default HomeVoiceSection;
