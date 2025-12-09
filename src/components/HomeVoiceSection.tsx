import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { GoogleGenAI, Modality } from '@google/genai';
import { MOCK_DOCTORS } from '../data/mockData';

// ============ CONFIGURATION ============
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const hasValidApiKey = GEMINI_API_KEY && GEMINI_API_KEY.length > 10;

const log = (...args: any[]) => console.log('[Voice]', ...args);
const logError = (...args: any[]) => console.error('[Voice ERROR]', ...args);

// ============ USER AUTH HELPER ============
interface UserInfo {
  isLoggedIn: boolean;
  name?: string;
  phone?: string;
  role?: string;
}

function getUserInfo(): UserInfo {
  try {
    const role = localStorage.getItem('nirnoy_role');
    const userDataStr = localStorage.getItem('nirnoy_user');
    
    if (role && role !== 'GUEST') {
      let userData: any = {};
      if (userDataStr) {
        try { userData = JSON.parse(userDataStr); } catch (e) {}
      }
      return {
        isLoggedIn: true,
        name: userData.name || undefined,
        phone: userData.phone || undefined,
        role: role
      };
    }
  } catch (e) {
    logError('Error reading user info:', e);
  }
  return { isLoggedIn: false };
}

// ============ AUDIO PLAYER ============
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
      this.gainNode.gain.value = 3.0;
      this.gainNode.connect(this.audioContext.destination);
      
      if (this.audioContext.state === 'suspended') await this.audioContext.resume();
      this.nextPlayTime = 0;
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
  }
}

// ============ GENERATE DOCTOR DATABASE ============
function generateDoctorKnowledge(): string {
  const totalDoctors = MOCK_DOCTORS.length;
  
  const specialtyCounts: Record<string, number> = {};
  const specialtyDoctors: Record<string, typeof MOCK_DOCTORS> = {};
  
  MOCK_DOCTORS.forEach(doc => {
    doc.specialties.forEach(spec => {
      specialtyCounts[spec] = (specialtyCounts[spec] || 0) + 1;
      if (!specialtyDoctors[spec]) specialtyDoctors[spec] = [];
      if (specialtyDoctors[spec].length < 3) {
        specialtyDoctors[spec].push(doc);
      }
    });
  });

  const specialtySummary = Object.entries(specialtyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([spec, count]) => {
      const docs = specialtyDoctors[spec] || [];
      const docNames = docs.map(d => `${d.name} (${d.chambers[0]?.fee || 500} টাকা)`).join(', ');
      return `${spec}: ${count} জন। যেমন: ${docNames}`;
    })
    .join('\n');

  return `মোট ডাক্তার: ${totalDoctors} জন বিশেষজ্ঞ ডাক্তার।

বিশেষত্ব অনুযায়ী:
${specialtySummary}`;
}

