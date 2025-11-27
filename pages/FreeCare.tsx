import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { chatWithHealthAssistant } from '../services/geminiService';

// ============ TYPES ============
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// ============ COMPONENT ============
export const FreeCare: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initial greeting
  useEffect(() => {
    const greeting: Message = {
      id: '1',
      role: 'assistant',
      content: isBn 
        ? `আসসালামু আলাইকুম! 👋

আমি নির্ণয় AI - আপনার বিনামূল্যে স্বাস্থ্য সহকারী।

আমি আপনাকে সাহায্য করতে পারি:
• সাধারণ স্বাস্থ্য প্রশ্নের উত্তর দিতে
• লক্ষণ সম্পর্কে তথ্য দিতে
• কোন ধরনের ডাক্তার দেখাবেন সে বিষয়ে পরামর্শ দিতে
• স্বাস্থ্যকর জীবনযাপনের টিপস দিতে

কিভাবে সাহায্য করতে পারি? 🩺`
        : `Hello! 👋

I'm Nirnoy AI - your free health assistant.

I can help you with:
• Answering general health questions
• Providing information about symptoms
• Suggesting what type of doctor to see
• Tips for healthy living

How can I help you today? 🩺`,
      timestamp: Date.now(),
    };
    setMessages([greeting]);
  }, [isBn]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle send message
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build context for free care (no patient data)
      const freeContext = isBn
        ? `এটি নির্ণয় ফ্রি কেয়ার সার্ভিস। ব্যবহারকারী লগইন করেননি। 
           সাধারণ স্বাস্থ্য তথ্য দিন। গুরুতর লক্ষণে ডাক্তার দেখাতে বলুন।
           বাংলায় উত্তর দিন। সংক্ষিপ্ত ও সহজ ভাষায়।`
        : `This is Nirnoy Free Care service. User is not logged in.
           Provide general health information. Advise to see a doctor for serious symptoms.
           Keep responses concise and easy to understand.`;

      const history = messages.slice(-10).map(m => `${m.role}: ${m.content}`);
      const response = await chatWithHealthAssistant(input.trim(), history, freeContext);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: isBn 
          ? 'দুঃখিত, একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।'
          : 'Sorry, something went wrong. Please try again.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick prompts
  const quickPrompts = isBn
    ? [
        'জ্বর ও মাথাব্যথা হলে কি করব?',
        'পেটে ব্যথার কারণ কি হতে পারে?',
        'ঘুম ভালো হওয়ার উপায় কি?',
        'কোন ডাক্তার দেখাব বুঝতে পারছি না',
      ]
    : [
        'What should I do for fever and headache?',
        'What could cause stomach pain?',
        'How can I improve my sleep?',
        "I don't know which doctor to see",
      ];

  // Translations
  const t = {
    title: isBn ? 'নির্ণয় ফ্রি কেয়ার' : 'Nirnoy Free Care',
    subtitle: isBn ? 'বিনামূল্যে AI স্বাস্থ্য সহকারী' : 'Free AI Health Assistant',
    placeholder: isBn ? 'আপনার স্বাস্থ্য সম্পর্কিত প্রশ্ন লিখুন...' : 'Type your health question...',
    send: isBn ? 'পাঠান' : 'Send',
    disclaimer: isBn 
      ? '⚠️ এই AI সাধারণ তথ্য দেয়, চিকিৎসা পরামর্শ নয়। গুরুতর সমস্যায় অবশ্যই ডাক্তার দেখান।'
      : '⚠️ This AI provides general information, not medical advice. Always consult a doctor for serious issues.',
    understand: isBn ? 'বুঝেছি' : 'I Understand',
    quickPrompts: isBn ? 'দ্রুত প্রশ্ন' : 'Quick Questions',
    poweredBy: isBn ? 'Gemini AI দ্বারা চালিত' : 'Powered by Gemini AI',
    forImmigrants: isBn 
      ? '🌍 প্রবাসী ও সীমিত স্বাস্থ্যসেবা অ্যাক্সেস থাকা মানুষদের জন্য বিশেষভাবে তৈরি'
      : '🌍 Specially designed for immigrants & people with limited healthcare access',
    bookDoctor: isBn ? 'ডাক্তার বুক করুন' : 'Book a Doctor',
    emergency: isBn ? 'জরুরি? 999 এ কল করুন' : 'Emergency? Call 999',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <span className="text-white font-black text-lg">ন</span>
            </div>
            <div className="leading-tight">
              <span className="font-black text-white text-lg tracking-tight">{t.title}</span>
              <span className="text-[10px] text-emerald-400 font-semibold block -mt-0.5 tracking-widest uppercase">{t.subtitle}</span>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <a href="tel:999" className="px-3 py-1.5 bg-red-500/20 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/30 transition">
              <i className="fas fa-phone-alt mr-1"></i>
              999
            </a>
            <button
              onClick={() => navigate('/search')}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold rounded-xl hover:from-emerald-600 hover:to-teal-600 transition shadow-lg shadow-emerald-500/25"
            >
              {t.bookDoctor}
            </button>
          </div>
        </div>
      </header>

      {/* Disclaimer Modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-exclamation-triangle text-amber-500 text-2xl"></i>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-3">
              {isBn ? 'গুরুত্বপূর্ণ তথ্য' : 'Important Notice'}
            </h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              {isBn 
                ? 'এই AI সহকারী শুধুমাত্র সাধারণ স্বাস্থ্য তথ্য প্রদান করে। এটি কোনো ডাক্তারের বিকল্প নয়। গুরুতর বা জরুরি স্বাস্থ্য সমস্যায় অবশ্যই ডাক্তার দেখান বা 999 এ কল করুন।'
                : 'This AI assistant provides general health information only. It is not a substitute for professional medical advice. For serious or emergency health issues, always consult a doctor or call 999.'}
            </p>
            <button
              onClick={() => setShowDisclaimer(false)}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-teal-600 transition"
            >
              {t.understand}
            </button>
          </div>
        </div>
      )}

      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b border-emerald-500/20 py-3 px-4 text-center">
        <p className="text-emerald-300 text-sm">{t.forImmigrants}</p>
      </div>

      {/* Chat Container */}
      <div className="flex-1 max-w-4xl w-full mx-auto flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                    : 'bg-slate-800 text-slate-100 border border-slate-700'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700">
                    <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs font-bold">ন</span>
                    </div>
                    <span className="text-xs text-emerald-400 font-semibold">Nirnoy AI</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        {messages.length <= 1 && (
          <div className="px-4 pb-4">
            <p className="text-slate-500 text-sm mb-3">{t.quickPrompts}</p>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(prompt);
                    inputRef.current?.focus();
                  }}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-sm rounded-xl border border-slate-700 hover:border-emerald-500/50 hover:text-emerald-400 transition"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={t.placeholder}
                rows={1}
                className="flex-1 px-5 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none focus:border-emerald-500 resize-none"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-teal-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25"
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>

            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-slate-500">
                <i className="fas fa-shield-alt mr-1"></i>
                {t.disclaimer}
              </p>
              <p className="text-xs text-slate-600">
                <i className="fas fa-robot mr-1"></i>
                {t.poweredBy}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Footer */}
      <div className="bg-red-500/10 border-t border-red-500/20 py-2 px-4 text-center">
        <p className="text-red-400 text-sm font-medium">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {t.emergency}
        </p>
      </div>
    </div>
  );
};

export default FreeCare;

