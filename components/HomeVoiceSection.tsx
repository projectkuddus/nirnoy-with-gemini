import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { GoogleGenAI, Modality } from '@google/genai';
import { MOCK_DOCTORS } from '../data/mockData';

// ============ CONFIGURATION ============
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const hasValidApiKey = GEMINI_API_KEY && GEMINI_API_KEY.length > 10;

// ============ AUDIO HELPERS ============
function float32ToPCM16(float32Data: Float32Array): { data: string; mimeType: string } {
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
  return { data: btoa(binary), mimeType: 'audio/pcm;rate=16000' };
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

// ============ SYSTEM PROMPT ============
function buildSystemPrompt(voiceGender: 'male' | 'female'): string {
  const hour = new Date().getHours();
  let greeting = 'শুভ সন্ধ্যা';
  if (hour >= 5 && hour < 12) greeting = 'সুপ্রভাত';
  else if (hour >= 12 && hour < 17) greeting = 'শুভ দুপুর';
  else if (hour >= 20) greeting = 'শুভ রাত্রি';

  const doctorList = MOCK_DOCTORS.slice(0, 8).map(d => 
    `${d.name} (${d.specialties[0]}) - ফি: ৳${d.chambers[0]?.fee || 500}`
  ).join('\n');

  return `
## আপনার পরিচয়
আপনি "নির্ণয়" (Nirnoy) এর AI ভয়েস এসিস্ট্যান্ট। আপনার নাম "Nree"। আপনি ${voiceGender === 'male' ? 'পুরুষ' : 'মহিলা'} কণ্ঠে কথা বলেন।

## প্রথম কথা (অবশ্যই বলুন)
কল শুরু হলে প্রথমেই বলুন: "আসসালামু আলাইকুম! ${greeting}! আমি Nree, নির্ণয় থেকে। কীভাবে সাহায্য করতে পারি?"

## ভাষা
- শুধুমাত্র বাংলায় কথা বলুন
- সংক্ষিপ্ত উত্তর দিন (১-২ বাক্য)
- "জি", "আচ্ছা", "ঠিক আছে" ব্যবহার করুন

## ডাক্তার তালিকা:
${doctorList}

## কাজ:
1. ডাক্তার খোঁজা - বিশেষত্ব অনুযায়ী
2. ফি জানানো
3. সাধারণ স্বাস্থ্য পরামর্শ

## জরুরি:
বুকে ব্যথা/শ্বাসকষ্ট বললে: "এটা জরুরি! 999 এ কল করুন।"
`;
}

type AgentStatus = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error';

interface VoiceAgentCardProps {
  name: string;
  gender: 'male' | 'female';
  status: AgentStatus;
  isActive: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  error?: string | null;
}

const VoiceAgentCard: React.FC<VoiceAgentCardProps> = ({ name, gender, status, isActive, onConnect, onDisconnect, error }) => {
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
    <div className={`bg-white rounded-2xl p-6 border-2 transition-all ${isActive ? 'border-blue-500 shadow-xl shadow-blue-500/20' : 'border-slate-200 hover:border-slate-300'}`}>
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${gender === 'male' ? 'bg-blue-100' : 'bg-pink-100'}`}>
          <i className={`fas ${gender === 'male' ? 'fa-mars text-blue-600' : 'fa-venus text-pink-600'} text-2xl`}></i>
        </div>
        <div>
          <h3 className="font-bold text-slate-800">{name}</h3>
          <p className="text-sm text-slate-500">{gender === 'male' ? (isBn ? 'পুরুষ কণ্ঠ' : 'Male Voice') : (isBn ? 'মহিলা কণ্ঠ' : 'Female Voice')}</p>
        </div>
      </div>

      {isActive && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${status === 'speaking' || status === 'listening' ? 'bg-green-500 animate-pulse' : status === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
            <span className={`${status === 'error' ? 'text-red-500' : 'text-slate-600'}`}>{getStatusText()}</span>
          </div>
          
          {(status === 'speaking' || status === 'listening') && (
            <div className="flex items-center justify-center gap-1 h-12 mt-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-100 ${status === 'speaking' ? 'bg-gradient-to-t from-indigo-500 to-purple-500' : 'bg-gradient-to-t from-blue-500 to-indigo-500'}`}
                  style={{ height: `${10 + Math.random() * 30}px`, animation: `pulse ${0.3 + i * 0.1}s ease-in-out infinite alternate` }}
                ></div>
              ))}
            </div>
          )}
        </div>
      )}

      {isActive ? (
        <button onClick={onDisconnect} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition flex items-center justify-center gap-2">
          <i className="fas fa-phone-slash"></i>
          {isBn ? 'শেষ করুন' : 'End Call'}
        </button>
      ) : (
        <button 
          onClick={onConnect} 
          disabled={!hasValidApiKey}
          className={`w-full py-3 font-bold rounded-xl transition flex items-center justify-center gap-2 ${hasValidApiKey ? 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg shadow-blue-500/25' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
        >
          <i className="fas fa-phone"></i>
          {isBn ? 'কথা বলুন' : 'Connect'}
        </button>
      )}
    </div>
  );
};

const HomeVoiceSection: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  
  const [activeAgent, setActiveAgent] = useState<'male' | 'female' | null>(null);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Refs for audio handling
  const aiClientRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const nextPlayTimeRef = useRef<number>(0);
  const isConnectedRef = useRef(false);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Initialize AI client
  useEffect(() => {
    if (hasValidApiKey) {
      aiClientRef.current = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    }
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    isConnectedRef.current = false;
    
    audioQueueRef.current.forEach(source => { try { source.stop(); } catch (e) {} });
    audioQueueRef.current = [];
    
    if (sessionRef.current) { try { sessionRef.current.close(); } catch (e) {} sessionRef.current = null; }
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(track => track.stop()); mediaStreamRef.current = null; }
    if (processorRef.current) { try { processorRef.current.disconnect(); } catch (e) {} processorRef.current = null; }
    if (audioContextRef.current?.state !== 'closed') { try { audioContextRef.current?.close(); } catch (e) {} audioContextRef.current = null; }
    if (inputContextRef.current?.state !== 'closed') { try { inputContextRef.current?.close(); } catch (e) {} inputContextRef.current = null; }
    
    gainNodeRef.current = null;
    nextPlayTimeRef.current = 0;
    setActiveAgent(null);
    setStatus('idle');
    setError(null);
  }, []);

  useEffect(() => { return () => cleanup(); }, [cleanup]);

  // Play audio with gain control
  const playAudioBuffer = useCallback((buffer: AudioBuffer, audioContext: AudioContext) => {
    try {
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      
      // Create or reuse gain node for volume control
      if (!gainNodeRef.current || gainNodeRef.current.context !== audioContext) {
        gainNodeRef.current = audioContext.createGain();
        gainNodeRef.current.gain.value = 1.5; // Boost volume
        gainNodeRef.current.connect(audioContext.destination);
      }
      
      source.connect(gainNodeRef.current);
      
      const currentTime = audioContext.currentTime;
      const startTime = Math.max(currentTime + 0.05, nextPlayTimeRef.current);
      
      source.start(startTime);
      nextPlayTimeRef.current = startTime + buffer.duration;
      
      audioQueueRef.current.push(source);
      
      source.onended = () => {
        const index = audioQueueRef.current.indexOf(source);
        if (index > -1) audioQueueRef.current.splice(index, 1);
        if (audioQueueRef.current.length === 0 && isConnectedRef.current) {
          setStatus('listening');
        }
      };
    } catch (e) {
      console.error('Play audio error:', e);
    }
  }, []);

  // Start audio capture
  const startAudioCapture = useCallback((stream: MediaStream) => {
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
      const downsampled = downsampleBuffer(new Float32Array(inputData), inputContextRef.current!.sampleRate, 16000);
      audioBuffer.push(downsampled);

      const now = Date.now();
      if (now - lastSendTime >= 100 && audioBuffer.length > 0) {
        const totalLength = audioBuffer.reduce((acc, buf) => acc + buf.length, 0);
        const combined = new Float32Array(totalLength);
        let offset = 0;
        for (const buf of audioBuffer) { combined.set(buf, offset); offset += buf.length; }

        try {
          sessionRef.current.sendRealtimeInput({ media: float32ToPCM16(combined) });
        } catch (e) { console.error('Send error:', e); }

        audioBuffer = [];
        lastSendTime = now;
      }
    };

    source.connect(processor);
    processor.connect(inputContextRef.current.destination);
  }, []);

  // Connect to voice agent
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

      // Get microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      mediaStreamRef.current = stream;

      // Create audio context for playback - MUST be created after user interaction
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      
      // Resume audio context (required for some browsers)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const systemPrompt = buildSystemPrompt(gender);
      const voiceName = gender === 'male' ? 'Aoede' : 'Kore';

      // Connect to Gemini Live API
      const session = await aiClientRef.current.live.connect({
        model: 'gemini-2.0-flash-exp',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemPrompt,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
        },
        callbacks: {
          onopen: () => {
            console.log('✅ Gemini Live connected');
            isConnectedRef.current = true;
            setStatus('connected');

            // Trigger initial greeting
            setTimeout(() => {
              if (sessionRef.current && isConnectedRef.current) {
                sessionRef.current.sendClientContent({
                  turns: [{ role: 'user', parts: [{ text: 'হ্যালো' }] }],
                  turnComplete: true
                });
              }
            }, 500);

            // Start capturing audio
            startAudioCapture(stream);
          },
          onmessage: (message: any) => {
            // Handle audio response
            const audioPart = message.serverContent?.modelTurn?.parts?.find(
              (p: any) => p.inlineData?.mimeType?.startsWith('audio/')
            );
            
            if (audioPart?.inlineData?.data && audioContextRef.current) {
              setStatus('speaking');
              
              try {
                const audioData = base64ToUint8Array(audioPart.inlineData.data);
                const audioBuffer = pcm16ToAudioBuffer(audioData, audioContextRef.current, 24000);
                playAudioBuffer(audioBuffer, audioContextRef.current);
              } catch (e) {
                console.error('Audio decode error:', e);
              }
            }
            
            if (message.serverContent?.turnComplete) {
              setTimeout(() => {
                if (isConnectedRef.current) setStatus('listening');
              }, 200);
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              audioQueueRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
              audioQueueRef.current = [];
              if (audioContextRef.current) {
                nextPlayTimeRef.current = audioContextRef.current.currentTime;
              }
            }
          },
          onclose: () => {
            console.log('Gemini Live disconnected');
            isConnectedRef.current = false;
            cleanup();
          },
          onerror: (err: any) => {
            console.error('Session error:', err);
            setError('সংযোগে সমস্যা হয়েছে');
            setStatus('error');
          },
        },
      });

      sessionRef.current = session;

    } catch (err: any) {
      console.error('Connection error:', err);
      let errorMsg = 'ভয়েস এজেন্ট শুরু করা যাচ্ছে না';
      if (err.name === 'NotAllowedError') errorMsg = 'মাইক্রোফোন পারমিশন দিন';
      else if (err.message?.includes('API')) errorMsg = 'API সংযোগে সমস্যা';
      setError(errorMsg);
      setStatus('error');
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
        <h3 className="text-2xl font-black text-white mb-2">{isBn ? 'Nree-এর সাথে কথা বলুন' : 'Talk to Nree'}</h3>
        <p className="text-slate-400 text-sm">{isBn ? 'বাংলায় কথা বলে ডাক্তার খুঁজুন, প্রশ্ন করুন' : 'Speak in Bangla to find doctors, ask questions'}</p>
        
        {!hasValidApiKey && (
          <div className="mt-4 bg-amber-500/20 text-amber-400 px-4 py-2 rounded-lg text-sm">
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
        />
        <VoiceAgentCard
          name="Nree"
          gender="female"
          onConnect={() => handleConnect('female')}
          onDisconnect={cleanup}
          status={activeAgent === 'female' ? status : 'idle'}
          isActive={activeAgent === 'female'}
          error={activeAgent === 'female' ? error : null}
        />
      </div>

      <p className="text-center text-slate-500 text-xs mt-6">
        <i className="fas fa-shield-alt mr-1"></i>
        {isBn ? 'নিরাপদ ও গোপনীয় • বিনামূল্যে' : 'Safe & Private • Free'}
      </p>
    </div>
  );
};

export default HomeVoiceSection;
