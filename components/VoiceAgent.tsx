import React, { useState, useRef, useEffect, useCallback } from 'react';
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
      
      // Get microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });
      
      log('Microphone access granted');

      // Create audio context for processing
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      
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
      log('Microphone processing started');
      return true;
    } catch (e) {
      logError('Failed to start microphone:', e);
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
function buildSystemPrompt(voiceGender: 'male' | 'female', context?: string): string {
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

${context ? `প্রসঙ্গ: ${context}\n` : ''}

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
    
    setStatus('idle');
    setError(null);
    setDebugInfo('');
  }, []);

  useEffect(() => { return () => cleanup(); }, [cleanup]);

  // Connect handler
  const handleConnect = async () => {
    if (!hasValidApiKey || !aiClientRef.current) {
      setError('API Key কনফিগার করা হয়নি');
      return;
    }

    try {
      cleanup();
      setStatus('connecting');
      setError(null);
      setDebugInfo('Initializing...');
      setTranscript([]);

      // Step 1: Initialize audio player (MUST be after user click)
      log('Step 1: Initializing audio player...');
      audioPlayerRef.current = new AudioPlayer();
      const audioReady = await audioPlayerRef.current.init();
      if (!audioReady) throw new Error('Failed to initialize audio');
      setDebugInfo('Audio ready');

      // Step 2: Initialize microphone
      log('Step 2: Initializing microphone...');
      micManagerRef.current = new MicrophoneManager();
      
      // Step 3: Connect to Gemini Live API
      log('Step 3: Connecting to Gemini Live API...');
      setDebugInfo('Connecting to Gemini...');
      
      const systemPrompt = buildSystemPrompt(voiceGender, context);
      const voiceName = voiceGender === 'male' ? 'Aoede' : 'Kore';

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
              setError('মাইক্রোফোন শুরু করা যায়নি');
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
              
              // Check for text parts
              if (part.text) {
                setTranscript(prev => [...prev, `AI: ${part.text}`]);
              }
            }

            // Check for input transcription
            if (message.serverContent?.inputTranscription) {
              setTranscript(prev => [...prev, `You: ${message.serverContent.inputTranscription}`]);
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
            if (e.code !== 1000) {
              setError('সংযোগ বিচ্ছিন্ন হয়েছে');
            }
            cleanup();
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
      if (err.name === 'NotAllowedError') errorMsg = 'মাইক্রোফোন পারমিশন দিন';
      else if (err.message?.includes('API')) errorMsg = 'API ত্রুটি';
      setError(errorMsg);
      setStatus('error');
      setDebugInfo(err.message || 'Unknown error');
    }
  };

  // Handle disconnect
  const handleDisconnect = () => {
    cleanup();
    onClose?.();
  };

  // Auto-connect on mount if not compact
  useEffect(() => {
    if (!compact && hasValidApiKey) {
      handleConnect();
    }
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

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-microphone text-xl"></i>
            </div>
            <div>
              <h4 className="font-bold">Nree AI</h4>
              <p className="text-sm text-white/70">{getStatusText()}</p>
            </div>
          </div>
          
          {status === 'idle' ? (
            <button
              onClick={handleConnect}
              disabled={!hasValidApiKey}
              className="px-4 py-2 bg-white text-blue-600 font-bold rounded-lg hover:bg-white/90 transition"
            >
              <i className="fas fa-phone mr-2"></i>
              কথা বলুন
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition"
            >
              <i className="fas fa-phone-slash mr-2"></i>
              শেষ
            </button>
          )}
        </div>

        {(status === 'speaking' || status === 'listening') && (
          <div className="flex items-center justify-center gap-1 h-8">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-1 rounded-full bg-white transition-all duration-150`}
                style={{ 
                  height: `${10 + Math.random() * 20}px`,
                  animation: `pulse ${0.4 + i * 0.1}s ease-in-out infinite alternate`
                }}
              ></div>
            ))}
          </div>
        )}

        {!hasValidApiKey && (
          <p className="text-xs text-white/60 mt-2">
            <i className="fas fa-exclamation-triangle mr-1"></i>
            API Key প্রয়োজন
          </p>
        )}
      </div>
    );
  }

  // Full modal view
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <i className={`fas ${voiceGender === 'male' ? 'fa-mars' : 'fa-venus'} text-2xl`}></i>
              </div>
              <div>
                <h3 className="text-xl font-bold">Nree AI</h3>
                <p className="text-sm text-white/80">{getStatusText()}</p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Visualization */}
        <div className="p-8 bg-slate-50">
          <div className="flex items-center justify-center gap-2 h-24">
            {status === 'connecting' ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            ) : (status === 'speaking' || status === 'listening') ? (
              [...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 rounded-full transition-all duration-150 ${
                    status === 'speaking' 
                      ? 'bg-gradient-to-t from-purple-500 to-pink-500' 
                      : 'bg-gradient-to-t from-blue-500 to-cyan-500'
                  }`}
                  style={{ 
                    height: `${20 + Math.random() * 50}px`,
                    animation: `pulse ${0.3 + i * 0.1}s ease-in-out infinite alternate`
                  }}
                ></div>
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
              <p key={i} className={`text-sm mb-1 ${line.startsWith('You:') ? 'text-blue-600' : 'text-slate-700'}`}>
                {line}
              </p>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border-t border-red-100">
            <p className="text-red-600 text-sm">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </p>
          </div>
        )}

        {/* Debug Info */}
        {DEBUG && debugInfo && (
          <div className="p-2 bg-slate-100 border-t">
            <p className="text-xs text-slate-500">{debugInfo}</p>
          </div>
        )}

        {/* Actions */}
        <div className="p-4 border-t">
          {status === 'idle' ? (
            <button
              onClick={handleConnect}
              disabled={!hasValidApiKey}
              className={`w-full py-4 font-bold rounded-xl transition flex items-center justify-center gap-2 ${
                hasValidApiKey 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white' 
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <i className="fas fa-phone"></i>
              কথা বলুন
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
            >
              <i className="fas fa-phone-slash"></i>
              শেষ করুন
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceAgent;
