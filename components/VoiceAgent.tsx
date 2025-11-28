import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { MOCK_DOCTORS } from '../data/mockData';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const hasValidApiKey = GEMINI_API_KEY && GEMINI_API_KEY.length > 10;
const log = (...args: any[]) => console.log('[Voice]', ...args);

// Audio beep
let audioCtx: AudioContext | null = null;
function playBeep(freq = 440, dur = 0.2): void {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + dur);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  } catch (e) {}
}

// TTS with gender support
function speak(text: string, gender: 'male' | 'female', onEnd?: () => void): void {
  window.speechSynthesis.cancel();
  if (!text) { onEnd?.(); return; }
  
  const clean = text.replace(/[^\u0980-\u09FF\s।,?!.-]/g, '').replace(/\s+/g, ' ').trim();
  if (!clean) { onEnd?.(); return; }
  
  const utt = new SpeechSynthesisUtterance(clean);
  utt.lang = 'bn-BD';
  
  // Gender differentiation through pitch
  if (gender === 'male') {
    utt.pitch = 0.75;  // Lower pitch for male
    utt.rate = 0.85;
  } else {
    utt.pitch = 1.3;   // Higher pitch for female
    utt.rate = 0.95;
  }
  
  utt.volume = 1.0;
  utt.onend = () => onEnd?.();
  utt.onerror = () => { playBeep(600, 0.3); setTimeout(() => onEnd?.(), 500); };
  
  setTimeout(() => window.speechSynthesis.speak(utt), 50);
}

// Recognition
let recog: any = null;
function listen(onResult: (t: string) => void, onErr?: () => void): void {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) { onErr?.(); return; }
  if (!recog) { recog = new SR(); recog.lang = 'bn-BD'; }
  recog.onresult = (e: any) => onResult(e.results[0][0].transcript);
  recog.onerror = () => onErr?.();
  try { recog.start(); playBeep(800, 0.1); } catch (e) { onErr?.(); }
}
function stopListen(): void { try { recog?.stop(); } catch (e) {} }

// Gemini
async function ask(client: GoogleGenAI, q: string, name: string): Promise<string> {
  const docs = MOCK_DOCTORS.slice(0, 3).map(d => `${d.name} (${d.specialties[0]})`).join(', ');
  try {
    const r = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: `তুমি ${name}, নির্ণয় হেলথ এর বাংলাদেশি AI। বাংলায় ছোট উত্তর দাও। "আপনি", "জ্বী" ব্যবহার করো। ডাক্তার: ${docs}\n\nপ্রশ্ন: ${q}` }] }],
    });
    return (r.text || 'দুঃখিত').replace(/[*#_~`]/g, '').trim();
  } catch (e) { return 'দুঃখিত, উত্তর দিতে পারছি না।'; }
}

type Status = 'idle' | 'greeting' | 'listening' | 'thinking' | 'speaking' | 'error';

interface Props {
  onClose?: () => void;
  voiceGender?: 'male' | 'female';
  compact?: boolean;
}

