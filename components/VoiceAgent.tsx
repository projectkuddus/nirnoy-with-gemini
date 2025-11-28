import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { MOCK_DOCTORS } from '../data/mockData';

// ============ CONFIGURATION ============
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const hasValidApiKey = GEMINI_API_KEY && GEMINI_API_KEY.length > 10;

const DEBUG = true;
const log = (...args: any[]) => { if (DEBUG) console.log('[VoiceAgent]', ...args); };
const logError = (...args: any[]) => console.error('[VoiceAgent ERROR]', ...args);

// ============ BROWSER SPEECH SYNTHESIS ============
class BrowserSpeaker {
  private synth: SpeechSynthesis;
  private isSpeaking = false;

  constructor() {
    this.synth = window.speechSynthesis;
  }

  speak(text: string, onStart?: () => void, onEnd?: () => void): void {
    if (!text || this.isSpeaking) return;
    this.synth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => { this.isSpeaking = true; onStart?.(); };
    utterance.onend = () => { this.isSpeaking = false; onEnd?.(); };
    utterance.onerror = () => { this.isSpeaking = false; onEnd?.(); };
    
    this.synth.speak(utterance);
  }

  stop(): void {
    this.synth.cancel();
    this.isSpeaking = false;
  }
}

// ============ SPEECH RECOGNITION ============
class SpeechRecognizer {
  private recognition: any = null;
  private isListening = false;

  constructor() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      this.recognition = new SR();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = 'bn-BD';
    }
  }

  isSupported(): boolean { return this.recognition !== null; }

  start(onResult: (text: string) => void, onError?: () => void): boolean {
    if (!this.recognition) return false;
    
    this.recognition.onresult = (e: any) => {
      const text = e.results[e.results.length - 1][0].transcript;
      onResult(text);
    };
    this.recognition.onerror = () => onError?.();
    this.recognition.onend = () => { if (this.isListening) try { this.recognition.start(); } catch(e){} };
    
    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (e) { return false; }
  }

  stop(): void {
    this.isListening = false;
    this.recognition?.stop();
  }
}

// ============ GEMINI TEXT CHAT ============
async function chatWithGemini(client: GoogleGenAI, message: string, agentName: string): Promise<string> {
  const doctorList = MOCK_DOCTORS.slice(0, 5).map(d => `- ${d.name}: ${d.specialties[0]}`).join('\n');
  
  const prompt = `আপনি "${agentName}" - নির্ণয় হেলথ এর AI সহকারী।
নিয়ম: বাংলায় ছোট উত্তর দিন (১-২ বাক্য)।
ডাক্তার: ${doctorList}
জরুরি = "999 এ কল করুন!"

User: ${message}`;

  const response = await client.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });
  
  return response.text || 'দুঃখিত, উত্তর দিতে পারছি না।';
}

// ============ TYPES ============
type Status = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';

interface VoiceAgentProps {
  onClose?: () => void;
  voiceGender?: 'male' | 'female';
  context?: string;
  compact?: boolean;
}

