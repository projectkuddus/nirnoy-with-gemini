import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { GoogleGenAI } from '@google/genai';
import { MOCK_DOCTORS } from '../data/mockData';

// ============ CONFIGURATION ============
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const hasValidApiKey = GEMINI_API_KEY && GEMINI_API_KEY.length > 10;

const log = (...args: any[]) => console.log('[Voice]', ...args);

// ============ AUDIO CONTEXT FOR BEEP ============
let audioContext: AudioContext | null = null;

function playBeep(frequency: number = 440, duration: number = 0.2): void {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (e) {
    log('Beep error:', e);
  }
}

// ============ TEXT-TO-SPEECH WITH GENDER SUPPORT ============
class TextToSpeech {
  private synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    this.synth = window.speechSynthesis;
    this.loadVoices();
    
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
    
    setTimeout(() => this.loadVoices(), 100);
    setTimeout(() => this.loadVoices(), 500);
    setTimeout(() => this.loadVoices(), 1000);
  }

  private loadVoices(): void {
    this.voices = this.synth.getVoices();
    log('Voices loaded:', this.voices.length);
    
    // Log Bengali voices specifically
    const bengaliVoices = this.voices.filter(v => v.lang.includes('bn') || v.lang.includes('hi'));
    if (bengaliVoices.length > 0) {
      log('Bengali/Hindi voices:', bengaliVoices.map(v => `${v.name} (${v.lang})`).join(', '));
    }
  }

  private getBengaliVoice(): SpeechSynthesisVoice | null {
    if (this.voices.length === 0) this.loadVoices();
    
    // Priority order for Bangladeshi Bengali
    const priorities = [
      'bn-BD',  // Bangladeshi Bengali (best)
      'bn-IN',  // Indian Bengali
      'bn',     // Generic Bengali
      'hi-IN',  // Hindi (similar sound)
      'hi',     // Generic Hindi
    ];
    
    for (const lang of priorities) {
      const voice = this.voices.find(v => v.lang === lang || v.lang.startsWith(lang));
      if (voice) {
        log('Found voice:', voice.name, voice.lang);
        return voice;
      }
    }
    
    // Try to find any voice with 'bengali' or 'bangla' in name
    const bengaliByName = this.voices.find(v => 
      v.name.toLowerCase().includes('bengali') || 
      v.name.toLowerCase().includes('bangla') ||
      v.name.toLowerCase().includes('bangladesh')
    );
    if (bengaliByName) return bengaliByName;
    
    // Fallback to Google voice if available (usually better quality)
    const googleVoice = this.voices.find(v => v.name.includes('Google'));
    if (googleVoice) return googleVoice;
    
    return this.voices[0] || null;
  }

  speak(text: string, gender: 'male' | 'female', onEnd?: () => void): boolean {
    this.synth.cancel();
    
    if (!text) {
      onEnd?.();
      return false;
    }

    // Clean text - keep only Bengali characters and basic punctuation
    const cleanText = text
      .replace(/[^\u0980-\u09FF\s।,?!.।॥-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      log('No text after cleaning');
      onEnd?.();
      return false;
    }

    log(`Speaking (${gender}):`, cleanText.substring(0, 50));

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    const voice = this.getBengaliVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'bn-BD';
    }
    
    // Gender differentiation through pitch and rate
    // Male: Lower pitch (0.8), slightly slower
    // Female: Higher pitch (1.2), slightly faster
    if (gender === 'male') {
      utterance.pitch = 0.75;  // Lower pitch for male
      utterance.rate = 0.85;   // Slightly slower
    } else {
      utterance.pitch = 1.3;   // Higher pitch for female
      utterance.rate = 0.95;   // Slightly faster
    }
    
    utterance.volume = 1.0;

    utterance.onstart = () => log('Speech started');
    utterance.onend = () => {
      log('Speech ended');
      onEnd?.();
    };
    utterance.onerror = (e) => {
      log('Speech error:', e.error);
      playBeep(600, 0.3);
      setTimeout(() => onEnd?.(), 500);
    };

    // Chrome workaround
    setTimeout(() => {
      this.synth.speak(utterance);
    }, 50);

    return true;
  }

  stop(): void {
    this.synth.cancel();
  }

  // Test function
  test(gender: 'male' | 'female'): void {
    const text = gender === 'male' 
      ? 'আমি স্বাস্থ্য। আমি পুরুষ সহকারী।'
      : 'আমি সেবা। আমি মহিলা সহকারী।';
    this.speak(text, gender, () => log('Test complete'));
  }
}

