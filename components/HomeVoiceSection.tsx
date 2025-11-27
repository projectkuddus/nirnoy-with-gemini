import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

type AgentStatus = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error';

interface VoiceAgentProps {
  name: string;
  gender: 'male' | 'female';
  onConnect: () => void;
  onDisconnect: () => void;
  status: AgentStatus;
  isActive: boolean;
}

const VoiceAgentCard: React.FC<VoiceAgentProps> = ({ name, gender, onConnect, onDisconnect, status, isActive }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const getStatusText = () => {
    switch (status) {
      case 'connecting': return isBn ? 'কানেক্ট হচ্ছে...' : 'Connecting...';
      case 'connected': return isBn ? 'কানেক্টেড' : 'Connected';
      case 'speaking': return isBn ? 'বলছে...' : 'Speaking...';
      case 'listening': return isBn ? 'শুনছে...' : 'Listening...';
      case 'error': return isBn ? 'ত্রুটি হয়েছে' : 'Error';
      default: return isBn ? 'প্রস্তুত' : 'Ready';
    }
  };

  return (
    <div className={`bg-white rounded-2xl p-6 border-2 transition-all ${isActive ? 'border-blue-500 shadow-xl shadow-blue-500/20' : 'border-slate-200 hover:border-slate-300'}`}>
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${gender === 'male' ? 'bg-blue-100' : 'bg-pink-100'}`}>
          <i className={`fas ${gender === 'male' ? 'fa-mars text-blue-600' : 'fa-venus text-pink-600'} text-2xl`}></i>
        </div>
        <div>
          <h3 className="font-bold text-slate-800">{name}</h3>
          <p className="text-sm text-slate-500">{gender === 'male' ? (isBn ? 'পুরুষ কণ্ঠ' : 'Male Voice') : (isBn ? 'মহিলা কণ্ঠ' : 'Female Voice')}</p>
        </div>
      </div>

      {/* Status Indicator */}
      {isActive && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${status === 'speaking' || status === 'listening' ? 'bg-green-500 animate-pulse' : status === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
            <span className="text-slate-600">{getStatusText()}</span>
          </div>
          
          {/* Audio Visualization */}
          {(status === 'speaking' || status === 'listening') && (
            <div className="flex items-center justify-center gap-1 h-12 mt-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-blue-500 to-indigo-500 rounded-full"
                  style={{
                    height: `${20 + Math.random() * 30}px`,
                    animation: `pulse ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
                  }}
                ></div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Button */}
      {isActive ? (
        <button
          onClick={onDisconnect}
          className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
        >
          <i className="fas fa-phone-slash"></i>
          {isBn ? 'শেষ করুন' : 'End Call'}
        </button>
      ) : (
        <button
          onClick={onConnect}
          className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold rounded-xl transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
        >
          <i className="fas fa-phone"></i>
          {isBn ? 'কথা বলুন' : 'Connect'}
        </button>
      )}
    </div>
  );
};

const HomeVoiceSection: React.FC = () => {
  const { language, t } = useLanguage();
  const isBn = language === 'bn';
  const [activeAgent, setActiveAgent] = useState<'male' | 'female' | null>(null);
  const [status, setStatus] = useState<AgentStatus>('idle');

  const handleConnect = (gender: 'male' | 'female') => {
    setActiveAgent(gender);
    setStatus('connecting');
    
    // Simulate connection
    setTimeout(() => {
      setStatus('connected');
      setTimeout(() => setStatus('listening'), 1000);
    }, 1500);
  };

  const handleDisconnect = () => {
    setStatus('idle');
    setActiveAgent(null);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 border border-slate-700">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
          </span>
          24/7 {isBn ? 'সক্রিয়' : 'Active'}
        </div>
        <h3 className="text-2xl font-black text-white mb-2">{isBn ? 'Nree-এর সাথে কথা বলুন' : 'Talk to Nree'}</h3>
        <p className="text-slate-400 text-sm">{isBn ? 'বাংলায় কথা বলে ডাক্তার খুঁজুন, প্রশ্ন করুন' : 'Speak in Bangla to find doctors, ask questions'}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <VoiceAgentCard
          name="Nree"
          gender="male"
          onConnect={() => handleConnect('male')}
          onDisconnect={handleDisconnect}
          status={activeAgent === 'male' ? status : 'idle'}
          isActive={activeAgent === 'male'}
        />
        <VoiceAgentCard
          name="Nree"
          gender="female"
          onConnect={() => handleConnect('female')}
          onDisconnect={handleDisconnect}
          status={activeAgent === 'female' ? status : 'idle'}
          isActive={activeAgent === 'female'}
        />
      </div>

      <p className="text-center text-slate-500 text-xs mt-6">
        <i className="fas fa-shield-alt mr-1"></i>
        {isBn ? 'নিরাপদ ও গোপনীয় • বিনামূল্যে' : 'Safe & Private • Free'}
      </p>
    </div>
  );
};

export default HomeVoiceSection;

