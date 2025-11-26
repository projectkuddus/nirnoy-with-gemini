import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { MOCK_DOCTORS } from '../data/mockData';

// ============ CONFIGURATION ============
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const hasValidApiKey = GEMINI_API_KEY && GEMINI_API_KEY.length > 10;

// The correct model name for Gemini Live API (non-Vertex AI)
const LIVE_MODEL = 'gemini-2.0-flash-live-001';

// Debug mode
const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log('[VoiceAgent]', ...args);
const logError = (...args: any[]) => console.error('[VoiceAgent ERROR]', ...args);

// ============ AUDIO CONSTANTS ============
const INPUT_SAMPLE_RATE = 16000;  // Gemini expects 16kHz input
const OUTPUT_SAMPLE_RATE = 24000; // Gemini outputs 24kHz

// ============ AUDIO HELPERS ============

// Convert Float32 audio to PCM16 base64 string
function audioPCM16FromFloat32(float32Data: Float32Array): string {
  const pcm16 = new Int16Array(float32Data.length);
  for (let i = 0; i < float32Data.length; i++) {
    const sample = Math.max(-1, Math.min(1, float32Data[i]));
    pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
  }
  
  // Convert to base64
  const uint8 = new Uint8Array(pcm16.buffer);
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

// Decode base64 PCM16 audio to Float32Array for Web Audio API
function audioFloat32FromPCM16Base64(base64Data: string): Float32Array {
  // Decode base64 to binary
  const binaryString = atob(base64Data);
  const uint8Array = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    uint8Array[i] = binaryString.charCodeAt(i);
  }
  
  // Convert to Int16 (PCM16 is 16-bit signed little-endian)
  const dataView = new DataView(uint8Array.buffer);
  const numSamples = uint8Array.length / 2;
  const float32Array = new Float32Array(numSamples);
  
  for (let i = 0; i < numSamples; i++) {
    // Read as little-endian signed 16-bit integer
    const int16 = dataView.getInt16(i * 2, true);
    // Normalize to [-1, 1]
    float32Array[i] = int16 / 32768;
  }
  
  return float32Array;
}

// Resample audio from source rate to target rate
function resampleAudio(
  inputData: Float32Array, 
  inputRate: number, 
  outputRate: number
): Float32Array {
  if (inputRate === outputRate) {
    return inputData;
  }
  
  const ratio = inputRate / outputRate;
  const outputLength = Math.floor(inputData.length / ratio);
  const output = new Float32Array(outputLength);
  
  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, inputData.length - 1);
    const t = srcIndex - srcIndexFloor;
    
    // Linear interpolation
    output[i] = inputData[srcIndexFloor] * (1 - t) + inputData[srcIndexCeil] * t;
  }
  
  return output;
}

// ============ GREETING ============
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'সুপ্রভাত';
  if (hour >= 12 && hour < 17) return 'শুভ দুপুর';
  if (hour >= 17 && hour < 20) return 'শুভ সন্ধ্যা';
  return 'শুভ রাত্রি';
}

// ============ SYSTEM PROMPT ============
function getSystemPrompt(agentNumber: number): string {
  const greeting = getGreeting();
  const doctors = MOCK_DOCTORS.slice(0, 5).map(d => 
    `${d.name} (${d.specialties[0]}), ফি: ৳${d.chambers[0]?.fee}`
  ).join('; ');

  return `আপনি Nirnoy ${agentNumber}, নির্ণয় কেয়ার এর AI ভয়েস এসিস্ট্যান্ট।

প্রথমেই বলুন: "আসসালামু আলাইকুম! ${greeting}! নির্ণয় কেয়ারে স্বাগতম। আমি Nirnoy ${agentNumber}। কীভাবে সাহায্য করতে পারি?"

বাংলাদেশী বাংলায় কথা বলুন। সংক্ষিপ্ত উত্তর দিন।

ডাক্তার: ${doctors}

কাজ: ডাক্তার খোঁজা, অ্যাপয়েন্টমেন্ট বুকিং, ফি জানানো।
জরুরি: বুকে ব্যথা/শ্বাসকষ্ট বললে 999 এ কল করতে বলুন।`;
}

// ============ TYPES ============
type Status = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

interface State {
  activeAgent: 1 | 2 | null;
  status: Status;
  statusText: string;
  volume: number;
  error: string | null;
}

