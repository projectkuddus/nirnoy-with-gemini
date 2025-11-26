import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { MOCK_DOCTORS } from '../data/mockData';

// ============ CONFIGURATION ============
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const hasValidApiKey = GEMINI_API_KEY && GEMINI_API_KEY.length > 10;

// Debug mode - set to true to see console logs
const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log('[VoiceAgent]', ...args);
const logError = (...args: any[]) => console.error('[VoiceAgent ERROR]', ...args);

// ============ AUDIO HELPERS ============

// Convert Float32Array to PCM16 base64 for Gemini
function float32ToPCM16Base64(float32Data: Float32Array): string {
  const int16 = new Int16Array(float32Data.length);
  for (let i = 0; i < float32Data.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return btoa(binary);
}

// Decode base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Decode PCM16 to AudioBuffer - FIXED VERSION
function pcm16ToAudioBuffer(
  pcmData: Uint8Array,
  audioContext: AudioContext,
  sampleRate: number = 24000
): AudioBuffer {
  // PCM16 is 2 bytes per sample
  const numSamples = pcmData.length / 2;
  
  // Create a DataView for proper endianness handling
  const dataView = new DataView(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength);
  
  // Create Float32 array for audio data
  const float32Data = new Float32Array(numSamples);
  
  for (let i = 0; i < numSamples; i++) {
    // Read as little-endian 16-bit signed integer
    const int16Value = dataView.getInt16(i * 2, true);
    // Convert to float [-1, 1]
    float32Data[i] = int16Value / 32768.0;
  }
  
  // Create audio buffer
  const audioBuffer = audioContext.createBuffer(1, numSamples, sampleRate);
  audioBuffer.getChannelData(0).set(float32Data);
  
  log(`Created audio buffer: ${numSamples} samples, ${(numSamples / sampleRate).toFixed(2)}s duration`);
  
  return audioBuffer;
}

// Downsample audio to 16kHz
function downsampleTo16kHz(buffer: Float32Array, inputSampleRate: number): Float32Array {
  if (inputSampleRate === 16000) {
    return buffer;
  }
  
  const ratio = inputSampleRate / 16000;
  const newLength = Math.floor(buffer.length / ratio);
  const result = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    const srcIndex = Math.floor(i * ratio);
    result[i] = buffer[srcIndex];
  }
  
  return result;
}

// ============ TIME-BASED GREETING ============
function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'সুপ্রভাত';
  if (hour >= 12 && hour < 17) return 'শুভ দুপুর';
  if (hour >= 17 && hour < 20) return 'শুভ সন্ধ্যা';
  return 'শুভ রাত্রি';
}

