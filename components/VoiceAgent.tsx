import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { MOCK_DOCTORS } from '../data/mockData';

// ============ CONFIGURATION ============
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const hasValidApiKey = GEMINI_API_KEY && GEMINI_API_KEY.length > 10;

// ============ AUDIO HELPERS ============

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

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function pcm16ToAudioBuffer(data: Uint8Array, audioContext: AudioContext, sampleRate: number = 24000): AudioBuffer {
  const int16Data = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const float32Data = new Float32Array(int16Data.length);
  
  for (let i = 0; i < int16Data.length; i++) {
    float32Data[i] = int16Data[i] / 32768.0;
  }
  
  const audioBuffer = audioContext.createBuffer(1, float32Data.length, sampleRate);
  audioBuffer.getChannelData(0).set(float32Data);
  
  return audioBuffer;
}

function downsampleBuffer(buffer: Float32Array, inputSampleRate: number, outputSampleRate: number): Float32Array {
  if (inputSampleRate === outputSampleRate) return buffer;
  
  const ratio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    const index = Math.round(i * ratio);
    result[i] = buffer[Math.min(index, buffer.length - 1)];
  }
  
  return result;
}

// ============ GREETING ============
function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'সুপ্রভাত';
  if (hour >= 12 && hour < 17) return 'শুভ দুপুর';
  if (hour >= 17 && hour < 20) return 'শুভ সন্ধ্যা';
  return 'শুভ রাত্রি';
}

// ============ SYSTEM PROMPT ============
function buildSystemPrompt(): string {
  const today = new Date().toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const greeting = getTimeBasedGreeting();
  
  const doctorList = MOCK_DOCTORS.slice(0, 10).map(d => 
    `${d.name} (${d.specialties[0]}) - ${d.chambers[0]?.name}, ফি: ৳${d.chambers[0]?.fee}`
  ).join('\n');

  return `
## আপনার পরিচয়
আপনি নির্ণয় কেয়ার (Nirnoy Care) এর AI ভয়েস এসিস্ট্যান্ট।

## অত্যন্ত গুরুত্বপূর্ণ - প্রথম কথা
কল শুরু হওয়ার সাথে সাথেই প্রথমে নিজে থেকে বলুন:
"আসসালামু আলাইকুম! ${greeting}! নির্ণয় কেয়ারে স্বাগতম। কীভাবে সাহায্য করতে পারি?"

## ভাষা নির্দেশনা
শুধুমাত্র বাংলাদেশী বাংলায় কথা বলুন। "জি", "আচ্ছা", "ঠিক আছে", "ভাই", "আপা" ব্যবহার করুন।

## আজকের তারিখ: ${today}

## ডাক্তার তালিকা:
${doctorList}

## কাজ:
1. ডাক্তার খোঁজা
2. অ্যাপয়েন্টমেন্ট বুকিং
3. ফি ও সময়সূচী জানানো

## জরুরি অবস্থা:
বুকে ব্যথা, শ্বাসকষ্ট বললে: "এটা ইমার্জেন্সি! 999 এ কল করুন।"

## সংক্ষিপ্ত উত্তর দিন (১-২ বাক্য)।
`;
}

// ============ TYPES ============
type AgentStatus = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error';