// ============ AUDIO PLAYER CLASS ============
class AudioPlayer {
  private context: AudioContext;
  private queue: AudioBufferSourceNode[] = [];
  private nextStartTime: number = 0;
  private onPlaybackStart?: () => void;
  private onPlaybackEnd?: () => void;

  constructor(onStart?: () => void, onEnd?: () => void) {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: OUTPUT_SAMPLE_RATE
    });
    this.onPlaybackStart = onStart;
    this.onPlaybackEnd = onEnd;
  }

  async resume() {
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  play(float32Audio: Float32Array) {
    if (float32Audio.length === 0) return;

    const buffer = this.context.createBuffer(1, float32Audio.length, OUTPUT_SAMPLE_RATE);
    buffer.getChannelData(0).set(float32Audio);

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);

    const now = this.context.currentTime;
    const startTime = Math.max(now + 0.05, this.nextStartTime);
    
    if (this.queue.length === 0) {
      this.onPlaybackStart?.();
    }

    source.start(startTime);
    this.nextStartTime = startTime + buffer.duration;
    this.queue.push(source);

    log(`Playing audio: ${float32Audio.length} samples, duration: ${buffer.duration.toFixed(2)}s`);

    source.onended = () => {
      this.queue = this.queue.filter(s => s !== source);
      if (this.queue.length === 0) {
        this.onPlaybackEnd?.();
      }
    };
  }

  stop() {
    this.queue.forEach(s => {
      try { s.stop(); } catch (e) {}
    });
    this.queue = [];
    this.nextStartTime = 0;
  }

  close() {
    this.stop();
    if (this.context.state !== 'closed') {
      this.context.close();
    }
  }
}

// ============ AUDIO RECORDER CLASS ============
class AudioRecorder {
  private context: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;
  private onAudioData?: (data: string) => void;
  private onVolume?: (volume: number) => void;
  private buffer: Float32Array[] = [];
  private lastSendTime: number = 0;
  private sendInterval: number = 100; // ms

  async start(onAudioData: (base64: string) => void, onVolume?: (v: number) => void) {
    this.onAudioData = onAudioData;
    this.onVolume = onVolume;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
    });

    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = this.context.createMediaStreamSource(this.stream);
    
    this.processor = this.context.createScriptProcessor(4096, 1, 1);
    
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate volume
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.onVolume?.(Math.min(1, rms * 5));

      // Resample to 16kHz
      const resampled = resampleAudio(
        new Float32Array(inputData), 
        this.context!.sampleRate, 
        INPUT_SAMPLE_RATE
      );
      this.buffer.push(resampled);

      // Send every sendInterval ms
      const now = Date.now();
      if (now - this.lastSendTime >= this.sendInterval && this.buffer.length > 0) {
        const totalLength = this.buffer.reduce((sum, arr) => sum + arr.length, 0);
        const combined = new Float32Array(totalLength);
        let offset = 0;
        for (const arr of this.buffer) {
          combined.set(arr, offset);
          offset += arr.length;
        }

        const base64 = audioPCM16FromFloat32(combined);
        this.onAudioData?.(base64);
        
        this.buffer = [];
        this.lastSendTime = now;
      }
    };

    source.connect(this.processor);
    this.processor.connect(this.context.destination);
    
    log('Audio recording started');
  }

  stop() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.context && this.context.state !== 'closed') {
      this.context.close();
      this.context = null;
    }
    this.buffer = [];
    log('Audio recording stopped');
  }
}