// Global TTS instance
let tts: TextToSpeech | null = null;
function getTTS(): TextToSpeech {
  if (!tts) tts = new TextToSpeech();
  return tts;
}

// ============ SPEECH RECOGNITION ============
let recognition: any = null;

function initRecognition(): boolean {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return false;
  
  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'bn-BD'; // Bangladeshi Bengali
  return true;
}

function startListening(onResult: (text: string) => void, onError?: () => void): void {
  if (!recognition && !initRecognition()) {
    onError?.();
    return;
  }
  
  recognition.onresult = (e: any) => {
    const text = e.results[0][0].transcript;
    log('Heard:', text);
    onResult(text);
  };
  
  recognition.onerror = (e: any) => {
    log('Recognition error:', e.error);
    if (e.error !== 'no-speech' && e.error !== 'aborted') {
      onError?.();
    }
  };
  
  try {
    recognition.start();
    log('Listening...');
    playBeep(800, 0.1);
  } catch (e) {
    onError?.();
  }
}

function stopListening(): void {
  if (recognition) {
    try { recognition.stop(); } catch (e) {}
  }
}

// ============ GEMINI CHAT ============
async function askGemini(client: GoogleGenAI, question: string, agentName: string): Promise<string> {
  const doctors = MOCK_DOCTORS.slice(0, 3).map(d => `${d.name} (${d.specialties[0]})`).join(', ');
  
  // Prompt in pure Bangladeshi Bengali style
  const prompt = `তুমি ${agentName}, নির্ণয় হেলথ এর বাংলাদেশি AI স্বাস্থ্য সহকারী।

গুরুত্বপূর্ণ নিয়ম:
- শুধুমাত্র বাংলায় উত্তর দাও
- সংক্ষিপ্ত উত্তর দাও (১-২ বাক্য)
- বিনয়ী ও সম্মানজনক ভাষা ব্যবহার করো
- "আপনি", "জ্বী", "আচ্ছা" এই শব্দগুলো ব্যবহার করো

উপলব্ধ ডাক্তার: ${doctors}

রোগীর প্রশ্ন: ${question}

তোমার উত্তর:`;

  try {
    const result = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    
    let response = result.text || 'দুঃখিত, বুঝতে পারিনি।';
    // Clean markdown and special chars
    response = response.replace(/[*#_~`]/g, '').trim();
    
    log('Gemini:', response);
    return response;
  } catch (e: any) {
    log('Gemini error:', e.message);
    return 'দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না।';
  }
}

// ============ TYPES ============
type Status = 'idle' | 'greeting' | 'listening' | 'thinking' | 'speaking' | 'error';

// ============ VOICE CARD ============
const VoiceCard: React.FC<{
  name: string;
  gender: 'male' | 'female';
  status: Status;
  isActive: boolean;
  transcript: string;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
}> = ({ name, gender, status, isActive, transcript, error, onStart, onStop }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  
  const statusText: Record<Status, string> = {
    idle: isBn ? 'প্রস্তুত' : 'Ready',
    greeting: isBn ? 'শুভেচ্ছা...' : 'Greeting...',
    listening: isBn ? 'বলুন...' : 'Speak...',
    thinking: isBn ? 'চিন্তা করছি...' : 'Thinking...',
    speaking: isBn ? 'বলছে...' : 'Speaking...',
    error: error || (isBn ? 'সমস্যা' : 'Error'),
  };

  const bgColor = gender === 'male' ? 'from-blue-500 to-indigo-600' : 'from-pink-500 to-rose-600';
  const iconLetter = gender === 'male' ? 'স্বা' : 'সে';

  return (
    <div className={`bg-white rounded-2xl p-6 border-2 transition-all ${
      isActive ? 'border-blue-500 shadow-xl' : 'border-slate-200 hover:border-slate-300'
    }`}>
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${bgColor} flex items-center justify-center`}>
          <span className="text-white text-lg font-bold">{iconLetter}</span>
        </div>
        <div>
          <h3 className="font-bold text-lg text-slate-800">{name}</h3>
          <p className="text-sm text-slate-500">
            {gender === 'male' ? (isBn ? 'পুরুষ সহকারী' : 'Male') : (isBn ? 'মহিলা সহকারী' : 'Female')}
          </p>
        </div>
      </div>

      {isActive && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-3 h-3 rounded-full ${
              status === 'listening' ? 'bg-green-500 animate-pulse' :
              status === 'speaking' || status === 'greeting' ? 'bg-purple-500 animate-pulse' :
              status === 'thinking' ? 'bg-yellow-500 animate-pulse' :
              status === 'error' ? 'bg-red-500' : 'bg-slate-400'
            }`}></div>
            <span className={`text-sm font-medium ${status === 'error' ? 'text-red-500' : 'text-slate-600'}`}>
              {statusText[status]}
            </span>
          </div>

          {(status === 'listening' || status === 'speaking' || status === 'greeting') && (
            <div className="flex justify-center gap-1 h-12 items-center bg-slate-50 rounded-xl">
              {[...Array(5)].map((_, i) => (
                <div key={i}
                  className={`w-1.5 rounded-full ${status === 'listening' ? 'bg-green-500' : 'bg-purple-500'}`}
                  style={{ height: `${15 + Math.random() * 20}px`, animation: `pulse ${0.4 + i * 0.1}s ease-in-out infinite alternate` }}
                />
              ))}
            </div>
          )}

          {status === 'thinking' && (
            <div className="flex justify-center gap-2 h-12 items-center bg-slate-50 rounded-xl">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}

          {transcript && (
            <div className="mt-3 p-3 bg-slate-100 rounded-xl text-sm text-slate-700">
              {transcript}
            </div>
          )}
        </div>
      )}

      {isActive ? (
        <button onClick={onStop}
          className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
          <i className="fas fa-stop"></i>
          {isBn ? 'শেষ করুন' : 'End'}
        </button>
      ) : (
        <button onClick={onStart} disabled={!hasValidApiKey}
          className={`w-full py-3 font-bold rounded-xl flex items-center justify-center gap-2 ${
            hasValidApiKey ? `bg-gradient-to-r ${bgColor} text-white hover:opacity-90` : 'bg-slate-300 text-slate-500'
          }`}>
          <i className="fas fa-microphone"></i>
          {isBn ? 'কথা বলুন' : 'Talk'}
        </button>
      )}
    </div>
  );
};

