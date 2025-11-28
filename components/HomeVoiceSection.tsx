import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { GoogleGenAI, Modality } from '@google/genai';
import { MOCK_DOCTORS } from '../data/mockData';

// ============ CONFIGURATION ============
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const hasValidApiKey = GEMINI_API_KEY && GEMINI_API_KEY.length > 10;

// Debug mode - set to true to see console logs
const DEBUG = true;
const log = (...args: any[]) => { if (DEBUG) console.log('[VoiceAgent]', ...args); };
const logError = (...args: any[]) => console.error('[VoiceAgent ERROR]', ...args);

// ============ AUDIO CONTEXT MANAGER ============
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
      
      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 2.5; // Boost volume
      this.gainNode.connect(this.audioContext.destination);
      
      // Resume if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.isInitialized = true;
      this.nextPlayTime = 0;
      log('AudioContext initialized:', this.audioContext.state, 'sampleRate:', this.audioContext.sampleRate);
      return true;
    } catch (e) {
      logError('Failed to init AudioContext:', e);
      return false;
    }
  }

  async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      log('AudioContext resumed');
    }
  }

  playPCM16(base64Data: string, sampleRate: number = 24000): void {
    if (!this.audioContext || !this.gainNode) {
      logError('AudioContext not initialized');
      return;
    }

    try {
      // Decode base64 to bytes
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM16 to Float32
      const int16Data = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
      const float32Data = new Float32Array(int16Data.length);
      for (let i = 0; i < int16Data.length; i++) {
        float32Data[i] = int16Data[i] / 32768.0;
      }

      // Create audio buffer
      const audioBuffer = this.audioContext.createBuffer(1, float32Data.length, sampleRate);
      audioBuffer.getChannelData(0).set(float32Data);

      // Create source and play
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.gainNode);

      const currentTime = this.audioContext.currentTime;
      const startTime = Math.max(currentTime + 0.05, this.nextPlayTime);
      
      source.start(startTime);
      this.nextPlayTime = startTime + audioBuffer.duration;
      
      log('Playing audio:', {
        duration: audioBuffer.duration.toFixed(3) + 's',
        samples: float32Data.length,
        startTime: startTime.toFixed(3)
      });

    } catch (e) {
      logError('Failed to play audio:', e);
    }
  }

  stop(): void {
    this.nextPlayTime = 0;
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {}
    }
    this.audioContext = null;
    this.gainNode = null;
    this.isInitialized = false;
  }
}

