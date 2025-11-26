import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MOCK_DOCTORS } from '../data/mockData';

// ============ CONFIGURATION ============
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const hasValidApiKey = GEMINI_API_KEY && GEMINI_API_KEY.length > 10;

// ============ AUDIO HELPERS ============

// Convert Float32Array to PCM16 blob
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

// Downsample audio to target sample rate
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

// ============ SYSTEM PROMPT ============
function buildSystemPrompt(): string {
  const today = new Date().toLocaleDateString('bn-BD', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const doctorList = MOCK_DOCTORS.slice(0, 10).map(d => 
    `${d.name} (${d.specialties[0]}) - ${d.chambers[0]?.name}, ফি: ৳${d.chambers[0]?.fee}`
  ).join('\n');

  return `
## আপনার পরিচয়
আপনি নির্ণয় কেয়ার (Nirnoy Care) এর AI ভয়েস এসিস্ট্যান্ট।

## নির্দেশনা
- বাংলাদেশী বাংলায় কথা বলুন
- প্রথমে বলুন: "আসসালামু আলাইকুম! নির্ণয় কেয়ারে স্বাগতম। কীভাবে সাহায্য করতে পারি?"
- সংক্ষিপ্ত উত্তর দিন (১-২ বাক্য)

## আজকের তারিখ: ${today}

## ডাক্তার তালিকা:
${doctorList}

## কাজ
1. ডাক্তার খোঁজা
2. অ্যাপয়েন্টমেন্ট বুকিং
3. ফি ও সময়সূচী জানানো

## জরুরি অবস্থা
বুকে ব্যথা, শ্বাসকষ্ট বললে: "এটা ইমার্জেন্সি! 999 এ কল করুন।"
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
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const nextPlayTimeRef = useRef<number>(0);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Stop audio sources
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
    setIsActive(false);
    setStatus('idle');
    setStatusText('কথা বলতে ক্লিক করুন');
    setVolume(0);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // Start session
  const startSession = async () => {
    if (!hasValidApiKey) {
      setError('API Key কনফিগার করা হয়নি');
      return;
    }

    try {
      cleanup();
      setIsActive(true);
      setStatus('connecting');
      setStatusText('কানেক্ট হচ্ছে...');
      setError(null);

      // Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      mediaStreamRef.current = stream;

      // Create audio context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate: 24000 });
      audioContextRef.current = audioContext;

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Connect to Gemini
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;
      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      ws.onopen = () => {
        const setupMessage = {
          setup: {
            model: 'models/gemini-2.0-flash-exp',
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Kore' }
                }
              }
            },
            systemInstruction: {
              parts: [{ text: buildSystemPrompt() }]
            }
          }
        };
        ws.send(JSON.stringify(setupMessage));
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.setupComplete) {
            setStatus('listening');
            setStatusText('কথা বলুন...');
            startAudioCapture(stream, audioContext, ws);
          }

          if (data.serverContent?.modelTurn?.parts) {
            for (const part of data.serverContent.modelTurn.parts) {
              if (part.inlineData?.data) {
                setStatus('speaking');
                setStatusText('বলছে...');
                
                const audioData = base64ToUint8Array(part.inlineData.data);
                const audioBuffer = await pcm16ToAudioBuffer(audioData, audioContext, 24000);
                playAudioBuffer(audioBuffer, audioContext);
              }
            }
          }

          if (data.serverContent?.turnComplete) {
            setStatus('listening');
            setStatusText('কথা বলুন...');
          }
        } catch (e) {
          console.error('Message parse error:', e);
        }
      };

      ws.onerror = () => {
        setError('সংযোগে সমস্যা');
        setStatus('error');
        setStatusText('ত্রুটি');
      };

      ws.onclose = () => {
        if (status !== 'error') {
          cleanup();
        }
      };

    } catch (err: any) {
      let errorMsg = 'ভয়েস এজেন্ট শুরু করা যাচ্ছে না';
      if (err.name === 'NotAllowedError') {
        errorMsg = 'মাইক্রোফোন পারমিশন দিন';
      }
      setError(errorMsg);
      setStatus('error');
      cleanup();
    }
  };

  // Start audio capture
  const startAudioCapture = (stream: MediaStream, audioContext: AudioContext, ws: WebSocket) => {
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    let audioBuffer: Float32Array[] = [];
    let lastSendTime = Date.now();

    processor.onaudioprocess = (event) => {
      if (ws.readyState !== WebSocket.OPEN) return;

      const inputData = event.inputBuffer.getChannelData(0);

      // Volume visualization
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      setVolume(Math.min(1, rms * 5));

      // Downsample to 16kHz
      const downsampled = downsampleBuffer(new Float32Array(inputData), audioContext.sampleRate, 16000);
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
      if (audioQueueRef.current.length === 0 && status === 'speaking') {
        setStatus('listening');
        setStatusText('কথা বলুন...');
      }
    };
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* Active call panel */}
      {isActive && (
        <div className="mb-4 bg-white p-4 rounded-2xl shadow-2xl border border-teal-100 w-80 animate-fade-in-up relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-teal-600"></div>
          
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${status === 'speaking' ? 'bg-blue-500' : 'bg-green-500'} animate-pulse`}></div>
              <div className="text-sm font-bold text-slate-800">Nirnoy Voice Agent</div>
            </div>
            <div className="flex space-x-0.5 items-end h-4">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-75 ${status === 'speaking' ? 'bg-blue-500' : 'bg-teal-500'}`}
                  style={{ height: `${Math.max(3, (status === 'speaking' ? Math.random() * 20 : volume * 20 * Math.random()))}px` }}
                ></div>
              ))}
            </div>
          </div>
          
          <div className="bg-slate-50 rounded-lg p-3 mb-2">
            <p className="text-xs text-slate-600 font-medium text-center">{statusText}</p>
          </div>
          
          {error && (
            <p className="text-xs text-red-500 text-center mb-2">{error}</p>
          )}
          
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
                ? 'bg-primary border-teal-400 hover:bg-secondary' 
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
