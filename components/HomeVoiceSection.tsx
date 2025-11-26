import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { AudioStreamer, base64ToUint8Array } from '../lib/audio-streamer';
import { AudioRecorder } from '../lib/audio-recorder';
import { MOCK_DOCTORS } from '../data/mockData';

// ============ CONFIGURATION ============
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const hasValidApiKey = GEMINI_API_KEY && GEMINI_API_KEY.length > 10;
const LIVE_MODEL = 'gemini-2.0-flash-live-001';

const log = (...args: any[]) => console.log('[🎤 Nree]', ...args);
const logError = (...args: any[]) => console.error('[❌ Nree]', ...args);

// ============ GET REAL STATS ============
function getRealStats() {
  const totalDoctors = MOCK_DOCTORS.length;
  const specialties = [...new Set(MOCK_DOCTORS.flatMap(d => d.specialties))];
  const hospitals = [...new Set(MOCK_DOCTORS.flatMap(d => d.chambers.map(c => c.name)))];
  
  // Get top specialties with counts
  const specCounts: Record<string, number> = {};
  MOCK_DOCTORS.forEach(d => {
    d.specialties.forEach(s => {
      specCounts[s] = (specCounts[s] || 0) + 1;
    });
  });
  const topSpecs = Object.entries(specCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => `${name} (${count} জন)`);

  return {
    totalDoctors,
    totalSpecialties: specialties.length,
    totalHospitals: hospitals.length,
    topSpecialties: topSpecs,
  };
}

// ============ GREETING ============
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'সুপ্রভাত';
  if (hour >= 12 && hour < 17) return 'শুভ দুপুর';
  if (hour >= 17 && hour < 20) return 'শুভ সন্ধ্যা';
  return 'শুভ রাত্রি';
}

// ============ SYSTEM PROMPT - Natural Bangladeshi Bangla ============
function getSystemPrompt(isMale: boolean): string {
  const greeting = getGreeting();
  const stats = getRealStats();
  
  // Get sample doctors for reference
  const sampleDoctors = MOCK_DOCTORS.slice(0, 15).map(d => 
    `- ${d.name}, ${d.specialties[0]}, ${d.chambers[0]?.name || 'চেম্বার'}, ফি ৳${d.chambers[0]?.fee || 1000}`
  ).join('\n');

  return `## তোমার পরিচয়
তুমি "Nree" (নির্ণয়ের ২৪/৭ AI সহকারী)। তুমি ${isMale ? 'একজন ছেলে' : 'একজন মেয়ে'}। তোমার কাজ হলো নির্ণয় প্ল্যাটফর্মে মানুষদের সাহায্য করা।

## কথা বলার ধরন (অত্যন্ত গুরুত্বপূর্ণ)
- শুধুমাত্র বাংলাদেশী বাংলায় কথা বলো। ভারতীয় বাংলা একদম না।
- "আপনি" না বলে "তুমি" বা "আপনি" পরিস্থিতি বুঝে বলো। সাধারণত "আপনি" ভালো।
- স্বাভাবিক, বন্ধুসুলভ, আন্তরিক - যেমন একজন হেল্পফুল বন্ধু কথা বলে।
- "জ্বী", "আচ্ছা", "ঠিক আছে", "অবশ্যই" এসব ব্যবহার করো।
- ছোট ছোট বাক্যে কথা বলো। লম্বা বাক্য না।
- "হ্যাঁ" না বলে "জ্বী" বলো। "না" বলতে পারো সরাসরি।
- শেষে "আর কিছু?" বা "আর কোনো হেল্প লাগবে?" জিজ্ঞেস করো।

## প্রথম কথা
এভাবে শুরু করো: "আসসালামু আলাইকুম! ${greeting}! আমি Nree, নির্ণয়ের সহকারী। বলুন, কীভাবে হেল্প করতে পারি?"

## নির্ণয় সম্পর্কে তথ্য (সঠিক তথ্য)
- মোট ডাক্তার: ${stats.totalDoctors} জন
- বিশেষত্ব: ${stats.totalSpecialties}+ ধরনের
- হাসপাতাল/চেম্বার: ${stats.totalHospitals}+ টা
- সার্ভিস: ২৪/৭ চালু
- ফি: ডাক্তার ভেদে ৳৫০০ থেকে ৳২০০০+

## জনপ্রিয় বিশেষত্ব
${stats.topSpecialties.join(', ')}

## কিছু ডাক্তারের তথ্য (রেফারেন্স)
${sampleDoctors}

## তোমার কাজ
১. ডাক্তার খুঁজতে হেল্প করা - বিশেষত্ব, লোকেশন, ফি অনুযায়ী
২. অ্যাপয়েন্টমেন্ট বুক করতে সাহায্য করা
৩. ফি, সময়সূচী জানানো
৪. নির্ণয় সম্পর্কে যেকোনো প্রশ্নের উত্তর দেওয়া

## জরুরি অবস্থা
বুকে ব্যথা, শ্বাসকষ্ট, অজ্ঞান - এসব শুনলে বলো: "এইটা ইমার্জেন্সি! এখনই ৯৯৯ এ কল করেন অথবা কাছের হাসপাতালে যান।"

## বিদায়
শেষে বলো: "আল্লাহ হাফেজ! ভালো থাকবেন।" অথবা "ধন্যবাদ! আবার কথা হবে।"`;
}

