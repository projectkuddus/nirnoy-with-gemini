import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatWithHealthAssistant } from '../services/geminiService';
import { ChatMessage, PrescriptionItem } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// ============ TYPES ============
interface HealthProfile {
  id: string;
  name: string;
  nameBn: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  bloodGroup: string;
  height: number;
  weight: number;
  profileImage: string;
  emergencyContact: { name: string; relation: string; phone: string };
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  insuranceInfo?: { provider: string; policyNo: string };
  joinedDate: string;
}

interface VitalRecord {
  date: string;
  bpSystolic: number;
  bpDiastolic: number;
  heartRate: number;
  weight: number;
  bloodSugar?: number;
}

interface ConsultationRecord {
  id: string;
  date: string;
  doctorId: string;
  doctorName: string;
  doctorImage: string;
  specialty: string;
  chamberName: string;
  diagnosis: string;
  notes: string;
  prescription: PrescriptionItem[];
  bodyParts?: string[]; // affected body parts
  followUpDate?: string;
}

interface BodyPartHealth {
  id: string;
  name: string;
  nameBn: string;
  status: 'excellent' | 'good' | 'attention' | 'concern';
  score: number;
  issues: string[];
  lastChecked?: string;
  doctor?: string;
}

// ============ BODY PARTS HEALTH DATA ============
const INITIAL_BODY_HEALTH: BodyPartHealth[] = [
  { id: 'brain', name: 'Brain & Mental', nameBn: 'মস্তিষ্ক ও মানসিক', status: 'good', score: 85, issues: [], lastChecked: '2024-08-15' },
  { id: 'eyes', name: 'Eyes', nameBn: 'চোখ', status: 'excellent', score: 92, issues: [], lastChecked: '2024-06-20' },
  { id: 'ears', name: 'Ears', nameBn: 'কান', status: 'excellent', score: 95, issues: [] },
  { id: 'nose', name: 'Nose & Sinuses', nameBn: 'নাক ও সাইনাস', status: 'good', score: 88, issues: ['Dust allergy'], lastChecked: '2024-09-15' },
  { id: 'mouth', name: 'Mouth & Teeth', nameBn: 'মুখ ও দাঁত', status: 'attention', score: 72, issues: ['Dental checkup overdue'], lastChecked: '2024-01-10' },
  { id: 'throat', name: 'Throat', nameBn: 'গলা', status: 'good', score: 90, issues: [] },
  { id: 'heart', name: 'Heart', nameBn: 'হৃদযন্ত্র', status: 'attention', score: 78, issues: ['Mild Hypertension - Controlled'], lastChecked: '2024-11-20', doctor: 'Dr. Abul Kashem' },
  { id: 'lungs', name: 'Lungs', nameBn: 'ফুসফুস', status: 'good', score: 88, issues: [], lastChecked: '2024-06-10' },
  { id: 'liver', name: 'Liver', nameBn: 'যকৃত', status: 'excellent', score: 92, issues: [], lastChecked: '2024-05-15' },
  { id: 'stomach', name: 'Stomach & Digestion', nameBn: 'পাকস্থলী ও হজম', status: 'good', score: 85, issues: [] },
  { id: 'kidneys', name: 'Kidneys', nameBn: 'কিডনি', status: 'excellent', score: 94, issues: [], lastChecked: '2024-05-15' },
  { id: 'skin', name: 'Skin', nameBn: 'ত্বক', status: 'attention', score: 75, issues: ['Contact Dermatitis - Resolved'], lastChecked: '2024-09-15', doctor: 'Dr. Sarah Rahman' },
  { id: 'bones', name: 'Bones & Joints', nameBn: 'হাড় ও জয়েন্ট', status: 'good', score: 82, issues: [] },
  { id: 'muscles', name: 'Muscles', nameBn: 'মাংসপেশী', status: 'good', score: 80, issues: ['Need more exercise'] },
  { id: 'blood', name: 'Blood & Circulation', nameBn: 'রক্ত ও সঞ্চালন', status: 'good', score: 85, issues: [], lastChecked: '2024-11-15' },
  { id: 'immune', name: 'Immune System', nameBn: 'রোগ প্রতিরোধ', status: 'good', score: 82, issues: ['Penicillin allergy'] },
];

// ============ MOCK DATA ============
const PATIENT_PROFILE: HealthProfile = {
  id: 'P-98234',
  name: 'Rahim Uddin',
  nameBn: 'রহিম উদ্দিন',
  email: 'rahim.uddin@gmail.com',
  phone: '+880 1712-345678',
  dateOfBirth: '1993-05-15',
  gender: 'male',
  bloodGroup: 'A+',
  height: 175,
  weight: 72,
  profileImage: 'https://randomuser.me/api/portraits/men/32.jpg',
  emergencyContact: { name: 'Karim Uddin', relation: 'Brother', phone: '+880 1812-345678' },
  allergies: ['Penicillin', 'Dust'],
  chronicConditions: ['Mild Hypertension'],
  currentMedications: ['Amlodipine 5mg'],
  insuranceInfo: { provider: 'Green Delta Insurance', policyNo: 'GD-2023-78543' },
  joinedDate: '2022-03-15',
};

const VITALS_HISTORY: VitalRecord[] = [
  { date: '2024-01', bpSystolic: 135, bpDiastolic: 88, heartRate: 78, weight: 75, bloodSugar: 110 },
  { date: '2024-03', bpSystolic: 130, bpDiastolic: 85, heartRate: 75, weight: 74, bloodSugar: 105 },
  { date: '2024-05', bpSystolic: 125, bpDiastolic: 82, heartRate: 72, weight: 73, bloodSugar: 100 },
  { date: '2024-07', bpSystolic: 122, bpDiastolic: 80, heartRate: 70, weight: 72.5, bloodSugar: 98 },
  { date: '2024-09', bpSystolic: 120, bpDiastolic: 78, heartRate: 68, weight: 72, bloodSugar: 95 },
  { date: '2024-11', bpSystolic: 118, bpDiastolic: 76, heartRate: 70, weight: 72, bloodSugar: 92 },
];

