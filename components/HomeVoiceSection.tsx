
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

// --- Build comprehensive Bangladeshi Bangla system prompt ---
function buildSystemPrompt(
  agentNameBn: string,
  agentNameEn: string,
  isLoggedIn: boolean,
  today: string,
  doctorList: string
): string {
  return `
## আপনার পরিচয় (Identity)
আপনি "${agentNameBn}" (${agentNameEn}), "নির্ণয় কেয়ার" (Nirnoy Care) এর অফিসিয়াল AI ভয়েস এসিস্ট্যান্ট।

## ভাষা নির্দেশনা (CRITICAL - MUST FOLLOW)
আপনাকে অবশ্যই **বাংলাদেশী বাংলা** তে কথা বলতে হবে। কলকাতার বাংলা বা পশ্চিমবঙ্গের স্টাইল একদম চলবে না।

### যা বলবেন (Bangladeshi Style):
- "জি" (Ji) - হ্যাঁ বোঝাতে
- "আপনি" - সম্মানসূচক
- "ভাই/ভাইয়া" বা "আপা" - সম্বোধনে
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
1. **তথ্য দেওয়া**: নির্ণয় কেয়ার সম্পর্কে - আমরা ডাক্তার অ্যাপয়েন্টমেন্ট সহজ করি, হেলথ রেকর্ড ম্যানেজ করি, waiting time কমাই।
2. **ডাক্তার খোঁজা**: স্পেশালিটি বা নাম দিয়ে ডাক্তার খুঁজে দেওয়া।
3. **বুকিং করা**: ${isLoggedIn ? 'ইউজার লগইন আছে, বুকিং করতে পারবেন।' : 'গেস্ট ইউজার - শুধু তথ্য দিতে পারবেন, বুকিং করতে লগইন লাগবে।'}
4. **সিরিয়াল/কিউ তথ্য**: লাইভ কিউ স্ট্যাটাস জানানো।
5. **ফি ও সময়সূচী**: ডাক্তারের ফি, চেম্বারের সময় জানানো।

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
### গেস্ট ইউজারের জন্য:
- বুকিং করতে চাইলে বলুন: "ভাই/আপা, বুকিং করতে হলে আগে লগইন করতে হবে। ওয়েবসাইটে গিয়ে সাইন আপ করে নেন, তারপর আবার কল দেন।"
- তথ্য দিতে পারবেন, কিন্তু বুকিং করতে পারবেন না।
`}