// ============ SYSTEM PROMPT ============
function getSystemPrompt(agentName: string, gender: 'male' | 'female', userInfo: UserInfo): string {
  const hour = new Date().getHours();
  let greeting = 'শুভ সন্ধ্যা';
  if (hour >= 5 && hour < 12) greeting = 'সুপ্রভাত';
  else if (hour >= 12 && hour < 17) greeting = 'শুভ দুপুর';
  else if (hour >= 17 && hour < 20) greeting = 'শুভ সন্ধ্যা';
  else greeting = 'শুভ রাত্রি';

  const doctorKnowledge = generateDoctorKnowledge();
  const genderWord = gender === 'male' ? 'পুরুষ' : 'মহিলা';
  const personality = gender === 'male' 
    ? 'তুমি একজন অভিজ্ঞ, বিশ্বস্ত বড় ভাইয়ের মতো। গম্ভীর কিন্তু যত্নশীল।'
    : 'তুমি একজন সহানুভূতিশীল, মিষ্টি বোনের মতো। উষ্ণ এবং সহায়ক।';

  // Different greeting and capabilities based on login status
  let userContext = '';
  let bookingCapability = '';
  let initialGreeting = '';

  if (userInfo.isLoggedIn && userInfo.name) {
    userContext = `
বর্তমান ব্যবহারকারী: ${userInfo.name} (লগইন করা আছে)
এই ব্যবহারকারী রেজিস্টার্ড, তাই তুমি তার জন্য সিরিয়াল বুক করতে পারবে।`;
    
    bookingCapability = `
সিরিয়াল বুকিং (শুধু লগইন করা ব্যবহারকারীর জন্য):
১. সমস্যা শুনে উপযুক্ত ডাক্তার সাজেস্ট করো
২. ডাক্তার পছন্দ হলে তারিখ ও সময় জিজ্ঞেস করো
৩. বুকিং কনফার্ম করো: "${userInfo.name}, আপনার সিরিয়াল বুক হয়ে গেছে!"`;

    initialGreeting = `"আসসালামু আলাইকুম ${userInfo.name}! ${greeting}! আমি ${agentName}। কেমন আছেন? আজ কী সেবা লাগবে?"`;
  } else {
    userContext = `
বর্তমান ব্যবহারকারী: অতিথি (লগইন করা নেই)
এই ব্যবহারকারী রেজিস্টার্ড নয়, তাই তুমি সিরিয়াল বুক করতে পারবে না।
শুধু ডাক্তার সাজেস্ট করতে পারবে এবং তথ্য দিতে পারবে।`;

    bookingCapability = `
গুরুত্বপূর্ণ সীমাবদ্ধতা:
- তুমি এই ব্যবহারকারীর জন্য সিরিয়াল বুক করতে পারবে না
- শুধু ডাক্তার সাজেস্ট করতে পারবে
- সিরিয়াল নিতে চাইলে বলো: "সিরিয়াল নিতে হলে আগে অ্যাকাউন্ট খুলতে হবে। 'শুরু করুন' বাটনে ক্লিক করুন।"
- অথবা বলো: "আপনি ওয়েবসাইটে গিয়ে সহজেই রেজিস্ট্রেশন করতে পারবেন, তারপর সিরিয়াল নিতে পারবেন।"`;

    initialGreeting = `"আসসালামু আলাইকুম! ${greeting}! আমি ${agentName}। কেমন আছেন? কী সমস্যা বলুন, আমি উপযুক্ত ডাক্তার খুঁজে দেব।"`;
  }

  return `তুমি "${agentName}" - নির্ণয় হেলথের ${genderWord} AI সহকারী। ${personality}
${userContext}

প্রথম কথা (সংযোগ হলেই বলবে):
${initialGreeting}

তোমার ব্যক্তিত্ব:
- একজন বাস্তব মানুষের মতো কথা বলো
- রোগীর কথা মনোযোগ দিয়ে শোনো
- সহানুভূতি দেখাও: "বুঝতে পারছি, এটা কষ্টকর"
- প্রশ্ন করো: "কতদিন ধরে এই সমস্যা?", "ব্যথা কোথায় বেশি?"
- আশ্বস্ত করো: "চিন্তা করবেন না, ভালো ডাক্তার আছেন"

নির্ণয় সম্পর্কে:
- বাংলাদেশের প্রথম AI স্বাস্থ্যসেবা প্ল্যাটফর্ম
- ওয়েবসাইট: nirnoy.ai
- ${MOCK_DOCTORS.length} জনের বেশি বিশেষজ্ঞ ডাক্তার
- ২৪ ঘণ্টা AI সহায়তা
- ঘরে বসে অনলাইন সিরিয়াল
- পারিবারিক স্বাস্থ্য ট্র্যাকিং

ডাক্তার তথ্য:
${doctorKnowledge}
${bookingCapability}

সমস্যা থেকে ডাক্তার সাজেস্ট:
- জ্বর, সর্দি, কাশি, মাথাব্যথা → মেডিসিন বিশেষজ্ঞ
- বুকে ব্যথা, হার্টের সমস্যা → হৃদরোগ বিশেষজ্ঞ
- মহিলাদের সমস্যা → স্ত্রীরোগ বিশেষজ্ঞ
- বাচ্চাদের অসুখ → শিশুরোগ বিশেষজ্ঞ
- হাড়ে ব্যথা, কোমর ব্যথা → হাড় ও জোড়া বিশেষজ্ঞ
- চুলকানি, ত্বকের সমস্যা → চর্মরোগ বিশেষজ্ঞ
- কান, নাক, গলা → নাক-কান-গলা বিশেষজ্ঞ
- চোখের সমস্যা → চক্ষু বিশেষজ্ঞ
- ডায়াবেটিস → ডায়াবেটিস বিশেষজ্ঞ
- পেটের সমস্যা → গ্যাস্ট্রো বিশেষজ্ঞ
- মানসিক সমস্যা → মানসিক রোগ বিশেষজ্ঞ

কথা বলার নিয়ম:
- সবসময় বাংলায় কথা বলো
- ছোট বাক্যে কথা বলো (২-৩ বাক্য)
- "আপনি", "জ্বী", "ধন্যবাদ" ব্যবহার করো
- ইমোজি বা ইংরেজি এড়িয়ে চলো

জরুরি অবস্থা:
বুকে তীব্র ব্যথা, শ্বাসকষ্ট, অজ্ঞান হলে বলো:
"এটা জরুরি! এখনই ৯৯৯ এ কল করুন!"

যা করবে না:
- ওষুধের নাম বা ডোজ বলবে না
- রোগ নির্ণয় করবে না
- ব্যক্তিগত তথ্য চাইবে না`;
}

