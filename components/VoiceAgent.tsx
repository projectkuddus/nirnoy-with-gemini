import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { MOCK_DOCTORS } from '../data/mockData';

// ============ CONFIGURATION ============
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const hasValidApiKey = GEMINI_API_KEY && GEMINI_API_KEY.length > 10;

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
      log('AudioContext initialized');
      return true;
    } catch (e) {
      logError('AudioContext init failed:', e);
      return false;
    }
  }

  async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  playPCM16(base64Data: string, sampleRate: number = 24000): void {
    if (!this.audioContext || !this.gainNode) return;

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
      
      log('🔊 Playing:', audioBuffer.duration.toFixed(2) + 's');
    } catch (e) {
      logError('Play failed:', e);
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
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });

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
        const ratio = this.audioContext!.sampleRate / 16000;
        const newLength = Math.round(inputData.length / ratio);
        const downsampled = new Float32Array(newLength);
        
        for (let i = 0; i < newLength; i++) {
          downsampled[i] = inputData[Math.min(Math.round(i * ratio), inputData.length - 1)];
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
          
          this.onAudioData({ data: btoa(binary), mimeType: 'audio/pcm;rate=16000' });
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
      logError('Mic error:', e.name, e.message);
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
  }
}

// ============ SYSTEM PROMPT ============
function buildSystemPrompt(agentName: string, gender: 'male' | 'female', context?: string): string {
  const hour = new Date().getHours();
  let greeting = 'শুভ সন্ধ্যা';
  if (hour >= 5 && hour < 12) greeting = 'সুপ্রভাত';
  else if (hour >= 12 && hour < 17) greeting = 'শুভ দুপুর';
  else if (hour >= 20) greeting = 'শুভ রাত্রি';

  const doctorList = MOCK_DOCTORS.slice(0, 5).map(d => 
    `- ${d.name}: ${d.specialties[0]}, ফি ৳${d.chambers[0]?.fee || 500}`
  ).join('\n');

  const personality = gender === 'male' 
    ? 'বিশ্বস্ত এবং জ্ঞানী বড় ভাইয়ের মতো'
    : 'যত্নশীল এবং উষ্ণ বড় বোনের মতো';

  return `আপনি "${agentName}" - নির্ণয় হেলথ এর AI স্বাস্থ্য সহকারী।

🎭 ব্যক্তিত্ব: ${personality}

📢 প্রথম কথা:
"আসসালামু আলাইকুম! ${greeting}! আমি ${agentName}। কীভাবে সাহায্য করতে পারি?"

${context ? `📋 প্রসঙ্গ: ${context}\n` : ''}

📋 নিয়ম:
- শুধু বাংলায় কথা বলুন
- ছোট বাক্য (১-২ বাক্য)
- "জ্বী", "আচ্ছা", "বুঝেছি" ব্যবহার করুন
- উষ্ণ এবং বন্ধুত্বপূর্ণ

👨‍⚕️ ডাক্তার:
${doctorList}

🚨 জরুরি = "999 এ কল করুন!"`;
}

// ============ TYPES ============
type AgentStatus = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error';

interface VoiceAgentProps {
  onClose?: () => void;
  voiceGender?: 'male' | 'female';
  context?: string;
  compact?: boolean;
}

