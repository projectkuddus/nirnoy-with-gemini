import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { MOCK_DOCTORS } from '../data/mockData';

// ============ CONFIGURATION ============
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
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
function pcm16ToAudioBuffer(
  data: Uint8Array,
  audioContext: AudioContext,
  sampleRate: number = 24000
): AudioBuffer {
  const int16Data = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
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
function buildSystemPrompt(agentNumber: number, isMale: boolean): string {
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

  const genderContext = isMale 
    ? 'আপনি একজন পুরুষ এসিস্ট্যান্ট। পুরুষসুলভ কিন্তু বিনয়ী ভাবে কথা বলুন।'
    : 'আপনি একজন মহিলা এসিস্ট্যান্ট। মহিলাসুলভ এবং সহানুভূতিশীল ভাবে কথা বলুন।';

  return `
## আপনার পরিচয়
আপনি "Nirnoy ${agentNumber}", নির্ণয় কেয়ার (Nirnoy Care) এর অফিসিয়াল AI ভয়েস এসিস্ট্যান্ট।
${genderContext}

## অত্যন্ত গুরুত্বপূর্ণ - প্রথম কথা (MUST DO FIRST)
কল শুরু হওয়ার সাথে সাথেই আপনাকে অবশ্যই প্রথমে নিজে থেকে বলতে হবে:
"আসসালামু আলাইকুম! ${greeting}! নির্ণয় কেয়ারে স্বাগতম। আমি Nirnoy ${agentNumber}। কীভাবে সাহায্য করতে পারি?"

এটা বলার জন্য ইউজারের কিছু বলার অপেক্ষা করবেন না। কল কানেক্ট হলেই প্রথমে আপনি সালাম দিয়ে শুরু করবেন।

## ভাষা নির্দেশনা (বাংলাদেশী বাংলা - NOT কলকাতার বাংলা)
শুধুমাত্র বাংলাদেশী বাংলায় কথা বলুন। কলকাতার বাংলা ব্যবহার করবেন না।

### যা বলবেন:
- "জি" (হ্যাঁ বোঝাতে)
- "আচ্ছা" (বোঝা গেছে)
- "ঠিক আছে" (okay)
- "ভাই" বা "ভাইয়া" (পুরুষদের জন্য)
- "আপা" বা "বোন" (মহিলাদের জন্য)
- "কেমন আছেন?"
- "বলেন" (tell me)
- "করে দিচ্ছি" / "কইরা দিচ্ছি"
- "হয়ে গেছে" / "হইছে"

### যা বলবেন না (কলকাতার স্টাইল):
- "দাদা" ❌ (use ভাই)
- "দিদি" ❌ (use আপা)
- "হ্যাঁ গো" ❌
- "এক্ষুনি" ❌ (use এখনই)
- "বেশ" ❌ (use ঠিক আছে)

## আজকের তারিখ: ${today}

## ডাক্তার তালিকা:
${doctorList}

## আপনার কাজ:
1. ডাক্তার খোঁজায় সাহায্য করা
2. অ্যাপয়েন্টমেন্ট বুকিং করা  
3. ফি ও সময়সূচী জানানো
4. সাধারণ স্বাস্থ্য প্রশ্নের উত্তর দেওয়া

## বুকিং প্রক্রিয়া:
1. জিজ্ঞেস করুন: "কোন ধরনের ডাক্তার দরকার?" বা "কী সমস্যা?"
2. ডাক্তার সাজেস্ট করুন
3. রোগীর নাম জিজ্ঞেস করুন
4. মোবাইল নম্বর নিন
5. কনফার্ম করুন এবং সিরিয়াল দিন

## জরুরি অবস্থা:
বুকে ব্যথা, শ্বাসকষ্ট, অজ্ঞান হওয়া বললে সাথে সাথে বলুন:
"এটা ইমার্জেন্সি! এখনই 999 এ কল করুন বা নিকটস্থ হাসপাতালে যান!"

## কথোপকথন শেষ করতে:
"আর কিছু লাগবে?" জিজ্ঞেস করুন। শেষে "আল্লাহ হাফেজ" বা "ধন্যবাদ, ভালো থাকবেন" বলুন।

## সংক্ষিপ্ত উত্তর:
১-২ বাক্যে উত্তর দিন। লম্বা লম্বা কথা বলবেন না।
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

  // Refs for audio handling
  const aiClientRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const nextPlayTimeRef = useRef<number>(0);
  const isConnectedRef = useRef(false);

  // Initialize AI client
  useEffect(() => {
    if (hasValidApiKey) {
      aiClientRef.current = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    }
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    isConnectedRef.current = false;
    
    // Stop all audio sources
    audioQueueRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    audioQueueRef.current = [];
    
    // Close session
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
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

  // Play audio buffer
  const playAudioBuffer = useCallback((buffer: AudioBuffer, audioContext: AudioContext) => {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    
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
      
      if (audioQueueRef.current.length === 0) {
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
        } 
      });
      mediaStreamRef.current = stream;

      // Create audio context for playback (24kHz output)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate: 24000 });
      audioContextRef.current = audioContext;
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Build system prompt
      // Nirnoy 1 = Male (Charon voice), Nirnoy 2 = Female (Kore voice)
      const isMale = agentNumber === 1;
      const systemPrompt = buildSystemPrompt(agentNumber, isMale);
      
      // Voice selection: Male = Charon, Female = Kore
      const voiceName = isMale ? 'Charon' : 'Kore';

      console.log(`Starting session with voice: ${voiceName}`);

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
            console.log('Session opened');
            isConnectedRef.current = true;
            
            setState(prev => ({
              ...prev,
              status: 'connected',
              statusText: 'সংযুক্ত হয়েছে...',
            }));

            // Send initial greeting prompt to make AI speak first
            setTimeout(() => {
              if (sessionRef.current && isConnectedRef.current) {
                console.log('Sending greeting prompt');
                sessionRef.current.sendClientContent({
                  turns: [{
                    role: 'user',
                    parts: [{ text: 'হ্যালো' }]
                  }],
                  turnComplete: true
                });
              }
            }, 500);

            // Start audio capture
            startAudioCapture(stream, audioContext);
          },
          onmessage: (message: any) => {
            // Handle audio response
            const audioPart = message.serverContent?.modelTurn?.parts?.find(
              (p: any) => p.inlineData?.mimeType?.startsWith('audio/')
            );
            
            if (audioPart?.inlineData?.data && audioContextRef.current) {
              setState(prev => ({ ...prev, status: 'speaking', statusText: 'বলছে...' }));
              
              try {
                const audioData = base64ToUint8Array(audioPart.inlineData.data);
                const audioBuffer = pcm16ToAudioBuffer(audioData, audioContextRef.current, 24000);
                playAudioBuffer(audioBuffer, audioContextRef.current);
              } catch (e) {
                console.error('Audio decode error:', e);
              }
            }
            
            // Handle turn complete
            if (message.serverContent?.turnComplete) {
              setState(prev => ({ 
                ...prev, 
                status: 'listening', 
                statusText: 'কথা বলুন...' 
              }));
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              audioQueueRef.current.forEach(s => {
                try { s.stop(); } catch (e) {}
              });
              audioQueueRef.current = [];
              if (audioContextRef.current) {
                nextPlayTimeRef.current = audioContextRef.current.currentTime;
              }
            }
          },
          onclose: () => {
            console.log('Session closed');
            isConnectedRef.current = false;
            cleanup();
          },
          onerror: (error: any) => {
            console.error('Session error:', error);
            setState(prev => ({
              ...prev,
              error: 'সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।',
              status: 'error',
              statusText: 'ত্রুটি',
            }));
            cleanup();
          },
        },
      });

      sessionRef.current = session;

    } catch (err: any) {
      console.error('Session start error:', err);
      
      let errorMessage = 'ভয়েস এজেন্ট শুরু করা যাচ্ছে না।';
      if (err.name === 'NotAllowedError') {
        errorMessage = 'মাইক্রোফোন পারমিশন দিন।';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'মাইক্রোফোন পাওয়া যাচ্ছে না।';
      } else if (err.message) {
        errorMessage = `ত্রুটি: ${err.message}`;
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
  const startAudioCapture = (stream: MediaStream, audioContext: AudioContext) => {
    // Create a separate context for input at native sample rate
    const inputContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = inputContext.createMediaStreamSource(stream);
    
    const bufferSize = 4096;
    const processor = inputContext.createScriptProcessor(bufferSize, 1, 1);
    processorRef.current = processor;
    
    let audioBuffer: Float32Array[] = [];
    const SEND_INTERVAL = 100;
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
      
      // Downsample to 16kHz
      const downsampled = downsampleBuffer(new Float32Array(inputData), inputContext.sampleRate, 16000);
      audioBuffer.push(downsampled);
      
      // Send audio every SEND_INTERVAL ms
      const now = Date.now();
      if (now - lastSendTime >= SEND_INTERVAL && audioBuffer.length > 0) {
        const totalLength = audioBuffer.reduce((acc, buf) => acc + buf.length, 0);
        const combined = new Float32Array(totalLength);
        let offset = 0;
        for (const buf of audioBuffer) {
          combined.set(buf, offset);
          offset += buf.length;
        }
        
        const pcmBlob = float32ToPCM16Blob(combined);
        
        try {
          sessionRef.current.sendRealtimeInput({
            media: pcmBlob
          });
        } catch (e) {
          console.error('Send error:', e);
        }
        
        audioBuffer = [];
        lastSendTime = now;
      }
    };
    
    source.connect(processor);
    processor.connect(inputContext.destination);
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