// ============ TYPES ============
type Status = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

// ============ VOICE CARD - GLASSMORPHISM ============
const VoiceCard: React.FC<{
  name: string;
  gender: 'male' | 'female';
  status: Status;
  isActive: boolean;
  error: string | null;
  isLoggedIn: boolean;
  onStart: () => void;
  onStop: () => void;
}> = ({ name, gender, status, isActive, error, isLoggedIn, onStart, onStop }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const statusText: Record<Status, string> = {
    idle: isBn ? 'প্রস্তুত' : 'Ready',
    connecting: isBn ? 'সংযোগ হচ্ছে...' : 'Connecting...',
    listening: isBn ? 'শুনছি...' : 'Listening...',
    speaking: isBn ? 'বলছে...' : 'Speaking...',
    error: error || (isBn ? 'সমস্যা' : 'Error'),
  };

  const gradient = gender === 'male' 
    ? 'from-blue-500 via-indigo-500 to-violet-600' 
    : 'from-pink-500 via-rose-500 to-red-500';
  const glow = gender === 'male' ? 'shadow-blue-500/40' : 'shadow-pink-500/40';
  const bgTint = gender === 'male' ? 'from-blue-500/5 to-indigo-500/10' : 'from-pink-500/5 to-rose-500/10';

  return (
    <div className={`relative overflow-hidden rounded-3xl transition-all duration-500 group ${
      isActive ? `shadow-2xl ${glow} scale-[1.02]` : 'hover:scale-[1.01] hover:shadow-xl'
    }`}>
      {/* Glass background layers */}
      <div className={`absolute inset-0 bg-gradient-to-br ${bgTint}`}></div>
      <div className="absolute inset-0 backdrop-blur-[2px]"></div>
      
      {/* Animated glow orbs */}
      <div className={`absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-3xl transition-opacity duration-500 ${isActive ? 'opacity-40' : 'group-hover:opacity-30'}`}></div>
      <div className={`absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-2xl`}></div>
      
      {/* Main card content */}
      <div className="relative p-6 bg-white/90 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
        <div className="flex items-center gap-4 mb-5">
          {/* Avatar with glow effect */}
          <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg ${glow} transition-all duration-300 ${
            isActive ? 'scale-110' : 'group-hover:scale-105'
          }`}>
            <span className="text-white text-xl font-bold drop-shadow-lg">{gender === 'male' ? 'স্বা' : 'সে'}</span>
            {isActive && (
              <>
                <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-br ${gradient} opacity-50 blur animate-pulse`}></div>
                <div className={`absolute -inset-2 rounded-2xl bg-gradient-to-br ${gradient} opacity-30 blur-md animate-ping`}></div>
              </>
            )}
          </div>
          <div className="text-left">
            <h3 className="font-bold text-xl text-slate-800 tracking-tight">{name}</h3>
            <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
              <span className="text-base">{gender === 'male' ? '👨‍⚕️' : '👩‍⚕️'}</span>
              {gender === 'male' ? (isBn ? 'পুরুষ সহকারী' : 'Male') : (isBn ? 'মহিলা সহকারী' : 'Female')}
            </p>
          </div>
        </div>

        {/* Login status - Glass pill */}
        <div className={`text-xs px-3 py-2 rounded-full mb-4 inline-flex items-center gap-2 backdrop-blur-sm border transition-colors ${
          isLoggedIn 
            ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' 
            : 'bg-amber-500/10 text-amber-700 border-amber-500/20'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isLoggedIn ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
          {isLoggedIn 
            ? (isBn ? 'সিরিয়াল বুক করতে পারবেন' : 'Can book appointments')
            : (isBn ? 'শুধু ডাক্তার সাজেশন' : 'Doctor suggestions only')
          }
        </div>

        {isActive && (
          <div className="mb-5 p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-3 h-3 rounded-full transition-colors ${
                status === 'speaking' ? 'bg-violet-500 animate-pulse shadow-lg shadow-violet-500/50' :
                status === 'listening' ? 'bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50' :
                status === 'connecting' ? 'bg-amber-500 animate-pulse shadow-lg shadow-amber-500/50' :
                status === 'error' ? 'bg-red-500 shadow-lg shadow-red-500/50' : 'bg-slate-400'
              }`}></div>
              <span className="text-sm font-medium text-slate-600">{statusText[status]}</span>
            </div>

            {/* Audio visualizer - Listening */}
            {status === 'listening' && (
              <div className="flex justify-center items-end gap-1.5 h-10">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-full animate-pulse shadow-sm shadow-emerald-500/30"
                    style={{
                      animationDelay: `${i * 0.08}s`,
                      height: `${20 + Math.random() * 80}%`,
                    }}
                  ></div>
                ))}
              </div>
            )}

            {/* Audio visualizer - Speaking */}
            {status === 'speaking' && (
              <div className="flex justify-center items-end gap-1.5 h-10">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-gradient-to-t from-violet-500 to-purple-400 rounded-full animate-bounce shadow-sm shadow-violet-500/30"
                    style={{ animationDelay: `${i * 0.08}s` }}
                  ></div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action button - Glass style */}
        <button
          onClick={isActive ? onStop : onStart}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
            isActive
              ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:scale-[1.02]'
              : `bg-gradient-to-r ${gradient} text-white shadow-lg ${glow} hover:shadow-xl hover:scale-[1.02]`
          }`}
        >
          {isActive ? (isBn ? '🛑 থামান' : '🛑 Stop') : (isBn ? '🎤 কথা বলুন' : '🎤 Talk')}
        </button>
      </div>
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
  const [userInfo, setUserInfo] = useState<UserInfo>({ isLoggedIn: false });

  const clientRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<any>(null);
  const audioRef = useRef<AudioPlayer | null>(null);
  const micRef = useRef<Microphone | null>(null);
  const activeRef = useRef(false);
  const greetingSentRef = useRef(false);

  // Check user login status
  useEffect(() => {
    const checkUser = () => {
      const info = getUserInfo();
      setUserInfo(info);
      log('User info:', info);
    };
    
    checkUser();
    // Re-check when storage changes
    window.addEventListener('storage', checkUser);
    // Also check periodically in case of same-tab login
    const interval = setInterval(checkUser, 2000);
    
    return () => {
      window.removeEventListener('storage', checkUser);
      clearInterval(interval);
    };
  }, []);

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

    // Refresh user info before starting
    const currentUserInfo = getUserInfo();
    setUserInfo(currentUserInfo);

    cleanup();
    setActiveAgent(gender);
    setStatus('connecting');
    activeRef.current = true;
    greetingSentRef.current = false;

    const agentName = gender === 'male' ? 'স্বাস্থ্য' : 'সেবা';
    const voiceName = gender === 'male' ? 'Puck' : 'Kore';

    try {
      audioRef.current = new AudioPlayer();
      const audioOk = await audioRef.current.init();
      if (!audioOk) throw new Error('Audio init failed');

      micRef.current = new Microphone();

      log('Connecting with user info:', currentUserInfo);
      const session = await clientRef.current.live.connect({
        model: 'gemini-3-pro-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: getSystemPrompt(agentName, gender, currentUserInfo),
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } }
          }
        },
        callbacks: {
          onopen: async () => {
            log('Connected to Gemini Live!');
            activeRef.current = true;

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

            // Auto-greet
            if (!greetingSentRef.current && sessionRef.current && activeRef.current) {
              greetingSentRef.current = true;
              log('Triggering auto-greeting...');
              sessionRef.current.sendClientContent({
                turns: [{ 
                  role: 'user', 
                  parts: [{ text: 'হ্যালো, শুরু করো' }] 
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
    <section className="relative py-20 overflow-hidden mx-4 md:mx-8 rounded-3xl">
      {/* Background with gradient mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-pink-900/20 via-transparent to-transparent"></div>
      
      {/* Animated grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }}></div>
      
      {/* Floating orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="relative max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          {/* Status badge - Glass style */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 backdrop-blur-xl rounded-full mb-6 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
            <span className="text-emerald-400 text-sm font-semibold tracking-wide">
              {isBn ? '২৪/৭ সক্রিয়' : '24/7 Active'}
            </span>
          </div>
          
          {/* Title with gradient */}
          <h2 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            {isBn ? 'AI স্বাস্থ্য সহকারী' : 'AI Health Assistant'}
          </h2>
          
          {/* Subtitle */}
          <p className="text-slate-400 text-lg max-w-md mx-auto">
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
            isLoggedIn={userInfo.isLoggedIn}
            onStart={() => handleStart('male')}
            onStop={handleStop}
          />
          <VoiceCard
            name="সেবা"
            gender="female"
            status={activeAgent === 'female' ? status : 'idle'}
            isActive={activeAgent === 'female'}
            error={activeAgent === 'female' ? error : null}
            isLoggedIn={userInfo.isLoggedIn}
            onStart={() => handleStart('female')}
            onStop={handleStop}
          />
        </div>

        {/* Footer info - Glass card */}
        <div className="flex justify-center mt-8">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 backdrop-blur-xl rounded-full border border-white/10">
            <span className="text-slate-400 text-sm">
              {userInfo.isLoggedIn 
                ? (isBn ? `👋 ${userInfo.name || 'ব্যবহারকারী'}` : `👋 ${userInfo.name || 'User'}`)
                : ''
              }
            </span>
            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
            <span className="text-slate-400 text-sm flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span>
              {MOCK_DOCTORS.length}+ {isBn ? 'ডাক্তার' : 'Doctors'}
            </span>
            {!userInfo.isLoggedIn && (
              <>
                <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                <span className="text-amber-400 text-sm">
                  {isBn ? 'অ্যাকাউন্ট খুলে সিরিয়াল নিন' : 'Register to book'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeVoiceSection;