const VoiceAgent: React.FC<Props> = ({ onClose, voiceGender = 'female', compact = false }) => {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const clientRef = useRef<GoogleGenAI | null>(null);
  const activeRef = useRef(false);
  const name = voiceGender === 'male' ? 'স্বাস্থ্য' : 'সেবা';

  useEffect(() => {
    if (hasValidApiKey) clientRef.current = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    return () => { window.speechSynthesis.cancel(); stopListen(); };
  }, []);

  const process = useCallback(async (text: string) => {
    if (!clientRef.current || !activeRef.current) return;
    setTranscript(`আপনি: ${text}`);
    setStatus('thinking');
    const resp = await ask(clientRef.current, text, name);
    if (!activeRef.current) return;
    setTranscript(`${name}: ${resp}`);
    setStatus('speaking');
    speak(resp, voiceGender, () => {
      if (activeRef.current) {
        setStatus('listening');
        setTranscript('');
        listen(process, () => setStatus('error'));
      }
    });
  }, [name, voiceGender]);

  const start = () => {
    if (!hasValidApiKey) return;
    window.speechSynthesis.cancel();
    stopListen();
    setStatus('greeting');
    setError(null);
    setTranscript('');
    activeRef.current = true;
    
    const greet = `আসসালামু আলাইকুম। আমি ${name}। আপনার স্বাস্থ্য বিষয়ে কীভাবে সাহায্য করতে পারি?`;
    setTranscript(`${name}: ${greet}`);
    playBeep(600, 0.15);
    
    speak(greet, voiceGender, () => {
      if (activeRef.current) {
        setStatus('listening');
        setTranscript('');
        listen(process, () => setError('মাইক সমস্যা'));
      }
    });
  };

  const stop = () => {
    activeRef.current = false;
    window.speechSynthesis.cancel();
    stopListen();
    setStatus('idle');
    setTranscript('');
    playBeep(400, 0.2);
    onClose?.();
  };

  useEffect(() => { if (!compact && hasValidApiKey) start(); }, [compact]);

  const statusTxt = { idle: 'প্রস্তুত', greeting: 'শুভেচ্ছা...', listening: 'বলুন...', thinking: 'চিন্তা...', speaking: 'বলছে...', error: error || 'সমস্যা' };
  const bg = voiceGender === 'male' ? 'from-blue-600 to-indigo-600' : 'from-pink-600 to-rose-600';

  if (compact) {
    return (
      <div className={`bg-gradient-to-r ${bg} rounded-2xl p-6 text-white`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-lg font-bold">{voiceGender === 'male' ? 'স্বা' : 'সে'}</span>
            </div>
            <div>
              <h4 className="font-bold">{name}</h4>
              <p className="text-sm text-white/70">{statusTxt[status]}</p>
            </div>
          </div>
          {status === 'idle' ? (
            <button onClick={start} disabled={!hasValidApiKey} className="px-4 py-2 bg-white text-blue-600 font-bold rounded-lg">
              <i className="fas fa-microphone mr-2"></i>কথা বলুন
            </button>
          ) : (
            <button onClick={stop} className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg">
              <i className="fas fa-stop mr-2"></i>শেষ
            </button>
          )}
        </div>
        {transcript && <div className="p-3 bg-white/10 rounded-xl text-sm">{transcript}</div>}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className={`p-6 text-white bg-gradient-to-r ${bg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-xl font-bold">{voiceGender === 'male' ? 'স্বা' : 'সে'}</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">{name}</h3>
                <p className="text-sm text-white/80">{statusTxt[status]}</p>
              </div>
            </div>
            <button onClick={stop} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div className="p-8 bg-slate-50">
          <div className="flex items-center justify-center gap-2 h-24">
            {(status === 'speaking' || status === 'listening' || status === 'greeting') ? (
              [...Array(7)].map((_, i) => (
                <div key={i} className={`w-2 rounded-full ${status === 'listening' ? 'bg-green-500' : 'bg-purple-500'}`}
                  style={{ height: `${20 + Math.random() * 50}px`, animation: `pulse ${0.3 + i * 0.1}s ease-in-out infinite alternate` }} />
              ))
            ) : status === 'thinking' ? (
              [0,1,2].map(i => <div key={i} className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />)
            ) : (
              <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center">
                <i className="fas fa-microphone text-3xl text-slate-400"></i>
              </div>
            )}
          </div>
        </div>

        {transcript && <div className="p-4 bg-slate-100 border-t"><p className="text-sm text-slate-700">{transcript}</p></div>}
        {error && <div className="p-4 bg-red-50 border-t"><p className="text-red-600 text-sm"><i className="fas fa-exclamation-circle mr-2"></i>{error}</p></div>}

        <div className="p-4 border-t">
          {status === 'idle' ? (
            <button onClick={start} disabled={!hasValidApiKey}
              className={`w-full py-4 font-bold rounded-xl flex items-center justify-center gap-2 ${hasValidApiKey ? `bg-gradient-to-r ${bg} text-white` : 'bg-slate-300 text-slate-500'}`}>
              <i className="fas fa-microphone"></i>কথা বলুন
            </button>
          ) : (
            <button onClick={stop} className="w-full py-4 bg-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-2">
              <i className="fas fa-stop"></i>শেষ করুন
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceAgent;
