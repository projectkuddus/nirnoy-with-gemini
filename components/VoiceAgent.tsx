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

      log('Playing audio chunk:', buffer.duration.toFixed(2) + 's');
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
      log('Microphone started');
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
    log('Microphone stopped');
  }
}

// ============ SYSTEM PROMPT ============
function getSystemPrompt(agentName: string, gender: 'male' | 'female'): string {
  const hour = new Date().getHours();
  let greeting = 'শুভ সন্ধ্যা';
  if (hour >= 5 && hour < 12) greeting = 'সুপ্রভাত';
  else if (hour >= 12 && hour < 17) greeting = 'শুভ দুপুর';
  else if (hour >= 17 && hour < 20) greeting = 'শুভ সন্ধ্যা';
  else greeting = 'শুভ রাত্রি';

  // Get doctors by specialty
  const specialties = ['মেডিসিন', 'হৃদরোগ', 'স্ত্রীরোগ', 'শিশুরোগ', 'হাড় ও জোড়া', 'চর্মরোগ'];
  const doctorsBySpecialty = specialties.map(spec => {
    const docs = MOCK_DOCTORS.filter(d => d.specialties.includes(spec)).slice(0, 2);
    if (docs.length === 0) return null;
    return `${spec}: ${docs.map(d => `${d.name} (ফি ${d.chambers[0]?.fee || 500} টাকা)`).join(', ')}`;
  }).filter(Boolean).join('\n');

  const genderWord = gender === 'male' ? 'পুরুষ' : 'মহিলা';

  return `তুমি "${agentName}" - নির্ণয় হেলথের ${genderWord} AI সহকারী।

গুরুত্বপূর্ণ নির্দেশনা:
সংযোগ হলেই প্রথমে তুমি বলবে: "আসসালামু আলাইকুম! ${greeting}! আমি ${agentName}। ডাক্তার সিরিয়াল নিতে বা নির্ণয় সম্পর্কে জানতে বলুন।"

নির্ণয় সম্পর্কে:
- বাংলাদেশের AI স্বাস্থ্যসেবা প্ল্যাটফর্ম
- ওয়েবসাইট: nirnoy.ai
- ২০০ এর বেশি বিশেষজ্ঞ ডাক্তার
- ২৪ ঘণ্টা AI সহায়তা
- অনলাইনে সিরিয়াল বুকিং
- পারিবারিক স্বাস্থ্য ট্র্যাকিং

সিরিয়াল বুকিং:
১. সমস্যা জিজ্ঞেস করো
২. উপযুক্ত ডাক্তার সাজেস্ট করো
৩. তারিখ ও সময় নাও
৪. কনফার্ম করো

ডাক্তার তালিকা:
${doctorsBySpecialty}

সমস্যা থেকে বিশেষত্ব:
- জ্বর, সর্দি, কাশি = মেডিসিন
- বুকে ব্যথা = হৃদরোগ
- মহিলাদের সমস্যা = স্ত্রীরোগ
- শিশুদের সমস্যা = শিশুরোগ
- হাড়, কোমর ব্যথা = হাড় ও জোড়া
- চুলকানি, ত্বক = চর্মরোগ

নিয়ম:
- শুধু বাংলায় কথা বলো
- ছোট উত্তর দাও, এক দুই বাক্য
- বিনয়ী হও, আপনি বলো
- ইমোজি ব্যবহার করো না

জরুরি অবস্থা:
বুকে তীব্র ব্যথা, শ্বাসকষ্ট হলে বলো: "এখনই ৯৯৯ এ কল করুন!"

যা বলবে না:
- ওষুধের নাম বা ডোজ
- রোগ নির্ণয়
- ব্যক্তিগত তথ্য চাওয়া`;
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
            <span className="text-sm text-slate-600">{statusText[status]}</span>
          </div>

          {status === 'listening' && (
            <div className="flex justify-center gap-1 h-8">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-green-500 rounded-full animate-pulse"
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    height: `${Math.random() * 100}%`,
                  }}
                ></div>
              ))}
            </div>
          )}

          {status === 'speaking' && (
            <div className="flex justify-center gap-1 h-8">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-purple-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.1}s` }}
                ></div>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={isActive ? onStop : onStart}
        className={`w-full py-3 rounded-xl font-bold transition-all ${
          isActive
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : `bg-gradient-to-r ${bg} text-white hover:opacity-90`
        }`}
      >
        {isActive ? (isBn ? 'থামান' : 'Stop') : (isBn ? 'কথা বলুন' : 'Talk')}
      </button>
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
  const greetingSentRef = useRef(false);

  // Initialize Gemini client
  useEffect(() => {
    if (hasValidApiKey && !clientRef.current) {
      try {
        clientRef.current = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        log('Gemini client initialized');
      } catch (e) {
        logError('Failed to init Gemini client:', e);
      }
    }
  }, []);

  const cleanup = useCallback(() => {
    activeRef.current = false;
    greetingSentRef.current = false;
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }
    audioRef.current?.stop();
    audioRef.current = null;
    micRef.current?.stop();
    micRef.current = null;
  }, []);

  const handleStop = useCallback(() => {
    cleanup();
    setActiveAgent(null);
    setStatus('idle');
    setError(null);
  }, [cleanup]);

  const handleStart = async (gender: 'male' | 'female') => {
    if (!hasValidApiKey || !clientRef.current) return;

    cleanup();
    setActiveAgent(gender);
    setStatus('connecting');
    activeRef.current = true;
    greetingSentRef.current = false;

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
            log('Connected to Gemini Live!');
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

            // Trigger auto-greeting immediately
            if (!greetingSentRef.current && sessionRef.current && activeRef.current) {
              greetingSentRef.current = true;
              log('Sending greeting trigger...');
              
              // Send a greeting request to make the AI speak first
              sessionRef.current.sendClientContent({
                turns: [{ 
                  role: 'user', 
                  parts: [{ text: 'শুরু করো, নিজের পরিচয় দাও' }] 
                }],
                turnComplete: true
              });
            }
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
              setError('API Key সমস্যা');
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
        setError('API Key সমস্যা');
      } else {
        setError('সংযোগ ব্যর্থ');
      }
      setStatus('error');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { cleanup(); };
  }, [cleanup]);

  if (!hasValidApiKey) {
    return (
      <section className="py-16 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            {isBn ? 'AI ভয়েস সহকারী' : 'AI Voice Assistant'}
          </h2>
          <p className="text-slate-400">
            {isBn ? 'API Key কনফিগার করা হয়নি' : 'API Key not configured'}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full mb-4">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm font-medium">
              {isBn ? '২৪/৭ সক্রিয়' : '24/7 Active'}
            </span>
          </div>
          <h2 className="text-3xl font-black text-white mb-3">
            {isBn ? 'AI স্বাস্থ্য সহকারী' : 'AI Health Assistant'}
          </h2>
          <p className="text-slate-400">
            {isBn ? 'বাংলায় কথা বলুন, ডাক্তার সিরিয়াল নিন' : 'Speak in Bangla, book doctor appointment'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <VoiceCard
            name="স্বাস্থ্য"
            gender="male"
            status={activeAgent === 'male' ? status : 'idle'}
            isActive={activeAgent === 'male'}
            error={activeAgent === 'male' ? error : null}
            onStart={() => handleStart('male')}
            onStop={handleStop}
          />
          <VoiceCard
            name="সেবা"
            gender="female"
            status={activeAgent === 'female' ? status : 'idle'}
            isActive={activeAgent === 'female'}
            error={activeAgent === 'female' ? error : null}
            onStart={() => handleStart('female')}
            onStop={handleStop}
          />
        </div>

        <p className="text-center text-slate-500 text-sm">
          {isBn ? 'Gemini Live API • রিয়েল-টাইম ভয়েস' : 'Gemini Live API • Real-time Voice'}
        </p>
      </div>
    </section>
  );
};

export default HomeVoiceSection;
