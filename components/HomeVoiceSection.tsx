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
  agentNameBn: string,
  agentNameEn: string,
  isLoggedIn: boolean,
  today: string,
  doctorList: string,
  greeting: string
): string {
  return `
## আপনার পরিচয় (Identity)
আপনি "${agentNameBn}" (${agentNameEn}), "নির্ণয় কেয়ার" (Nirnoy Care) এর অফিসিয়াল AI ভয়েস এসিস্ট্যান্ট।

## ভাষা নির্দেশনা (CRITICAL - MUST FOLLOW)
আপনাকে অবশ্যই **খাঁটি বাংলাদেশী বাংলা** তে কথা বলতে হবে। কলকাতার বাংলা বা পশ্চিমবঙ্গের স্টাইল একদম চলবে না।

### সালাম ও অভিবাদন (GREETING - MUST START WITH):
কল শুরু করতেই প্রথমে বলুন: "আসসালামু আলাইকুম! ${greeting}! নির্ণয় কেয়ারে স্বাগতম। আমি ${agentNameBn}। কীভাবে সাহায্য করতে পারি?"

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

## আপনার ক্ষমতা (Capabilities - Both Yunus and Arisha have EQUAL capabilities):
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
1. **সালাম দিয়ে শুরু**: কল শুরু হলেই "আসসালামু আলাইকুম! ${greeting}! নির্ণয় কেয়ারে স্বাগতম। আমি ${agentNameBn}। কীভাবে সাহায্য করতে পারি?"
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
  const [activeAgent, setActiveAgent] = useState<'male' | 'female' | null>(null);
  const [status, setStatus] = useState('Ready to connect');
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
    setStatus('Ready to connect');
    nextStartTimeRef.current = 0;
  };

  const startSession = async (agentType: 'male' | 'female') => {
    if (!aiRef.current) {
      setError("Missing API Key. Voice feature unavailable.");
      return;
    }
    
    try {
      // 1. Reset State safely
      cleanup();
      setError(null);
      setActiveAgent(agentType);
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

      // BOTH agents have same voice quality, just different names
      const voiceName = agentType === 'male' ? 'Fenrir' : 'Kore'; // Fenrir = Deep/Male, Kore = Clear/Female
      const agentNameBn = agentType === 'male' ? 'ইউনুস' : 'আরিশা';
      const agentNameEn = agentType === 'male' ? 'Yunus' : 'Arisha';

      setStatus("AI সাথে কানেক্ট হচ্ছে...");

      // Build system prompt with proper Bangladeshi Bangla instructions
      const systemPrompt = buildSystemPrompt(agentNameBn, agentNameEn, isLoggedIn, today, doctorList, greeting);

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
              setVolume(Math.min(1, rms * 5)); // Boost scale for visibility

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
    <section className="py-20 bg-[#0a0a0f] relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500/10 to-purple-500/10 border border-white/10 rounded-full mb-6">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-white/80">Live Voice AI</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">বাংলায় কথা বলুন</h2>
          <p className="text-slate-400 max-w-xl mx-auto text-lg">
            ইউনুস বা আরিশার সাথে কথা বলুন। দুজনেই সমান - শুধু গলার স্বর আলাদা।
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center justify-center gap-2">
             <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}

        {/* Voice Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          
          {/* Yunus (Male) Card */}
          <div className={`relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 border-2 transition-all duration-500 ${
            activeAgent === 'male' 
              ? 'border-teal-500 shadow-2xl shadow-teal-500/20 scale-105' 
              : activeAgent === 'female' 
                ? 'border-slate-700/50 opacity-50' 
                : 'border-slate-700/50 hover:border-teal-500/50'
          }`}>
            {/* Active Indicator */}
            {activeAgent === 'male' && (
              <div className="absolute top-4 right-4">
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              </div>
            )}
            
            {/* Avatar */}
            <div className="w-28 h-28 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 to-cyan-500/10 rounded-full"></div>
              <div className="absolute inset-1 bg-slate-800 rounded-full flex items-center justify-center">
                <i className="fas fa-user text-5xl text-teal-400/80"></i>
              </div>
              {activeAgent === 'male' && isAgentSpeaking && (
                <div className="absolute inset-0 rounded-full border-2 border-teal-400 animate-ping opacity-30"></div>
              )}
            </div>
             
            <h3 className="text-2xl font-bold text-white text-center">ইউনুস</h3>
            <p className="text-slate-500 text-sm text-center mb-8">Yunus • AI Assistant</p>

            {activeAgent === 'male' ? (
              <div className="space-y-6">
                {/* Audio Visualizer */}
                <div className="h-16 bg-slate-900/50 rounded-2xl flex items-center justify-center gap-1.5 border border-slate-700/50 px-4">
                  {[...Array(8)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-1.5 rounded-full transition-all duration-75 ${isAgentSpeaking ? 'bg-teal-400' : 'bg-slate-600'}`} 
                      style={{ 
                        height: isAgentSpeaking 
                          ? `${Math.max(20, Math.random() * 50)}%` 
                          : `${Math.max(15, volume * Math.random() * 100)}%` 
                      }}
                    ></div>
                  ))}
                </div>
                 
                <div className="flex items-center justify-center gap-2 text-teal-400 font-medium">
                  <i className={isAgentSpeaking ? "fas fa-volume-up animate-pulse" : "fas fa-microphone animate-pulse"}></i>
                  {status}
                </div>
                 
                <button onClick={cleanup} className="w-full bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 px-8 py-3 rounded-xl font-medium transition flex items-center justify-center gap-2">
                  <i className="fas fa-phone-slash"></i> কল শেষ করুন
                </button>
              </div>
            ) : (
              <button 
                onClick={() => startSession('male')} 
                disabled={!!activeAgent}
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-8 py-4 rounded-xl font-bold transition shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:shadow-teal-500/30 flex items-center justify-center gap-2"
              >
                <i className="fas fa-phone"></i> কথা বলুন
              </button>
            )}
          </div>

          {/* Arisha (Female) Card */}
          <div className={`relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 border-2 transition-all duration-500 ${
            activeAgent === 'female' 
              ? 'border-purple-500 shadow-2xl shadow-purple-500/20 scale-105' 
              : activeAgent === 'male' 
                ? 'border-slate-700/50 opacity-50' 
                : 'border-slate-700/50 hover:border-purple-500/50'
          }`}>
            {/* Active Indicator */}
            {activeAgent === 'female' && (
              <div className="absolute top-4 right-4">
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              </div>
            )}
             
            {/* Avatar */}
            <div className="w-28 h-28 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-full"></div>
              <div className="absolute inset-1 bg-slate-800 rounded-full flex items-center justify-center">
                <i className="fas fa-user text-5xl text-purple-400/80"></i>
              </div>
              {activeAgent === 'female' && isAgentSpeaking && (
                <div className="absolute inset-0 rounded-full border-2 border-purple-400 animate-ping opacity-30"></div>
              )}
            </div>
             
            <h3 className="text-2xl font-bold text-white text-center">আরিশা</h3>
            <p className="text-slate-500 text-sm text-center mb-8">Arisha • AI Assistant</p>

            {activeAgent === 'female' ? (
              <div className="space-y-6">
                {/* Audio Visualizer */}
                <div className="h-16 bg-slate-900/50 rounded-2xl flex items-center justify-center gap-1.5 border border-slate-700/50 px-4">
                  {[...Array(8)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-1.5 rounded-full transition-all duration-75 ${isAgentSpeaking ? 'bg-purple-400' : 'bg-slate-600'}`} 
                      style={{ 
                        height: isAgentSpeaking 
                          ? `${Math.max(20, Math.random() * 50)}%` 
                          : `${Math.max(15, volume * Math.random() * 100)}%` 
                      }}
                    ></div>
                  ))}
                </div>
                 
                <div className="flex items-center justify-center gap-2 text-purple-400 font-medium">
                  <i className={isAgentSpeaking ? "fas fa-volume-up animate-pulse" : "fas fa-microphone animate-pulse"}></i>
                  {status}
                </div>
                 
                <button onClick={cleanup} className="w-full bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 px-8 py-3 rounded-xl font-medium transition flex items-center justify-center gap-2">
                  <i className="fas fa-phone-slash"></i> কল শেষ করুন
                </button>
              </div>
            ) : (
              <button 
                onClick={() => startSession('female')} 
                disabled={!!activeAgent}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-xl font-bold transition shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:shadow-purple-500/30 flex items-center justify-center gap-2"
              >
                <i className="fas fa-phone"></i> কথা বলুন
              </button>
            )}
          </div>
        </div>

        {/* Equal Capabilities Notice */}
        <div className="mt-12 text-center">
          <p className="text-slate-500 text-sm flex items-center justify-center gap-2">
            <i className="fas fa-info-circle"></i>
            দুজনের কাজ একই - ডাক্তার খোঁজা, অ্যাপয়েন্টমেন্ট বুকিং, প্রশ্নের উত্তর। শুধু গলার স্বর আলাদা।
          </p>
        </div>
        
        <div className="mt-8 flex items-center justify-center gap-2 text-slate-600 text-xs">
          <i className="fas fa-lock"></i>
          <span>নিরাপদ ও গোপনীয় • Powered by Gemini Live</span>
        </div>
      </div>
    </section>
  );
};
