import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { MOCK_DOCTORS } from '../data/mockData';

// Audio Processing Helpers
function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binary);

  return {
    data: b64,
    mimeType: 'audio/pcm;rate=16000',
  };
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const VoiceAgent: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<string>("Click to call Nirnoy Agent");
  const [volume, setVolume] = useState(0);
  
  const aiRef = useRef<GoogleGenAI | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (process.env.API_KEY) {
      aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (inputContextRef.current) inputContextRef.current.close();
    if (outputContextRef.current) outputContextRef.current.close();
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    setIsActive(false);
  };

  const startSession = async () => {
    if (!aiRef.current) {
      setStatus("API Key missing");
      return;
    }

    try {
      setIsActive(true);
      setStatus("Connecting to Agent...");

      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Prepare Context
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const doctorList = MOCK_DOCTORS.map(d => ({
        name: d.name,
        specialties: d.specialties.join(', '),
        chamber: d.chambers[0]?.name,
        timing: `${d.chambers[0]?.startTime} to ${d.chambers[0]?.endTime}`,
        fee: d.chambers[0]?.fee,
        nextAvailable: d.nextAvailable
      }));
      const doctorContext = JSON.stringify(doctorList);

      sessionPromiseRef.current = aiRef.current.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `
            Context: Today is ${today}.
            You are the AI receptionist for Nirnoy Care (নির্ণয় কেয়ার). 
            You speak Bengali (Bangla) fluently and naturally.
            
            Your goal is to help patients book appointments.
            
            Here is the list of available doctors and their schedules:
            ${doctorContext}
            
            Instructions:
            1. Start by greeting in Bangla: "নমস্কার, নির্ণয় কেয়ারে আপনাকে স্বাগতম। আমি কিভাবে সাহায্য করতে পারি?" (Hello, Welcome to Nirnoy Care. How can I help?)
            2. Listen to the user's request. They might ask for a specific doctor, a specialty (e.g., Cardiologist/Hridrog), or availability.
            3. Check the provided list. 
               - If matching doctor found: Mention name, location, and 'nextAvailable' slot. Ask if they want to book.
               - If NOT found: Apologize in Bangla and ask if they want to search for something else.
            4. To confirm a booking: 
               - Ask for their Name and Phone Number.
               - Confirm the details: "আমি কি ডক্টর [Name]-এর সাথে [Time]-এ বুকিং কনফার্ম করব?"
            5. Once confirmed, say: "ধন্যবাদ, [Name]. আপনার অ্যাপয়েন্টমেন্ট বুক করা হয়েছে। কনফার্মেশন এসএমএস পাঠানো হয়েছে।" (Thanks, booking confirmed, SMS sent).
            6. If the user's request is too complex, emergency, or you don't understand, say: "দুঃখিত, আমি বুঝতে পারছি না। দয়া করে আমাদের হেল্পলাইন ১৬২৬৩ তে কল করুন।" (Sorry, please call 16263).
            
            Keep your responses concise, polite, and professional. Speak purely in Bangla unless the user speaks English.
          `,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
        callbacks: {
          onopen: () => {
            setStatus("Connected. Speak now.");
            // Setup Input Stream
            const source = inputContextRef.current!.createMediaStreamSource(stream);
            const processor = inputContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // Simple volume visualizer logic
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolume(Math.sqrt(sum/inputData.length) * 500); 

              const pcmBlob = createBlob(inputData);
              sessionPromiseRef.current?.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
             const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
             if (base64Audio && outputContextRef.current) {
                const ctx = outputContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                
                const audioBuffer = await decodeAudioData(
                  decode(base64Audio),
                  ctx,
                  24000,
                  1
                );
                
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.addEventListener('ended', () => sourcesRef.current.delete(source));
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
             }
             
             if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
             }
          },
          onclose: () => {
            setStatus("Call ended");
            setIsActive(false);
          },
          onerror: (e) => {
            console.error(e);
            setStatus("Connection failed");
            setIsActive(false);
          }
        }
      });

    } catch (err) {
      console.error(err);
      setStatus("Failed to access microphone");
      setIsActive(false);
    }
  };

  const stopSession = () => {
    cleanup();
    setStatus("Call ended");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {isActive && (
         <div className="mb-4 bg-white p-4 rounded-2xl shadow-2xl border border-teal-100 w-80 animate-fade-in-up relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-teal-600"></div>
            <div className="flex justify-between items-center mb-4">
               <div className="flex items-center gap-2">
                 <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                 <div className="text-sm font-bold text-slate-800">Nirnoy Voice Agent</div>
               </div>
               <div className="flex space-x-0.5 items-center h-4 items-end">
                  {[...Array(8)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1 bg-teal-500 rounded-full transition-all duration-75"
                      style={{ height: `${Math.min(20, Math.max(3, volume * Math.random() * 4))}px`}}
                    ></div>
                  ))}
               </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 mb-2">
               <p className="text-xs text-slate-600 font-medium text-center">{status}</p>
            </div>
            <p className="text-[10px] text-slate-400 text-center">AI can make mistakes. Verify important info.</p>
         </div>
      )}
      
      <div className="group relative flex items-center">
        {!isActive && (
           <div className="mr-4 bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
              Call to Book (Bangla)
           </div>
        )}
        <button
          onClick={isActive ? stopSession : startSession}
          className={`h-16 w-16 rounded-full shadow-xl flex items-center justify-center transition-all transform hover:scale-110 border-4 ${
            isActive ? 'bg-white border-red-100' : 'bg-primary border-teal-400 hover:bg-secondary'
          }`}
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