// ============ SYSTEM PROMPT ============
function buildSystemPrompt(agentNumber: number, isMale: boolean): string {
  const today = new Date().toLocaleDateString('bn-BD', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const greeting = getTimeBasedGreeting();
  
  const doctorList = MOCK_DOCTORS.slice(0, 8).map(d => 
    `${d.name} (${d.specialties[0]}) - ${d.chambers[0]?.name}, ফি: ৳${d.chambers[0]?.fee}`
  ).join('\n');

  const genderContext = isMale 
    ? 'আপনি একজন পুরুষ এসিস্ট্যান্ট।'
    : 'আপনি একজন মহিলা এসিস্ট্যান্ট।';

  return `
## পরিচয়
আপনি "Nirnoy ${agentNumber}", নির্ণয় কেয়ার এর AI ভয়েস এসিস্ট্যান্ট। ${genderContext}

## প্রথম কথা (অবশ্যই বলতে হবে)
কল শুরু হলেই প্রথমে বলুন:
"আসসালামু আলাইকুম! ${greeting}! নির্ণয় কেয়ারে স্বাগতম। আমি Nirnoy ${agentNumber}। কীভাবে সাহায্য করতে পারি?"

## ভাষা
শুধুমাত্র বাংলাদেশী বাংলায় কথা বলুন। "জি", "আচ্ছা", "ঠিক আছে", "ভাই", "আপা" ব্যবহার করুন।

## তারিখ: ${today}

## ডাক্তার:
${doctorList}

## কাজ:
1. ডাক্তার খোঁজা
2. অ্যাপয়েন্টমেন্ট বুকিং
3. ফি জানানো

## জরুরি:
বুকে ব্যথা/শ্বাসকষ্ট বললে: "এটা ইমার্জেন্সি! 999 এ কল করুন।"

## সংক্ষিপ্ত উত্তর দিন।
`;
}

// ============ VOICE AGENT TYPES ============
type AgentStatus = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error';

interface VoiceAgentState {
  activeAgent: 1 | 2 | null;
  status: AgentStatus;
  statusText: string;
  volume: number;
  error: string | null;
}

// ============ MAIN COMPONENT ============
export const HomeVoiceSection: React.FC = () => {
  const [state, setState] = useState<VoiceAgentState>({
    activeAgent: null,
    status: 'idle',
    statusText: 'প্রস্তুত',
    volume: 0,
    error: null,
  });

  // Refs
  const aiClientRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<any>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const nextPlayTimeRef = useRef<number>(0);
  const isConnectedRef = useRef(false);

  // Initialize AI client
  useEffect(() => {
    if (hasValidApiKey) {
      log('Initializing GoogleGenAI client');
      aiClientRef.current = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    } else {
      logError('No valid API key found');
    }
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    log('Cleaning up...');
    isConnectedRef.current = false;
    
    // Stop all audio sources
    audioQueueRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    audioQueueRef.current = [];
    
    // Close session
    if (sessionRef.current) {
      try { 
        sessionRef.current.close(); 
        log('Session closed');
      } catch (e) {}
      sessionRef.current = null;
    }
    
    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    // Disconnect processor
    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch (e) {}
      processorRef.current = null;
    }
    
    // Close audio contexts
    if (playbackContextRef.current && playbackContextRef.current.state !== 'closed') {
      try { playbackContextRef.current.close(); } catch (e) {}
      playbackContextRef.current = null;
    }
    
    if (inputContextRef.current && inputContextRef.current.state !== 'closed') {
      try { inputContextRef.current.close(); } catch (e) {}
      inputContextRef.current = null;
    }
    
    nextPlayTimeRef.current = 0;
    
    setState({
      activeAgent: null,
      status: 'idle',
      statusText: 'প্রস্তুত',
      volume: 0,
      error: null,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // Play audio buffer with proper scheduling
  const playAudioBuffer = useCallback((buffer: AudioBuffer) => {
    const ctx = playbackContextRef.current;
    if (!ctx) {
      logError('No playback context available');
      return;
    }
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    
    // Schedule playback
    const currentTime = ctx.currentTime;
    const startTime = Math.max(currentTime + 0.01, nextPlayTimeRef.current);
    
    log(`Scheduling audio: currentTime=${currentTime.toFixed(3)}, startTime=${startTime.toFixed(3)}, duration=${buffer.duration.toFixed(3)}`);
    
    source.start(startTime);
    nextPlayTimeRef.current = startTime + buffer.duration;
    
    audioQueueRef.current.push(source);
    
    source.onended = () => {
      const index = audioQueueRef.current.indexOf(source);
      if (index > -1) {
        audioQueueRef.current.splice(index, 1);
      }
      
      if (audioQueueRef.current.length === 0) {
        log('All audio finished playing');
        setState(prev => {
          if (prev.status === 'speaking') {
            return { ...prev, status: 'listening', statusText: 'কথা বলুন...' };
          }
          return prev;
        });
      }
    };
  }, []);

  // Start voice session
  const startSession = async (agentNumber: 1 | 2) => {
    if (!hasValidApiKey || !aiClientRef.current) {
      setState(prev => ({
        ...prev,
        error: 'API Key কনফিগার করা হয়নি।',
        status: 'error',
        statusText: 'কনফিগারেশন ত্রুটি',
      }));
      return;
    }

    try {
      cleanup();
      
      log(`Starting session for agent ${agentNumber}`);
      
      setState({
        activeAgent: agentNumber,
        status: 'connecting',
        statusText: 'কানেক্ট হচ্ছে...',
        volume: 0,
        error: null,
      });

      // Request microphone permission
      log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      mediaStreamRef.current = stream;
      log('Microphone access granted');

      // Create audio context for playback (24kHz - Gemini output sample rate)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      playbackContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      
      if (playbackContextRef.current.state === 'suspended') {
        await playbackContextRef.current.resume();
      }
      log(`Playback context created: sampleRate=${playbackContextRef.current.sampleRate}`);

      // Build system prompt
      const isMale = agentNumber === 1;
      const systemPrompt = buildSystemPrompt(agentNumber, isMale);
      
      // Voice selection: Male = Puck (male), Female = Kore (female)
      // Available voices: Puck, Charon, Kore, Fenrir, Aoede
      const voiceName = isMale ? 'Puck' : 'Kore';
      
      log(`Connecting with voice: ${voiceName}`);

      // Connect to Gemini Live API
      const session = await aiClientRef.current.live.connect({
        model: 'gemini-2.0-flash-exp',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemPrompt,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName,
              },
            },
          },
        },
        callbacks: {
          onopen: () => {
            log('Session opened successfully');
            isConnectedRef.current = true;
            
            setState(prev => ({
              ...prev,
              status: 'connected',
              statusText: 'সংযুক্ত...',
            }));

            // Start audio capture FIRST
            startAudioCapture(stream);

            // Then trigger the AI to speak first by sending a greeting prompt
            setTimeout(() => {
              if (sessionRef.current && isConnectedRef.current) {
                log('Sending initial greeting prompt to trigger AI response');
                sessionRef.current.sendClientContent({
                  turns: [{
                    role: 'user',
                    parts: [{ text: 'হ্যালো, শুরু করুন' }]
                  }],
                  turnComplete: true
                });
              }
            }, 1000);
          },
          
          onmessage: (message: LiveServerMessage) => {
            log('Received message:', JSON.stringify(message, null, 2).substring(0, 500));
            
            // Check for setup complete
            if (message.setupComplete) {
              log('Setup complete received');
            }
            
            // Handle audio response from serverContent.modelTurn.parts
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                // Check for inline data (audio)
                if (part.inlineData) {
                  const { mimeType, data } = part.inlineData;
                  log(`Received inline data: mimeType=${mimeType}, dataLength=${data?.length || 0}`);
                  
                  if (data && mimeType?.includes('audio')) {
                    setState(prev => ({ ...prev, status: 'speaking', statusText: 'বলছে...' }));
                    
                    try {
                      const audioData = base64ToUint8Array(data);
                      log(`Decoded audio data: ${audioData.length} bytes`);
                      
                      if (playbackContextRef.current && audioData.length > 0) {
                        const audioBuffer = pcm16ToAudioBuffer(audioData, playbackContextRef.current, 24000);
                        playAudioBuffer(audioBuffer);
                      }
                    } catch (e) {
                      logError('Audio decode/play error:', e);
                    }
                  }
                }
                
                // Check for text (for debugging)
                if (part.text) {
                  log(`Received text: ${part.text}`);
                }
              }
            }
            
            // Handle turn complete
            if (message.serverContent?.turnComplete) {
              log('Turn complete');
              setState(prev => ({ 
                ...prev, 
                status: 'listening', 
                statusText: 'কথা বলুন...' 
              }));
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              log('Interrupted by user');
              audioQueueRef.current.forEach(s => {
                try { s.stop(); } catch (e) {}
              });
              audioQueueRef.current = [];
              if (playbackContextRef.current) {
                nextPlayTimeRef.current = playbackContextRef.current.currentTime;
              }
              setState(prev => ({ ...prev, status: 'listening', statusText: 'কথা বলুন...' }));
            }
          },
          
          onclose: (event: CloseEvent) => {
            log('Session closed:', event.code, event.reason);
            isConnectedRef.current = false;
            cleanup();
          },
          
          onerror: (error: ErrorEvent) => {
            logError('Session error:', error);
            setState(prev => ({
              ...prev,
              error: 'সংযোগে সমস্যা হয়েছে।',
              status: 'error',
              statusText: 'ত্রুটি',
            }));
            cleanup();
          },
        },
      });

      sessionRef.current = session;
      log('Session reference stored');

    } catch (err: any) {
      logError('Session start error:', err);
      
      let errorMessage = 'ভয়েস এজেন্ট শুরু করা যাচ্ছে না।';
      if (err.name === 'NotAllowedError') {
        errorMessage = 'মাইক্রোফোন পারমিশন দিন।';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'মাইক্রোফোন পাওয়া যাচ্ছে না।';
      } else if (err.message) {
        errorMessage = `ত্রুটি: ${err.message.substring(0, 100)}`;
      }
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        status: 'error',
        statusText: 'ত্রুটি',
      }));
      cleanup();
    }
  };

  // Start audio capture and send to session
  const startAudioCapture = (stream: MediaStream) => {
    log('Starting audio capture...');
    
    // Create a separate context for input capture
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    inputContextRef.current = new AudioContextClass();
    
    const source = inputContextRef.current.createMediaStreamSource(stream);
    const inputSampleRate = inputContextRef.current.sampleRate;
    log(`Input context created: sampleRate=${inputSampleRate}`);
    
    const bufferSize = 4096;
    const processor = inputContextRef.current.createScriptProcessor(bufferSize, 1, 1);
    processorRef.current = processor;
    
    let audioChunks: Float32Array[] = [];
    const SEND_INTERVAL_MS = 100;
    let lastSendTime = Date.now();
    
    processor.onaudioprocess = (event) => {
      if (!isConnectedRef.current || !sessionRef.current) return;
      
      const inputData = event.inputBuffer.getChannelData(0);
      
      // Calculate volume for visualization
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      setState(prev => ({ ...prev, volume: Math.min(1, rms * 5) }));
      
      // Downsample to 16kHz (required by Gemini)
      const downsampled = downsampleTo16kHz(new Float32Array(inputData), inputSampleRate);
      audioChunks.push(downsampled);
      
      // Send audio every SEND_INTERVAL_MS
      const now = Date.now();
      if (now - lastSendTime >= SEND_INTERVAL_MS && audioChunks.length > 0) {
        // Combine chunks
        const totalLength = audioChunks.reduce((acc, buf) => acc + buf.length, 0);
        const combined = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of audioChunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        
        // Convert to PCM16 base64
        const pcmBase64 = float32ToPCM16Base64(combined);
        
        try {
          sessionRef.current.sendRealtimeInput({
            media: {
              mimeType: 'audio/pcm;rate=16000',
              data: pcmBase64
            }
          });
        } catch (e) {
          logError('Send audio error:', e);
        }
        
        audioChunks = [];
        lastSendTime = now;
      }
    };
    
    source.connect(processor);
    // Don't connect to destination to avoid feedback
    processor.connect(inputContextRef.current.destination);
    
    log('Audio capture started');
  };

  // Render volume bars
  const renderVolumeBars = (isActive: boolean, isSpeaking: boolean) => {
    return [...Array(6)].map((_, i) => {
      let height = '15%';
      if (isActive) {
        if (isSpeaking) {
          height = `${Math.max(20, Math.random() * 100)}%`;
        } else {
          height = `${Math.max(15, state.volume * 100 * (0.5 + Math.random() * 0.5))}%`;
        }
      }
      
      return (
        <div
          key={i}
          className={`w-1 rounded-full transition-all duration-75 ${
            isActive ? (isSpeaking ? 'bg-blue-500' : 'bg-green-500') : 'bg-slate-300'
          }`}
          style={{ height }}
        />
      );
    });
  };

  // Render agent card
  const renderAgentCard = (agentNumber: 1 | 2) => {
    const isActive = state.activeAgent === agentNumber;
    const isOtherActive = state.activeAgent !== null && state.activeAgent !== agentNumber;
    const isSpeaking = isActive && state.status === 'speaking';
    const isMale = agentNumber === 1;
    
    return (
      <div className={`relative bg-white rounded-2xl p-6 border-2 transition-all duration-300 ${
        isActive 
          ? isMale ? 'border-blue-500 shadow-xl shadow-blue-500/10' : 'border-pink-500 shadow-xl shadow-pink-500/10'
          : isOtherActive 
            ? 'border-slate-100 opacity-50' 
            : isMale ? 'border-slate-200 hover:border-blue-300 hover:shadow-lg' : 'border-slate-200 hover:border-pink-300 hover:shadow-lg'
      }`}>
        {/* Active indicator */}
        {isActive && (
          <div className="absolute top-3 right-3">
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </div>
        )}
        
        {/* Agent icon */}
        <div className="w-20 h-20 mx-auto mb-4 relative">
          <div className={`absolute inset-0 rounded-full ${isMale ? 'bg-blue-100' : 'bg-pink-100'}`}></div>
          <div className="absolute inset-1 bg-white rounded-full flex items-center justify-center">
            <i className={`fas ${isMale ? 'fa-user-tie' : 'fa-user'} text-3xl ${isMale ? 'text-blue-500' : 'text-pink-500'}`}></i>
          </div>
          {isSpeaking && (
            <div className={`absolute inset-0 rounded-full border-2 ${isMale ? 'border-blue-400' : 'border-pink-400'} animate-ping opacity-30`}></div>
          )}
        </div>
        
        <h3 className="text-lg font-bold text-slate-800 text-center mb-1">Nirnoy {agentNumber}</h3>
        <p className={`text-sm text-center mb-1 ${isMale ? 'text-blue-500' : 'text-pink-500'}`}>
          {isMale ? '🎙️ পুরুষ কণ্ঠ' : '🎙️ মহিলা কণ্ঠ'}
        </p>
        <p className="text-xs text-slate-500 text-center mb-6">AI স্বাস্থ্য সহায়ক</p>
        
        {isActive ? (
          <div className="space-y-4">
            {/* Volume visualization */}
            <div className="h-12 bg-slate-50 rounded-xl flex items-center justify-center gap-1 px-4">
              {renderVolumeBars(true, isSpeaking)}
            </div>
            
            {/* Status */}
            <p className={`text-center text-sm font-medium animate-pulse ${isMale ? 'text-blue-600' : 'text-pink-600'}`}>
              <i className={`${isSpeaking ? 'fas fa-volume-up' : 'fas fa-microphone'} mr-2`}></i>
              {state.statusText}
            </p>
            
            {/* End call button */}
            <button 
              onClick={cleanup}
              className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition flex items-center justify-center gap-2"
            >
              <i className="fas fa-phone-slash"></i> শেষ করুন
            </button>
          </div>
        ) : (
          <button 
            onClick={() => startSession(agentNumber)}
            disabled={isOtherActive}
            className={`w-full py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
              isMale 
                ? 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-300' 
                : 'bg-pink-500 text-white hover:bg-pink-600 disabled:bg-pink-300'
            } disabled:cursor-not-allowed`}
          >
            <i className="fas fa-phone"></i> কথা বলুন
          </button>
        )}
      </div>
    );
  };

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-4">
            <i className="fas fa-phone-volume text-blue-500"></i>
            <span className="text-sm font-bold text-blue-600">24/7 • বিনামূল্যে</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            কথা বলে অ্যাপয়েন্টমেন্ট নিন
          </h2>
          <p className="text-slate-600 max-w-xl mx-auto">
            বাংলায় কথা বলুন আমাদের AI এজেন্টের সাথে। ডাক্তার খুঁজুন, প্রশ্ন করুন, অ্যাপয়েন্টমেন্ট বুক করুন।
          </p>
        </div>

        {/* Error message */}
        {state.error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center justify-center gap-2">
            <i className="fas fa-exclamation-circle"></i> {state.error}
          </div>
        )}

        {/* API Key warning */}
        {!hasValidApiKey && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
            <p className="font-bold mb-1"><i className="fas fa-exclamation-triangle mr-2"></i>API Key প্রয়োজন</p>
            <p className="text-xs">ভয়েস এজেন্ট ব্যবহার করতে <code className="bg-amber-100 px-1 rounded">.env</code> ফাইলে <code className="bg-amber-100 px-1 rounded">VITE_GEMINI_API_KEY</code> সেট করুন।</p>
          </div>
        )}

        {/* Voice Agent Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {renderAgentCard(1)}
          {renderAgentCard(2)}
        </div>

        {/* Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
            <i className="fas fa-info-circle"></i>
            Nirnoy 1 পুরুষ কণ্ঠে, Nirnoy 2 মহিলা কণ্ঠে কথা বলে। দুটোর কাজ একই।
          </p>
        </div>
        
        <div className="mt-6 flex items-center justify-center gap-2 text-slate-400 text-xs">
          <i className="fas fa-lock"></i>
          <span>নিরাপদ ও গোপনীয় • Powered by Gemini AI</span>
        </div>
      </div>
    </section>
  );
};

export default HomeVoiceSection;
