import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { GoogleGenAI, Modality } from '@google/genai';
import { MOCK_DOCTORS } from '../data/mockData';

// ============ CONFIGURATION ============
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const hasValidApiKey = GEMINI_API_KEY && GEMINI_API_KEY.length > 10;

// Debug mode
const DEBUG = true;
const log = (...args: any[]) => { if (DEBUG) console.log('[VoiceAgent]', ...args); };
const logError = (...args: any[]) => console.error('[VoiceAgent ERROR]', ...args);

// ============ AUDIO PLAYER CLASS ============
class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private nextPlayTime = 0;
  private isInitialized = false;

  async init(): Promise<boolean> {
    if (this.isInitialized && this.audioContext?.state !== 'closed') {
      await this.resume();
      return true;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate: 24000 });
      
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 2.5;
      this.gainNode.connect(this.audioContext.destination);
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.isInitialized = true;
      this.nextPlayTime = 0;
      log('AudioContext initialized:', this.audioContext.state);
      return true;
    } catch (e) {
      logError('Failed to init AudioContext:', e);
      return false;
    }
  }

  async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  playPCM16(base64Data: string, sampleRate: number = 24000): void {
    if (!this.audioContext || !this.gainNode) {
      logError('AudioContext not initialized');
      return;
    }

    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16Data = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
      const float32Data = new Float32Array(int16Data.length);
      for (let i = 0; i < int16Data.length; i++) {
        float32Data[i] = int16Data[i] / 32768.0;
      }

      const audioBuffer = this.audioContext.createBuffer(1, float32Data.length, sampleRate);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.gainNode);

      const currentTime = this.audioContext.currentTime;
      const startTime = Math.max(currentTime + 0.05, this.nextPlayTime);
      
      source.start(startTime);
      this.nextPlayTime = startTime + audioBuffer.duration;
      
      log('🔊 Playing audio:', audioBuffer.duration.toFixed(2) + 's');
    } catch (e) {
      logError('Failed to play audio:', e);
    }
  }

  stop(): void {
    this.nextPlayTime = 0;
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch (e) {}
    }
    this.audioContext = null;
    this.gainNode = null;
    this.isInitialized = false;
  }
}

// ============ MICROPHONE MANAGER CLASS ============
class MicrophoneManager {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private onAudioData: ((data: { data: string; mimeType: string }) => void) | null = null;
  private isRunning = false;