// ============ COMPONENT ============
export const VoiceAgent: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [statusText, setStatusText] = useState('কথা বলতে ক্লিক করুন');
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const aiClientRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
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

  // Cleanup
  const cleanup = useCallback(() => {
    isConnectedRef.current = false;
    
    audioQueueRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    audioQueueRef.current = [];
    
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch (e) {}
      processorRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    
    if (inputContextRef.current && inputContextRef.current.state !== 'closed') {
      try { inputContextRef.current.close(); } catch (e) {}
      inputContextRef.current = null;
    }
    
    nextPlayTimeRef.current = 0;
    setIsActive(false);
    setStatus('idle');
    setStatusText('কথা বলতে ক্লিক করুন');
    setVolume(0);
    setError(null);
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // Play audio
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
      if (index > -1) audioQueueRef.current.splice(index, 1);
      
      if (audioQueueRef.current.length === 0 && status === 'speaking') {
        setStatus('listening');
        setStatusText('কথা বলুন...');
      }
    };
  }, [status]);

  // Start session
  const startSession = async () => {
    if (!hasValidApiKey || !aiClientRef.current) {
      setError('API Key কনফিগার করা হয়নি');
      return;
    }

    try {
      cleanup();
      setIsActive(true);
      setStatus('connecting');
      setStatusText('কানেক্ট হচ্ছে...');
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      mediaStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const systemPrompt = buildSystemPrompt();

      const session = await aiClientRef.current.live.connect({
        model: 'gemini-2.0-flash-exp',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemPrompt,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
        callbacks: {
          onopen: () => {
            isConnectedRef.current = true;
            setStatus('connected');
            setStatusText('সংযুক্ত হয়েছে...');

            // Trigger greeting
            setTimeout(() => {
              if (sessionRef.current && isConnectedRef.current) {
                sessionRef.current.sendClientContent({
                  turns: [{ role: 'user', parts: [{ text: 'হ্যালো' }] }],
                  turnComplete: true
                });
              }
            }, 500);

            startAudioCapture(stream);
          },
          onmessage: (message: any) => {
            const audioPart = message.serverContent?.modelTurn?.parts?.find(
              (p: any) => p.inlineData?.mimeType?.startsWith('audio/')
            );
            
            if (audioPart?.inlineData?.data && audioContextRef.current) {
              setStatus('speaking');
              setStatusText('বলছে...');
              
              try {
                const audioData = base64ToUint8Array(audioPart.inlineData.data);
                const audioBuffer = pcm16ToAudioBuffer(audioData, audioContextRef.current, 24000);
                playAudioBuffer(audioBuffer, audioContextRef.current);
              } catch (e) {
                console.error('Audio decode error:', e);
              }
            }
            
            if (message.serverContent?.turnComplete) {
              setStatus('listening');
              setStatusText('কথা বলুন...');
            }

            if (message.serverContent?.interrupted) {
              audioQueueRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
              audioQueueRef.current = [];
              if (audioContextRef.current) {
                nextPlayTimeRef.current = audioContextRef.current.currentTime;
              }
            }
          },
          onclose: () => {
            isConnectedRef.current = false;
            cleanup();
          },
          onerror: (err: any) => {
            console.error('Session error:', err);
            setError('সংযোগে সমস্যা');
            setStatus('error');
            cleanup();
          },
        },
      });

      sessionRef.current = session;

    } catch (err: any) {
      let errorMsg = 'ভয়েস এজেন্ট শুরু করা যাচ্ছে না';
      if (err.name === 'NotAllowedError') errorMsg = 'মাইক্রোফোন পারমিশন দিন';
      setError(errorMsg);
      setStatus('error');
      cleanup();
    }
  };

  // Audio capture
  const startAudioCapture = (stream: MediaStream) => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    inputContextRef.current = new AudioContextClass();
    const source = inputContextRef.current.createMediaStreamSource(stream);
    
    const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    let audioBuffer: Float32Array[] = [];
    let lastSendTime = Date.now();

    processor.onaudioprocess = (event) => {
      if (!isConnectedRef.current || !sessionRef.current) return;

      const inputData = event.inputBuffer.getChannelData(0);

      let sum = 0;
      for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
      const rms = Math.sqrt(sum / inputData.length);
      setVolume(Math.min(1, rms * 5));

      const downsampled = downsampleBuffer(new Float32Array(inputData), inputContextRef.current!.sampleRate, 16000);
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

        const pcmBlob = float32ToPCM16Blob(combined);
        try {
          sessionRef.current.sendRealtimeInput({ media: pcmBlob });
        } catch (e) {
          console.error('Send error:', e);
        }

        audioBuffer = [];
        lastSendTime = now;
      }
    };

    source.connect(processor);
    processor.connect(inputContextRef.current.destination);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* Active call panel */}
      {isActive && (
        <div className="mb-4 bg-white p-4 rounded-2xl shadow-2xl border border-blue-100 w-80 animate-fade-in-up relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-600"></div>
          
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${status === 'speaking' ? 'bg-blue-500' : 'bg-green-500'} animate-pulse`}></div>
              <div className="text-sm font-bold text-slate-800">Nirnoy Voice Agent</div>
            </div>
            <div className="flex space-x-0.5 items-end h-4">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-75 ${status === 'speaking' ? 'bg-indigo-500' : 'bg-blue-500'}`}
                  style={{ height: `${Math.max(3, (status === 'speaking' ? Math.random() * 20 : volume * 20 * Math.random()))}px` }}
                ></div>
              ))}
            </div>
          </div>
          
          <div className="bg-slate-50 rounded-lg p-3 mb-2">
            <p className="text-xs text-slate-600 font-medium text-center">{statusText}</p>
          </div>
          
          {error && <p className="text-xs text-red-500 text-center mb-2">{error}</p>}
          
          <p className="text-[10px] text-slate-400 text-center">AI can make mistakes. Verify important info.</p>
        </div>
      )}

      {/* API Key warning */}
      {!hasValidApiKey && !isActive && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-700 max-w-[200px]">
          <i className="fas fa-exclamation-triangle mr-1"></i>
          API Key needed
        </div>
      )}

      {/* Call button */}
      <div className="group relative flex items-center">
        {!isActive && (
          <div className="mr-4 bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
            কথা বলে বুক করুন
          </div>
        )}
        <button
          onClick={isActive ? cleanup : startSession}
          disabled={!hasValidApiKey && !isActive}
          className={`h-16 w-16 rounded-full shadow-xl flex items-center justify-center transition-all transform hover:scale-110 border-4 ${
            isActive 
              ? 'bg-white border-red-100' 
              : hasValidApiKey 
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-400 hover:from-blue-600 hover:to-indigo-700' 
                : 'bg-slate-400 border-slate-300 cursor-not-allowed'
          }`}
          aria-label={isActive ? 'End call' : 'Start voice call'}
        >
          {isActive ? (
            <i className="fas fa-phone-slash text-2xl text-red-500 animate-pulse"></i>
          ) : (
            <i className="fas fa-phone-volume text-2xl text-white"></i>
          )}
        </button>
      </div>
    </div>
  );
};

export default VoiceAgent;