// ============ MAIN COMPONENT ============
const VoiceAgent: React.FC<VoiceAgentProps> = ({ onClose, voiceGender = 'female', compact = false }) => {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');

  const aiClientRef = useRef<GoogleGenAI | null>(null);
  const speakerRef = useRef<BrowserSpeaker | null>(null);
  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const isActiveRef = useRef(false);

  const agentName = voiceGender === 'male' ? 'স্বাস্থ্য' : 'সেবা';

  useEffect(() => {
    if (hasValidApiKey) aiClientRef.current = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    speakerRef.current = new BrowserSpeaker();
    recognizerRef.current = new SpeechRecognizer();
    return () => { speakerRef.current?.stop(); recognizerRef.current?.stop(); };
  }, []);

  const cleanup = useCallback(() => {
    isActiveRef.current = false;
    speakerRef.current?.stop();
    recognizerRef.current?.stop();
    setStatus('idle');
    setError(null);
    setTranscript('');
  }, []);

  const handleUserSpeech = useCallback(async (text: string) => {
    if (!aiClientRef.current || !isActiveRef.current) return;
    
    setTranscript(`আপনি: ${text}`);
    setStatus('thinking');
    recognizerRef.current?.stop();
    
    try {
      const response = await chatWithGemini(aiClientRef.current, text, agentName);
      setTranscript(`${agentName}: ${response}`);
      setStatus('speaking');
      
      speakerRef.current?.speak(response, undefined, () => {
        if (isActiveRef.current) {
          setStatus('listening');
          recognizerRef.current?.start((t) => handleUserSpeech(t));
        }
      });
    } catch (e) {
      setError('উত্তর দিতে সমস্যা');
      setStatus('error');
    }
  }, [agentName]);

  const handleConnect = async () => {
    if (!hasValidApiKey) { setError('API Key নেই'); return; }
    if (!recognizerRef.current?.isSupported()) { setError('ব্রাউজার সাপোর্ট করে না'); return; }

    cleanup();
    setStatus('connecting');
    isActiveRef.current = true;
    
    const greeting = `আসসালামু আলাইকুম! আমি ${agentName}। কীভাবে সাহায্য করতে পারি?`;
    setTranscript(`${agentName}: ${greeting}`);
    setStatus('speaking');
    
    speakerRef.current?.speak(greeting, undefined, () => {
      if (isActiveRef.current) {
        setStatus('listening');
        if (!recognizerRef.current?.start((t) => handleUserSpeech(t))) {
          setError('মাইক পারমিশন দিন');
          setStatus('error');
        }
      }
    });
  };

  const handleDisconnect = () => { cleanup(); onClose?.(); };

  useEffect(() => { if (!compact && hasValidApiKey) handleConnect(); }, [compact]);

  const getStatusText = () => {
    switch (status) {
      case 'connecting': return 'শুরু হচ্ছে...';
      case 'listening': return 'শুনছি... বলুন';
      case 'thinking': return 'চিন্তা করছি...';
      case 'speaking': return 'বলছে...';
      case 'error': return error || 'ত্রুটি';
      default: return 'প্রস্তুত';
    }
  };

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-xl font-bold">{agentName.charAt(0)}</span>
            </div>
            <div>
              <h4 className="font-bold">{agentName}</h4>
              <p className="text-sm text-white/70">{getStatusText()}</p>
            </div>
          </div>
          
          {status === 'idle' ? (
            <button onClick={handleConnect} disabled={!hasValidApiKey}
              className="px-4 py-2 bg-white text-blue-600 font-bold rounded-lg hover:bg-white/90 transition">
              <i className="fas fa-microphone mr-2"></i>কথা বলুন
            </button>
          ) : (
            <button onClick={handleDisconnect}
              className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition">
              <i className="fas fa-stop mr-2"></i>শেষ
            </button>
          )}
        </div>

        {transcript && (
          <div className="p-3 bg-white/10 rounded-xl text-sm max-h-20 overflow-y-auto">
            {transcript}
          </div>
        )}
      </div>
    );
  }

  // Full modal
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className={`p-6 text-white ${voiceGender === 'male' ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-pink-600 to-rose-600'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-2xl font-bold">{agentName.charAt(0)}</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">{agentName}</h3>
                <p className="text-sm text-white/80">{getStatusText()}</p>
              </div>
            </div>
            <button onClick={handleDisconnect} className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div className="p-8 bg-slate-50">
          <div className="flex items-center justify-center gap-2 h-24">
            {(status === 'speaking' || status === 'listening') ? (
              [...Array(7)].map((_, i) => (
                <div key={i}
                  className={`w-2 rounded-full ${status === 'speaking' ? 'bg-purple-500' : 'bg-green-500'}`}
                  style={{ height: `${20 + Math.random() * 50}px`, animation: `pulse ${0.3 + i * 0.1}s ease-in-out infinite alternate` }}></div>
              ))
            ) : status === 'thinking' ? (
              [0,1,2].map(i => <div key={i} className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}></div>)
            ) : (
              <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center">
                <i className="fas fa-microphone text-3xl text-slate-400"></i>
              </div>
            )}
          </div>
        </div>

        {transcript && (
          <div className="p-4 bg-slate-100 border-t max-h-32 overflow-y-auto">
            <p className="text-sm text-slate-700">{transcript}</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border-t">
            <p className="text-red-600 text-sm"><i className="fas fa-exclamation-circle mr-2"></i>{error}</p>
          </div>
        )}

        <div className="p-4 border-t">
          {status === 'idle' ? (
            <button onClick={handleConnect} disabled={!hasValidApiKey}
              className={`w-full py-4 font-bold rounded-xl flex items-center justify-center gap-2 ${hasValidApiKey ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white' : 'bg-slate-300 text-slate-500'}`}>
              <i className="fas fa-microphone"></i>কথা বলুন
            </button>
          ) : (
            <button onClick={handleDisconnect} className="w-full py-4 bg-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-2">
              <i className="fas fa-stop"></i>শেষ করুন
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceAgent;
