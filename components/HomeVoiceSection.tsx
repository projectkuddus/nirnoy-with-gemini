import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_DOCTORS } from '../data/mockData';

// ============ CONFIGURATION ============
// For production, set this in your environment or use a config service
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Check if we have a valid API key
const hasValidApiKey = GEMINI_API_KEY && GEMINI_API_KEY.length > 10;

// ============ AUDIO HELPERS ============

// Convert Float32Array to PCM16 blob for Gemini
function float32ToPCM16Blob(float32Data: Float32Array): { data: string; mimeType: string } {
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
  
  return {
    data: btoa(binary),
    mimeType: 'audio/pcm;rate=16000',
  };
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

// Decode PCM16 to AudioBuffer
async function pcm16ToAudioBuffer(
  data: Uint8Array,
  audioContext: AudioContext,
  sampleRate: number = 24000
): Promise<AudioBuffer> {
  const int16Data = new Int16Array(data.buffer);
  const float32Data = new Float32Array(int16Data.length);
  
  for (let i = 0; i < int16Data.length; i++) {
    float32Data[i] = int16Data[i] / 32768.0;
  }
  
  const audioBuffer = audioContext.createBuffer(1, float32Data.length, sampleRate);
  audioBuffer.getChannelData(0).set(float32Data);
  
  return audioBuffer;
}

// Downsample audio to 16kHz
function downsampleBuffer(buffer: Float32Array, inputSampleRate: number, outputSampleRate: number): Float32Array {
  if (inputSampleRate === outputSampleRate) {
    return buffer;
  }
  
  const ratio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    const index = Math.round(i * ratio);
    result[i] = buffer[Math.min(index, buffer.length - 1)];
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
function buildSystemPrompt(agentNumber: number, isLoggedIn: boolean): string {
  const today = new Date().toLocaleDateString('bn-BD', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const greeting = getTimeBasedGreeting();
  
  // Get doctor list for context
  const doctorList = MOCK_DOCTORS.slice(0, 10).map(d => 
    `${d.name} (${d.specialties[0]}) - ${d.chambers[0]?.name}, ফি: ৳${d.chambers[0]?.fee}`
  ).join('\n');

  return `
## আপনার পরিচয়
আপনি "Nirnoy ${agentNumber}", নির্ণয় কেয়ার (Nirnoy Care) এর AI ভয়েস এসিস্ট্যান্ট।

## গুরুত্বপূর্ণ নির্দেশনা
- শুধুমাত্র বাংলাদেশী বাংলায় কথা বলুন
- প্রথমেই বলুন: "আসসালামু আলাইকুম! ${greeting}! নির্ণয় কেয়ারে স্বাগতম। আমি Nirnoy ${agentNumber}। কীভাবে সাহায্য করতে পারি?"
- সংক্ষিপ্ত উত্তর দিন (১-২ বাক্য)
- "জি", "আচ্ছা", "ঠিক আছে" ব্যবহার করুন

## আজকের তারিখ
${today}

## ডাক্তার তালিকা
${doctorList}

## আপনার কাজ
1. ডাক্তার খোঁজায় সাহায্য করা
2. অ্যাপয়েন্টমেন্ট বুকিং করা
3. ফি ও সময়সূচী জানানো
4. সাধারণ স্বাস্থ্য প্রশ্নের উত্তর দেওয়া

## বুকিং প্রক্রিয়া
${isLoggedIn ? 
'ইউজার লগইন আছে। সরাসরি নাম ও তারিখ জিজ্ঞেস করে বুকিং করুন।' : 
'গেস্ট ইউজার। প্রথমে মোবাইল নম্বর নিন, তারপর OTP ভেরিফাই করে বুকিং করুন।'}

## জরুরি অবস্থা
বুকে ব্যথা, শ্বাসকষ্ট বললে বলুন: "এটা ইমার্জেন্সি! এখনই 999 এ কল করুন বা নিকটস্থ হাসপাতালে যান।"

## শেষ করতে
"আর কিছু লাগবে?" জিজ্ঞেস করুন। শেষে "আল্লাহ হাফেজ" বা "ধন্যবাদ, ভালো থাকবেন" বলুন।
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
  const navigate = useNavigate();
  
  const [state, setState] = useState<VoiceAgentState>({
    activeAgent: null,
    status: 'idle',
    statusText: 'প্রস্তুত',
    volume: 0,
    error: null,
  });

  // Refs for audio handling
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const nextPlayTimeRef = useRef<number>(0);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Stop all audio sources
    audioQueueRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    audioQueueRef.current = [];
    
    // Close WebSocket
    if (websocketRef.current) {
      try { websocketRef.current.close(); } catch (e) {}
      websocketRef.current = null;
    }
    
    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    // Disconnect worklet
    if (workletNodeRef.current) {
      try { workletNodeRef.current.disconnect(); } catch (e) {}
      workletNodeRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
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

  // Start voice session
  const startSession = async (agentNumber: 1 | 2) => {
    // Check API key
    if (!hasValidApiKey) {
      setState(prev => ({
        ...prev,
        error: 'API Key কনফিগার করা হয়নি। .env ফাইলে VITE_GEMINI_API_KEY সেট করুন।',
        status: 'error',
        statusText: 'কনফিগারেশন ত্রুটি',
      }));
      return;
    }

    try {
      cleanup();
      
      setState({
        activeAgent: agentNumber,
        status: 'connecting',
        statusText: 'কানেক্ট হচ্ছে...',
        volume: 0,
        error: null,
      });

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Request 16kHz if supported
        } 
      });
      mediaStreamRef.current = stream;

      // Create audio context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate: 24000 });
      audioContextRef.current = audioContext;
      
      // Resume context (required for some browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Get user login status
      const isLoggedIn = !!localStorage.getItem('nirnoy_role');
      const systemPrompt = buildSystemPrompt(agentNumber, isLoggedIn);

      // Connect to Gemini Live API via WebSocket
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;
      
      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        
        // Send setup message
        const setupMessage = {
          setup: {
            model: 'models/gemini-2.0-flash-exp',
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: agentNumber === 1 ? 'Aoede' : 'Kore'
                  }
                }
              }
            },
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            }
          }
        };
        
        ws.send(JSON.stringify(setupMessage));
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle setup complete
          if (data.setupComplete) {
            console.log('Setup complete, starting audio capture');
            
            setState(prev => ({
              ...prev,
              status: 'listening',
              statusText: 'কথা বলুন...',
            }));
            
            // Start capturing audio
            startAudioCapture(stream, audioContext, ws);
          }
          
          // Handle audio response
          if (data.serverContent?.modelTurn?.parts) {
            for (const part of data.serverContent.modelTurn.parts) {
              if (part.inlineData?.data) {
                setState(prev => ({ ...prev, status: 'speaking', statusText: 'বলছে...' }));
                
                const audioData = base64ToUint8Array(part.inlineData.data);
                const audioBuffer = await pcm16ToAudioBuffer(audioData, audioContext, 24000);
                
                playAudioBuffer(audioBuffer, audioContext);
              }
            }
          }
          
          // Handle turn complete
          if (data.serverContent?.turnComplete) {
            setState(prev => ({ ...prev, status: 'listening', statusText: 'কথা বলুন...' }));
          }
          
        } catch (e) {
          console.error('Message parse error:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({
          ...prev,
          error: 'সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।',
          status: 'error',
          statusText: 'ত্রুটি',
        }));
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        if (state.status !== 'error') {
          cleanup();
        }
      };

    } catch (err: any) {
      console.error('Session start error:', err);
      
      let errorMessage = 'ভয়েস এজেন্ট শুরু করা যাচ্ছে না।';
      if (err.name === 'NotAllowedError') {
        errorMessage = 'মাইক্রোফোন পারমিশন দিন।';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'মাইক্রোফোন পাওয়া যাচ্ছে না।';
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

  // Start audio capture and send to WebSocket
  const startAudioCapture = (stream: MediaStream, audioContext: AudioContext, ws: WebSocket) => {
    const source = audioContext.createMediaStreamSource(stream);
    
    // Use ScriptProcessorNode (deprecated but widely supported)
    const bufferSize = 4096;
    const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
    workletNodeRef.current = processor;
    
    let audioBuffer: Float32Array[] = [];
    const SEND_INTERVAL = 100; // Send every 100ms
    let lastSendTime = Date.now();
    
    processor.onaudioprocess = (event) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      
      const inputData = event.inputBuffer.getChannelData(0);
      
      // Calculate volume for visualization
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      setState(prev => ({ ...prev, volume: Math.min(1, rms * 5) }));
      
      // Downsample to 16kHz if needed
      const inputSampleRate = audioContext.sampleRate;
      const downsampled = downsampleBuffer(new Float32Array(inputData), inputSampleRate, 16000);
      audioBuffer.push(downsampled);
      
      // Send audio every SEND_INTERVAL ms
      const now = Date.now();
      if (now - lastSendTime >= SEND_INTERVAL && audioBuffer.length > 0) {
        // Combine buffers
        const totalLength = audioBuffer.reduce((acc, buf) => acc + buf.length, 0);
        const combined = new Float32Array(totalLength);
        let offset = 0;
        for (const buf of audioBuffer) {
          combined.set(buf, offset);
          offset += buf.length;
        }
        
        // Convert to PCM16 and send
        const pcmBlob = float32ToPCM16Blob(combined);
        
        try {
          ws.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [{
                mimeType: pcmBlob.mimeType,
                data: pcmBlob.data
              }]
            }
          }));
        } catch (e) {
          console.error('Send error:', e);
        }
        
        audioBuffer = [];
        lastSendTime = now;
      }
    };
    
    source.connect(processor);
    processor.connect(audioContext.destination);
  };

  // Play audio buffer
  const playAudioBuffer = (buffer: AudioBuffer, audioContext: AudioContext) => {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    
    // Schedule playback
    const currentTime = audioContext.currentTime;
    const startTime = Math.max(currentTime, nextPlayTimeRef.current);
    
    source.start(startTime);
    nextPlayTimeRef.current = startTime + buffer.duration;
    
    audioQueueRef.current.push(source);
    
    source.onended = () => {
      const index = audioQueueRef.current.indexOf(source);
      if (index > -1) {
        audioQueueRef.current.splice(index, 1);
      }
      
      // Check if all audio finished
      if (audioQueueRef.current.length === 0) {
        setState(prev => {
          if (prev.status === 'speaking') {
            return { ...prev, status: 'listening', statusText: 'কথা বলুন...' };
          }
          return prev;
        });
      }
    };
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
    const isBlue = agentNumber === 1;
    
    return (
      <div className={`relative bg-white rounded-2xl p-6 border-2 transition-all duration-300 ${
        isActive 
          ? isBlue ? 'border-blue-500 shadow-xl shadow-blue-500/10' : 'border-slate-800 shadow-xl shadow-slate-800/10'
          : isOtherActive 
            ? 'border-slate-100 opacity-50' 
            : isBlue ? 'border-slate-200 hover:border-blue-300 hover:shadow-lg' : 'border-slate-200 hover:border-slate-400 hover:shadow-lg'
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
          <div className={`absolute inset-0 rounded-full ${isBlue ? 'bg-blue-100' : 'bg-slate-100'}`}></div>
          <div className="absolute inset-1 bg-white rounded-full flex items-center justify-center">
            <i className={`fas fa-headset text-3xl ${isBlue ? 'text-blue-500' : 'text-slate-600'}`}></i>
          </div>
          {isSpeaking && (
            <div className={`absolute inset-0 rounded-full border-2 ${isBlue ? 'border-blue-400' : 'border-slate-600'} animate-ping opacity-30`}></div>
          )}
        </div>
        
        <h3 className="text-lg font-bold text-slate-800 text-center mb-1">Nirnoy {agentNumber}</h3>
        <p className="text-sm text-slate-500 text-center mb-6">AI স্বাস্থ্য সহায়ক</p>
        
        {isActive ? (
          <div className="space-y-4">
            {/* Volume visualization */}
            <div className="h-12 bg-slate-50 rounded-xl flex items-center justify-center gap-1 px-4">
              {renderVolumeBars(true, isSpeaking)}
            </div>
            
            {/* Status */}
            <p className={`text-center text-sm font-medium animate-pulse ${isBlue ? 'text-blue-600' : 'text-slate-600'}`}>
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
              isBlue 
                ? 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-300' 
                : 'bg-slate-800 text-white hover:bg-slate-900 disabled:bg-slate-400'
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
            দুটি এজেন্টের কাজ একই। যেকোনো একটি বেছে নিন।
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