// ============ TYPES ============
type Status = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

interface State {
  activeAgent: 'male' | 'female' | null;
  status: Status;
  statusText: string;
  volume: number;
  error: string | null;
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
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const isActiveRef = useRef(false);

  useEffect(() => {
    if (hasValidApiKey) {
      log('Initializing');
      aiRef.current = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    }
  }, []);

  const cleanup = useCallback(() => {
    log('Cleaning up...');
    isActiveRef.current = false;

    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }

    if (streamerRef.current) {
      streamerRef.current.stop();
      streamerRef.current = null;
    }

    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
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

  const handleEndCall = useCallback(() => {
    log('End call');
    cleanup();
  }, [cleanup]);

  const startSession = async (gender: 'male' | 'female') => {
    if (!aiRef.current) {
      setState(s => ({ ...s, error: 'API Key নেই', status: 'error' }));
      return;
    }

    cleanup();
    await new Promise(resolve => setTimeout(resolve, 100));
    isActiveRef.current = true;

    setState({
      activeAgent: gender,
      status: 'connecting',
      statusText: 'কানেক্ট হচ্ছে...',
      volume: 0,
      error: null,
    });

    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      streamerRef.current = new AudioStreamer(audioContextRef.current);
      streamerRef.current.onComplete = () => {
        if (isActiveRef.current) {
          setState(s => ({ ...s, status: 'listening', statusText: 'শুনছি...' }));
        }
      };
      await streamerRef.current.resume();

      recorderRef.current = new AudioRecorder(16000);
      recorderRef.current.on('data', (base64Audio: string) => {
        if (sessionRef.current && isActiveRef.current) {
          try {
            sessionRef.current.sendRealtimeInput({
              media: { mimeType: 'audio/pcm;rate=16000', data: base64Audio }
            });
          } catch (e) {}
        }
      });
      recorderRef.current.on('volume', (volume: number) => {
        setState(s => ({ ...s, volume }));
      });

      // Puck = more neutral/male, Kore = more feminine
      const voiceName = gender === 'male' ? 'Puck' : 'Kore';
      const systemPrompt = getSystemPrompt(gender === 'male');

      log('Connecting...', { voice: voiceName });

      const session = await aiRef.current.live.connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemPrompt,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
        },
        callbacks: {
          onopen: async () => {
            log('Connected!');
            setState(s => ({ ...s, status: 'listening', statusText: 'সংযুক্ত' }));

            try {
              await recorderRef.current?.start();
            } catch (e) {
              setState(s => ({ ...s, error: 'মাইক পারমিশন দিন', status: 'error' }));
              return;
            }

            setTimeout(() => {
              if (sessionRef.current && isActiveRef.current) {
                sessionRef.current.sendClientContent({
                  turns: [{ role: 'user', parts: [{ text: 'হ্যালো' }] }],
                  turnComplete: true,
                });
              }
            }, 500);
          },

          onmessage: (msg: LiveServerMessage) => {
            if (!isActiveRef.current) return;

            const parts = msg.serverContent?.modelTurn?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.inlineData?.data && part.inlineData.data.length > 0) {
                  setState(s => ({ ...s, status: 'speaking', statusText: 'বলছে...' }));
                  const audioData = base64ToUint8Array(part.inlineData.data);
                  streamerRef.current?.addPCM16(audioData);
                }
              }
            }