// ============ MICROPHONE MANAGER ============
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
      
      // Get microphone access with better error handling
      log('Requesting microphone access...');
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      log('Microphone access granted, tracks:', this.stream.getAudioTracks().length);

      // Create audio context for processing
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      
      // Resume if suspended
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
        
        // Downsample to 16kHz
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

        // Send every 100ms
        const now = Date.now();
        if (now - lastSendTime >= 100 && audioBuffer.length > 0) {
          const totalLength = audioBuffer.reduce((acc, buf) => acc + buf.length, 0);
          const combined = new Float32Array(totalLength);
          let offset = 0;
          for (const buf of audioBuffer) {
            combined.set(buf, offset);
            offset += buf.length;
          }

          // Convert to PCM16 base64
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
      log('Microphone processing started, sampleRate:', this.audioContext.sampleRate);
      return true;
    } catch (e: any) {
      logError('Failed to start microphone:', e.name, e.message);
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

// ============ SYSTEM PROMPT ============
function buildSystemPrompt(voiceGender: 'male' | 'female'): string {
  const hour = new Date().getHours();
  let greeting = 'শুভ সন্ধ্যা';
  if (hour >= 5 && hour < 12) greeting = 'সুপ্রভাত';
  else if (hour >= 12 && hour < 17) greeting = 'শুভ দুপুর';
  else if (hour >= 20) greeting = 'শুভ রাত্রি';

  const doctorList = MOCK_DOCTORS.slice(0, 5).map(d => 
    `- ${d.name}: ${d.specialties[0]}, ফি ৳${d.chambers[0]?.fee || 500}`
  ).join('\n');

  return `আপনি "Nree" - নির্ণয় হেলথ এর ${voiceGender === 'male' ? 'পুরুষ' : 'মহিলা'} AI সহকারী।

প্রথমেই বলুন: "আসসালামু আলাইকুম! ${greeting}! আমি Nree। কীভাবে সাহায্য করতে পারি?"

নিয়ম:
- শুধু বাংলায় কথা বলুন
- ছোট উত্তর দিন (১-২ বাক্য)
- বিনয়ী হোন

ডাক্তার তালিকা:
${doctorList}

জরুরি: বুকে ব্যথা/শ্বাসকষ্ট = "999 এ কল করুন!"`;
}

// ============ TYPES ============
type AgentStatus = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error';

// ============ VOICE AGENT CARD ============
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

  return (
    <div className={`bg-white rounded-2xl p-6 border-2 transition-all ${
      isActive ? 'border-blue-500 shadow-xl shadow-blue-500/20' : 'border-slate-200 hover:border-slate-300'
    }`}>
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
          gender === 'male' ? 'bg-blue-100' : 'bg-pink-100'
        }`}>
          <i className={`fas ${gender === 'male' ? 'fa-mars text-blue-600' : 'fa-venus text-pink-600'} text-2xl`}></i>
        </div>
        <div>
          <h3 className="font-bold text-slate-800">{name}</h3>
          <p className="text-sm text-slate-500">
            {gender === 'male' ? (isBn ? 'পুরুষ কণ্ঠ' : 'Male Voice') : (isBn ? 'মহিলা কণ্ঠ' : 'Female Voice')}
          </p>
        </div>
      </div>

      {isActive && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              status === 'speaking' ? 'bg-purple-500 animate-pulse' :
              status === 'listening' ? 'bg-green-500 animate-pulse' : 
              status === 'error' ? 'bg-red-500' : 'bg-blue-500'
            }`}></div>
            <span className={status === 'error' ? 'text-red-500' : 'text-slate-600'}>
              {getStatusText()}
            </span>
          </div>
          
          {(status === 'speaking' || status === 'listening') && (
            <div className="flex items-center justify-center gap-1 h-12 mt-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 rounded-full transition-all duration-150 ${
                    status === 'speaking' 
                      ? 'bg-gradient-to-t from-purple-500 to-pink-500' 
                      : 'bg-gradient-to-t from-blue-500 to-cyan-500'
                  }`}
                  style={{ 
                    height: `${15 + Math.random() * 25}px`,
                    animation: `pulse ${0.4 + i * 0.1}s ease-in-out infinite alternate`
                  }}
                ></div>
              ))}
            </div>
          )}

          {DEBUG && debugInfo && (
            <div className="mt-2 text-xs text-slate-400 bg-slate-50 p-2 rounded">
              {debugInfo}
            </div>
          )}
        </div>
      )}

      {isActive ? (
        <button 
          onClick={onDisconnect} 
          className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
        >
          <i className="fas fa-phone-slash"></i>
          {isBn ? 'শেষ করুন' : 'End Call'}
        </button>
      ) : (
        <button 
          onClick={onConnect} 
          disabled={!hasValidApiKey}
          className={`w-full py-3 font-bold rounded-xl transition flex items-center justify-center gap-2 ${
            hasValidApiKey 
              ? 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg shadow-blue-500/25' 
              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
          }`}
        >
          <i className="fas fa-phone"></i>
          {isBn ? 'কথা বলুন' : 'Connect'}
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
      log('GoogleGenAI client initialized');
    } else {
      log('No valid API key found');
    }
  }, []);

  // Cleanup
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
      setError('API Key কনফিগার করা হয়নি');
      return;
    }

    try {
      cleanup();
      setActiveAgent(gender);
      setStatus('connecting');
      setError(null);
      setDebugInfo('Initializing...');

      // Step 1: Initialize audio player (MUST be after user click)
      log('Step 1: Initializing audio player...');
      audioPlayerRef.current = new AudioPlayer();
      const audioReady = await audioPlayerRef.current.init();
      if (!audioReady) throw new Error('Failed to initialize audio');
      setDebugInfo('Audio ready');

      // Step 2: Initialize microphone manager (but don't start yet)
      log('Step 2: Preparing microphone...');
      micManagerRef.current = new MicrophoneManager();
      
      // Step 3: Connect to Gemini Live API
      log('Step 3: Connecting to Gemini Live API...');
      setDebugInfo('Connecting to Gemini...');
      
      const systemPrompt = buildSystemPrompt(gender);
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
            log('✅ WebSocket connected!');
            isConnectedRef.current = true;
            setStatus('connected');
            setDebugInfo('Connected! Starting mic...');

            // Start microphone capture
            const micStarted = await micManagerRef.current!.start((audioData) => {
              if (sessionRef.current && isConnectedRef.current) {
                try {
                  sessionRef.current.sendRealtimeInput({ media: audioData });
                } catch (e) {
                  logError('Failed to send audio:', e);
                }
              }
            });

            if (!micStarted) {
              setError('মাইক্রোফোন পারমিশন দিন');
              setStatus('error');
              setDebugInfo('Microphone permission denied');
              return;
            }

            setDebugInfo('Mic ready, waiting for greeting...');
            setStatus('listening');

            // Trigger greeting
            setTimeout(() => {
              if (sessionRef.current && isConnectedRef.current) {
                log('Sending greeting trigger...');
                sessionRef.current.sendClientContent({
                  turns: [{ role: 'user', parts: [{ text: 'হ্যালো' }] }],
                  turnComplete: true
                });
              }
            }, 1000);
          },

          onmessage: (message: any) => {
            log('Received message:', JSON.stringify(message).substring(0, 200));

            // Check for audio data
            const parts = message.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              if (part.inlineData?.mimeType?.startsWith('audio/') && part.inlineData?.data) {
                log('🔊 Received audio data, length:', part.inlineData.data.length);
                setStatus('speaking');
                setDebugInfo('Playing audio...');
                
                // Resume audio context if needed
                audioPlayerRef.current?.resume();
                
                // Play the audio
                audioPlayerRef.current?.playPCM16(part.inlineData.data, 24000);
              }
            }

            // Check for turn complete
            if (message.serverContent?.turnComplete) {
              log('Turn complete');
              setStatus('listening');
              setDebugInfo('Listening...');
            }

            // Check for interruption
            if (message.serverContent?.interrupted) {
              log('Interrupted');
              audioPlayerRef.current?.stop();
              audioPlayerRef.current?.init();
            }
          },

          onclose: (e: CloseEvent) => {
            log('WebSocket closed:', e.code, e.reason);
            isConnectedRef.current = false;
            
            // Handle specific close codes
            if (e.code === 1011) {
              // Check if it's a quota error
              if (e.reason?.toLowerCase().includes('quota')) {
                setError('API কোটা শেষ - পরে চেষ্টা করুন');
              } else {
                setError('সার্ভার ত্রুটি');
              }
              setStatus('error');
            } else if (e.code !== 1000) {
              setError('সংযোগ বিচ্ছিন্ন হয়েছে');
              setStatus('error');
            }
            
            // Cleanup resources
            if (micManagerRef.current) {
              micManagerRef.current.stop();
            }
            if (audioPlayerRef.current) {
              audioPlayerRef.current.stop();
            }
          },

          onerror: (e: ErrorEvent) => {
            logError('WebSocket error:', e);
            setError('সংযোগে সমস্যা হয়েছে');
            setStatus('error');
          },
        },
      });

      sessionRef.current = session;
      log('Session created');

    } catch (err: any) {
      logError('Connection failed:', err);
      let errorMsg = 'সংযোগ করা যাচ্ছে না';
      
      if (err.name === 'NotAllowedError') {
        errorMsg = 'মাইক্রোফোন পারমিশন দিন';
      } else if (err.message?.includes('quota') || err.message?.includes('exceeded')) {
        errorMsg = 'API কোটা শেষ';
      } else if (err.message?.includes('API')) {
        errorMsg = 'API ত্রুটি';
      } else if (err.message?.includes('network') || err.message?.includes('Network')) {
        errorMsg = 'নেটওয়ার্ক সমস্যা';
      }
      
      setError(errorMsg);
      setStatus('error');
      setDebugInfo(err.message || 'Unknown error');
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 border border-slate-700">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
          </span>
          24/7 {isBn ? 'সক্রিয়' : 'Active'}
        </div>
        <h3 className="text-2xl font-black text-white mb-2">
          {isBn ? 'Nree-এর সাথে কথা বলুন' : 'Talk to Nree'}
        </h3>
        <p className="text-slate-400 text-sm">
          {isBn ? 'বাংলায় কথা বলে ডাক্তার খুঁজুন, প্রশ্ন করুন' : 'Speak in Bangla to find doctors, ask questions'}
        </p>
        
        {!hasValidApiKey && (
          <div className="mt-4 bg-amber-500/20 text-amber-400 px-4 py-2 rounded-lg text-sm inline-block">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            {isBn ? 'API Key প্রয়োজন' : 'API Key required'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <VoiceAgentCard
          name="Nree"
          gender="male"
          onConnect={() => handleConnect('male')}
          onDisconnect={cleanup}
          status={activeAgent === 'male' ? status : 'idle'}
          isActive={activeAgent === 'male'}
          error={activeAgent === 'male' ? error : null}
          debugInfo={activeAgent === 'male' ? debugInfo : undefined}
        />
        <VoiceAgentCard
          name="Nree"
          gender="female"
          onConnect={() => handleConnect('female')}
          onDisconnect={cleanup}
          status={activeAgent === 'female' ? status : 'idle'}
          isActive={activeAgent === 'female'}
          error={activeAgent === 'female' ? error : null}
          debugInfo={activeAgent === 'female' ? debugInfo : undefined}
        />
      </div>

      <p className="text-center text-slate-500 text-xs mt-6">
        <i className="fas fa-shield-alt mr-1"></i>
        {isBn ? 'নিরাপদ ও গোপনীয় • বিনামূল্যে' : 'Safe & Private • Free'}
      </p>

      {DEBUG && (
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-600">
            API Key: {hasValidApiKey ? '✅ Set' : '❌ Missing'} | 
            Open browser console (F12) for debug logs
          </p>
        </div>
      )}
    </div>
  );
};

export default HomeVoiceSection;
