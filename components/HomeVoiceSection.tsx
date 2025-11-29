import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { GoogleGenAI, Modality } from '@google/genai';
import { MOCK_DOCTORS } from '../data/mockData';

// ============ CONFIGURATION ============
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const hasValidApiKey = GEMINI_API_KEY && GEMINI_API_KEY.length > 10;

const log = (...args: any[]) => console.log('[Voice]', ...args);
const logError = (...args: any[]) => console.error('[Voice ERROR]', ...args);

// ============ AUDIO PLAYER (for Gemini Live API) ============
class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private nextPlayTime = 0;

  async init(): Promise<boolean> {
    try {
      if (this.audioContext && this.audioContext.state !== 'closed') {
        if (this.audioContext.state === 'suspended') await this.audioContext.resume();
        return true;
      }
      
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AC({ sampleRate: 24000 });
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 3.0; // Boost volume
      this.gainNode.connect(this.audioContext.destination);
      
      if (this.audioContext.state === 'suspended') await this.audioContext.resume();
      
      this.nextPlayTime = 0;
      log('AudioContext ready:', this.audioContext.state);
      return true;
    } catch (e) {
      logError('AudioContext init failed:', e);
      return false;
    }
  }

  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  playPCM16(base64Data: string): void {
    if (!this.audioContext || !this.gainNode) return;

    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const buffer = this.audioContext.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.gainNode);

      const now = this.audioContext.currentTime;
      const startTime = Math.max(now + 0.05, this.nextPlayTime);
      source.start(startTime);
      this.nextPlayTime = startTime + buffer.duration;

      log('🔊 Playing audio chunk:', buffer.duration.toFixed(2) + 's');
    } catch (e) {
      logError('Audio play error:', e);
    }
  }

  stop(): void {
    this.nextPlayTime = 0;
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch (e) {}
    }
    this.audioContext = null;
    this.gainNode = null;
  }
}

// ============ MICROPHONE ============
class Microphone {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private isRunning = false;

  async start(onAudio: (data: { data: string; mimeType: string }) => void): Promise<boolean> {
    if (this.isRunning) return true;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });

      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.context = new AC();
      
      if (this.context.state === 'suspended') await this.context.resume();

      const source = this.context.createMediaStreamSource(this.stream);
      this.processor = this.context.createScriptProcessor(4096, 1, 1);

      let buffer: Float32Array[] = [];
      let lastSend = Date.now();

      this.processor.onaudioprocess = (e) => {
        if (!this.isRunning) return;

        const input = e.inputBuffer.getChannelData(0);
        const ratio = this.context!.sampleRate / 16000;
        const len = Math.round(input.length / ratio);
        const down = new Float32Array(len);
        for (let i = 0; i < len; i++) {
          down[i] = input[Math.min(Math.round(i * ratio), input.length - 1)];
        }
        buffer.push(down);

        if (Date.now() - lastSend >= 100 && buffer.length > 0) {
          const total = buffer.reduce((a, b) => a + b.length, 0);
          const combined = new Float32Array(total);
          let offset = 0;
          for (const b of buffer) { combined.set(b, offset); offset += b.length; }

          const int16 = new Int16Array(combined.length);
          for (let i = 0; i < combined.length; i++) {
            const s = Math.max(-1, Math.min(1, combined[i]));
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }

          const bytes = new Uint8Array(int16.buffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);

          onAudio({ data: btoa(binary), mimeType: 'audio/pcm;rate=16000' });
          buffer = [];
          lastSend = Date.now();
        }
      };

      source.connect(this.processor);
      this.processor.connect(this.context.destination);
      this.isRunning = true;
      log('🎤 Microphone started');
      return true;
    } catch (e: any) {
      logError('Microphone error:', e.name, e.message);
      return false;
    }
  }

  stop(): void {
    this.isRunning = false;
    if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
    if (this.processor) { this.processor.disconnect(); this.processor = null; }
    if (this.context) { try { this.context.close(); } catch (e) {} this.context = null; }
    log('🎤 Microphone stopped');
  }
}

// ============ SYSTEM PROMPT ============
function getSystemPrompt(agentName: string, gender: 'male' | 'female'): string {
  const hour = new Date().getHours();
  let greeting = 'শুভ সন্ধ্যা';
  if (hour >= 5 && hour < 12) greeting = 'সুপ্রভাত';
  else if (hour >= 12 && hour < 17) greeting = 'শুভ দুপুর';
  else if (hour >= 20) greeting = 'শুভ রাত্রি';

  const doctors = MOCK_DOCTORS.slice(0, 5).map(d => 
    `${d.name}: ${d.specialties[0]}, ফি ৳${d.chambers[0]?.fee || 500}`
  ).join('\n');

  return `তুমি "${agentName}" - নির্ণয় হেলথ এর ${gender === 'male' ? 'পুরুষ' : 'মহিলা'} AI স্বাস্থ্য সহকারী।

প্রথমে বলো: "আসসালামু আলাইকুম! ${greeting}! আমি ${agentName}। আপনার স্বাস্থ্য বিষয়ে কীভাবে সাহায্য করতে পারি?"

নিয়ম:
- শুধু বাংলায় কথা বলো
- ছোট উত্তর দাও (১-২ বাক্য)
- বিনয়ী হও, "আপনি", "জ্বী" ব্যবহার করো

ডাক্তার তালিকা:
${doctors}

জরুরি অবস্থা (বুকে ব্যথা, শ্বাসকষ্ট) = "এখনই 999 এ কল করুন!"`;
}

