import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { useNavigate } from 'react-router-dom';
import { MOCK_DOCTORS } from '../data/mockData';

// --- Audio Helpers ---

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return {
    data: btoa(binary),
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

// --- Get Time-Based Greeting ---
function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'সুপ্রভাত';
  if (hour >= 12 && hour < 17) return 'শুভ দুপুর';
  if (hour >= 17 && hour < 20) return 'শুভ সন্ধ্যা';
  return 'শুভ রাত্রি';
}

// --- Build comprehensive Bangladeshi Bangla system prompt ---
function buildSystemPrompt(
  agentNumber: number,
  isLoggedIn: boolean,
  today: string,
  doctorList: string,
  greeting: string
): string {
  return `
## আপনার পরিচয় (Identity)
আপনি "Nirnoy ${agentNumber}", "নির্ণয় কেয়ার" (Nirnoy Care) এর অফিসিয়াল AI ভয়েস এসিস্ট্যান্ট।

## ভাষা নির্দেশনা (CRITICAL - MUST FOLLOW)
আপনাকে অবশ্যই **খাঁটি বাংলাদেশী বাংলা** তে কথা বলতে হবে। কলকাতার বাংলা বা পশ্চিমবঙ্গের স্টাইল একদম চলবে না।

### সালাম ও অভিবাদন (GREETING - MUST START WITH):
কল শুরু করতেই প্রথমে বলুন: "আসসালামু আলাইকুম! ${greeting}! নির্ণয় কেয়ারে স্বাগতম। আমি Nirnoy ${agentNumber}। কীভাবে সাহায্য করতে পারি?"

### যা বলবেন (Bangladeshi Style):
- "জি" (Ji) - হ্যাঁ বোঝাতে
- "আপনি" - সম্মানসূচক
- "ভাই/ভাইয়া" বা "আপা" - সম্বোধনে (যথাযথ হলে)
- "কেমন আছেন?" - হালচাল জিজ্ঞেস করতে
- "আচ্ছা" - বোঝা গেছে বোঝাতে
- "ঠিক আছে" - okay বোঝাতে
- "একটু" - a little
- "এখন" - now
- "কইরা দিচ্ছি" / "করে দিচ্ছি" - doing it
- "হইছে" / "হয়েছে" - done
- "লাগবে" - will need
- "পারবেন" - can you
- "দেখেন" - see/look
- "বলেন" - tell me
- "কী সমস্যা?" - what's the problem?
- "ডাক্তার সাহেব" / "ডাক্তার আপা" - addressing doctors

### যা বলবেন না (AVOID - Kolkata/West Bengal Style):
- "দাদা" ❌ (use "ভাই" instead)
- "দিদি" ❌ (use "আপা" instead)  
- "হ্যাঁ গো" ❌
- "কি খবর" ❌ (use "কেমন আছেন" instead)
- "এক্ষুনি" ❌ (use "এখনই" instead)
- "বেশ" ❌ (use "ঠিক আছে" instead)
- "তফাৎ" ❌
- Overly Sanskritized/formal words ❌

### উচ্চারণ ও টোন:
- ঢাকাইয়া/স্ট্যান্ডার্ড বাংলাদেশী উচ্চারণ
- উষ্ণ, বন্ধুত্বপূর্ণ কিন্তু প্রফেশনাল
- ধীরে ধীরে, স্পষ্ট করে বলুন

## প্রসঙ্গ (Context)
- আজকের তারিখ: ${today}
- ইউজার স্ট্যাটাস: ${isLoggedIn ? 'লগইন করা আছে (LOGGED_IN)' : 'গেস্ট ইউজার (GUEST)'}

## ডাক্তার ডাটাবেজ (Available Doctors):
${doctorList}

## আপনার ক্ষমতা (Capabilities):
1. **নির্ণয় সম্পর্কে তথ্য**: আমরা ডাক্তার অ্যাপয়েন্টমেন্ট সহজ করি, হেলথ রেকর্ড ম্যানেজ করি, waiting time কমাই।
2. **ডাক্তার খোঁজা**: স্পেশালিটি বা নাম দিয়ে ডাক্তার খুঁজে দেওয়া।
3. **অ্যাপয়েন্টমেন্ট বুকিং**: ${isLoggedIn ? 'ইউজার লগইন আছে, সরাসরি বুকিং করতে পারবেন।' : 'গেস্ট ইউজার - OTP দিয়ে ভেরিফাই করে বুকিং করতে পারবেন।'}
4. **লাইভ কিউ তথ্য**: সিরিয়াল ও ওয়েটিং টাইম জানানো।
5. **ফি ও সময়সূচী**: ডাক্তারের ফি, চেম্বারের সময় জানানো।
6. **প্রাথমিক স্বাস্থ্য তথ্য**: সাধারণ প্রশ্নের উত্তর দেওয়া (কিন্তু ডায়াগনোসিস না)।

## বুকিং প্রসেস (Booking Flow):
${isLoggedIn ? `
### লগইন ইউজারের জন্য:
1. প্রথমে জিজ্ঞেস করুন: "কোন ধরনের ডাক্তার দরকার?" বা "কী সমস্যা?"
2. ডাক্তার সাজেস্ট করুন ডাটাবেজ থেকে
3. ইউজার সিলেক্ট করলে জিজ্ঞেস করুন: "রোগীর নাম কী?" 
4. তারপর: "কবে দেখাতে চান? আজকে নাকি অন্য কোনো দিন?"
5. কনফার্ম করুন: "ঠিক আছে, [ডাক্তারের নাম] এর কাছে [তারিখ] এ অ্যাপয়েন্টমেন্ট বুক করে দিচ্ছি। ফি হবে [amount] টাকা।"
6. শেষে: "আপনার সিরিয়াল নম্বর হইছে [number]। ধন্যবাদ!"
` : `
### গেস্ট ইউজারের জন্য (OTP দিয়ে বুকিং):
1. প্রথমে বলুন: "বুকিং করতে আপনার মোবাইল নম্বর দরকার হবে।"
2. মোবাইল নম্বর নিন: "আপনার মোবাইল নম্বরটা বলেন প্লিজ?"
3. নম্বর পেলে বলুন: "ঠিক আছে, আপনার নম্বরে একটা OTP পাঠাচ্ছি। কয়েক সেকেন্ড অপেক্ষা করুন।"
4. OTP ভেরিফাই করুন: "OTP টা বলেন প্লিজ?"
5. ভেরিফাই হলে বুকিং করুন এবং বলুন: "অ্যাকাউন্ট তৈরি হয়ে গেছে! এখন বুকিং করে দিচ্ছি।"
`}

## নিয়মাবলী (Rules):
1. **সালাম দিয়ে শুরু**: কল শুরু হলেই "আসসালামু আলাইকুম! ${greeting}! নির্ণয় কেয়ারে স্বাগতম। আমি Nirnoy ${agentNumber}। কীভাবে সাহায্য করতে পারি?"
2. **ছোট উত্তর**: ১-২ বাক্যে উত্তর দিন, যাতে স্বাভাবিক কথোপকথন হয়।
3. **বুঝতে না পারলে**: "একটু আবার বলবেন প্লিজ?" বা "সরি, ঠিক বুঝতে পারলাম না।"
4. **ইমার্জেন্সি**: বুকে ব্যথা, শ্বাসকষ্ট, বা জরুরি অবস্থা বললে - "এটা ইমার্জেন্সি মনে হচ্ছে! এখনই নিকটস্থ হাসপাতালে যান বা 999 এ কল করুন।"
5. **শেষ করতে**: "আর কিছু লাগবে?" জিজ্ঞেস করুন। শেষে "আল্লাহ হাফেজ" বা "ধন্যবাদ, ভালো থাকবেন" বলুন।

## উদাহরণ কথোপকথন:
User: "আমার জ্বর হইছে"
You: "জ্বর কতদিন ধরে? আর কোনো সমস্যা আছে - যেমন সর্দি, কাশি, মাথা ব্যথা?"

User: "হার্টের ডাক্তার দেখাতে চাই"
You: "জি, আমাদের কাছে কয়েকজন ভালো হার্ট স্পেশালিস্ট আছেন। Dr. Ahmed Hossain আছেন Mirpur General Hospital এ, ফি ৬০০ টাকা। বুক করে দেব?"

User: "ফি কত?"
You: "কোন ডাক্তারের ফি জানতে চাচ্ছেন? নাম বা স্পেশালিটি বলেন।"

User: "নির্ণয় কী?"
You: "নির্ণয় হলো বাংলাদেশের জন্য তৈরি একটা হেলথকেয়ার প্ল্যাটফর্ম। এখানে আপনি সেরা ডাক্তারদের খুঁজে পাবেন, অ্যাপয়েন্টমেন্ট বুক করতে পারবেন, আর আপনার সব হেলথ রেকর্ড এক জায়গায় রাখতে পারবেন।"
`;
}