// ============ MAIN COMPONENT ============
const HomeVoiceSection: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [activeAgent, setActiveAgent] = useState<'male' | 'female' | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<GoogleGenAI | null>(null);
  const isActiveRef = useRef(false);
  const currentGenderRef = useRef<'male' | 'female'>('male');

  useEffect(() => {
    if (hasValidApiKey) {
      clientRef.current = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      log('Gemini ready');
    }
    getTTS(); // Initialize TTS
    
    return () => {
      getTTS().stop();
      stopListening();
    };
  }, []);

  const processUserInput = useCallback(async (text: string, agentName: string) => {
    if (!clientRef.current || !isActiveRef.current) return;

    setTranscript(`আপনি: ${text}`);
    setStatus('thinking');

    const response = await askGemini(clientRef.current, text, agentName);
    
    if (!isActiveRef.current) return;

    setTranscript(`${agentName}: ${response}`);
    setStatus('speaking');

    const spoken = getTTS().speak(response, currentGenderRef.current, () => {
      if (isActiveRef.current) {
        setStatus('listening');
        setTranscript('');
        startListening(
          (newText) => processUserInput(newText, agentName),
          () => {
            if (isActiveRef.current) {
              setError('মাইক সমস্যা');
              setStatus('error');
            }
          }
        );
      }
    });

    if (!spoken) {
      setTimeout(() => {
        if (isActiveRef.current) {
          setStatus('listening');
          startListening((newText) => processUserInput(newText, agentName), () => {});
        }
      }, 2000);
    }
  }, []);

  const handleStart = (gender: 'male' | 'female') => {
    if (!hasValidApiKey) return;

    getTTS().stop();
    stopListening();
    
    setActiveAgent(gender);
    setStatus('greeting');
    setError(null);
    setTranscript('');
    isActiveRef.current = true;
    currentGenderRef.current = gender;

    const agentName = gender === 'male' ? 'স্বাস্থ্য' : 'সেবা';
    const greeting = `আসসালামু আলাইকুম। আমি ${agentName}। আপনার স্বাস্থ্য বিষয়ে কীভাবে সাহায্য করতে পারি?`;

    setTranscript(`${agentName}: ${greeting}`);
    playBeep(600, 0.15);

    const spoken = getTTS().speak(greeting, gender, () => {
      if (isActiveRef.current) {
        setStatus('listening');
        setTranscript('');
        playBeep(800, 0.1);
        startListening(
          (text) => processUserInput(text, agentName),
          () => {
            if (isActiveRef.current) {
              setError('মাইক্রোফোন পারমিশন দিন');
              setStatus('error');
            }
          }
        );
      }
    });

    if (!spoken) {
      setTimeout(() => {
        if (isActiveRef.current) {
          playBeep(800, 0.1);
          setStatus('listening');
          setTranscript('');
          startListening((text) => processUserInput(text, gender === 'male' ? 'স্বাস্থ্য' : 'সেবা'), () => {});
        }
      }, 1500);
    }
  };

  const handleStop = () => {
    isActiveRef.current = false;
    getTTS().stop();
    stopListening();
    setActiveAgent(null);
    setStatus('idle');
    setTranscript('');
    setError(null);
    playBeep(400, 0.2);
  };

  const handleTestAudio = (gender: 'male' | 'female') => {
    log(`Testing ${gender} voice...`);
    playBeep(600, 0.2);
    setTimeout(() => getTTS().test(gender), 300);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 border border-slate-700">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative rounded-full h-2 w-2 bg-green-400"></span>
          </span>
          24/7 {isBn ? 'সক্রিয়' : 'Active'}
        </div>

        <h3 className="text-2xl font-black text-white mb-2">
          {isBn ? 'AI স্বাস্থ্য সহকারী' : 'AI Health Assistant'}
        </h3>
        <p className="text-slate-400 text-sm">
          {isBn ? 'বাংলায় কথা বলুন, স্বাস্থ্য পরামর্শ নিন' : 'Speak in Bangla'}
        </p>

        {!hasValidApiKey && (
          <div className="mt-4 bg-amber-500/20 text-amber-400 px-4 py-2 rounded-lg text-sm">
            API Key প্রয়োজন
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <VoiceCard
          name="স্বাস্থ্য"
          gender="male"
          status={activeAgent === 'male' ? status : 'idle'}
          isActive={activeAgent === 'male'}
          transcript={activeAgent === 'male' ? transcript : ''}
          error={activeAgent === 'male' ? error : null}
          onStart={() => handleStart('male')}
          onStop={handleStop}
        />
        <VoiceCard
          name="সেবা"
          gender="female"
          status={activeAgent === 'female' ? status : 'idle'}
          isActive={activeAgent === 'female'}
          transcript={activeAgent === 'female' ? transcript : ''}
          error={activeAgent === 'female' ? error : null}
          onStart={() => handleStart('female')}
          onStop={handleStop}
        />
      </div>

      <div className="mt-6 flex justify-center gap-4">
        <button onClick={() => handleTestAudio('male')} className="text-slate-500 text-xs hover:text-blue-400">
          🔊 {isBn ? 'পুরুষ কণ্ঠ টেস্ট' : 'Test Male'}
        </button>
        <button onClick={() => handleTestAudio('female')} className="text-slate-500 text-xs hover:text-pink-400">
          🔊 {isBn ? 'মহিলা কণ্ঠ টেস্ট' : 'Test Female'}
        </button>
      </div>

      <p className="text-center text-slate-500 text-xs mt-4">
        <i className="fas fa-info-circle mr-1"></i>
        {isBn ? 'Chrome/Edge এ সবচেয়ে ভালো কাজ করে' : 'Works best in Chrome/Edge'}
      </p>
    </div>
  );
};

export default HomeVoiceSection;