## নিয়মাবলী (Rules):
1. **সালাম দিয়ে শুরু**: "আসসালামু আলাইকুম! নির্ণয় কেয়ারে স্বাগতম। আমি ${agentNameBn}। কীভাবে সাহায্য করতে পারি?"
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
      setStatus("Connecting...");

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
      
      // Simplified doctor list for prompt context
      const doctorList = MOCK_DOCTORS.slice(0, 15).map(d => 
        `${d.name} (${d.specialties[0]}) at ${d.chambers[0]?.name}, Fee: ৳${d.chambers[0]?.fee}`
      ).join('; ');

      const voiceName = agentType === 'male' ? 'Fenrir' : 'Kore'; // Fenrir = Deep/Male, Kore = Clear/Female
      const agentNameBn = agentType === 'male' ? 'ইউনুস' : 'আরিশা';
      const agentNameEn = agentType === 'male' ? 'Yunus' : 'Arisha';

      setStatus("Connecting to AI...");

      // Build system prompt with proper Bangladeshi Bangla instructions
      const systemPrompt = buildSystemPrompt(agentNameBn, agentNameEn, isLoggedIn, today, doctorList);

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
            setStatus("Disconnected");
            cleanup();
          },
          onerror: (e) => {
            console.error("Gemini Live Error:", e);
            setError("Connection interrupted. Please try again.");
            setStatus("Error");
            cleanup();
          }
        }
      });

      sessionPromiseRef.current = sessionPromise;
      
      // Handle connection errors immediately
      sessionPromise.catch(err => {
          console.error("Connection Failed:", err);
          setError("Failed to connect to Voice Service. Network or API error.");
          cleanup();
      });

    } catch (err) {
      console.error("Session Start Error:", err);
      setError("Could not access microphone. Please check permissions.");
      cleanup();
    }
  };

  return (
    <section className="py-20 bg-gradient-to-b from-white to-teal-50/30 border-t border-slate-100 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-10 left-10 w-64 h-64 bg-blue-400/5 rounded-full blur-3xl"></div>
         <div className="absolute bottom-10 right-10 w-64 h-64 bg-teal-400/5 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 text-center relative z-10">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-600 text-xs font-bold uppercase tracking-wider mb-4 animate-pulse">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div> Live Beta
          </div>
          <h2 className="text-4xl font-bold text-slate-800 mb-4">বাংলায় কথা বলুন</h2>
          <p className="text-slate-500 max-w-xl mx-auto text-lg">
            আমাদের AI এসিস্ট্যান্টের সাথে <strong>বাংলায়</strong> কথা বলুন। ডাক্তার খুঁজুন, অ্যাপয়েন্টমেন্ট বুক করুন, প্রশ্ন করুন।
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-center gap-2 animate-fade-in">
             <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          {/* --- Yunus (Male) Card --- */}
          <div className={`relative bg-white rounded-3xl p-8 shadow-xl border-2 transition-all duration-500 ${activeAgent === 'male' ? 'border-teal-500 ring-4 ring-teal-500/10 scale-105 z-10' : 'border-slate-100 hover:border-teal-200'}`}>
             <div className="absolute top-4 right-4">
                {activeAgent === 'male' && (
                    <span className="flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                )}
             </div>
             
             <div className="w-28 h-28 mx-auto bg-gradient-to-br from-blue-50 to-teal-50 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-lg relative">
                <i className="fas fa-user-tie text-5xl text-teal-700"></i>
                {activeAgent === 'male' && isAgentSpeaking && (
                    <div className="absolute inset-0 rounded-full border-2 border-teal-500 animate-ping opacity-20"></div>
                )}
             </div>
             
             <h3 className="text-2xl font-bold text-slate-800">ইউনুস</h3>
             <p className="text-slate-400 text-sm mb-8 font-medium">পুরুষ • বুকিং ও সাপোর্ট</p>

             {activeAgent === 'male' ? (
                <div className="space-y-6">
                   {/* Audio Visualizer */}
                   <div className="h-16 bg-slate-50 rounded-2xl flex items-center justify-center gap-1.5 border border-slate-100 overflow-hidden px-4">
                      {[...Array(8)].map((_, i) => (
                        <div 
                           key={i} 
                           className={`w-1.5 rounded-full transition-all duration-75 ${isAgentSpeaking ? 'bg-teal-500' : 'bg-slate-300'}`} 
                           style={{ 
                               height: isAgentSpeaking 
                                  ? `${Math.max(20, Math.random() * 50)}%` 
                                  : `${Math.max(15, volume * Math.random() * 100)}%` 
                           }}
                        ></div>
                      ))}
                   </div>
                   
                   <div className="flex items-center justify-center gap-2 text-teal-600 font-bold animate-pulse">
                      <i className={isAgentSpeaking ? "fas fa-volume-up" : "fas fa-microphone"}></i>
                      {status}
                   </div>
                   
                   <button onClick={cleanup} className="w-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 px-8 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2">
                     <i className="fas fa-phone-slash"></i> কল শেষ করুন
                   </button>
                </div>
             ) : (
                <button 
                  onClick={() => startSession('male')} 
                  disabled={!!activeAgent}
                  className="w-full bg-slate-900 text-white hover:bg-teal-600 px-8 py-4 rounded-xl font-bold transition shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <span className="group-hover:hidden"><i className="fas fa-phone mr-2"></i> কানেক্ট করুন</span>
                  <span className="hidden group-hover:inline"><i className="fas fa-microphone mr-2"></i> বাংলায় কথা বলুন</span>
                </button>
             )}
          </div>

          {/* --- Arisha (Female) Card --- */}
          <div className={`relative bg-white rounded-3xl p-8 shadow-xl border-2 transition-all duration-500 ${activeAgent === 'female' ? 'border-purple-500 ring-4 ring-purple-500/10 scale-105 z-10' : 'border-slate-100 hover:border-purple-200'}`}>
             <div className="absolute top-4 right-4">
                {activeAgent === 'female' && (
                    <span className="flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                )}
             </div>
             
             <div className="w-28 h-28 mx-auto bg-gradient-to-br from-purple-50 to-pink-50 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-lg relative">
                <i className="fas fa-user-nurse text-5xl text-purple-700"></i>
                {activeAgent === 'female' && isAgentSpeaking && (
                    <div className="absolute inset-0 rounded-full border-2 border-purple-500 animate-ping opacity-20"></div>
                )}
             </div>
             
             <h3 className="text-2xl font-bold text-slate-800">আরিশা</h3>
             <p className="text-slate-400 text-sm mb-8 font-medium">মহিলা • সাধারণ জিজ্ঞাসা</p>

             {activeAgent === 'female' ? (
                <div className="space-y-6">
                   {/* Audio Visualizer */}
                   <div className="h-16 bg-slate-50 rounded-2xl flex items-center justify-center gap-1.5 border border-slate-100 overflow-hidden px-4">
                      {[...Array(8)].map((_, i) => (
                        <div 
                           key={i} 
                           className={`w-1.5 rounded-full transition-all duration-75 ${isAgentSpeaking ? 'bg-purple-500' : 'bg-slate-300'}`} 
                           style={{ 
                               height: isAgentSpeaking 
                                  ? `${Math.max(20, Math.random() * 50)}%` 
                                  : `${Math.max(15, volume * Math.random() * 100)}%` 
                           }}
                        ></div>
                      ))}
                   </div>
                   
                   <div className="flex items-center justify-center gap-2 text-purple-600 font-bold animate-pulse">
                      <i className={isAgentSpeaking ? "fas fa-volume-up" : "fas fa-microphone"}></i>
                      {status}
                   </div>
                   
                   <button onClick={cleanup} className="w-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 px-8 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2">
                     <i className="fas fa-phone-slash"></i> কল শেষ করুন
                   </button>
                </div>
             ) : (
                <button 
                  onClick={() => startSession('female')} 
                  disabled={!!activeAgent}
                  className="w-full bg-slate-900 text-white hover:bg-purple-600 px-8 py-4 rounded-xl font-bold transition shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <span className="group-hover:hidden"><i className="fas fa-phone mr-2"></i> কানেক্ট করুন</span>
                  <span className="hidden group-hover:inline"><i className="fas fa-microphone mr-2"></i> বাংলায় কথা বলুন</span>
                </button>
             )}
          </div>
        </div>
        
        <div className="mt-12 flex items-center justify-center gap-2 text-slate-400 text-xs">
           <i className="fas fa-lock"></i>
           <span>নিরাপদ ও গোপনীয় • Powered by Gemini Live</span>
        </div>
      </div>
    </section>
  );
};