// ============ TYPES ============
type Status = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

// ============ VOICE CARD ============
const VoiceCard: React.FC<{
  name: string;
  gender: 'male' | 'female';
  status: Status;
  isActive: boolean;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
}> = ({ name, gender, status, isActive, error, onStart, onStop }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const statusText: Record<Status, string> = {
    idle: isBn ? 'প্রস্তুত' : 'Ready',
    connecting: isBn ? 'সংযোগ হচ্ছে...' : 'Connecting...',
    listening: isBn ? 'শুনছি...' : 'Listening...',
    speaking: isBn ? 'বলছে...' : 'Speaking...',
    error: error || (isBn ? 'সমস্যা' : 'Error'),
  };

  const bg = gender === 'male' ? 'from-blue-500 to-indigo-600' : 'from-pink-500 to-rose-600';

  return (
    <div className={`bg-white rounded-2xl p-6 border-2 transition-all ${
      isActive ? 'border-blue-500 shadow-xl' : 'border-slate-200 hover:border-slate-300'
    }`}>
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${bg} flex items-center justify-center`}>
          <span className="text-white text-lg font-bold">{gender === 'male' ? 'স্বা' : 'সে'}</span>
        </div>
        <div>
          <h3 className="font-bold text-lg text-slate-800">{name}</h3>
          <p className="text-sm text-slate-500">
            {gender === 'male' ? (isBn ? 'পুরুষ সহকারী' : 'Male') : (isBn ? 'মহিলা সহকারী' : 'Female')}
          </p>
        </div>
      </div>

      {isActive && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-3 h-3 rounded-full ${
              status === 'speaking' ? 'bg-purple-500 animate-pulse' :
              status === 'listening' ? 'bg-green-500 animate-pulse' :
              status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
              status === 'error' ? 'bg-red-500' : 'bg-slate-400'
            }`}></div>
            <span className={`text-sm font-medium ${status === 'error' ? 'text-red-500' : 'text-slate-600'}`}>
              {statusText[status]}
            </span>
          </div>

          {(status === 'listening' || status === 'speaking') && (
            <div className="flex justify-center gap-1 h-12 items-center bg-slate-50 rounded-xl">
              {[...Array(7)].map((_, i) => (
                <div key={i}
                  className={`w-1.5 rounded-full ${status === 'speaking' ? 'bg-purple-500' : 'bg-green-500'}`}
                  style={{ height: `${12 + Math.random() * 25}px`, animation: `pulse ${0.3 + i * 0.08}s ease-in-out infinite alternate` }}
                />
              ))}
            </div>
          )}

          {status === 'connecting' && (
            <div className="flex justify-center gap-2 h-12 items-center bg-slate-50 rounded-xl">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}
        </div>
      )}

      {isActive ? (
        <button onClick={onStop}
          className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
          <i className="fas fa-phone-slash"></i>
          {isBn ? 'শেষ করুন' : 'End'}
        </button>
      ) : (
        <button onClick={onStart} disabled={!hasValidApiKey}
          className={`w-full py-3 font-bold rounded-xl flex items-center justify-center gap-2 ${
            hasValidApiKey ? `bg-gradient-to-r ${bg} text-white hover:opacity-90` : 'bg-slate-300 text-slate-500'
          }`}>
          <i className="fas fa-phone"></i>
          {isBn ? 'কথা বলুন' : 'Talk'}
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
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<any>(null);
  const audioRef = useRef<AudioPlayer | null>(null);
  const micRef = useRef<Microphone | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    if (hasValidApiKey) {
      clientRef.current = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      log('Gemini client ready');
    }
    return () => cleanup();
  }, []);

  const cleanup = useCallback(() => {
    log('Cleaning up...');
    activeRef.current = false;
    if (sessionRef.current) { try { sessionRef.current.close(); } catch (e) {} sessionRef.current = null; }
    if (audioRef.current) { audioRef.current.stop(); audioRef.current = null; }
    if (micRef.current) { micRef.current.stop(); micRef.current = null; }
    setActiveAgent(null);
    setStatus('idle');
    setError(null);
  }, []);

  const handleStart = async (gender: 'male' | 'female') => {
    if (!hasValidApiKey || !clientRef.current) return;

    cleanup();
    setActiveAgent(gender);
    setStatus('connecting');
    activeRef.current = true;

    const agentName = gender === 'male' ? 'স্বাস্থ্য' : 'সেবা';
    // Puck = deep male voice, Kore = female voice
    const voiceName = gender === 'male' ? 'Puck' : 'Kore';

    try {
      // Initialize audio player
      audioRef.current = new AudioPlayer();
      const audioOk = await audioRef.current.init();
      if (!audioOk) throw new Error('Audio init failed');

      // Initialize microphone
      micRef.current = new Microphone();

      // Connect to Gemini Live API
      log('Connecting to Gemini Live API...');
      const session = await clientRef.current.live.connect({
        model: 'gemini-2.0-flash-exp',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: getSystemPrompt(agentName, gender),
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } }
          }
        },
        callbacks: {
          onopen: async () => {
            log('✅ Connected to Gemini Live!');
            activeRef.current = true;

            // Start microphone
            const micOk = await micRef.current!.start((audioData) => {
              if (sessionRef.current && activeRef.current) {
                try { sessionRef.current.sendRealtimeInput({ media: audioData }); } catch (e) {}
              }
            });

            if (!micOk) {
              setError('মাইক্রোফোন পারমিশন দিন');
              setStatus('error');
              return;
            }

            setStatus('listening');

            // Trigger greeting
            setTimeout(() => {
              if (sessionRef.current && activeRef.current) {
                sessionRef.current.sendClientContent({
                  turns: [{ role: 'user', parts: [{ text: 'হ্যালো' }] }],
                  turnComplete: true
                });
              }
            }, 500);
          },

          onmessage: (msg: any) => {
            const parts = msg.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              if (part.inlineData?.mimeType?.startsWith('audio/') && part.inlineData?.data) {
                setStatus('speaking');
                audioRef.current?.resume();
                audioRef.current?.playPCM16(part.inlineData.data);
              }
            }

            if (msg.serverContent?.turnComplete) {
              setStatus('listening');
            }

            if (msg.serverContent?.interrupted) {
              audioRef.current?.stop();
              audioRef.current?.init();
            }
          },

          onclose: (e: CloseEvent) => {
            log('Connection closed:', e.code, e.reason);
            activeRef.current = false;
            
            if (e.code === 1011 && e.reason?.includes('quota')) {
              setError('API কোটা শেষ');
            } else if (e.code === 1007) {
              setError('API Key সমস্যা - পেইড টিয়ার চেক করুন');
            } else if (e.code !== 1000) {
              setError('সংযোগ বিচ্ছিন্ন');
            }
            
            if (e.code !== 1000) setStatus('error');
            micRef.current?.stop();
          },

          onerror: (e: ErrorEvent) => {
            logError('WebSocket error:', e);
            setError('সংযোগ ত্রুটি');
            setStatus('error');
          }
        }
      });

      sessionRef.current = session;
      log('Session created');

    } catch (e: any) {
      logError('Connection failed:', e);
      
      if (e.name === 'NotAllowedError') {
        setError('মাইক্রোফোন পারমিশন দিন');
      } else if (e.message?.includes('API') || e.message?.includes('key')) {
        setError('API Key বা বিলিং সমস্যা');
      } else {
        setError('সংযোগ ব্যর্থ');
      }
      setStatus('error');
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 border border-slate-700">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative rounded-full h-2 w-2 bg-green-400"></span>
          </span>
          24/7 {isBn ? 'সক্রিয়' : 'Active'}
        </div>

        <h3 className="text-2xl font-black text-white mb-2">
          {isBn ? 'AI স্বাস্থ্য সহকারী' : 'AI Health Assistant'}
        </h3>
        <p className="text-slate-400 text-sm">
          {isBn ? 'বাংলায় কথা বলুন, ডাক্তার সিরিয়াল নিন' : 'Speak in Bangla, Book Doctor Appointments'}
        </p>

        {!hasValidApiKey && (
          <div className="mt-4 bg-amber-500/20 text-amber-400 px-4 py-2 rounded-lg text-sm">
            API Key প্রয়োজন
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <VoiceCard
          name="স্বাস্থ্য"
          gender="male"
          status={activeAgent === 'male' ? status : 'idle'}
          isActive={activeAgent === 'male'}
          error={activeAgent === 'male' ? error : null}
          onStart={() => handleStart('male')}
          onStop={cleanup}
        />
        <VoiceCard
          name="সেবা"
          gender="female"
          status={activeAgent === 'female' ? status : 'idle'}
          isActive={activeAgent === 'female'}
          error={activeAgent === 'female' ? error : null}
          onStart={() => handleStart('female')}
          onStop={cleanup}
        />
      </div>

      <p className="text-center text-slate-500 text-xs mt-6">
        <i className="fas fa-shield-alt mr-1"></i>
        {isBn ? 'Gemini Live API • রিয়েল-টাইম ভয়েস' : 'Gemini Live API • Real-time Voice'}
      </p>
    </div>
  );
};

export default HomeVoiceSection;