  async start(onAudioData: (data: { data: string; mimeType: string }) => void): Promise<boolean> {
    if (this.isRunning) return true;

    try {
      this.onAudioData = onAudioData;
      
      log('Requesting microphone...');
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      log('Microphone granted');

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      let audioBuffer: Float32Array[] = [];
      let lastSendTime = Date.now();

      this.processor.onaudioprocess = (event) => {
        if (!this.onAudioData || !this.isRunning) return;

        const inputData = event.inputBuffer.getChannelData(0);
        
        const inputSampleRate = this.audioContext!.sampleRate;
        const outputSampleRate = 16000;
        const ratio = inputSampleRate / outputSampleRate;
        const newLength = Math.round(inputData.length / ratio);
        const downsampled = new Float32Array(newLength);
        
        for (let i = 0; i < newLength; i++) {
          const index = Math.round(i * ratio);
          downsampled[i] = inputData[Math.min(index, inputData.length - 1)];
        }
        
        audioBuffer.push(downsampled);

        const now = Date.now();
        if (now - lastSendTime >= 100 && audioBuffer.length > 0) {
          const totalLength = audioBuffer.reduce((acc, buf) => acc + buf.length, 0);
          const combined = new Float32Array(totalLength);
          let offset = 0;
          for (const buf of audioBuffer) {
            combined.set(buf, offset);
            offset += buf.length;
          }

          const int16 = new Int16Array(combined.length);
          for (let i = 0; i < combined.length; i++) {
            const s = Math.max(-1, Math.min(1, combined[i]));
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          
          const bytes = new Uint8Array(int16.buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          
          this.onAudioData({
            data: btoa(binary),
            mimeType: 'audio/pcm;rate=16000'
          });

          audioBuffer = [];
          lastSendTime = now;
        }
      };

      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
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
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.audioContext) {
      try { this.audioContext.close(); } catch (e) {}
      this.audioContext = null;
    }
    this.onAudioData = null;
    log('Microphone stopped');
  }
}

// ============ SYSTEM PROMPT FOR VOICE AGENTS ============
function buildSystemPrompt(agentName: string, gender: 'male' | 'female'): string {
  const hour = new Date().getHours();
  let greeting = 'শুভ সন্ধ্যা';
  if (hour >= 5 && hour < 12) greeting = 'সুপ্রভাত';
  else if (hour >= 12 && hour < 17) greeting = 'শুভ দুপুর';
  else if (hour >= 20) greeting = 'শুভ রাত্রি';

  const doctorList = MOCK_DOCTORS.slice(0, 5).map(d => 
    `- ${d.name}: ${d.specialties[0]}, ফি ৳${d.chambers[0]?.fee || 500}`
  ).join('\n');

  const personality = gender === 'male' 
    ? 'বিশ্বস্ত, জ্ঞানী এবং সহানুভূতিশীল বড় ভাইয়ের মতো'
    : 'যত্নশীল, উষ্ণ এবং সহানুভূতিশীল বড় বোনের মতো';

  return `আপনি "${agentName}" - নির্ণয় হেলথ এর ${gender === 'male' ? 'পুরুষ' : 'মহিলা'} AI স্বাস্থ্য সহকারী।

🎭 ব্যক্তিত্ব: ${personality}

📢 প্রথম কথা (এটি অবশ্যই বলুন):
"আসসালামু আলাইকুম! ${greeting}! আমি ${agentName}। নির্ণয় হেলথ থেকে বলছি। আপনার স্বাস্থ্য বিষয়ে কীভাবে সাহায্য করতে পারি?"

📋 নিয়মাবলী:
1. শুধুমাত্র বাংলায় কথা বলুন - মিষ্টি এবং স্পষ্ট উচ্চারণে
2. ছোট এবং সহজ বাক্য ব্যবহার করুন (১-২ বাক্য)
3. রোগীর কথা মনোযোগ দিয়ে শুনুন
4. প্রয়োজনে সঠিক ডাক্তার সাজেস্ট করুন
5. সবসময় বিনয়ী এবং সম্মানজনক থাকুন
6. "জ্বী", "আচ্ছা", "বুঝেছি" এই শব্দগুলো ব্যবহার করুন

👨‍⚕️ ডাক্তার তালিকা:
${doctorList}

🚨 জরুরি অবস্থা:
- বুকে ব্যথা, শ্বাসকষ্ট, অজ্ঞান = "এখনই 999 এ কল করুন!"
- রক্তক্ষরণ, দুর্ঘটনা = "জরুরি বিভাগে যান!"

💬 কথা বলার ধরন:
- উষ্ণ এবং বন্ধুত্বপূর্ণ
- ধীরে এবং স্পষ্ট করে
- সহানুভূতিশীল`;
}

// ============ TYPES ============
type AgentStatus = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error';

// ============ VOICE AGENT CARD COMPONENT ============
interface VoiceAgentCardProps {
  name: string;
  gender: 'male' | 'female';
  status: AgentStatus;
  isActive: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  error?: string | null;
  debugInfo?: string;
}

const VoiceAgentCard: React.FC<VoiceAgentCardProps> = ({ 
  name, gender, status, isActive, onConnect, onDisconnect, error, debugInfo 
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const getStatusText = () => {
    switch (status) {
      case 'connecting': return isBn ? 'কানেক্ট হচ্ছে...' : 'Connecting...';
      case 'connected': return isBn ? 'সংযুক্ত' : 'Connected';
      case 'speaking': return isBn ? 'বলছে...' : 'Speaking...';
      case 'listening': return isBn ? 'শুনছে...' : 'Listening...';
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
        ? `border-${gender === 'male' ? 'blue' : 'pink'}-500 shadow-xl shadow-${gender === 'male' ? 'blue' : 'pink'}-500/20` 
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
              status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
              status === 'error' ? 'bg-red-500' : 'bg-blue-500'
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
                      : 'bg-gradient-to-t from-blue-500 to-cyan-400'
                  }`}
                  style={{ 
                    height: `${12 + Math.random() * 30}px`,
                    animation: `pulse ${0.3 + i * 0.08}s ease-in-out infinite alternate`
                  }}
                ></div>
              ))}
            </div>
          )}

          {/* Connecting Animation */}
          {status === 'connecting' && (
            <div className="flex items-center justify-center gap-2 h-14 bg-slate-50 rounded-xl">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          )}

          {/* Debug Info */}
          {DEBUG && debugInfo && (
            <div className="mt-2 text-xs text-slate-400 bg-slate-100 p-2 rounded font-mono">
              {debugInfo}
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
          <i className="fas fa-phone"></i>
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
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Refs
  const aiClientRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<any>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const micManagerRef = useRef<MicrophoneManager | null>(null);
  const isConnectedRef = useRef(false);

  // Initialize AI client
  useEffect(() => {
    if (hasValidApiKey) {
      aiClientRef.current = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      log('GoogleGenAI initialized');
    }
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    log('Cleaning up...');
    isConnectedRef.current = false;
    
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }
    
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stop();
      audioPlayerRef.current = null;
    }
    
    if (micManagerRef.current) {
      micManagerRef.current.stop();
      micManagerRef.current = null;
    }
    
    setActiveAgent(null);
    setStatus('idle');
    setError(null);
    setDebugInfo('');
  }, []);

  useEffect(() => { return () => cleanup(); }, [cleanup]);

  // Connect handler
  const handleConnect = async (gender: 'male' | 'female') => {
    if (!hasValidApiKey || !aiClientRef.current) {
      setError('API Key নেই');
      return;
    }

    try {
      cleanup();
      setActiveAgent(gender);
      setStatus('connecting');
      setError(null);
      setDebugInfo('শুরু হচ্ছে...');

      // Agent names
      const agentName = gender === 'male' ? 'স্বাস্থ্য' : 'সেবা';
      
      // Step 1: Initialize audio
      log('Step 1: Audio init...');
      audioPlayerRef.current = new AudioPlayer();
      const audioReady = await audioPlayerRef.current.init();
      if (!audioReady) throw new Error('Audio init failed');
      setDebugInfo('অডিও প্রস্তুত');

      // Step 2: Prepare microphone
      log('Step 2: Mic init...');
      micManagerRef.current = new MicrophoneManager();
      
      // Step 3: Connect to Gemini Live
      log('Step 3: Connecting to Gemini...');
      setDebugInfo('জেমিনি সংযোগ...');
      
      const systemPrompt = buildSystemPrompt(agentName, gender);
      
      // Use Gemini's built-in voices
      // Aoede = deeper male voice, Kore = female voice
      const voiceName = gender === 'male' ? 'Aoede' : 'Kore';

      const session = await aiClientRef.current.live.connect({
        model: 'gemini-2.0-flash-exp',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemPrompt,
          speechConfig: {
            voiceConfig: { 
              prebuiltVoiceConfig: { voiceName } 
            },
          },
        },
        callbacks: {
          onopen: async () => {
            log('✅ Connected!');
            isConnectedRef.current = true;
            setStatus('connected');
            setDebugInfo('মাইক শুরু...');

            // Start microphone
            const micStarted = await micManagerRef.current!.start((audioData) => {
              if (sessionRef.current && isConnectedRef.current) {
                try {
                  sessionRef.current.sendRealtimeInput({ media: audioData });
                } catch (e) {
                  logError('Send audio error:', e);
                }
              }
            });

            if (!micStarted) {
              setError('মাইক্রোফোন পারমিশন দিন');
              setStatus('error');
              return;
            }

            setDebugInfo('শুনছি...');
            setStatus('listening');

            // Trigger greeting
            setTimeout(() => {
              if (sessionRef.current && isConnectedRef.current) {
                log('Triggering greeting...');
                sessionRef.current.sendClientContent({
                  turns: [{ role: 'user', parts: [{ text: 'হ্যালো' }] }],
                  turnComplete: true
                });
              }
            }, 800);
          },

          onmessage: (message: any) => {
            log('Message:', JSON.stringify(message).substring(0, 150));

            const parts = message.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              if (part.inlineData?.mimeType?.startsWith('audio/') && part.inlineData?.data) {
                log('🔊 Audio received');
                setStatus('speaking');
                setDebugInfo('বলছে...');
                
                audioPlayerRef.current?.resume();
                audioPlayerRef.current?.playPCM16(part.inlineData.data, 24000);
              }
            }

            if (message.serverContent?.turnComplete) {
              log('Turn complete');
              setStatus('listening');
              setDebugInfo('শুনছি...');
            }

            if (message.serverContent?.interrupted) {
              log('Interrupted');
              audioPlayerRef.current?.stop();
              audioPlayerRef.current?.init();
            }
          },

          onclose: (e: CloseEvent) => {
            log('Closed:', e.code, e.reason);
            isConnectedRef.current = false;
            
            if (e.code === 1011) {
              if (e.reason?.toLowerCase().includes('quota')) {
                setError('API কোটা শেষ');
              } else {
                setError('সার্ভার সমস্যা');
              }
              setStatus('error');
            } else if (e.code !== 1000) {
              setError('সংযোগ বিচ্ছিন্ন');
              setStatus('error');
            }
            
            micManagerRef.current?.stop();
            audioPlayerRef.current?.stop();
          },

          onerror: (e: ErrorEvent) => {
            logError('WebSocket error:', e);
            setError('সংযোগ ত্রুটি');
            setStatus('error');
          },
        },
      });

      sessionRef.current = session;
      log('Session created');

    } catch (err: any) {
      logError('Connection failed:', err);
      let errorMsg = 'সংযোগ ব্যর্থ';
      
      if (err.name === 'NotAllowedError') {
        errorMsg = 'মাইক্রোফোন পারমিশন দিন';
      } else if (err.message?.includes('quota')) {
        errorMsg = 'API কোটা শেষ';
      }
      
      setError(errorMsg);
      setStatus('error');
      setDebugInfo(err.message || '');
    }
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
          debugInfo={activeAgent === 'male' ? debugInfo : undefined}
        />
        <VoiceAgentCard
          name="সেবা"
          gender="female"
          onConnect={() => handleConnect('female')}
          onDisconnect={cleanup}
          status={activeAgent === 'female' ? status : 'idle'}
          isActive={activeAgent === 'female'}
          error={activeAgent === 'female' ? error : null}
          debugInfo={activeAgent === 'female' ? debugInfo : undefined}
        />
      </div>

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-slate-500 text-xs flex items-center justify-center gap-2">
          <i className="fas fa-shield-alt"></i>
          {isBn ? 'নিরাপদ ও গোপনীয় • সম্পূর্ণ বিনামূল্যে' : 'Safe & Private • Completely Free'}
        </p>
      </div>

      {/* Debug Panel */}
      {DEBUG && (
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-600">
            API: {hasValidApiKey ? '✅' : '❌'} | Console: F12
          </p>
        </div>
      )}
    </div>
  );
};

export default HomeVoiceSection;