const CONSULTATIONS: ConsultationRecord[] = [
  {
    id: 'c1',
    date: '2024-11-20',
    doctorId: 'd1',
    doctorName: 'Dr. Abul Kashem',
    doctorImage: 'https://randomuser.me/api/portraits/men/85.jpg',
    specialty: 'Cardiology',
    chamberName: 'Square Hospital',
    diagnosis: 'Controlled Hypertension',
    notes: 'Blood pressure well controlled with current medication. Continue Amlodipine 5mg.',
    prescription: [
      { medicine: 'Amlodipine 5mg', dosage: '0+0+1', duration: '90 Days', instruction: 'After dinner' },
      { medicine: 'Aspirin 75mg', dosage: '0+1+0', duration: '90 Days', instruction: 'After lunch' },
    ],
    bodyParts: ['heart', 'blood'],
    followUpDate: '2025-02-20',
  },
  {
    id: 'c2',
    date: '2024-09-15',
    doctorId: 'd2',
    doctorName: 'Dr. Sarah Rahman',
    doctorImage: 'https://randomuser.me/api/portraits/women/65.jpg',
    specialty: 'Dermatology',
    chamberName: 'United Hospital',
    diagnosis: 'Contact Dermatitis',
    notes: 'Mild skin reaction due to new detergent. Recommended hypoallergenic products.',
    prescription: [
      { medicine: 'Betnovate-N Cream', dosage: 'Apply 2x daily', duration: '14 Days', instruction: 'On affected area' },
    ],
    bodyParts: ['skin'],
  },
  {
    id: 'c3',
    date: '2024-06-10',
    doctorId: 'd3',
    doctorName: 'Dr. Mohammad Ali',
    doctorImage: 'https://randomuser.me/api/portraits/men/45.jpg',
    specialty: 'General Medicine',
    chamberName: 'Labaid Hospital',
    diagnosis: 'Seasonal Flu',
    notes: 'Viral infection with mild fever. Advised rest and fluids.',
    prescription: [
      { medicine: 'Napa Extra', dosage: '1+1+1', duration: '5 Days', instruction: 'After meal' },
    ],
    bodyParts: ['lungs', 'throat', 'immune'],
  },
];

