import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { GoogleGenAI } from '@google/genai';
import { MOCK_DOCTORS } from '../data/mockData';

// ============ CONFIGURATION ============
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const hasValidApiKey = GEMINI_API_KEY && GEMINI_API_KEY.length > 10;

const log = (...args: any[]) => console.log('[Voice]', ...args);

// ============ SIMPLE TEXT-TO-SPEECH ============
function speak(text: string, onEnd?: () => void): void {
  // Clean the text - remove emojis and special characters
  const cleanText = text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // symbols
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // transport
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // misc
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // dingbats
    .replace(/[📢📋👨‍⚕️🚨💬🎭]/g, '')        // specific emojis
    .replace(/[!?।]+/g, '।')               // normalize punctuation
    .trim();

  if (!cleanText) {
    onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'bn-BD';
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  
  // Try to find a good voice
  const voices = window.speechSynthesis.getVoices();
  const bengaliVoice = voices.find(v => v.lang.includes('bn') || v.lang.includes('hi'));
  if (bengaliVoice) utterance.voice = bengaliVoice;
  
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  
  log('Speaking:', cleanText.substring(0, 50));
  window.speechSynthesis.speak(utterance);
}

function stopSpeaking(): void {
  window.speechSynthesis.cancel();
}

// ============ SIMPLE SPEECH RECOGNITION ============
let recognition: any = null;

function initRecognition(): boolean {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return false;
  
  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'bn-BD';
  return true;
}

function startListening(onResult: (text: string) => void, onError?: () => void): void {
  if (!recognition) {
    if (!initRecognition()) {
      onError?.();
      return;
    }
  }
  
  recognition.onresult = (e: any) => {
    const text = e.results[0][0].transcript;
    log('Heard:', text);
    onResult(text);
  };
  
  recognition.onerror = (e: any) => {
    log('Recognition error:', e.error);
    onError?.();
  };
  
  recognition.onend = () => {
    log('Recognition ended');
  };
  
  try {
    recognition.start();
    log('Listening started');
  } catch (e) {
    log('Failed to start listening');
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
  
  const prompt = `তুমি ${agentName}, নির্ণয় হেলথ এর বাংলা AI সহকারী।

নিয়ম:
- শুধু বাংলায় উত্তর দাও
- ছোট উত্তর দাও, ১-২ বাক্যে
- বিনয়ী হও
- ইমোজি ব্যবহার করো না

ডাক্তার: ${doctors}

প্রশ্ন: ${question}

উত্তর:`;

  try {
    const result = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    
    let response = result.text || 'দুঃখিত, বুঝতে পারিনি।';
    
    // Clean response
    response = response
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
      .replace(/[*#_~`]/g, '')
      .trim();
    
    log('Gemini response:', response);
    return response;
  } catch (e: any) {
    log('Gemini error:', e.message);
    return 'দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না। একটু পরে চেষ্টা করুন।';
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
    greeting: isBn ? 'শুভেচ্ছা জানাচ্ছে...' : 'Greeting...',
    listening: isBn ? 'শুনছি... বলুন' : 'Listening...',
    thinking: isBn ? 'চিন্তা করছি...' : 'Thinking...',
    speaking: isBn ? 'বলছে...' : 'Speaking...',
    error: error || (isBn ? 'সমস্যা হয়েছে' : 'Error'),
  };

  const bgColor = gender === 'male' ? 'from-blue-500 to-indigo-600' : 'from-pink-500 to-rose-600';

  return (
    <div className={`bg-white rounded-2xl p-6 border-2 transition-all ${
      isActive ? 'border-blue-500 shadow-xl' : 'border-slate-200 hover:border-slate-300'
    }`}>
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${bgColor} flex items-center justify-center`}>
          <span className="text-white text-2xl font-bold">{name.charAt(0)}</span>
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
                <div
                  key={i}
                  className={`w-1.5 rounded-full ${
                    status === 'listening' ? 'bg-green-500' : 'bg-purple-500'
                  }`}
                  style={{
                    height: `${15 + Math.random() * 20}px`,
                    animation: `pulse ${0.4 + i * 0.1}s ease-in-out infinite alternate`
                  }}
                />
              ))}
            </div>
          )}

          {status === 'thinking' && (
            <div className="flex justify-center gap-2 h-12 items-center bg-slate-50 rounded-xl">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
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
            hasValidApiKey
              ? `bg-gradient-to-r ${bgColor} text-white hover:opacity-90`
              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
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

  // Initialize Gemini client
  useEffect(() => {
    if (hasValidApiKey) {
      clientRef.current = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      log('Gemini client ready');
    }
    
    // Load voices
    window.speechSynthesis.getVoices();
    
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, []);

  // Handle conversation flow
  const processUserInput = useCallback(async (text: string, agentName: string) => {
    if (!clientRef.current || !isActiveRef.current) return;

    setTranscript(`আপনি: ${text}`);
    setStatus('thinking');

    const response = await askGemini(clientRef.current, text, agentName);
    
    if (!isActiveRef.current) return;

    setTranscript(`${agentName}: ${response}`);
    setStatus('speaking');

    speak(response, () => {
      if (isActiveRef.current) {
        setStatus('listening');
        setTranscript('');
        startListening(
          (newText) => processUserInput(newText, agentName),
          () => {
            if (isActiveRef.current) {
              setError('মাইক সমস্যা। আবার চেষ্টা করুন।');
              setStatus('error');
            }
          }
        );
      }
    });
  }, []);

  // Start conversation
  const handleStart = (gender: 'male' | 'female') => {
    if (!hasValidApiKey) return;

    // Reset state
    stopSpeaking();
    stopListening();
    
    setActiveAgent(gender);
    setStatus('greeting');
    setError(null);
    setTranscript('');
    isActiveRef.current = true;

    const agentName = gender === 'male' ? 'স্বাস্থ্য' : 'সেবা';
    const greeting = `আসসালামু আলাইকুম। আমি ${agentName}। আপনার স্বাস্থ্য বিষয়ে কীভাবে সাহায্য করতে পারি?`;

    setTranscript(`${agentName}: ${greeting}`);

    speak(greeting, () => {
      if (isActiveRef.current) {
        setStatus('listening');
        setTranscript('');
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
  };

  // Stop conversation
  const handleStop = () => {
    isActiveRef.current = false;
    stopSpeaking();
    stopListening();
    setActiveAgent(null);
    setStatus('idle');
    setTranscript('');
    setError(null);
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
          {isBn ? 'বাংলায় কথা বলুন, স্বাস্থ্য পরামর্শ নিন' : 'Speak in Bangla, get health advice'}
        </p>

        {!hasValidApiKey && (
          <div className="mt-4 bg-amber-500/20 text-amber-400 px-4 py-2 rounded-lg text-sm">
            <i className="fas fa-exclamation-triangle mr-2"></i>
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

      <p className="text-center text-slate-500 text-xs mt-6">
        <i className="fas fa-shield-alt mr-1"></i>
        {isBn ? 'Chrome/Edge ব্রাউজারে ভালো কাজ করে' : 'Works best in Chrome/Edge'}
      </p>
    </div>
  );
};

export default HomeVoiceSection;