export const HomeVoiceSection: React.FC = () => {
  const navigate = useNavigate();
  const [activeAgent, setActiveAgent] = useState<1 | 2 | null>(null);
  const [status, setStatus] = useState('Ready');
  const [volume, setVolume] = useState(0);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aiRef = useRef<GoogleGenAI | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const isConnectedRef = useRef(false);
  
  // Audio Contexts
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  
  // Playback Queue
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    if (process.env.API_KEY) {
      aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return () => cleanup();
  }, []);

  const cleanup = () => {
    isConnectedRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch(e) {}
      processorRef.current = null;
    }
    if (inputContextRef.current) {
        if (inputContextRef.current.state !== 'closed') {
            try { inputContextRef.current.close(); } catch(e) {}
        }
        inputContextRef.current = null;
    }
    if (outputContextRef.current) {
        if (outputContextRef.current.state !== 'closed') {
            try { outputContextRef.current.close(); } catch(e) {}
        }
        outputContextRef.current = null;
    }
    
    sourcesRef.current.forEach(s => {
      try { s.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    
    setActiveAgent(null);
    setIsAgentSpeaking(false);
    setVolume(0);
    setStatus('Ready');
    nextStartTimeRef.current = 0;
  };

  const startSession = async (agentNumber: 1 | 2) => {
    if (!aiRef.current) {
      setError("Missing API Key. Voice feature unavailable.");
      return;
    }
    
    try {
      // 1. Reset State safely
      cleanup();
      setError(null);
      setActiveAgent(agentNumber);
      setStatus("কানেক্ট হচ্ছে...");

      // 2. Initialize Audio Contexts (Must be after user gesture)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      
      inputContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      outputContextRef.current = new AudioContextClass({ sampleRate: 24000 });

      // Explicitly resume contexts (crucial for browser autoplay policies)
      try {
        await inputContextRef.current.resume();
        await outputContextRef.current.resume();
      } catch (e) {
        console.warn("AudioContext resume failed", e);
      }
      
      // 3. Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 4. Prepare Context Data
      const isLoggedIn = !!localStorage.getItem('nirnoy_role');
      const today = new Date().toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const greeting = getTimeBasedGreeting();
      
      // Simplified doctor list for prompt context
      const doctorList = MOCK_DOCTORS.slice(0, 15).map(d => 
        `${d.name} (${d.specialties[0]}) at ${d.chambers[0]?.name}, Fee: ৳${d.chambers[0]?.fee}`
      ).join('; ');

      // Both agents use same voice for consistency - just different number
      const voiceName = agentNumber === 1 ? 'Fenrir' : 'Kore';

      setStatus("AI সাথে কানেক্ট হচ্ছে...");

      // Build system prompt
      const systemPrompt = buildSystemPrompt(agentNumber, isLoggedIn, today, doctorList, greeting);

      // 5. Connect to Gemini Live
      const sessionPromise = aiRef.current.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemPrompt,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
          },
        },
        callbacks: {
          onopen: () => {
            isConnectedRef.current = true;
            setStatus("কথা বলুন...");
            
            if (!inputContextRef.current) return;

            // Setup Audio Pipeline
            const source = inputContextRef.current.createMediaStreamSource(stream);
            const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              if (!isConnectedRef.current) return;
              
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Volume visualization
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum/inputData.length);
              setVolume(Math.min(1, rms * 5));

              // Send to API
              const pcmBlob = createBlob(inputData);
              sessionPromiseRef.current?.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              }).catch(err => {
                  console.debug("Send Error:", err);
              });
            };

            source.connect(processor);
            processor.connect(inputContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
             // Handle Audio Output
             const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
             if (base64Audio && outputContextRef.current) {
                setIsAgentSpeaking(true);
                const ctx = outputContextRef.current;
                
                if (nextStartTimeRef.current < ctx.currentTime) {
                    nextStartTimeRef.current = ctx.currentTime;
                }
                
                try {
                    const audioBuffer = await decodeAudioData(
                    decode(base64Audio),
                    ctx,
                    24000,
                    1
                    );
                    
                    const source = ctx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(ctx.destination);
                    
                    source.onended = () => {
                        sourcesRef.current.delete(source);
                        if (sourcesRef.current.size === 0) {
                            setIsAgentSpeaking(false);
                        }
                    };

                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += audioBuffer.duration;
                    sourcesRef.current.add(source);
                } catch (e) {
                    console.error("Audio Decode Error", e);
                }
             }
             
             // Handle Interruption
             if (message.serverContent?.interrupted) {
                console.log("Interrupted by user");
                sourcesRef.current.forEach(s => {
                    try { s.stop(); } catch (e) {}
                });
                sourcesRef.current.clear();
                if (outputContextRef.current) {
                    nextStartTimeRef.current = outputContextRef.current.currentTime;
                }
                setIsAgentSpeaking(false);
             }
          },
          onclose: () => {
            setStatus("সংযোগ বিচ্ছিন্ন");
            cleanup();
          },
          onerror: (e) => {
            console.error("Gemini Live Error:", e);
            setError("সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
            setStatus("Error");
            cleanup();
          }
        }
      });

      sessionPromiseRef.current = sessionPromise;
      
      // Handle connection errors immediately
      sessionPromise.catch(err => {
          console.error("Connection Failed:", err);
          setError("ভয়েস সার্ভিসে কানেক্ট করা যাচ্ছে না।");
          cleanup();
      });

    } catch (err) {
      console.error("Session Start Error:", err);
      setError("মাইক্রোফোন এক্সেস করা যাচ্ছে না। পারমিশন চেক করুন।");
      cleanup();
    }
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

        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center justify-center gap-2">
             <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}

        {/* Voice Agent Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          
          {/* Nirnoy 1 */}
          <div className={`relative bg-white rounded-2xl p-6 border-2 transition-all duration-300 ${
            activeAgent === 1 
              ? 'border-blue-500 shadow-xl shadow-blue-500/10' 
              : activeAgent === 2 
                ? 'border-slate-100 opacity-50' 
                : 'border-slate-200 hover:border-blue-300 hover:shadow-lg'
          }`}>
            {activeAgent === 1 && (
              <div className="absolute top-3 right-3">
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              </div>
            )}
            
            <div className="w-20 h-20 mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-blue-100 rounded-full"></div>
              <div className="absolute inset-1 bg-white rounded-full flex items-center justify-center">
                <i className="fas fa-headset text-3xl text-blue-500"></i>
              </div>
              {activeAgent === 1 && isAgentSpeaking && (
                <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-30"></div>
              )}
            </div>
             
            <h3 className="text-lg font-bold text-slate-800 text-center mb-1">Nirnoy 1</h3>
            <p className="text-sm text-slate-500 text-center mb-6">AI স্বাস্থ্য সহায়ক</p>

            {activeAgent === 1 ? (
              <div className="space-y-4">
                <div className="h-12 bg-slate-50 rounded-xl flex items-center justify-center gap-1 px-4">
                  {[...Array(6)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-1 rounded-full transition-all duration-75 ${isAgentSpeaking ? 'bg-blue-500' : 'bg-slate-300'}`}
                      style={{ height: isAgentSpeaking ? `${Math.max(20, Math.random() * 100)}%` : `${Math.max(15, volume * Math.random() * 100)}%` }}
                    ></div>
                  ))}
                </div>
                 
                <p className="text-center text-sm text-blue-600 font-medium animate-pulse">
                  <i className={isAgentSpeaking ? "fas fa-volume-up mr-2" : "fas fa-microphone mr-2"}></i>
                  {status}
                </p>
                 
                <button onClick={cleanup} className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition flex items-center justify-center gap-2">
                  <i className="fas fa-phone-slash"></i> শেষ করুন
                </button>
              </div>
            ) : (
              <button 
                onClick={() => startSession(1)} 
                disabled={activeAgent === 2}
                className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition flex items-center justify-center gap-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                <i className="fas fa-phone"></i> কথা বলুন
              </button>
            )}
          </div>

          {/* Nirnoy 2 */}
          <div className={`relative bg-white rounded-2xl p-6 border-2 transition-all duration-300 ${
            activeAgent === 2 
              ? 'border-slate-800 shadow-xl shadow-slate-800/10' 
              : activeAgent === 1 
                ? 'border-slate-100 opacity-50' 
                : 'border-slate-200 hover:border-slate-400 hover:shadow-lg'
          }`}>
            {activeAgent === 2 && (
              <div className="absolute top-3 right-3">
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              </div>
            )}
             
            <div className="w-20 h-20 mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-slate-100 rounded-full"></div>
              <div className="absolute inset-1 bg-white rounded-full flex items-center justify-center">
                <i className="fas fa-headset text-3xl text-slate-600"></i>
              </div>
              {activeAgent === 2 && isAgentSpeaking && (
                <div className="absolute inset-0 rounded-full border-2 border-slate-600 animate-ping opacity-30"></div>
              )}
            </div>
             
            <h3 className="text-lg font-bold text-slate-800 text-center mb-1">Nirnoy 2</h3>
            <p className="text-sm text-slate-500 text-center mb-6">AI স্বাস্থ্য সহায়ক</p>

            {activeAgent === 2 ? (
              <div className="space-y-4">
                <div className="h-12 bg-slate-50 rounded-xl flex items-center justify-center gap-1 px-4">
                  {[...Array(6)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-1 rounded-full transition-all duration-75 ${isAgentSpeaking ? 'bg-slate-600' : 'bg-slate-300'}`}
                      style={{ height: isAgentSpeaking ? `${Math.max(20, Math.random() * 100)}%` : `${Math.max(15, volume * Math.random() * 100)}%` }}
                    ></div>
                  ))}
                </div>
                 
                <p className="text-center text-sm text-slate-600 font-medium animate-pulse">
                  <i className={isAgentSpeaking ? "fas fa-volume-up mr-2" : "fas fa-microphone mr-2"}></i>
                  {status}
                </p>
                 
                <button onClick={cleanup} className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition flex items-center justify-center gap-2">
                  <i className="fas fa-phone-slash"></i> শেষ করুন
                </button>
              </div>
            ) : (
              <button 
                onClick={() => startSession(2)} 
                disabled={activeAgent === 1}
                className="w-full py-3 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-900 transition flex items-center justify-center gap-2 disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                <i className="fas fa-phone"></i> কথা বলুন
              </button>
            )}
          </div>
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