// ============ MAIN COMPONENT ============
const VoiceAgent: React.FC<VoiceAgentProps> = ({ 
  onClose, 
  voiceGender = 'female', 
  context,
  compact = false 
}) => {
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [transcript, setTranscript] = useState<string[]>([]);

  const aiClientRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<any>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const micManagerRef = useRef<MicrophoneManager | null>(null);
  const isConnectedRef = useRef(false);

  useEffect(() => {
    if (hasValidApiKey) {
      aiClientRef.current = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    }
  }, []);

  const cleanup = useCallback(() => {
    isConnectedRef.current = false;
    if (sessionRef.current) { try { sessionRef.current.close(); } catch (e) {} sessionRef.current = null; }
    if (audioPlayerRef.current) { audioPlayerRef.current.stop(); audioPlayerRef.current = null; }
    if (micManagerRef.current) { micManagerRef.current.stop(); micManagerRef.current = null; }
    setStatus('idle');
    setError(null);
    setDebugInfo('');
  }, []);

  useEffect(() => { return () => cleanup(); }, [cleanup]);

  const handleConnect = async () => {
    if (!hasValidApiKey || !aiClientRef.current) {
      setError('API Key নেই');
      return;
    }

    try {
      cleanup();
      setStatus('connecting');
      setTranscript([]);

      const agentName = voiceGender === 'male' ? 'স্বাস্থ্য' : 'সেবা';

      audioPlayerRef.current = new AudioPlayer();
      await audioPlayerRef.current.init();

      micManagerRef.current = new MicrophoneManager();
      
      const systemPrompt = buildSystemPrompt(agentName, voiceGender, context);
      const voiceName = voiceGender === 'male' ? 'Aoede' : 'Kore';

      const session = await aiClientRef.current.live.connect({
        model: 'gemini-2.0-flash-exp',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemPrompt,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
        callbacks: {
          onopen: async () => {
            isConnectedRef.current = true;
            setStatus('connected');

            const micStarted = await micManagerRef.current!.start((audioData) => {
              if (sessionRef.current && isConnectedRef.current) {
                try { sessionRef.current.sendRealtimeInput({ media: audioData }); } catch (e) {}
              }
            });

            if (!micStarted) {
              setError('মাইক পারমিশন দিন');
              setStatus('error');
              return;
            }

            setStatus('listening');

            setTimeout(() => {
              if (sessionRef.current && isConnectedRef.current) {
                sessionRef.current.sendClientContent({
                  turns: [{ role: 'user', parts: [{ text: 'হ্যালো' }] }],
                  turnComplete: true
                });
              }
            }, 800);
          },

          onmessage: (message: any) => {
            const parts = message.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              if (part.inlineData?.mimeType?.startsWith('audio/') && part.inlineData?.data) {
                setStatus('speaking');
                audioPlayerRef.current?.resume();
                audioPlayerRef.current?.playPCM16(part.inlineData.data, 24000);
              }
              if (part.text) {
                setTranscript(prev => [...prev, `AI: ${part.text}`]);
              }
            }

            if (message.serverContent?.inputTranscription) {
              setTranscript(prev => [...prev, `You: ${message.serverContent.inputTranscription}`]);
            }

            if (message.serverContent?.turnComplete) {
              setStatus('listening');
            }

            if (message.serverContent?.interrupted) {
              audioPlayerRef.current?.stop();
              audioPlayerRef.current?.init();
            }
          },

          onclose: (e: CloseEvent) => {
            isConnectedRef.current = false;
            if (e.code !== 1000) {
              setError(e.reason?.includes('quota') ? 'API কোটা শেষ' : 'সংযোগ বিচ্ছিন্ন');
              setStatus('error');
            }
            micManagerRef.current?.stop();
            audioPlayerRef.current?.stop();
          },

          onerror: () => {
            setError('সংযোগ ত্রুটি');
            setStatus('error');
          },
        },
      });

      sessionRef.current = session;
    } catch (err: any) {
      setError(err.name === 'NotAllowedError' ? 'মাইক পারমিশন দিন' : 'সংযোগ ব্যর্থ');
      setStatus('error');
    }
  };

  const handleDisconnect = () => {
    cleanup();
    onClose?.();
  };

  useEffect(() => {
    if (!compact && hasValidApiKey) handleConnect();
  }, [compact]);

  const getStatusText = () => {
    switch (status) {
      case 'connecting': return 'কানেক্ট হচ্ছে...';
      case 'connected': return 'সংযুক্ত';
      case 'speaking': return 'বলছে...';
      case 'listening': return 'শুনছে...';
      case 'error': return error || 'ত্রুটি';
      default: return 'প্রস্তুত';
    }
  };

  const agentName = voiceGender === 'male' ? 'স্বাস্থ্য' : 'সেবা';

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
              <i className="fas fa-phone mr-2"></i>কথা বলুন
            </button>
          ) : (
            <button onClick={handleDisconnect}
              className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition">
              <i className="fas fa-phone-slash mr-2"></i>শেষ
            </button>
          )}
        </div>

        {(status === 'speaking' || status === 'listening') && (
          <div className="flex items-center justify-center gap-1 h-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-1 rounded-full bg-white transition-all"
                style={{ height: `${10 + Math.random() * 20}px`, animation: `pulse ${0.4 + i * 0.1}s ease-in-out infinite alternate` }}></div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full modal view
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
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
            <button onClick={handleDisconnect}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Visualization */}
        <div className="p-8 bg-slate-50">
          <div className="flex items-center justify-center gap-2 h-24">
            {status === 'connecting' ? (
              <div className="flex items-center gap-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}></div>
                ))}
              </div>
            ) : (status === 'speaking' || status === 'listening') ? (
              [...Array(7)].map((_, i) => (
                <div key={i}
                  className={`w-2 rounded-full transition-all ${status === 'speaking' ? 'bg-gradient-to-t from-purple-500 to-pink-500' : 'bg-gradient-to-t from-blue-500 to-cyan-500'}`}
                  style={{ height: `${20 + Math.random() * 50}px`, animation: `pulse ${0.3 + i * 0.1}s ease-in-out infinite alternate` }}></div>
              ))
            ) : (
              <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center">
                <i className="fas fa-microphone text-3xl text-slate-400"></i>
              </div>
            )}
          </div>
        </div>

        {/* Transcript */}
        {transcript.length > 0 && (
          <div className="max-h-40 overflow-y-auto p-4 bg-slate-100 border-t">
            {transcript.slice(-5).map((line, i) => (
              <p key={i} className={`text-sm mb-1 ${line.startsWith('You:') ? 'text-blue-600' : 'text-slate-700'}`}>{line}</p>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border-t border-red-100">
            <p className="text-red-600 text-sm"><i className="fas fa-exclamation-circle mr-2"></i>{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="p-4 border-t">
          {status === 'idle' ? (
            <button onClick={handleConnect} disabled={!hasValidApiKey}
              className={`w-full py-4 font-bold rounded-xl transition flex items-center justify-center gap-2 ${
                hasValidApiKey ? 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}>
              <i className="fas fa-phone"></i>কথা বলুন
            </button>
          ) : (
            <button onClick={handleDisconnect}
              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition flex items-center justify-center gap-2">
              <i className="fas fa-phone-slash"></i>শেষ করুন
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceAgent;