// ============ MAIN COMPONENT ============
export const HomeVoiceSection: React.FC = () => {
  const [state, setState] = useState<State>({
    activeAgent: null,
    status: 'idle',
    statusText: 'প্রস্তুত',
    volume: 0,
    error: null,
  });

  const aiRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<any>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const isActiveRef = useRef(false);

  // Initialize AI client
  useEffect(() => {
    if (hasValidApiKey) {
      log('Initializing AI client with model:', LIVE_MODEL);
      aiRef.current = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    }
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    log('Cleaning up...');
    isActiveRef.current = false;

    recorderRef.current?.stop();
    recorderRef.current = null;

    playerRef.current?.close();
    playerRef.current = null;

    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }

    setState({
      activeAgent: null,
      status: 'idle',
      statusText: 'প্রস্তুত',
      volume: 0,
      error: null,
    });
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  // Start session
  const startSession = async (agentNumber: 1 | 2) => {
    if (!aiRef.current) {
      setState(s => ({ ...s, error: 'API Key কনফিগার করা হয়নি', status: 'error' }));
      return;
    }

    cleanup();
    isActiveRef.current = true;

    setState({
      activeAgent: agentNumber,
      status: 'connecting',
      statusText: 'কানেক্ট হচ্ছে...',
      volume: 0,
      error: null,
    });

    try {
      // Create audio player
      playerRef.current = new AudioPlayer(
        () => setState(s => ({ ...s, status: 'speaking', statusText: 'বলছে...' })),
        () => {
          if (isActiveRef.current) {
            setState(s => ({ ...s, status: 'listening', statusText: 'কথা বলুন...' }));
          }
        }
      );
      await playerRef.current.resume();

      // Voice: Puck (male-ish), Kore (female)
      const voiceName = agentNumber === 1 ? 'Puck' : 'Kore';
      const systemPrompt = getSystemPrompt(agentNumber);

      log('Connecting to Gemini Live API...');
      log('Model:', LIVE_MODEL);
      log('Voice:', voiceName);

      const session = await aiRef.current.live.connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemPrompt,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
        callbacks: {
          onopen: () => {
            log('Session connected!');
            setState(s => ({ ...s, status: 'listening', statusText: 'কথা বলুন...' }));

            // Start recording and sending audio
            recorderRef.current = new AudioRecorder();
            recorderRef.current.start(
              (base64Audio) => {
                if (sessionRef.current && isActiveRef.current) {
                  try {
                    sessionRef.current.sendRealtimeInput({
                      media: {
                        mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
                        data: base64Audio,
                      }
                    });
                  } catch (e) {
                    logError('Send audio error:', e);
                  }
                }
              },
              (volume) => setState(s => ({ ...s, volume }))
            );

            // Trigger AI to speak first
            setTimeout(() => {
              if (sessionRef.current && isActiveRef.current) {
                log('Triggering initial greeting...');
                sessionRef.current.sendClientContent({
                  turns: [{ role: 'user', parts: [{ text: 'হ্যালো' }] }],
                  turnComplete: true,
                });
              }
            }, 500);
          },

          onmessage: (msg: LiveServerMessage) => {
            // Handle audio data
            const parts = msg.serverContent?.modelTurn?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.inlineData?.data && part.inlineData?.mimeType?.includes('audio')) {
                  log('Received audio chunk:', part.inlineData.data.length, 'bytes base64');
                  
                  try {
                    const float32Audio = audioFloat32FromPCM16Base64(part.inlineData.data);
                    log('Decoded to:', float32Audio.length, 'samples');
                    playerRef.current?.play(float32Audio);
                  } catch (e) {
                    logError('Audio decode error:', e);
                  }
                }

                if (part.text) {
                  log('Received text:', part.text);
                }
              }
            }

            // Handle turn complete
            if (msg.serverContent?.turnComplete) {
              log('Turn complete');
            }

            // Handle interruption
            if (msg.serverContent?.interrupted) {
              log('Interrupted');
              playerRef.current?.stop();
            }
          },

          onclose: () => {
            log('Session closed');
            cleanup();
          },

          onerror: (e: ErrorEvent) => {
            logError('Session error:', e);
            setState(s => ({ 
              ...s, 
              error: 'সংযোগে সমস্যা হয়েছে', 
              status: 'error',
              statusText: 'ত্রুটি' 
            }));
            cleanup();
          },
        },
      });

      sessionRef.current = session;
      log('Session created successfully');

    } catch (err: any) {
      logError('Failed to start session:', err);
      setState(s => ({
        ...s,
        error: err.message?.includes('NotAllowed') 
          ? 'মাইক্রোফোন পারমিশন দিন' 
          : `ত্রুটি: ${err.message || 'Unknown error'}`,
        status: 'error',
        statusText: 'ত্রুটি',
      }));
      cleanup();
    }
  };

  // Render volume bars
  const VolumeBars: React.FC<{ active: boolean; speaking: boolean }> = ({ active, speaking }) => (
    <div className="h-12 bg-slate-50 rounded-xl flex items-center justify-center gap-1 px-4">
      {[...Array(6)].map((_, i) => {
        const height = active 
          ? speaking 
            ? `${20 + Math.random() * 80}%`
            : `${15 + state.volume * 85 * Math.random()}%`
          : '15%';
        return (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-75 ${
              active ? (speaking ? 'bg-blue-500' : 'bg-green-500') : 'bg-slate-300'
            }`}
            style={{ height }}
          />
        );
      })}
    </div>
  );

  // Render agent card
  const AgentCard: React.FC<{ num: 1 | 2 }> = ({ num }) => {
    const isActive = state.activeAgent === num;
    const isOther = state.activeAgent !== null && state.activeAgent !== num;
    const isSpeaking = isActive && state.status === 'speaking';
    const isMale = num === 1;
    const color = isMale ? 'blue' : 'pink';

    return (
      <div className={`relative bg-white rounded-2xl p-6 border-2 transition-all ${
        isActive 
          ? `border-${color}-500 shadow-xl shadow-${color}-500/10`
          : isOther 
            ? 'border-slate-100 opacity-50'
            : `border-slate-200 hover:border-${color}-300 hover:shadow-lg`
      }`}>
        {isActive && (
          <div className="absolute top-3 right-3">
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative rounded-full h-3 w-3 bg-green-500" />
            </span>
          </div>
        )}

        <div className="w-20 h-20 mx-auto mb-4 relative">
          <div className={`absolute inset-0 rounded-full ${isMale ? 'bg-blue-100' : 'bg-pink-100'}`} />
          <div className="absolute inset-1 bg-white rounded-full flex items-center justify-center">
            <i className={`fas ${isMale ? 'fa-user-tie' : 'fa-user'} text-3xl ${isMale ? 'text-blue-500' : 'text-pink-500'}`} />
          </div>
          {isSpeaking && (
            <div className={`absolute inset-0 rounded-full border-2 ${isMale ? 'border-blue-400' : 'border-pink-400'} animate-ping opacity-30`} />
          )}
        </div>

        <h3 className="text-lg font-bold text-slate-800 text-center mb-1">Nirnoy {num}</h3>
        <p className={`text-sm text-center mb-1 ${isMale ? 'text-blue-500' : 'text-pink-500'}`}>
          {isMale ? '🎙️ পুরুষ কণ্ঠ' : '🎙️ মহিলা কণ্ঠ'}
        </p>
        <p className="text-xs text-slate-500 text-center mb-6">AI স্বাস্থ্য সহায়ক</p>

        {isActive ? (
          <div className="space-y-4">
            <VolumeBars active speaking={isSpeaking} />
            <p className={`text-center text-sm font-medium animate-pulse ${isMale ? 'text-blue-600' : 'text-pink-600'}`}>
              <i className={`${isSpeaking ? 'fas fa-volume-up' : 'fas fa-microphone'} mr-2`} />
              {state.statusText}
            </p>
            <button
              onClick={cleanup}
              className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition flex items-center justify-center gap-2"
            >
              <i className="fas fa-phone-slash" /> শেষ করুন
            </button>
          </div>
        ) : (
          <button
            onClick={() => startSession(num)}
            disabled={isOther}
            className={`w-full py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
              isMale
                ? 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-300'
                : 'bg-pink-500 text-white hover:bg-pink-600 disabled:bg-pink-300'
            } disabled:cursor-not-allowed`}
          >
            <i className="fas fa-phone" /> কথা বলুন
          </button>
        )}
      </div>
    );
  };

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-4">
            <i className="fas fa-phone-volume text-blue-500" />
            <span className="text-sm font-bold text-blue-600">24/7 • বিনামূল্যে</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            কথা বলে অ্যাপয়েন্টমেন্ট নিন
          </h2>
          <p className="text-slate-600 max-w-xl mx-auto">
            বাংলায় কথা বলুন AI এজেন্টের সাথে। ডাক্তার খুঁজুন, অ্যাপয়েন্টমেন্ট বুক করুন।
          </p>
        </div>

        {state.error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center justify-center gap-2">
            <i className="fas fa-exclamation-circle" /> {state.error}
          </div>
        )}

        {!hasValidApiKey && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
            <p className="font-bold mb-1">
              <i className="fas fa-exclamation-triangle mr-2" />API Key প্রয়োজন
            </p>
            <p className="text-xs">
              <code className="bg-amber-100 px-1 rounded">.env</code> ফাইলে{' '}
              <code className="bg-amber-100 px-1 rounded">VITE_GEMINI_API_KEY</code> সেট করুন।
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <AgentCard num={1} />
          <AgentCard num={2} />
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            <i className="fas fa-info-circle mr-2" />
            Nirnoy 1 পুরুষ কণ্ঠে, Nirnoy 2 মহিলা কণ্ঠে কথা বলে।
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-slate-400 text-xs">
          <i className="fas fa-lock" />
          <span>Powered by Gemini AI</span>
        </div>
      </div>
    </section>
  );
};

export default HomeVoiceSection;