// ============ INTERACTIVE BODY SVG COMPONENT ============
const HumanBodySVG: React.FC<{
  bodyHealth: BodyPartHealth[];
  selectedPart: string | null;
  onPartClick: (partId: string) => void;
  isBn: boolean;
}> = ({ bodyHealth, selectedPart, onPartClick, isBn }) => {
  
  const getPartColor = (partId: string) => {
    const part = bodyHealth.find(p => p.id === partId);
    if (!part) return '#94a3b8';
    
    switch (part.status) {
      case 'excellent': return '#10b981';
      case 'good': return '#22c55e';
      case 'attention': return '#f59e0b';
      case 'concern': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  const getPulse = (partId: string) => {
    const part = bodyHealth.find(p => p.id === partId);
    return part?.status === 'attention' || part?.status === 'concern';
  };

  return (
    <div className="relative w-full max-w-[280px] mx-auto">
      <svg viewBox="0 0 200 400" className="w-full h-auto">
        {/* Head */}
        <ellipse 
          cx="100" cy="40" rx="30" ry="35"
          fill={getPartColor('brain')}
          opacity={selectedPart === 'brain' ? 1 : 0.8}
          className={`cursor-pointer transition-all duration-300 hover:opacity-100 ${getPulse('brain') ? 'animate-pulse' : ''}`}
          onClick={() => onPartClick('brain')}
        />
        
        {/* Eyes */}
        <g onClick={() => onPartClick('eyes')} className="cursor-pointer">
          <circle cx="88" cy="35" r="5" fill={getPartColor('eyes')} className="hover:opacity-80" />
          <circle cx="112" cy="35" r="5" fill={getPartColor('eyes')} className="hover:opacity-80" />
        </g>
        
        {/* Nose */}
        <path 
          d="M100 42 L96 52 L104 52 Z" 
          fill={getPartColor('nose')}
          className="cursor-pointer hover:opacity-80"
          onClick={() => onPartClick('nose')}
        />
        
        {/* Mouth */}
        <path 
          d="M92 58 Q100 65 108 58" 
          stroke={getPartColor('mouth')}
          strokeWidth="3"
          fill="none"
          className={`cursor-pointer hover:opacity-80 ${getPulse('mouth') ? 'animate-pulse' : ''}`}
          onClick={() => onPartClick('mouth')}
        />
        
        {/* Ears */}
        <g onClick={() => onPartClick('ears')} className="cursor-pointer">
          <ellipse cx="68" cy="40" rx="5" ry="10" fill={getPartColor('ears')} className="hover:opacity-80" />
          <ellipse cx="132" cy="40" rx="5" ry="10" fill={getPartColor('ears')} className="hover:opacity-80" />
        </g>
        
        {/* Neck */}
        <rect 
          x="90" y="75" width="20" height="20" rx="5"
          fill={getPartColor('throat')}
          className="cursor-pointer hover:opacity-80"
          onClick={() => onPartClick('throat')}
        />
        
        {/* Torso */}
        <path 
          d="M60 95 L60 200 Q60 220 80 220 L120 220 Q140 220 140 200 L140 95 Q140 85 100 85 Q60 85 60 95"
          fill="#e2e8f0"
          stroke="#cbd5e1"
          strokeWidth="1"
        />
        
        {/* Heart */}
        <g onClick={() => onPartClick('heart')} className="cursor-pointer">
          <path 
            d="M95 115 C85 105, 75 115, 75 125 C75 140, 95 155, 100 160 C105 155, 125 140, 125 125 C125 115, 115 105, 105 115 C105 110, 95 110, 95 115"
            fill={getPartColor('heart')}
            className={`transition-all hover:scale-105 ${getPulse('heart') ? 'animate-pulse' : ''}`}
            style={{ transformOrigin: '100px 135px' }}
          />
        </g>
        
        {/* Lungs */}
        <g onClick={() => onPartClick('lungs')} className="cursor-pointer">
          <ellipse cx="75" cy="140" rx="12" ry="25" fill={getPartColor('lungs')} opacity="0.7" className="hover:opacity-100" />
          <ellipse cx="125" cy="140" rx="12" ry="25" fill={getPartColor('lungs')} opacity="0.7" className="hover:opacity-100" />
        </g>
        
        {/* Liver */}
        <ellipse 
          cx="115" cy="175" rx="18" ry="12"
          fill={getPartColor('liver')}
          opacity="0.8"
          className="cursor-pointer hover:opacity-100"
          onClick={() => onPartClick('liver')}
        />
        
        {/* Stomach */}
        <ellipse 
          cx="90" cy="180" rx="15" ry="18"
          fill={getPartColor('stomach')}
          opacity="0.8"
          className="cursor-pointer hover:opacity-100"
          onClick={() => onPartClick('stomach')}
        />
        
        {/* Kidneys */}
        <g onClick={() => onPartClick('kidneys')} className="cursor-pointer">
          <ellipse cx="75" cy="195" rx="8" ry="12" fill={getPartColor('kidneys')} className="hover:opacity-80" />
          <ellipse cx="125" cy="195" rx="8" ry="12" fill={getPartColor('kidneys')} className="hover:opacity-80" />
        </g>
        
        {/* Arms - Left */}
        <path 
          d="M60 100 Q40 100 35 150 Q30 200 40 240"
          stroke={getPartColor('muscles')}
          strokeWidth="18"
          strokeLinecap="round"
          fill="none"
          className="cursor-pointer hover:opacity-80"
          onClick={() => onPartClick('muscles')}
        />
        
        {/* Arms - Right */}
        <path 
          d="M140 100 Q160 100 165 150 Q170 200 160 240"
          stroke={getPartColor('muscles')}
          strokeWidth="18"
          strokeLinecap="round"
          fill="none"
          className="cursor-pointer hover:opacity-80"
          onClick={() => onPartClick('muscles')}
        />
        
        {/* Hands */}
        <g onClick={() => onPartClick('skin')} className="cursor-pointer">
          <circle cx="40" cy="250" r="12" fill={getPartColor('skin')} className={`hover:opacity-80 ${getPulse('skin') ? 'animate-pulse' : ''}`} />
          <circle cx="160" cy="250" r="12" fill={getPartColor('skin')} className={`hover:opacity-80 ${getPulse('skin') ? 'animate-pulse' : ''}`} />
        </g>
        
        {/* Legs */}
        <g onClick={() => onPartClick('bones')} className="cursor-pointer">
          <path 
            d="M80 220 L75 320 Q73 340 80 350"
            stroke={getPartColor('bones')}
            strokeWidth="22"
            strokeLinecap="round"
            fill="none"
            className="hover:opacity-80"
          />
          <path 
            d="M120 220 L125 320 Q127 340 120 350"
            stroke={getPartColor('bones')}
            strokeWidth="22"
            strokeLinecap="round"
            fill="none"
            className="hover:opacity-80"
          />
        </g>
        
        {/* Feet */}
        <g onClick={() => onPartClick('bones')} className="cursor-pointer">
          <ellipse cx="80" cy="365" rx="15" ry="8" fill={getPartColor('bones')} className="hover:opacity-80" />
          <ellipse cx="120" cy="365" rx="15" ry="8" fill={getPartColor('bones')} className="hover:opacity-80" />
        </g>
        
        {/* Blood circulation indicator */}
        <circle 
          cx="100" cy="200" r="60" 
          fill="none" 
          stroke={getPartColor('blood')}
          strokeWidth="2"
          strokeDasharray="5,5"
          opacity="0.3"
          className="cursor-pointer"
          onClick={() => onPartClick('blood')}
        />
        
        {/* Immune system indicator */}
        <circle 
          cx="100" cy="150" r="80" 
          fill="none" 
          stroke={getPartColor('immune')}
          strokeWidth="1"
          strokeDasharray="3,6"
          opacity="0.2"
          className="cursor-pointer"
          onClick={() => onPartClick('immune')}
        />
      </svg>
      
      {/* Legend */}
      <div className="flex justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span className="text-slate-500">{isBn ? 'ভালো' : 'Good'}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-amber-500"></span>
          <span className="text-slate-500">{isBn ? 'সতর্ক' : 'Attention'}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <span className="text-slate-500">{isBn ? 'উদ্বেগ' : 'Concern'}</span>
        </div>
      </div>
    </div>
  );
};

// ============ MAIN COMPONENT ============
export const PatientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';
  
  // State
  const [activeTab, setActiveTab] = useState<'overview' | 'doctors' | 'reports' | 'chat' | 'profile'>('overview');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'model', 
      text: isBn 
        ? 'আসসালামু আলাইকুম রহিম ভাই! আমি নির্ণয় - আপনার ব্যক্তিগত স্বাস্থ্য সহকারী। আপনার শরীরের যেকোনো অংশে ক্লিক করুন বা আমাকে জিজ্ঞাসা করুন!'
        : 'Hello Rahim! I\'m Nirnoy - your personal health AI. Click on any body part or ask me anything!',
      timestamp: Date.now() 
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null);
  const [bodyHealth, setBodyHealth] = useState<BodyPartHealth[]>(INITIAL_BODY_HEALTH);
  const [expandedConsultation, setExpandedConsultation] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<{ type: string; text: string; time: Date; bodyPart?: string }[]>([
    { type: 'consultation', text: 'Cardiology checkup completed', time: new Date('2024-11-20'), bodyPart: 'heart' },
    { type: 'vital', text: 'Blood pressure recorded: 118/76', time: new Date('2024-11-15'), bodyPart: 'heart' },
    { type: 'chat', text: 'Asked about medication timing', time: new Date('2024-11-10') },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Calculate overall health score
  const overallHealthScore = useMemo(() => {
    const total = bodyHealth.reduce((sum, part) => sum + part.score, 0);
    return Math.round(total / bodyHealth.length);
  }, [bodyHealth]);

  // Get status counts
  const statusCounts = useMemo(() => {
    return {
      excellent: bodyHealth.filter(p => p.status === 'excellent').length,
      good: bodyHealth.filter(p => p.status === 'good').length,
      attention: bodyHealth.filter(p => p.status === 'attention').length,
      concern: bodyHealth.filter(p => p.status === 'concern').length,
    };
  }, [bodyHealth]);

  // Translations
  const t = {
    healthBrain: isBn ? 'স্বাস্থ্য মস্তিষ্ক' : 'Health Brain',
    overview: isBn ? 'সারসংক্ষেপ' : 'Overview',
    myDoctors: isBn ? 'আমার ডাক্তারগণ' : 'My Doctors',
    reports: isBn ? 'রিপোর্ট' : 'Reports',
    aiAssistant: isBn ? 'এআই সহকারী' : 'AI Assistant',
    profile: isBn ? 'প্রোফাইল' : 'Profile',
    overallHealth: isBn ? 'সামগ্রিক স্বাস্থ্য' : 'Overall Health',
    bodyStatus: isBn ? 'শরীরের অবস্থা' : 'Body Status',
    clickToExplore: isBn ? 'বিস্তারিত দেখতে ক্লিক করুন' : 'Click to explore',
    recentActivity: isBn ? 'সাম্প্রতিক কার্যকলাপ' : 'Recent Activity',
    aiInsights: isBn ? 'এআই বিশ্লেষণ' : 'AI Insights',
    vitalTrends: isBn ? 'ভাইটাল ট্রেন্ড' : 'Vital Trends',
    askAbout: isBn ? 'এই অংশ সম্পর্কে জিজ্ঞাসা করুন' : 'Ask about this',
    issues: isBn ? 'সমস্যা' : 'Issues',
    lastChecked: isBn ? 'সর্বশেষ পরীক্ষা' : 'Last Checked',
    score: isBn ? 'স্কোর' : 'Score',
    bookAppointment: isBn ? 'অ্যাপয়েন্টমেন্ট নিন' : 'Book Appointment',
    noIssues: isBn ? 'কোনো সমস্যা নেই' : 'No issues detected',
    analyzing: isBn ? 'বিশ্লেষণ করছি...' : 'Analyzing...',
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle body part click
  const handleBodyPartClick = (partId: string) => {
    setSelectedBodyPart(partId);
    const part = bodyHealth.find(p => p.id === partId);
    if (part) {
      // Add to chat as AI response about this body part
      const statusText = {
        excellent: isBn ? 'চমৎকার অবস্থায়' : 'in excellent condition',
        good: isBn ? 'ভালো অবস্থায়' : 'in good condition',
        attention: isBn ? 'সামান্য সতর্কতা প্রয়োজন' : 'needs some attention',
        concern: isBn ? 'উদ্বেগজনক অবস্থায়' : 'is a concern area',
      };
      
      const issueText = part.issues.length > 0 
        ? (isBn ? `সমস্যাসমূহ: ${part.issues.join(', ')}` : `Issues: ${part.issues.join(', ')}`)
        : (isBn ? 'কোনো সমস্যা শনাক্ত হয়নি।' : 'No issues detected.');
      
      const newMessage: ChatMessage = {
        role: 'model',
        text: isBn 
          ? `📍 **${part.nameBn}** (স্কোর: ${part.score}/100)\n\nআপনার ${part.nameBn} ${statusText[part.status]}। ${issueText}\n\n${part.lastChecked ? `সর্বশেষ পরীক্ষা: ${part.lastChecked}` : ''}\n\nএই অংশ সম্পর্কে আরো জানতে বা পরামর্শ নিতে প্রশ্ন করুন।`
          : `📍 **${part.name}** (Score: ${part.score}/100)\n\nYour ${part.name.toLowerCase()} is ${statusText[part.status]}. ${issueText}\n\n${part.lastChecked ? `Last checked: ${part.lastChecked}` : ''}\n\nAsk me anything about this or book a specialist appointment.`,
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, newMessage]);
    }
  };

  // Handle chat message
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg: ChatMessage = { role: 'user', text: chatInput, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    
    // Detect body parts mentioned in the message
    const mentionedParts = bodyHealth.filter(part => 
      chatInput.toLowerCase().includes(part.name.toLowerCase()) ||
      chatInput.toLowerCase().includes(part.nameBn)
    );
    
    // Update recent activity
    setRecentActivity(prev => [
      { type: 'chat', text: chatInput.slice(0, 50) + (chatInput.length > 50 ? '...' : ''), time: new Date(), bodyPart: mentionedParts[0]?.id },
      ...prev.slice(0, 9)
    ]);
    
    // If a body part is mentioned, potentially update its data
    if (mentionedParts.length > 0) {
      // This simulates AI updating health data based on conversation
      // In real app, this would come from actual analysis
      mentionedParts.forEach(part => {
        if (chatInput.toLowerCase().includes('pain') || chatInput.toLowerCase().includes('ব্যথা') ||
            chatInput.toLowerCase().includes('problem') || chatInput.toLowerCase().includes('সমস্যা')) {
          setBodyHealth(prev => prev.map(p => 
            p.id === part.id 
              ? { ...p, status: 'attention' as const, issues: [...p.issues, 'User reported discomfort'] }
              : p
          ));
        }
      });
    }
    
    setChatInput('');
    setIsTyping(true);

    // Build patient context
    const context = `
      Patient: ${PATIENT_PROFILE.name}, Age: ${new Date().getFullYear() - new Date(PATIENT_PROFILE.dateOfBirth).getFullYear()}
      Overall Health Score: ${overallHealthScore}/100
      Areas needing attention: ${bodyHealth.filter(p => p.status === 'attention' || p.status === 'concern').map(p => p.name).join(', ')}
      Current medications: ${PATIENT_PROFILE.currentMedications.join(', ')}
      Allergies: ${PATIENT_PROFILE.allergies.join(', ')}
      ${selectedBodyPart ? `Currently viewing: ${bodyHealth.find(p => p.id === selectedBodyPart)?.name}` : ''}
    `;

    try {
      const responseText = await chatWithHealthAssistant(userMsg.text, messages.map(m => m.text), context);
      const modelMsg: ChatMessage = { role: 'model', text: responseText, timestamp: Date.now() };
      setMessages(prev => [...prev, modelMsg]);
    } catch {
      const errorMsg: ChatMessage = { 
        role: 'model', 
        text: isBn ? 'দুঃখিত, সমস্যা হয়েছে।' : 'Sorry, there was an issue.', 
        timestamp: Date.now() 
      };
      setMessages(prev => [...prev, errorMsg]);
    }
    setIsTyping(false);
  };

  const age = new Date().getFullYear() - new Date(PATIENT_PROFILE.dateOfBirth).getFullYear();
  const bmi = (PATIENT_PROFILE.weight / Math.pow(PATIENT_PROFILE.height / 100, 2)).toFixed(1);

  // ============ RENDER OVERVIEW ============
  const renderOverview = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Section with Body Visualization */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">{isBn ? `স্বাগতম, ${PATIENT_PROFILE.nameBn}!` : `Welcome, ${PATIENT_PROFILE.name}!`}</h1>
              <p className="text-white/60 text-sm">{isBn ? 'আপনার সম্পূর্ণ স্বাস্থ্য মানচিত্র' : 'Your complete health map'}</p>
            </div>
            
            {/* Overall Score */}
            <div className="mt-4 md:mt-0 flex items-center gap-4 bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="relative w-16 h-16">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="none" />
                  <circle 
                    cx="32" cy="32" r="28" 
                    stroke="url(#gradient)" 
                    strokeWidth="6" 
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${(overallHealthScore / 100) * 176} 176`}
                  />
                  <defs>
                    <linearGradient id="gradient">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#14b8a6" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">{overallHealthScore}</span>
              </div>
              <div>
                <p className="text-xs text-white/60 uppercase font-bold">{t.overallHealth}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-green-400 text-xs"><i className="fas fa-arrow-up"></i> +3</span>
                  <span className="text-xs text-white/40">{isBn ? 'গত মাস থেকে' : 'from last month'}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Main Grid: Body + Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Body Visualization */}
            <div className="lg:col-span-1 bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
              <h3 className="text-sm font-bold text-white/80 mb-2 flex items-center gap-2">
                <i className="fas fa-body text-teal-400"></i> {t.bodyStatus}
              </h3>
              <p className="text-xs text-white/40 mb-4">{t.clickToExplore}</p>
              <HumanBodySVG 
                bodyHealth={bodyHealth}
                selectedPart={selectedBodyPart}
                onPartClick={handleBodyPartClick}
                isBn={isBn}
              />
            </div>
            
            {/* Right Side: Stats + Selected Part Details */}
            <div className="lg:col-span-2 space-y-4">
              {/* Status Summary */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: isBn ? 'চমৎকার' : 'Excellent', count: statusCounts.excellent, color: 'bg-emerald-500', icon: 'fa-star' },
                  { label: isBn ? 'ভালো' : 'Good', count: statusCounts.good, color: 'bg-green-500', icon: 'fa-check' },
                  { label: isBn ? 'সতর্ক' : 'Attention', count: statusCounts.attention, color: 'bg-amber-500', icon: 'fa-exclamation' },
                  { label: isBn ? 'উদ্বেগ' : 'Concern', count: statusCounts.concern, color: 'bg-red-500', icon: 'fa-times' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                    <div className={`w-8 h-8 ${stat.color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                      <i className={`fas ${stat.icon} text-white text-xs`}></i>
                    </div>
                    <p className="text-2xl font-bold">{stat.count}</p>
                    <p className="text-[10px] text-white/50 uppercase">{stat.label}</p>
                  </div>
                ))}
              </div>
              
              {/* Selected Part Details */}
              {selectedBodyPart && (
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10 animate-fade-in">
                  {(() => {
                    const part = bodyHealth.find(p => p.id === selectedBodyPart);
                    if (!part) return null;
                    
                    const statusColors = {
                      excellent: 'text-emerald-400 bg-emerald-500/20',
                      good: 'text-green-400 bg-green-500/20',
                      attention: 'text-amber-400 bg-amber-500/20',
                      concern: 'text-red-400 bg-red-500/20',
                    };
                    
                    return (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${statusColors[part.status]} flex items-center justify-center`}>
                              <i className="fas fa-crosshairs"></i>
                            </div>
                            <div>
                              <h4 className="font-bold">{isBn ? part.nameBn : part.name}</h4>
                              <p className="text-xs text-white/50">{t.score}: {part.score}/100</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              setChatInput(isBn ? `আমার ${part.nameBn} সম্পর্কে বিস্তারিত বলুন` : `Tell me more about my ${part.name.toLowerCase()}`);
                            }}
                            className="px-3 py-1.5 bg-teal-500/20 text-teal-300 rounded-lg text-xs hover:bg-teal-500/30 transition"
                          >
                            <i className="fas fa-robot mr-1"></i> {t.askAbout}
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-white/40 mb-1">{t.issues}</p>
                            {part.issues.length > 0 ? (
                              <ul className="space-y-1">
                                {part.issues.map((issue, i) => (
                                  <li key={i} className="flex items-center gap-2 text-amber-300">
                                    <i className="fas fa-exclamation-circle text-xs"></i>
                                    <span>{issue}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-green-400"><i className="fas fa-check-circle mr-1"></i>{t.noIssues}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-white/40 mb-1">{t.lastChecked}</p>
                            <p className="text-white/80">{part.lastChecked || (isBn ? 'পরীক্ষা হয়নি' : 'Not checked')}</p>
                            {part.doctor && <p className="text-xs text-teal-300 mt-1">{part.doctor}</p>}
                          </div>
                        </div>
                        
                        <div className="mt-4 flex gap-2">
                          <button 
                            onClick={() => navigate('/search')}
                            className="flex-1 py-2 bg-teal-600 rounded-lg text-sm font-bold hover:bg-teal-500 transition"
                          >
                            <i className="fas fa-calendar-plus mr-2"></i>{t.bookAppointment}
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
              
              {/* Quick Stats */}
              {!selectedBodyPart && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: isBn ? 'রক্তচাপ' : 'BP', value: '118/76', unit: 'mmHg', icon: 'fa-heartbeat', color: 'text-red-400' },
                    { label: isBn ? 'হার্ট রেট' : 'HR', value: '70', unit: 'bpm', icon: 'fa-heart', color: 'text-pink-400' },
                    { label: isBn ? 'ওজন' : 'Weight', value: PATIENT_PROFILE.weight.toString(), unit: 'kg', icon: 'fa-weight', color: 'text-purple-400' },
                    { label: 'BMI', value: bmi, unit: '', icon: 'fa-calculator', color: 'text-teal-400' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <i className={`fas ${stat.icon} ${stat.color} text-xs`}></i>
                        <span className="text-xs text-white/50">{stat.label}</span>
                      </div>
                      <p className="text-xl font-bold">{stat.value}<span className="text-xs text-white/30 ml-1">{stat.unit}</span></p>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Recent Activity */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-sm font-bold text-white/80 mb-3 flex items-center gap-2">
                  <i className="fas fa-history text-purple-400"></i> {t.recentActivity}
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                  {recentActivity.slice(0, 5).map((activity, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        activity.type === 'consultation' ? 'bg-teal-500/20 text-teal-400' :
                        activity.type === 'vital' ? 'bg-red-500/20 text-red-400' :
                        'bg-purple-500/20 text-purple-400'
                      }`}>
                        <i className={`fas ${
                          activity.type === 'consultation' ? 'fa-user-md' :
                          activity.type === 'vital' ? 'fa-heartbeat' :
                          'fa-comment'
                        } text-xs`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/80 truncate">{activity.text}</p>
                        <p className="text-xs text-white/40">{activity.time.toLocaleDateString()}</p>
                      </div>
                      {activity.bodyPart && (
                        <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] text-white/50">
                          {bodyHealth.find(p => p.id === activity.bodyPart)?.[isBn ? 'nameBn' : 'name']}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* AI Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <h4 className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2">
            <i className="fas fa-arrow-trend-up"></i> {isBn ? 'ইতিবাচক প্রবণতা' : 'Positive Trends'}
          </h4>
          <ul className="space-y-2 text-sm text-emerald-700">
            <li className="flex items-start gap-2">
              <i className="fas fa-check-circle mt-0.5 text-emerald-500"></i>
              {isBn ? 'হৃদযন্ত্র: রক্তচাপ নিয়ন্ত্রণে আছে' : 'Heart: Blood pressure well controlled'}
            </li>
            <li className="flex items-start gap-2">
              <i className="fas fa-check-circle mt-0.5 text-emerald-500"></i>
              {isBn ? 'কিডনি: সব পরীক্ষা স্বাভাবিক' : 'Kidneys: All tests normal'}
            </li>
            <li className="flex items-start gap-2">
              <i className="fas fa-check-circle mt-0.5 text-emerald-500"></i>
              {isBn ? 'ত্বক: ডার্মাটাইটিস সেরে গেছে' : 'Skin: Dermatitis resolved'}
            </li>
          </ul>
        </div>
        
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <h4 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">
            <i className="fas fa-exclamation-triangle"></i> {isBn ? 'সতর্কতা' : 'Attention Needed'}
          </h4>
          <ul className="space-y-2 text-sm text-amber-700">
            <li className="flex items-start gap-2">
              <i className="fas fa-info-circle mt-0.5 text-amber-500"></i>
              {isBn ? 'দাঁত: চেকআপ বাকি আছে' : 'Teeth: Dental checkup overdue'}
            </li>
            <li className="flex items-start gap-2">
              <i className="fas fa-info-circle mt-0.5 text-amber-500"></i>
              {isBn ? 'মাংসপেশী: আরো ব্যায়াম প্রয়োজন' : 'Muscles: Need more exercise'}
            </li>
            <li className="flex items-start gap-2">
              <i className="fas fa-info-circle mt-0.5 text-amber-500"></i>
              {isBn ? 'ফলো-আপ: ২০ ফেব্রুয়ারি' : 'Follow-up: February 20'}
            </li>
          </ul>
        </div>
      </div>
      
      {/* Vital Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <i className="fas fa-heartbeat text-red-500"></i> {isBn ? 'রক্তচাপ' : 'Blood Pressure'}
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={VITALS_HISTORY}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis domain={[60, 150]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="bpSystolic" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} name="Systolic" />
                <Line type="monotone" dataKey="bpDiastolic" stroke="#94a3b8" strokeWidth={2} dot={false} name="Diastolic" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <i className="fas fa-weight text-purple-500"></i> {isBn ? 'ওজন' : 'Weight'}
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={VITALS_HISTORY}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis domain={[70, 76]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="weight" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorWeight)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Inline Chat for Quick Questions */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-xl p-4 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <i className="fas fa-robot"></i>
          </div>
          <div>
            <h4 className="font-bold">{isBn ? 'নির্ণয় হেলথ এআই' : 'Nirnoy Health AI'}</h4>
            <p className="text-xs text-white/70">{isBn ? 'শরীরের যেকোনো অংশ নিয়ে প্রশ্ন করুন' : 'Ask about any body part'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={isBn ? 'আপনার প্রশ্ন লিখুন...' : 'Type your question...'}
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
          <button 
            onClick={handleSendMessage}
            disabled={isTyping || !chatInput.trim()}
            className="px-5 bg-white text-teal-600 rounded-xl font-bold hover:bg-white/90 transition disabled:opacity-50"
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
        {messages.length > 1 && (
          <button 
            onClick={() => setActiveTab('chat')}
            className="mt-3 text-xs text-white/70 hover:text-white transition"
          >
            <i className="fas fa-comments mr-1"></i>
            {isBn ? 'সম্পূর্ণ কথোপকথন দেখুন' : 'View full conversation'} ({messages.length} {isBn ? 'টি বার্তা' : 'messages'})
          </button>
        )}
      </div>
      
      {/* Coming Soon: Family */}
      <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 text-8xl">
          <i className="fas fa-users"></i>
        </div>
        <div className="relative z-10">
          <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-bold mb-3 inline-block">
            {isBn ? 'শীঘ্রই আসছে' : 'Coming Soon'}
          </span>
          <h3 className="text-xl font-bold mb-2">{isBn ? 'নির্ণয় ফ্যামিলি' : 'Nirnoy Family'}</h3>
          <p className="text-white/80 text-sm">{isBn ? 'পরিবারের সবার স্বাস্থ্য এক জায়গায়। শিশু ও বয়স্কদের যত্ন নিন।' : 'Manage your family\'s health in one place. Care for children and elderly.'}</p>
        </div>
      </div>
    </div>
  );

  // ============ RENDER DOCTORS ============
  const renderDoctors = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t.myDoctors}</h1>
          <p className="text-slate-500 text-sm">{isBn ? 'আপনার সকল পরামর্শের ইতিহাস' : 'Your complete consultation history'}</p>
        </div>
      </div>

      <div className="space-y-4">
        {CONSULTATIONS.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div 
              onClick={() => setExpandedConsultation(expandedConsultation === c.id ? null : c.id)}
              className="p-4 cursor-pointer hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-4">
                <img src={c.doctorImage} alt={c.doctorName} className="w-14 h-14 rounded-xl object-cover border-2 border-slate-100" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800">{c.doctorName}</h3>
                  <p className="text-sm text-slate-500">{c.specialty} • {c.chamberName}</p>
                  {c.bodyParts && (
                    <div className="flex gap-1 mt-1">
                      {c.bodyParts.map(partId => {
                        const part = bodyHealth.find(p => p.id === partId);
                        return part ? (
                          <span key={partId} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                            {isBn ? part.nameBn : part.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-medium rounded-full">{c.diagnosis}</span>
                  <p className="text-xs text-slate-400 mt-1">{new Date(c.date).toLocaleDateString()}</p>
                </div>
                <i className={`fas fa-chevron-down text-slate-400 transition-transform ${expandedConsultation === c.id ? 'rotate-180' : ''}`}></i>
              </div>
            </div>

            {expandedConsultation === c.id && (
              <div className="p-4 border-t border-slate-100 bg-slate-50 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{isBn ? 'নোট' : 'Notes'}</h4>
                    <p className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-200">{c.notes}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{isBn ? 'প্রেসক্রিপশন' : 'Prescription'}</h4>
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-slate-100">
                          {c.prescription.map((p, i) => (
                            <tr key={i}>
                              <td className="p-2 font-medium text-slate-700">{p.medicine}</td>
                              <td className="p-2 font-mono text-xs text-slate-600">{p.dosage}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-200">
                  <button 
                    onClick={() => navigate(`/doctors/${c.doctorId}`)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold hover:bg-teal-700 transition"
                  >
                    <i className="fas fa-calendar-plus mr-2"></i>{isBn ? 'আবার বুক করুন' : 'Book Again'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // ============ RENDER CHAT ============
  const renderChat = () => (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden animate-fade-in">
      <div className="flex-shrink-0 p-4 border-b border-slate-100 bg-gradient-to-r from-teal-600 to-teal-500 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <i className="fas fa-robot"></i>
            </div>
            <div>
              <h3 className="font-bold">{isBn ? 'নির্ণয় হেলথ এআই' : 'Nirnoy Health AI'}</h3>
              <p className="text-xs text-white/80">{isBn ? 'আপনার স্বাস্থ্য সহকারী' : 'Your health assistant'}</p>
            </div>
          </div>
          <button 
            onClick={() => setMessages([{ role: 'model', text: isBn ? 'নতুন কথোপকথন!' : 'New conversation!', timestamp: Date.now() }])}
            className="text-xs bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 transition"
          >
            {isBn ? 'রিসেট' : 'Reset'}
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-teal-600 text-white rounded-tr-none' 
                : 'bg-slate-100 text-slate-800 rounded-tl-none'
            }`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none text-slate-500 text-sm flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span>{t.analyzing}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 p-4 border-t border-slate-100 bg-white">
        <div className="flex gap-3">
          <input 
            type="text" 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={isBn ? 'আপনার প্রশ্ন লিখুন...' : 'Type your question...'}
            className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
          />
          <button 
            onClick={handleSendMessage}
            disabled={isTyping || !chatInput.trim()}
            className="px-5 bg-teal-600 rounded-xl text-white hover:bg-teal-700 transition disabled:opacity-50"
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  );

  // ============ RENDER PROFILE ============
  const renderProfile = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-2xl p-6 text-white">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <img src={PATIENT_PROFILE.profileImage} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-white/30" />
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold">{isBn ? PATIENT_PROFILE.nameBn : PATIENT_PROFILE.name}</h1>
            <p className="text-white/80">ID: {PATIENT_PROFILE.id}</p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
              <span className="px-2 py-1 bg-white/20 rounded-full text-xs">{PATIENT_PROFILE.bloodGroup}</span>
              <span className="px-2 py-1 bg-white/20 rounded-full text-xs">{age} {isBn ? 'বছর' : 'years'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-4"><i className="fas fa-user text-teal-500 mr-2"></i>{isBn ? 'ব্যক্তিগত তথ্য' : 'Personal Info'}</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">{isBn ? 'ফোন' : 'Phone'}</span><span className="font-medium">{PATIENT_PROFILE.phone}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">{isBn ? 'ইমেইল' : 'Email'}</span><span className="font-medium">{PATIENT_PROFILE.email}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">{isBn ? 'জন্ম তারিখ' : 'DOB'}</span><span className="font-medium">{new Date(PATIENT_PROFILE.dateOfBirth).toLocaleDateString()}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-4"><i className="fas fa-heartbeat text-red-500 mr-2"></i>{isBn ? 'স্বাস্থ্য তথ্য' : 'Health Info'}</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">{isBn ? 'রক্তের গ্রুপ' : 'Blood'}</span><span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-bold">{PATIENT_PROFILE.bloodGroup}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">{isBn ? 'উচ্চতা' : 'Height'}</span><span className="font-medium">{PATIENT_PROFILE.height} cm</span></div>
            <div className="flex justify-between"><span className="text-slate-500">{isBn ? 'ওজন' : 'Weight'}</span><span className="font-medium">{PATIENT_PROFILE.weight} kg</span></div>
            <div className="flex justify-between"><span className="text-slate-500">BMI</span><span className="font-medium">{bmi}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-4"><i className="fas fa-exclamation-triangle text-amber-500 mr-2"></i>{isBn ? 'এলার্জি' : 'Allergies'}</h3>
          <div className="flex flex-wrap gap-2">
            {PATIENT_PROFILE.allergies.map((a) => (
              <span key={a} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium">{a}</span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-4"><i className="fas fa-pills text-purple-500 mr-2"></i>{isBn ? 'বর্তমান ওষুধ' : 'Current Meds'}</h3>
          <div className="space-y-2">
            {PATIENT_PROFILE.currentMedications.map((m) => (
              <div key={m} className="flex items-center gap-3 p-2 bg-purple-50 rounded-lg">
                <i className="fas fa-capsules text-purple-500"></i>
                <span className="text-sm font-medium text-purple-800">{m}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ============ RENDER REPORTS (Simplified) ============
  const renderReports = () => (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-2xl font-bold text-slate-800">{t.reports}</h1></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { name: isBn ? 'রক্ত পরীক্ষা' : 'Blood Tests', icon: 'fa-vial', count: 8, color: 'bg-red-50 text-red-600' },
          { name: isBn ? 'ইমেজিং' : 'Imaging', icon: 'fa-x-ray', count: 3, color: 'bg-blue-50 text-blue-600' },
          { name: isBn ? 'প্রেসক্রিপশন' : 'Prescriptions', icon: 'fa-prescription', count: 12, color: 'bg-green-50 text-green-600' },
          { name: isBn ? 'অন্যান্য' : 'Others', icon: 'fa-file-medical', count: 5, color: 'bg-purple-50 text-purple-600' },
        ].map((cat) => (
          <div key={cat.name} className={`${cat.color} rounded-xl p-4 cursor-pointer hover:shadow-md transition`}>
            <i className={`fas ${cat.icon} text-2xl mb-2`}></i>
            <p className="font-bold">{cat.name}</p>
            <p className="text-sm opacity-70">{cat.count} {isBn ? 'টি' : 'files'}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // ============ MAIN RENDER ============
  const tabs = [
    { id: 'overview', label: t.overview, icon: 'fa-home' },
    { id: 'doctors', label: t.myDoctors, icon: 'fa-user-md' },
    { id: 'reports', label: t.reports, icon: 'fa-file-medical' },
    { id: 'chat', label: t.aiAssistant, icon: 'fa-robot' },
    { id: 'profile', label: t.profile, icon: 'fa-user' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Desktop */}
      <div className="w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col flex-shrink-0 h-screen sticky top-0">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <img src={PATIENT_PROFILE.profileImage} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-slate-100" />
            <div className="min-w-0">
              <h3 className="font-bold text-slate-800 truncate">{isBn ? PATIENT_PROFILE.nameBn : PATIENT_PROFILE.name}</h3>
              <p className="text-xs text-slate-500">ID: {PATIENT_PROFILE.id}</p>
            </div>
          </div>
        </div>

        <div className="p-4 mx-4 mt-4 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-700">{t.overallHealth}</span>
            <span className="text-2xl font-bold text-teal-600">{overallHealthScore}</span>
          </div>
          <div className="mt-2 h-2 bg-teal-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full" style={{ width: `${overallHealthScore}%` }}></div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium transition ${
                activeTab === tab.id ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <i className={`fas ${tab.icon} w-5 text-center`}></i> {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={() => navigate('/')} className="w-full text-left px-4 py-2 text-sm text-slate-500 hover:text-slate-700 flex items-center gap-3">
            <i className="fas fa-sign-out-alt"></i> {isBn ? 'লগআউট' : 'Logout'}
          </button>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
        <div className="flex justify-around py-2">
          {tabs.map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center gap-1 px-3 py-2 ${activeTab === tab.id ? 'text-teal-600' : 'text-slate-400'}`}
            >
              <i className={`fas ${tab.icon} text-lg`}></i>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'doctors' && renderDoctors()}
          {activeTab === 'reports' && renderReports()}
          {activeTab === 'chat' && renderChat()}
          {activeTab === 'profile' && renderProfile()}
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