            if (msg.serverContent?.interrupted) {
              streamerRef.current?.stop();
              setState(s => ({ ...s, status: 'listening', statusText: 'শুনছি...' }));
            }
          },

          onclose: () => {
            if (isActiveRef.current) cleanup();
          },

          onerror: () => {
            setState(s => ({ ...s, error: 'সংযোগ সমস্যা', status: 'error' }));
            cleanup();
          },
        },
      });

      sessionRef.current = session;

    } catch (err: any) {
      logError('Error:', err);
      setState(s => ({ ...s, error: 'শুরু করা যাচ্ছে না', status: 'error' }));
      cleanup();
    }
  };

  const stats = getRealStats();

  return (
    <section className="py-20 px-6 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 px-5 py-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full mb-6">
            <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-white">২৪/৭ চালু • বিনামূল্যে</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            Nree এর সাথে কথা বলুন
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto">
            নির্ণয়ের AI সহকারী। ডাক্তার খুঁজুন, অ্যাপয়েন্টমেন্ট নিন, যেকোনো প্রশ্ন করুন — সব বাংলায়।
          </p>
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-center gap-8 mb-10 text-center">
          <div>
            <p className="text-2xl font-black text-white">{stats.totalDoctors}+</p>
            <p className="text-xs text-slate-500">ডাক্তার</p>
          </div>
          <div className="w-px h-8 bg-slate-700"></div>
          <div>
            <p className="text-2xl font-black text-white">{stats.totalSpecialties}+</p>
            <p className="text-xs text-slate-500">বিশেষত্ব</p>
          </div>
          <div className="w-px h-8 bg-slate-700"></div>
          <div>
            <p className="text-2xl font-black text-white">24/7</p>
            <p className="text-xs text-slate-500">সার্ভিস</p>
          </div>
        </div>

        {/* Error */}
        {state.error && (
          <div className="max-w-md mx-auto mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm text-center backdrop-blur-sm">
            <i className="fas fa-exclamation-circle mr-2"></i>{state.error}
          </div>
        )}

        {!hasValidApiKey && (
          <div className="max-w-md mx-auto mb-6 p-4 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-300 text-sm text-center backdrop-blur-sm">
            <i className="fas fa-exclamation-triangle mr-2"></i>API Key প্রয়োজন
          </div>
        )}

        {/* Agent Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {(['male', 'female'] as const).map((gender) => {
            const isActive = state.activeAgent === gender;
            const isOther = state.activeAgent !== null && state.activeAgent !== gender;
            const isSpeaking = isActive && state.status === 'speaking';
            const isMale = gender === 'male';

            return (
              <div
                key={gender}
                className={`relative rounded-2xl p-6 transition-all duration-300 ${
                  isActive 
                    ? 'bg-white shadow-2xl shadow-blue-500/20' 
                    : isOther 
                      ? 'bg-white/5 opacity-40 pointer-events-none border border-white/5'
                      : 'bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 hover:border-white/20'
                }`}
              >
                {isActive && (
                  <div className="absolute top-4 right-4">
                    <span className="flex h-3 w-3">
                      <span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-4 mb-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    isActive 
                      ? isMale ? 'bg-blue-500' : 'bg-pink-500'
                      : isMale ? 'bg-blue-500/20' : 'bg-pink-500/20'
                  }`}>
                    <i className={`fas ${isMale ? 'fa-mars' : 'fa-venus'} text-xl ${
                      isActive ? 'text-white' : isMale ? 'text-blue-400' : 'text-pink-400'
                    }`}></i>
                  </div>
                  <div>
                    <h3 className={`font-bold text-lg ${isActive ? 'text-slate-900' : 'text-white'}`}>
                      Nree
                    </h3>
                    <p className={`text-sm ${isActive ? 'text-slate-500' : 'text-slate-400'}`}>
                      {isMale ? 'পুরুষ কণ্ঠ' : 'মহিলা কণ্ঠ'}
                    </p>
                  </div>
                </div>

                {isActive ? (
                  <div className="space-y-4">
                    {/* Visualizer */}
                    <div className="h-14 bg-slate-100 rounded-xl flex items-center justify-center gap-1 px-4">
                      {[...Array(10)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 rounded-full transition-all duration-75 ${
                            isSpeaking ? 'bg-blue-500' : 'bg-green-500'
                          }`}
                          style={{ 
                            height: isSpeaking 
                              ? `${20 + Math.random() * 80}%` 
                              : `${Math.max(15, state.volume * 100)}%` 
                          }}
                        />
                      ))}
                    </div>
                    
                    <p className="text-center text-sm font-medium text-slate-600">
                      <i className={`${isSpeaking ? 'fas fa-volume-up' : 'fas fa-microphone'} mr-2`}></i>
                      {state.statusText}
                    </p>
                    
                    <button
                      onClick={handleEndCall}
                      className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 active:bg-red-700 transition flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-phone-slash"></i>
                      কল শেষ করুন
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startSession(gender)}
                    disabled={isOther || !hasValidApiKey}
                    className={`w-full py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                      isMale
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-pink-500 text-white hover:bg-pink-600'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <i className="fas fa-phone"></i>
                    কথা বলুন
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="text-slate-500 text-sm">
            <i className="fas fa-shield-alt mr-2"></i>
            নিরাপদ ও গোপনীয় • Powered by Gemini AI
          </p>
        </div>
      </div>
    </section>
  );
};

export default HomeVoiceSection;
