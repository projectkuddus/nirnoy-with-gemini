import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

// ============ NIRNOY NEURAL BRAIN - Complex Organic Network ============
const NirnoyCoreGraphic: React.FC = () => {
  // Primary healthcare nodes - larger, more prominent
  const primaryNodes = [
    { icon: 'fa-user-md', label: 'ডাক্তার', x: 50, y: 5, size: 'xl' },
    { icon: 'fa-hospital', label: 'হাসপাতাল', x: 92, y: 30, size: 'lg' },
    { icon: 'fa-calendar-check', label: 'অ্যাপয়েন্টমেন্ট', x: 92, y: 70, size: 'xl' },
    { icon: 'fa-heartbeat', label: 'স্বাস্থ্য', x: 50, y: 95, size: 'lg' },
    { icon: 'fa-file-medical', label: 'রিপোর্ট', x: 8, y: 70, size: 'xl' },
    { icon: 'fa-clock', label: 'লাইভ কিউ', x: 8, y: 30, size: 'lg' },
  ];

  // Secondary nodes - medium size, in between
  const secondaryNodes = [
    { icon: 'fa-pills', label: 'ওষুধ', x: 75, y: 12, size: 'md' },
    { icon: 'fa-stethoscope', label: 'পরীক্ষা', x: 98, y: 50, size: 'md' },
    { icon: 'fa-ambulance', label: 'ইমার্জেন্সি', x: 75, y: 88, size: 'md' },
    { icon: 'fa-bell', label: 'নোটিফিকেশন', x: 25, y: 88, size: 'md' },
    { icon: 'fa-brain', label: 'AI সহায়ক', x: 2, y: 50, size: 'md' },
    { icon: 'fa-phone', label: 'সাপোর্ট', x: 25, y: 12, size: 'md' },
  ];

  // Tertiary micro-nodes - smallest, scattered around for complexity
  const microNodes = [
    { x: 35, y: 8 }, { x: 65, y: 8 }, { x: 85, y: 18 }, { x: 95, y: 42 },
    { x: 95, y: 58 }, { x: 85, y: 82 }, { x: 65, y: 92 }, { x: 35, y: 92 },
    { x: 15, y: 82 }, { x: 5, y: 58 }, { x: 5, y: 42 }, { x: 15, y: 18 },
    { x: 40, y: 25 }, { x: 60, y: 25 }, { x: 72, y: 40 }, { x: 72, y: 60 },
    { x: 60, y: 75 }, { x: 40, y: 75 }, { x: 28, y: 60 }, { x: 28, y: 40 },
  ];

  const allNodes = [...primaryNodes, ...secondaryNodes];

  // Generate organic curved path with multiple control points
  const generateBrainPath = (x: number, y: number, index: number) => {
    const cx = 50, cy = 50;
    const dx = x - cx, dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Create S-curve like brain connections
    const angle = Math.atan2(dy, dx);
    const perpAngle = angle + Math.PI / 2;
    const curve = (index % 2 === 0 ? 1 : -1) * (8 + (index % 5) * 2);
    
    const mid1X = cx + dx * 0.35 + Math.cos(perpAngle) * curve;
    const mid1Y = cy + dy * 0.35 + Math.sin(perpAngle) * curve;
    const mid2X = cx + dx * 0.65 + Math.cos(perpAngle) * -curve * 0.7;
    const mid2Y = cy + dy * 0.65 + Math.sin(perpAngle) * -curve * 0.7;
    
    return `M${cx},${cy} C${mid1X},${mid1Y} ${mid2X},${mid2Y} ${x},${y}`;
  };

  // Generate interconnection paths between nodes
  const generateInterconnection = (n1: {x: number, y: number}, n2: {x: number, y: number}, i: number) => {
    const midX = (n1.x + n2.x) / 2 + (i % 2 === 0 ? 8 : -8);
    const midY = (n1.y + n2.y) / 2 + (i % 3 === 0 ? -6 : 6);
    return `M${n1.x},${n2.y} Q${midX},${midY} ${n2.x},${n2.y}`;
  };

  return (
    <div className="relative w-[420px] h-[420px] mx-auto">
      {/* Deep background ambient glow */}
      <div className="absolute inset-0 bg-gradient-radial from-blue-200/40 via-blue-100/20 to-transparent rounded-full blur-2xl"></div>
      
      {/* SVG for neural connections */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* Strong neural gradient */}
          <linearGradient id="neuralStrongGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.3" />
          </linearGradient>
          
          <linearGradient id="neuralMediumGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.2" />
          </linearGradient>
          
          <linearGradient id="neuralLightGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#bfdbfe" stopOpacity="0.1" />
          </linearGradient>

          {/* Center radial gradient */}
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1d4ed8" stopOpacity="1" />
            <stop offset="40%" stopColor="#2563eb" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </radialGradient>
          
          {/* Strong glow filter */}
          <filter id="strongGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background neural mesh - many faint connections */}
        {microNodes.map((node, i) => (
          <path
            key={`micro-${i}`}
            d={generateBrainPath(node.x, node.y, i)}
            fill="none"
            stroke="#bfdbfe"
            strokeWidth="0.3"
            opacity="0.4"
          />
        ))}

        {/* Interconnections between micro nodes */}
        {microNodes.slice(0, 12).map((node, i) => {
          const next = microNodes[(i + 1) % 12];
          return (
            <path
              key={`micro-inter-${i}`}
              d={generateInterconnection(node, next, i)}
              fill="none"
              stroke="#dbeafe"
              strokeWidth="0.2"
              opacity="0.3"
            />
          );
        })}

        {/* Secondary connections - medium weight */}
        {secondaryNodes.map((node, i) => (
          <g key={`sec-${i}`}>
            <path
              d={generateBrainPath(node.x, node.y, i + 10)}
              fill="none"
              stroke="url(#neuralMediumGradient)"
              strokeWidth="0.8"
              opacity="0.7"
            />
            {/* Flowing particle */}
            <circle r="1.2" fill="#3b82f6" opacity="0.7" filter="url(#softGlow)">
              <animateMotion dur={`${2.5 + i * 0.2}s`} repeatCount="indefinite" path={generateBrainPath(node.x, node.y, i + 10)} />
            </circle>
          </g>
        ))}

        {/* Primary connections - bold weight with glow */}
        {primaryNodes.map((node, i) => (
          <g key={`pri-${i}`}>
            {/* Glow layer */}
            <path
              d={generateBrainPath(node.x, node.y, i)}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              opacity="0.2"
              filter="url(#strongGlow)"
            />
            {/* Main bold line */}
            <path
              d={generateBrainPath(node.x, node.y, i)}
              fill="none"
              stroke="url(#neuralStrongGradient)"
              strokeWidth="1.2"
              opacity="0.9"
              strokeLinecap="round"
            />
            {/* Multiple flowing particles */}
            <circle r="1.8" fill="#1d4ed8" opacity="0.9" filter="url(#strongGlow)">
              <animateMotion dur={`${1.8 + i * 0.15}s`} repeatCount="indefinite" path={generateBrainPath(node.x, node.y, i)} />
            </circle>
            <circle r="1" fill="#60a5fa" opacity="0.6">
              <animateMotion dur={`${2.2 + i * 0.2}s`} repeatCount="indefinite" path={generateBrainPath(node.x, node.y, i)} begin="0.5s" />
            </circle>
            <circle r="0.7" fill="#93c5fd" opacity="0.5">
              <animateMotion dur={`${2.8 + i * 0.25}s`} repeatCount="indefinite" path={generateBrainPath(node.x, node.y, i)} begin="1s" />
            </circle>
          </g>
        ))}

        {/* Cross-connections between primary nodes */}
        {primaryNodes.map((node, i) => {
          const next = primaryNodes[(i + 1) % primaryNodes.length];
          return (
            <path
              key={`cross-pri-${i}`}
              d={generateInterconnection(node, next, i)}
              fill="none"
              stroke="#60a5fa"
              strokeWidth="0.5"
              opacity="0.4"
            />
          );
        })}

        {/* Central core base glow */}
        <circle cx="50" cy="50" r="14" fill="url(#centerGlow)" filter="url(#strongGlow)" />
        
        {/* Expanding pulse rings from center */}
        {[0, 0.4, 0.8, 1.2].map((delay, i) => (
          <circle key={`pulse-${i}`} cx="50" cy="50" r="10" fill="none" stroke="#1d4ed8" strokeWidth="0.8" opacity="0">
            <animate attributeName="r" from="10" to="28" dur="2.5s" repeatCount="indefinite" begin={`${delay}s`} />
            <animate attributeName="opacity" from="0.6" to="0" dur="2.5s" repeatCount="indefinite" begin={`${delay}s`} />
          </circle>
        ))}

        {/* Inner core rings */}
        <circle cx="50" cy="50" r="11" fill="none" stroke="#1d4ed8" strokeWidth="0.8" opacity="0.5" />
        <circle cx="50" cy="50" r="9" fill="none" stroke="#2563eb" strokeWidth="1" opacity="0.7" />
      </svg>

      {/* Center Core - Nirnoy Brain - BOLD & CONNECTED */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 z-20">
        {/* Deep outer glow */}
        <div className="absolute -inset-8 bg-blue-500/30 rounded-full blur-2xl"></div>
        <div className="absolute -inset-5 bg-blue-600/40 rounded-full blur-xl animate-pulse"></div>
        
        {/* Connection ring */}
        <div className="absolute -inset-2 rounded-full border-2 border-blue-400/50 animate-spin" style={{ animationDuration: '12s' }}></div>
        <div className="absolute -inset-4 rounded-full border border-blue-300/30 animate-spin" style={{ animationDuration: '20s', animationDirection: 'reverse' }}></div>
        
        {/* Core sphere - 3D effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800 shadow-2xl" style={{ boxShadow: '0 0 60px rgba(37, 99, 235, 0.6), inset 0 -8px 20px rgba(0,0,0,0.3), inset 0 8px 20px rgba(255,255,255,0.2)' }}>
          {/* Inner sphere highlight */}
          <div className="absolute inset-3 rounded-full bg-gradient-to-br from-white/40 via-white/10 to-transparent"></div>
          <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-gradient-to-br from-transparent to-blue-900/30"></div>
          
          {/* Logo content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <span className="text-4xl font-black block drop-shadow-lg" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>ন</span>
              <span className="text-[11px] font-black uppercase tracking-[0.2em] opacity-95">Nirnoy</span>
            </div>
          </div>
        </div>
        
        {/* Orbiting mini-dots around center */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '8s' }}>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-300 rounded-full shadow-lg"></div>
        </div>
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }}>
          <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full shadow-lg"></div>
        </div>
      </div>

      {/* Primary Nodes - XL & LG */}
      {primaryNodes.map((node, i) => (
        <div
          key={`pri-node-${i}`}
          className={`absolute ${node.size === 'xl' ? 'w-14 h-14' : 'w-12 h-12'} group`}
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            transform: 'translate(-50%, -50%)',
            animation: `float ${3.5 + (i % 2)}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }}
        >
          {/* Glow */}
          <div className="absolute -inset-2 bg-blue-500/40 rounded-full blur-lg group-hover:bg-blue-500/60 transition-all"></div>
          
          {/* Node body */}
          <div className="absolute inset-0 bg-white rounded-full shadow-xl border-2 border-blue-200 flex items-center justify-center group-hover:scale-110 group-hover:border-blue-400 transition-all duration-300 cursor-default" style={{ boxShadow: '0 4px 25px rgba(59, 130, 246, 0.4)' }}>
            <i className={`fas ${node.icon} ${node.size === 'xl' ? 'text-xl' : 'text-lg'} text-blue-600`}></i>
          </div>
          
          {/* Tooltip */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-8 opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-30 pointer-events-none">
            <span className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-full shadow-xl border border-blue-100">
              {node.label}
            </span>
          </div>
        </div>
      ))}

      {/* Secondary Nodes - MD */}
      {secondaryNodes.map((node, i) => (
        <div
          key={`sec-node-${i}`}
          className="absolute w-10 h-10 group"
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            transform: 'translate(-50%, -50%)',
            animation: `float ${4 + (i % 3)}s ease-in-out infinite`,
            animationDelay: `${i * 0.4 + 0.5}s`,
          }}
        >
          {/* Glow */}
          <div className="absolute -inset-1 bg-blue-400/30 rounded-full blur-md group-hover:bg-blue-400/50 transition-all"></div>
          
          {/* Node body */}
          <div className="absolute inset-0 bg-white rounded-full shadow-lg border border-blue-100 flex items-center justify-center group-hover:scale-110 transition-all duration-300 cursor-default">
            <i className={`fas ${node.icon} text-sm text-blue-500`}></i>
          </div>
          
          {/* Tooltip */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-7 opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-30 pointer-events-none">
            <span className="text-[10px] font-medium text-slate-600 bg-white/95 backdrop-blur px-2 py-1 rounded-full shadow-lg border border-slate-100">
              {node.label}
            </span>
          </div>
        </div>
      ))}

      {/* Micro Nodes - tiny dots for complexity */}
      {microNodes.map((node, i) => (
        <div
          key={`micro-node-${i}`}
          className="absolute w-3 h-3"
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            transform: 'translate(-50%, -50%)',
            animation: `microFloat ${2 + (i % 4) * 0.5}s ease-in-out infinite`,
            animationDelay: `${i * 0.15}s`,
          }}
        >
          <div className="w-full h-full bg-gradient-to-br from-blue-300 to-blue-400 rounded-full shadow-md opacity-70"></div>
        </div>
      ))}

      {/* Animation keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
          50% { transform: translate(-50%, -50%) translateY(-10px); }
        }
        @keyframes microFloat {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
};

// ============ VOICE AGENT CARD ============
const VoiceAgentCard: React.FC<{
  agentNumber: 1 | 2;
  isActive: boolean;
  isSpeaking: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  disabled: boolean;
}> = ({ agentNumber, isActive, isSpeaking, onConnect, onDisconnect, disabled }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  return (
    <div className={`relative bg-white rounded-2xl p-6 border-2 transition-all duration-300 ${
      isActive 
        ? 'border-blue-500 shadow-xl shadow-blue-500/10' 
        : disabled 
          ? 'border-slate-100 opacity-50' 
          : 'border-slate-200 hover:border-blue-300 hover:shadow-lg'
    }`}>
      {/* Active Indicator */}
      {isActive && (
        <div className="absolute top-3 right-3">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
        </div>
      )}

      {/* Agent Icon */}
      <div className="w-20 h-20 mx-auto mb-4 relative">
        <div className={`absolute inset-0 rounded-full ${agentNumber === 1 ? 'bg-blue-100' : 'bg-slate-100'}`}></div>
        <div className="absolute inset-1 bg-white rounded-full flex items-center justify-center">
          <i className={`fas fa-headset text-3xl ${agentNumber === 1 ? 'text-blue-500' : 'text-slate-600'}`}></i>
        </div>
        {isActive && isSpeaking && (
          <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-30"></div>
        )}
      </div>

      <h3 className="text-lg font-bold text-slate-800 text-center mb-1">
        Nirnoy {agentNumber}
      </h3>
      <p className="text-sm text-slate-500 text-center mb-6">
        {isBn ? 'AI স্বাস্থ্য সহায়ক' : 'AI Health Assistant'}
      </p>

      {isActive ? (
        <div className="space-y-4">
          {/* Audio Visualizer */}
          <div className="h-12 bg-slate-50 rounded-xl flex items-center justify-center gap-1 px-4">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i} 
                className={`w-1 rounded-full transition-all duration-75 ${isSpeaking ? 'bg-blue-500' : 'bg-slate-300'}`}
                style={{ height: isSpeaking ? `${Math.max(20, Math.random() * 100)}%` : '20%' }}
              ></div>
            ))}
          </div>
          
          <p className="text-center text-sm text-blue-600 font-medium animate-pulse">
            <i className={isSpeaking ? "fas fa-volume-up mr-2" : "fas fa-microphone mr-2"}></i>
            {isBn ? 'কথা বলুন...' : 'Listening...'}
          </p>
          
          <button 
            onClick={onDisconnect}
            className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition flex items-center justify-center gap-2"
          >
            <i className="fas fa-phone-slash"></i>
            {isBn ? 'শেষ করুন' : 'End Call'}
          </button>
        </div>
      ) : (
        <button 
          onClick={onConnect}
          disabled={disabled}
          className={`w-full py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
            agentNumber === 1 
              ? 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-300' 
              : 'bg-slate-800 text-white hover:bg-slate-900 disabled:bg-slate-400'
          } disabled:cursor-not-allowed`}
        >
          <i className="fas fa-phone"></i>
          {isBn ? 'কথা বলুন' : 'Connect'}
        </button>
      )}
    </div>
  );
};

// ============ MAIN LANDING PAGE ============
export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAgent, setActiveAgent] = useState<1 | 2 | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Simulate speaking animation
  useEffect(() => {
    if (activeAgent) {
      const interval = setInterval(() => {
        setIsSpeaking(prev => !prev);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [activeAgent]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/search');
  };

  const stats = [
    { value: '200+', label: isBn ? 'বিশেষজ্ঞ ডাক্তার' : 'Expert Doctors' },
    { value: '10,000+', label: isBn ? 'সন্তুষ্ট রোগী' : 'Happy Patients' },
    { value: '24/7', label: isBn ? 'সার্ভিস চালু' : 'Service Available' },
  ];

  const features = [
    { icon: 'fa-microphone', title: isBn ? 'ভয়েস বুকিং' : 'Voice Booking', desc: isBn ? 'বাংলায় কথা বলে বুকিং করুন' : 'Book by speaking in Bangla' },
    { icon: 'fa-clock', title: isBn ? 'লাইভ কিউ' : 'Live Queue', desc: isBn ? 'রিয়েল-টাইম সিরিয়াল দেখুন' : 'Real-time queue tracking' },
    { icon: 'fa-notes-medical', title: isBn ? 'হেলথ রেকর্ড' : 'Health Record', desc: isBn ? 'সব রেকর্ড এক জায়গায়' : 'All records in one place' },
    { icon: 'fa-bell', title: isBn ? 'স্মার্ট নোটিফিকেশন' : 'Smart Alerts', desc: isBn ? 'SMS ও পুশ নোটিফিকেশন' : 'SMS & push notifications' },
  ];

  return (
    <div className="min-h-screen bg-white font-sans">
      
      {/* ============ HEADER ============ */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">ন</span>
            </div>
            <span className="font-bold text-xl text-slate-800">Nirnoy</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/patient-auth')} className="text-sm font-medium text-slate-600 hover:text-slate-800 transition">
              {isBn ? 'লগইন' : 'Login'}
            </button>
            <button onClick={() => navigate('/search')} className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition">
              {isBn ? 'ডাক্তার খুঁজুন' : 'Find Doctor'}
            </button>
          </div>
        </div>
      </header>

      {/* ============ HERO SECTION ============ */}
      <section className="pt-28 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full mb-6">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  {isBn ? 'বাংলাদেশের জন্য' : 'Built for Bangladesh'}
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
                {isBn ? (
                  <>স্বাস্থ্যসেবা <br/><span className="text-blue-500">সহজ করি</span></>
                ) : (
                  <>Healthcare <br/><span className="text-blue-500">Made Simple</span></>
                )}
              </h1>

              <p className="text-lg text-slate-600 mb-8 max-w-lg">
                {isBn 
                  ? 'ঢাকার সেরা ডাক্তারদের খুঁজুন, অ্যাপয়েন্টমেন্ট বুক করুন, লাইভ কিউ ট্র্যাক করুন - সব এক জায়গায়।' 
                  : 'Find the best doctors in Dhaka, book appointments, track live queue - all in one place.'}
              </p>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="relative mb-8">
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-2 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100 transition">
                  <div className="flex items-center flex-1 px-3">
                    <i className="fas fa-search text-slate-400 mr-3"></i>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={isBn ? 'ডাক্তার বা বিশেষত্ব খুঁজুন...' : 'Search doctor or specialty...'}
                      className="flex-1 bg-transparent outline-none text-slate-800 placeholder:text-slate-400 py-2"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition"
                  >
                    {isBn ? 'খুঁজুন' : 'Search'}
                  </button>
                </div>
              </form>

              {/* Quick Specialty Tags */}
              <div className="flex flex-wrap gap-2">
                {[
                  { en: 'Cardiology', bn: 'হৃদরোগ' },
                  { en: 'Medicine', bn: 'মেডিসিন' },
                  { en: 'Gynecology', bn: 'স্ত্রীরোগ' },
                  { en: 'Pediatrics', bn: 'শিশুরোগ' },
                ].map((spec, i) => (
                  <button
                    key={i}
                    onClick={() => navigate('/search')}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:border-blue-400 hover:text-blue-600 transition"
                  >
                    {isBn ? spec.bn : spec.en}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Health Graphic */}
            <div className="hidden lg:block">
              <NirnoyCoreGraphic />
            </div>
          </div>
        </div>
      </section>

      {/* ============ STATS BAR ============ */}
      <section className="py-8 bg-slate-50 border-y border-slate-100">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-8 text-center">
            {stats.map((stat, i) => (
              <div key={i}>
                <p className="text-2xl md:text-3xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ VOICE BOOKING SECTION ============ */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-4">
              <i className="fas fa-phone-volume text-blue-500"></i>
              <span className="text-sm font-bold text-blue-600">24/7 • {isBn ? 'বিনামূল্যে' : 'No Charge'}</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {isBn ? 'কথা বলে অ্যাপয়েন্টমেন্ট নিন' : 'Book by Talking to Our Agents'}
            </h2>
            <p className="text-slate-600 max-w-xl mx-auto">
              {isBn 
                ? 'বাংলায় কথা বলুন আমাদের AI এজেন্টের সাথে। ডাক্তার খুঁজুন, প্রশ্ন করুন, অ্যাপয়েন্টমেন্ট বুক করুন - সব ভয়েসে।' 
                : 'Speak in Bangla with our AI agents. Find doctors, ask questions, book appointments - all by voice.'}
            </p>
          </div>

          {/* Voice Agent Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <VoiceAgentCard
              agentNumber={1}
              isActive={activeAgent === 1}
              isSpeaking={isSpeaking}
              onConnect={() => setActiveAgent(1)}
              onDisconnect={() => setActiveAgent(null)}
              disabled={activeAgent === 2}
            />
            <VoiceAgentCard
              agentNumber={2}
              isActive={activeAgent === 2}
              isSpeaking={isSpeaking}
              onConnect={() => setActiveAgent(2)}
              onDisconnect={() => setActiveAgent(null)}
              disabled={activeAgent === 1}
            />
          </div>

          {/* Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
              <i className="fas fa-info-circle"></i>
              {isBn 
                ? 'দুটি এজেন্টের কাজ একই। যেকোনো একটি বেছে নিন।' 
                : 'Both agents have same capabilities. Choose any one.'}
            </p>
          </div>
        </div>
      </section>

      {/* ============ FEATURES SECTION ============ */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              {isBn ? 'কেন নির্ণয়?' : 'Why Nirnoy?'}
            </h2>
            <p className="text-slate-600">
              {isBn ? 'আধুনিক স্বাস্থ্যসেবার জন্য আধুনিক সমাধান' : 'Modern solutions for modern healthcare'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 hover:shadow-lg transition">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                  <i className={`fas ${feature.icon} text-blue-500 text-xl`}></i>
                </div>
                <h3 className="font-bold text-slate-800 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ QUICK ACTIONS ============ */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: 'fa-stethoscope', label: isBn ? 'ডাক্তার খুঁজুন' : 'Find Doctor', path: '/search', color: 'blue' },
              { icon: 'fa-calendar-check', label: isBn ? 'আমার অ্যাপয়েন্টমেন্ট' : 'My Appointments', path: '/my-appointments', color: 'slate' },
              { icon: 'fa-heartbeat', label: isBn ? 'আমার স্বাস্থ্য' : 'My Health', path: '/my-health', color: 'blue' },
              { icon: 'fa-user-md', label: isBn ? 'ডাক্তার লগইন' : 'Doctor Login', path: '/login', color: 'slate' },
            ].map((action, i) => (
              <button
                key={i}
                onClick={() => navigate(action.path)}
                className={`p-6 rounded-2xl border transition-all hover:shadow-lg ${
                  action.color === 'blue' 
                    ? 'bg-blue-50 border-blue-100 hover:border-blue-200' 
                    : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                  action.color === 'blue' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-white'
                }`}>
                  <i className={`fas ${action.icon} text-xl`}></i>
                </div>
                <p className="font-medium text-slate-800 text-sm">{action.label}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA FOR DOCTORS ============ */}
      <section className="py-20 px-4 bg-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-6">
            <i className="fas fa-user-md text-blue-400"></i>
            <span className="text-sm font-medium text-white/80">{isBn ? 'ডাক্তারদের জন্য' : 'For Doctors'}</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            {isBn ? 'আপনার প্র্যাকটিস ডিজিটাল করুন' : 'Digitize Your Practice'}
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto mb-8">
            {isBn 
              ? 'AI কপাইলট, স্মার্ট কিউ ম্যানেজমেন্ট, ডিজিটাল প্রেসক্রিপশন - সব এক প্ল্যাটফর্মে।' 
              : 'AI copilot, smart queue management, digital prescriptions - all in one platform.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/doctor-registration')}
              className="px-8 py-4 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition flex items-center gap-2"
            >
              <i className="fas fa-plus"></i>
              {isBn ? 'রেজিস্টার করুন' : 'Register Now'}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-white/10 border border-white/20 text-white font-medium rounded-xl hover:bg-white/20 transition"
            >
              {isBn ? 'লগইন করুন' : 'Login'}
            </button>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="py-12 px-4 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">ন</span>
              </div>
              <div>
                <span className="font-bold text-slate-800 block">Nirnoy</span>
                <span className="text-xs text-slate-500">{isBn ? 'স্বাস্থ্যসেবা সহজ করি' : 'Healthcare Made Simple'}</span>
              </div>
            </div>

            <div className="flex gap-6 text-sm text-slate-500">
              <button onClick={() => navigate('/about')} className="hover:text-slate-800 transition">{isBn ? 'আমাদের সম্পর্কে' : 'About'}</button>
              <button onClick={() => navigate('/search')} className="hover:text-slate-800 transition">{isBn ? 'ডাক্তার' : 'Doctors'}</button>
              <button onClick={() => navigate('/privacy')} className="hover:text-slate-800 transition">{isBn ? 'গোপনীয়তা' : 'Privacy'}</button>
            </div>

            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-blue-50 hover:text-blue-500 transition" aria-label="Facebook">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#" className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-500 transition" aria-label="YouTube">
                <i className="fab fa-youtube"></i>
              </a>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100 text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Nirnoy Care. {isBn ? 'সর্বস্বত্ব সংরক্ষিত' : 'All rights reserved'}.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
