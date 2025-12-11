/**
 * NIRNOY PATIENT DASHBOARD - PRODUCTION v3
 * =========================================
 * Clean left sidebar, 60-30-10 color rule
 * Built for 1,000,000+ users
 * All data in Supabase - NO localStorage
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, PatientProfile } from '../contexts/AuthContext';
import { saveFeedback, getUserFeedbacks, FeedbackData } from '../components/FeedbackWidget';
import { chatWithHealthAssistant } from '../services/geminiService';
import { aiChatService, authService, supabase, isSupabaseConfigured } from '../services/supabaseAuth';
import { getPatientMedicalHistory, CompleteMedicalHistory, getPatientHistoryForDoctor } from '../services/medicalHistoryService';

// Import Patient Components
import { 
  ProfileManager, 
  MedicalHistoryManager, 
  HealthRecords,
  AppointmentManager,
  PrescriptionTracker,
  HealthDashboard,
  MyDoctors,
  MedicationTracker,
  type MedicalHistoryData,
  type HealthRecord,
  type Appointment as AppointmentType,
  type Prescription,
  type VitalSign,
  type HealthGoal,
  type HealthInsight,
  type DoctorConnection
} from '../components/patient';

// ============ TYPES ============
type TabId = 'home' | 'appointments' | 'medical-history' | 'health-records' | 'my-doctors' | 'doctors' | 'ai' | 'medication' | 'health-insights' | 'food-scan' | 'quiz' | 'food-chart' | 'incentives' | 'advanced-ai' | 'feedback' | 'profile' | 'prescriptions';

interface AppointmentData {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  chamberName: string;
  chamberAddress: string;
  date: string;
  time: string;
  serialNumber: number;
  visitType: string;
  status: string;
  fee: number;
  symptoms?: string;
  isFamilyBooking?: boolean;
  familyMemberName?: string;
  familyRelation?: string;
}

interface NavItem {
  id: TabId;
  icon: string;
  label: string;
  labelBn: string;
  paid?: boolean;
  comingSoon?: boolean;
}

// ============ NAVIGATION CONFIG ============
const NAV_ITEMS: NavItem[] = [
  { id: 'home', icon: '🏠', label: 'Home', labelBn: 'হোম' },
  { id: 'profile', icon: '👤', label: 'My Profile', labelBn: 'আমার প্রোফাইল' },
  { id: 'health-insights', icon: '📊', label: 'Health Dashboard', labelBn: 'স্বাস্থ্য ড্যাশবোর্ড' },
  { id: 'appointments', icon: '📅', label: 'My Appointments', labelBn: 'আমার অ্যাপয়েন্টমেন্ট' },
  { id: 'prescriptions', icon: '💊', label: 'Prescriptions', labelBn: 'প্রেসক্রিপশন' },
  { id: 'medical-history', icon: '📋', label: 'Medical History', labelBn: 'চিকিৎসা ইতিহাস' },
  { id: 'health-records', icon: '📁', label: 'Health Records', labelBn: 'স্বাস্থ্য রেকর্ড' },
  { id: 'my-doctors', icon: '👨‍⚕️', label: 'My Doctors', labelBn: 'আমার ডাক্তাররা' },
  { id: 'doctors', icon: '🔍', label: 'Find Doctors', labelBn: 'ডাক্তার খুঁজুন' },
  { id: 'ai', icon: '🤖', label: 'AI Assistant', labelBn: 'এআই সহায়ক' },
  { id: 'medication', icon: '⏰', label: 'Medication Tracker', labelBn: 'ওষুধ ট্র্যাকার', paid: true },
  { id: 'food-scan', icon: '📷', label: 'Ki Khacchi', labelBn: 'কি খাচ্ছি', paid: true },
  { id: 'quiz', icon: '🎯', label: 'Health Quiz', labelBn: 'স্বাস্থ্য কুইজ', paid: true },
  { id: 'food-chart', icon: '🥗', label: 'Food Chart', labelBn: 'খাদ্য তালিকা', paid: true },
  { id: 'incentives', icon: '🎁', label: 'Rewards', labelBn: 'পুরস্কার' },
  { id: 'advanced-ai', icon: '🧠', label: 'Advanced AI', labelBn: 'অ্যাডভান্সড এআই', paid: true, comingSoon: true },
  { id: 'feedback', icon: '💬', label: 'Feedback', labelBn: 'মতামত' },
];

// ============ COMPONENT ============
export const PatientDashboard: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { user, role, logout, isLoading, updateProfile } = useAuth();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Core state
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // AI Chat state
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{role: string; content: string; timestamp?: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Profile state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [editForm, setEditForm] = useState({ name: '', email: '', dateOfBirth: '', gender: '', bloodGroup: '', heightCm: '', weightKg: '', chronicConditions: '', allergies: '', emergencyContactName: '', emergencyContactPhone: '' });
  
  // Quiz state
  const [quizActive, setQuizActive] = useState(false);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  
  // Feedback state
  const [fbText, setFbText] = useState('');
  const [fbCat, setFbCat] = useState<'general' | 'bug' | 'feature' | 'complaint'>('general');
  const [fbSent, setFbSent] = useState(false);
  const [myFeedbacks, setMyFeedbacks] = useState<FeedbackData[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  
  // Appointments state
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  
  // Medical History state
  const [medicalHistory, setMedicalHistory] = useState<CompleteMedicalHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [retryHistoryCount, setRetryHistoryCount] = useState(0);
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState<any>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  
  // Doctor visits (mock for now, will be from Supabase)
  const [doctorVisits, setDoctorVisits] = useState<any[]>([]);
  
  const patientUser = useMemo(() => (user && (role === 'patient' || role === 'PATIENT')) ? user as PatientProfile : null, [user, role]);

  // Comprehensive Health Metrics Calculation
  const healthMetrics = useMemo(() => {
    if (!patientUser) return { score: 75, bmi: null, bmiCategory: 'Unknown', age: null, riskLevel: 'Low' };
    
    let score = 85; // Start with good baseline
    let bmi: number | null = null;
    let bmiCategory = 'Unknown';
    let age: number | null = null;
    let riskLevel = 'Low';
    
    // Calculate BMI
    if (patientUser.heightCm && patientUser.weightKg) {
      bmi = patientUser.weightKg / Math.pow(patientUser.heightCm / 100, 2);
      if (bmi < 16) { bmiCategory = 'Severely Underweight'; score -= 20; }
      else if (bmi < 18.5) { bmiCategory = 'Underweight'; score -= 10; }
      else if (bmi < 25) { bmiCategory = 'Normal'; score += 10; }
      else if (bmi < 30) { bmiCategory = 'Overweight'; score -= 5; }
      else if (bmi < 35) { bmiCategory = 'Obese (Class I)'; score -= 15; }
      else { bmiCategory = 'Obese (Class II+)'; score -= 25; }
    }
    
    // Calculate Age
    if (patientUser.dateOfBirth) {
      const today = new Date();
      const birthDate = new Date(patientUser.dateOfBirth);
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
      
      // Age-based adjustments
      if (age && age > 60) score -= 5;
      if (age && age > 70) score -= 10;
    }
    
    // Chronic conditions impact
    if (patientUser.chronicConditions?.length) {
      const conditionCount = patientUser.chronicConditions.length;
      score -= conditionCount * 8;
      if (conditionCount >= 3) riskLevel = 'High';
      else if (conditionCount >= 1) riskLevel = 'Medium';
    }
    
    // Allergies impact
    if (patientUser.allergies?.length) {
      score -= patientUser.allergies.length * 3;
    }
    
    // Blood group bonus (just for having complete profile)
    if (patientUser.bloodGroup) score += 2;
    
    // Emergency contact bonus
    if (patientUser.emergencyContactName && patientUser.emergencyContactPhone) score += 3;
    
    // Recent consultation bonus (health-conscious)
    if (medicalHistory && medicalHistory.consultations.length > 0) {
      const lastConsultDate = new Date(medicalHistory.consultations[0].consultationDate);
      const monthsSinceConsult = (new Date().getTime() - lastConsultDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSinceConsult < 6) score += 5;
    }
    
    return {
      score: Math.max(20, Math.min(100, Math.round(score))),
      bmi: bmi ? Math.round(bmi * 10) / 10 : null,
      bmiCategory,
      age,
      riskLevel
    };
  }, [patientUser, medicalHistory]);

  const healthScore = healthMetrics.score;

  // AI Context Mode (self or family)
  const [aiContextMode, setAiContextMode] = useState<'self' | 'family'>('self');
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<string | null>(null);
  const [showAiContext, setShowAiContext] = useState(false);
  const [showChatSessions, setShowChatSessions] = useState(false);

  // Comprehensive Patient context for AI - includes full health profile
  const patientContext = useMemo(() => {
    if (!patientUser) return '';
    
    const context: string[] = [];
    
    // === PATIENT PROFILE ===
    context.push('=== রোগীর তথ্য (Patient Profile) ===');
    context.push(`নাম (Name): ${patientUser.name}`);
    if (patientUser.phone) context.push(`ফোন (Phone): ${patientUser.phone}`);
    if (patientUser.gender) context.push(`লিঙ্গ (Gender): ${patientUser.gender === 'male' ? 'পুরুষ' : 'মহিলা'}`);
    if (healthMetrics.age) context.push(`বয়স (Age): ${healthMetrics.age} বছর`);
    if (patientUser.bloodGroup) context.push(`রক্তের গ্রুপ (Blood Group): ${patientUser.bloodGroup}`);
    
    // === PHYSICAL METRICS ===
    if (patientUser.heightCm || patientUser.weightKg) {
      context.push('\n=== শারীরিক তথ্য (Physical Metrics) ===');
      if (patientUser.heightCm) context.push(`উচ্চতা (Height): ${patientUser.heightCm} cm`);
      if (patientUser.weightKg) context.push(`ওজন (Weight): ${patientUser.weightKg} kg`);
      if (healthMetrics.bmi) context.push(`BMI: ${healthMetrics.bmi} (${healthMetrics.bmiCategory})`);
    }
    
    // === HEALTH SCORE ===
    context.push(`\nস্বাস্থ্য স্কোর (Health Score): ${healthMetrics.score}/100`);
    context.push(`ঝুঁকির মাত্রা (Risk Level): ${healthMetrics.riskLevel === 'High' ? 'উচ্চ' : healthMetrics.riskLevel === 'Medium' ? 'মাঝারি' : 'কম'}`);
    
    // === CHRONIC CONDITIONS ===
    if (patientUser.chronicConditions?.length) {
      context.push('\n=== দীর্ঘমেয়াদী রোগ (Chronic Conditions) ===');
      patientUser.chronicConditions.forEach(c => context.push(`• ${c}`));
    }
    
    // === ALLERGIES ===
    if (patientUser.allergies?.length) {
      context.push('\n=== এলার্জি (Allergies) ===');
      patientUser.allergies.forEach(a => context.push(`⚠️ ${a}`));
    }
    
    // === MEDICAL HISTORY ===
    if (medicalHistory) {
      // Recent Consultations
      if (medicalHistory.consultations.length > 0) {
        context.push('\n=== সাম্প্রতিক পরামর্শ (Recent Consultations) ===');
        medicalHistory.consultations.slice(0, 5).forEach(c => {
          context.push(`📅 ${new Date(c.consultationDate).toLocaleDateString('bn-BD')}`);
          if (c.diagnosis) context.push(`   রোগ নির্ণয়: ${c.diagnosis}`);
          if (c.doctorName) context.push(`   ডাক্তার: ${c.doctorName}`);
        });
      }
      
      // Current Medications
      if (medicalHistory.prescriptions.length > 0) {
        context.push('\n=== বর্তমান ওষুধ (Current Medications) ===');
        const recentPrescriptions = medicalHistory.prescriptions.slice(0, 10);
        recentPrescriptions.forEach(p => {
          context.push(`💊 ${p.medicineName} - ${p.dosage} (${p.duration})`);
        });
      }
      
      // Test Reports
      if (medicalHistory.testReports.length > 0) {
        context.push('\n=== সাম্প্রতিক টেস্ট (Recent Tests) ===');
        medicalHistory.testReports.slice(0, 5).forEach(t => {
          context.push(`🔬 ${t.testName} - ${new Date(t.testDate).toLocaleDateString('bn-BD')}`);
          if (t.findings) context.push(`   ফলাফল: ${t.findings}`);
        });
      }
      
      // Doctors Consulted
      if (medicalHistory.doctors.length > 0) {
        context.push('\n=== যেসব ডাক্তার দেখিয়েছেন (Doctors Consulted) ===');
        medicalHistory.doctors.forEach(d => {
          context.push(`👨‍⚕️ ${d.name} (${d.specialty})`);
        });
      }
    }
    
    // === UPCOMING APPOINTMENTS ===
    const upcomingAppts = appointments.filter(a => new Date(a.date) >= new Date() && a.status !== 'cancelled');
    if (upcomingAppts.length > 0) {
      context.push('\n=== আসন্ন অ্যাপয়েন্টমেন্ট (Upcoming Appointments) ===');
      upcomingAppts.slice(0, 3).forEach(a => {
        context.push(`📅 ${new Date(a.date).toLocaleDateString('bn-BD')} - Dr. ${a.doctorName} (${a.doctorSpecialty})`);
      });
    }
    
    // === EMERGENCY CONTACT ===
    if (patientUser.emergencyContactName) {
      context.push('\n=== জরুরি যোগাযোগ (Emergency Contact) ===');
      context.push(`👤 ${patientUser.emergencyContactName}: ${patientUser.emergencyContactPhone || 'N/A'}`);
    }
    
    return context.join('\n');
  }, [patientUser, healthMetrics, medicalHistory, appointments]);

  // Family context for AI (when accessing family health)
  const familyContext = useMemo(() => {
    // Get family appointments
    const familyAppts = appointments.filter(a => a.isFamilyBooking);
    if (familyAppts.length === 0) return null;
    
    const familyMembers: { name: string; relation: string; appointments: typeof familyAppts }[] = [];
    
    familyAppts.forEach(apt => {
      const existing = familyMembers.find(f => f.name === apt.familyMemberName);
      if (existing) {
        existing.appointments.push(apt);
      } else if (apt.familyMemberName) {
        familyMembers.push({
          name: apt.familyMemberName,
          relation: apt.familyRelation || 'পরিবার',
          appointments: [apt]
        });
      }
    });
    
    return familyMembers;
  }, [appointments]);

  // Load profile into form
  useEffect(() => {
    if (patientUser) {
      setEditForm({
        name: patientUser.name || '', email: patientUser.email || '', dateOfBirth: patientUser.dateOfBirth || '',
        gender: patientUser.gender || '', bloodGroup: patientUser.bloodGroup || '',
        heightCm: patientUser.heightCm ? String(patientUser.heightCm) : '', 
        weightKg: patientUser.weightKg ? String(patientUser.weightKg) : '',
        chronicConditions: (patientUser.chronicConditions || []).join(', '), 
        allergies: (patientUser.allergies || []).join(', '),
        emergencyContactName: patientUser.emergencyContactName || '', 
        emergencyContactPhone: patientUser.emergencyContactPhone || ''
      });
    }
  }, [patientUser]);

  // Initialize AI chat with comprehensive greeting
  useEffect(() => {
    if (patientUser && messages.length === 0) {
      // Build personalized greeting
      let greeting = `আসসালামু আলাইকুম ${patientUser.name}! 👋\n\n`;
      greeting += `আমি নির্ণয় এআই স্বাস্থ্য সহায়ক - Gemini 3 Pro দ্বারা চালিত। 🤖\n\n`;
      greeting += `📋 **আমি আপনার সম্পর্কে যা জানি:**\n`;
      
      // Add known info
      const knownInfo: string[] = [];
      if (healthMetrics.age) knownInfo.push(`• বয়স: ${healthMetrics.age} বছর`);
      if (patientUser.bloodGroup) knownInfo.push(`• রক্তের গ্রুপ: ${patientUser.bloodGroup}`);
      if (healthMetrics.bmi) knownInfo.push(`• BMI: ${healthMetrics.bmi} (${healthMetrics.bmiCategory})`);
      if (patientUser.chronicConditions?.length) knownInfo.push(`• দীর্ঘমেয়াদী অবস্থা: ${patientUser.chronicConditions.join(', ')}`);
      if (patientUser.allergies?.length) knownInfo.push(`• এলার্জি: ${patientUser.allergies.join(', ')}`);
      if (medicalHistory?.consultations.length) knownInfo.push(`• মোট পরামর্শ: ${medicalHistory.consultations.length} টি`);
      if (medicalHistory?.prescriptions.length) knownInfo.push(`• বর্তমান ওষুধ: ${medicalHistory.prescriptions.length} টি`);
      
      if (knownInfo.length > 0) {
        greeting += knownInfo.join('\n');
      } else {
        greeting += `• আপনার প্রোফাইল সম্পূর্ণ করুন আরো ভালো সেবা পেতে`;
      }
      
      greeting += `\n\n✨ **আমি সাহায্য করতে পারি:**\n`;
      greeting += `• স্বাস্থ্য সম্পর্কিত প্রশ্নের উত্তর\n`;
      greeting += `• আপনার চিকিৎসা ইতিহাস বিশ্লেষণ\n`;
      greeting += `• ওষুধ ও পার্শ্বপ্রতিক্রিয়া সম্পর্কে জানানো\n`;
      greeting += `• পরিবারের স্বাস্থ্য তথ্য দেখা\n\n`;
      greeting += `কীভাবে সাহায্য করতে পারি? 😊`;
      
      setMessages([{ 
        role: 'assistant', 
        content: greeting,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [patientUser, messages.length, healthMetrics, medicalHistory]);

  // Scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  
  // Focus input on AI tab
  useEffect(() => {
    if (activeTab === 'ai') setTimeout(() => inputRef.current?.focus(), 200);
  }, [activeTab]);

  // Load chat history
  const loadChatHistory = useCallback(async () => {
    if (!patientUser) return;
    try {
      const history = await aiChatService.getConversations(patientUser.id, 20);
      setChatHistory(history);
    } catch (e) { console.error('[Dashboard] Chat history error:', e); }
  }, [patientUser]);

  useEffect(() => {
    if (activeTab === 'ai') loadChatHistory();
  }, [activeTab, loadChatHistory]);

  const handleLogout = () => { logout(); onLogout?.(); navigate('/', { replace: true }); };

  // AI Chat - Enhanced with full context
  const handleSend = async () => {
    if (!chatInput.trim() || isTyping) return;
    const msg = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg, timestamp: new Date().toISOString() }]);
    setIsTyping(true);
    
    try {
      const prevContext = await aiChatService.getLatestMessages(patientUser?.id || '');
      const allHistory = [...prevContext, ...messages].map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`);
      
      // Build comprehensive context based on mode
      let fullContext = `আপনি নির্ণয় এআই স্বাস্থ্য সহায়ক। আপনি Gemini 3 Pro দ্বারা চালিত। সবসময় বাংলায় উত্তর দিন।
এই রোগীর সম্পূর্ণ তথ্য আপনার কাছে আছে:

${patientContext}`;

      // Add family context if in family mode
      if (aiContextMode === 'family' && familyContext && selectedFamilyMember) {
        const member = familyContext.find(f => f.name === selectedFamilyMember);
        if (member) {
          fullContext += `\n\n=== পরিবারের সদস্যের তথ্য (Family Member: ${member.name}) ===
সম্পর্ক: ${member.relation}
অ্যাপয়েন্টমেন্ট: ${member.appointments.length} টি
সাম্প্রতিক ভিজিট: ${member.appointments.slice(0, 3).map(a => `${new Date(a.date).toLocaleDateString('bn-BD')} - Dr. ${a.doctorName}`).join(', ')}`;
        }
      }
      
      fullContext += `\n\nগুরুত্বপূর্ণ নির্দেশনা:
- এই রোগীর সমস্ত তথ্য মনে রাখুন এবং ব্যক্তিগত পরামর্শ দিন
- জরুরি অবস্থায় অবশ্যই ডাক্তার দেখাতে বলুন
- ওষুধের পরামর্শ দিলে বলুন যে ডাক্তারের সাথে আলোচনা করতে
- সংক্ষিপ্ত, স্পষ্ট এবং সহানুভূতিশীল উত্তর দিন`;
      
      const reply = await chatWithHealthAssistant(msg, allHistory, fullContext);
      setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: new Date().toISOString() }]);
      
      // Save conversation
      if (patientUser) {
        const summary = msg.substring(0, 50);
        await aiChatService.saveConversation(patientUser.id, [...messages, { role: 'user', content: msg }, { role: 'assistant', content: reply }], summary);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'দুঃখিত, সমস্যা হয়েছে। আবার চেষ্টা করুন।', timestamp: new Date().toISOString() }]);
    }
    
    setIsTyping(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Save profile
  const handleSaveProfile = async () => {
    if (!patientUser || !updateProfile) return;
    setSaving(true);
    setSaveMsg('');
    
    const updates = {
      name: editForm.name, email: editForm.email || undefined, dateOfBirth: editForm.dateOfBirth || undefined,
      gender: editForm.gender as any || undefined, bloodGroup: editForm.bloodGroup || undefined,
      heightCm: editForm.heightCm ? parseInt(editForm.heightCm) : undefined,
      weightKg: editForm.weightKg ? parseFloat(editForm.weightKg) : undefined,
      chronicConditions: editForm.chronicConditions ? editForm.chronicConditions.split(',').map(s => s.trim()).filter(Boolean) : [],
      allergies: editForm.allergies ? editForm.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
      emergencyContactName: editForm.emergencyContactName || undefined,
      emergencyContactPhone: editForm.emergencyContactPhone || undefined
    };
    
    const success = await updateProfile(updates);
    if (success) {
      await authService.refreshPatientData(patientUser.id);
      setSaveMsg('✅ সংরক্ষিত!');
      setIsEditing(false);
    } else {
      setSaveMsg('❌ ব্যর্থ');
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  // Submit feedback
  const submitFeedback = async () => {
    if (!fbText.trim() || !patientUser) return;
    await saveFeedback({
      id: Date.now().toString(), type: fbCat, mood: 'neutral', message: fbText,
      page: '/patient-dashboard', userAgent: navigator.userAgent, timestamp: new Date().toISOString(),
      userId: patientUser.id, userRole: 'patient', userName: patientUser.name, status: 'new'
    });
    setFbSent(true);
    setFbText('');
    setTimeout(() => setFbSent(false), 3000);
  };

  // Check if user has premium
  const isPremium = patientUser?.subscriptionTier === 'premium' || patientUser?.subscriptionTier === 'family';

  // Load user's feedbacks
  const loadMyFeedbacks = useCallback(async () => {
    if (!patientUser) return;
    setLoadingFeedbacks(true);
    try {
      const feedbacks = await getUserFeedbacks(patientUser.id);
      setMyFeedbacks(feedbacks);
      console.log('[Dashboard] Loaded', feedbacks.length, 'user feedbacks');
    } catch (e) {
      console.error('[Dashboard] Feedback load error:', e);
    }
    setLoadingFeedbacks(false);
  }, [patientUser]);

  // Load feedbacks when tab is active
  useEffect(() => {
    if (activeTab === 'feedback') loadMyFeedbacks();
  }, [activeTab, loadMyFeedbacks]);

  // Load user's appointments with improved error handling
  const loadMyAppointments = useCallback(async () => {
    if (!patientUser || !isSupabaseConfigured()) {
      setAppointmentsError('ডাটাবেস সংযোগ নেই। ইন্টারনেট সংযোগ পরীক্ষা করুন।');
      return;
    }
    
    setAppointmentsError(null);
    setLoadingAppointments(true);
    
    try {
      // Query appointments for this patient (either as patient_id or booked_by_id)
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .or(`patient_id.eq.${patientUser.id},booked_by_id.eq.${patientUser.id}`)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      if (error) {
        console.error('[PatientDashboard] Error fetching appointments:', error);
        setAppointmentsError('অ্যাপয়েন্টমেন্ট লোড করতে ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।');
        setLoadingAppointments(false);
        return;
      }

      if (data && data.length > 0) {
        // Get doctor info for each appointment
        const doctorIds = [...new Set(data.map(apt => apt.doctor_id).filter(Boolean))];
        
        let profileMap = new Map();
        let doctorMap = new Map();
        
        if (doctorIds.length > 0) {
          // Fetch doctor profiles
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', doctorIds);
          
          if (profileError) {
            console.warn('[PatientDashboard] Error fetching doctor profiles:', profileError);
          } else {
            profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
          }
          
          // Fetch doctor specialties
          const { data: doctors, error: doctorError } = await supabase
            .from('doctors')
            .select('profile_id, specialties')
            .in('profile_id', doctorIds);
          
          if (doctorError) {
            console.warn('[PatientDashboard] Error fetching doctor specialties:', doctorError);
          } else {
            doctorMap = new Map(doctors?.map(d => [d.profile_id, d]) || []);
          }
        }
        
        const transformedAppointments: AppointmentData[] = data.map(apt => {
          const profile = profileMap.get(apt.doctor_id);
          const doctorData = doctorMap.get(apt.doctor_id);
          
          return {
            id: apt.id,
            doctorId: apt.doctor_id,
            doctorName: profile?.name || 'Unknown Doctor',
            doctorSpecialty: doctorData?.specialties?.[0] || 'General',
            chamberName: apt.chamber_name || 'Chamber',
            chamberAddress: apt.chamber_address || '',
            date: apt.scheduled_date,
            time: apt.scheduled_time,
            serialNumber: apt.serial_number || 1,
            visitType: apt.appointment_type || 'new',
            status: apt.status || 'confirmed',
            fee: apt.fee_paid || 500,
            symptoms: apt.symptoms,
            isFamilyBooking: apt.is_family_booking || false,
            familyMemberName: apt.patient_name,
            familyRelation: apt.family_relation,
          };
        });

        console.log('[PatientDashboard] Loaded', transformedAppointments.length, 'appointments');
        setAppointments(transformedAppointments);
        setAppointmentsError(null);
      } else {
        setAppointments([]);
        setAppointmentsError(null);
      }
    } catch (e: any) {
      console.error('[PatientDashboard] Appointment load error:', e);
      setAppointmentsError(e?.message || 'অ্যাপয়েন্টমেন্ট লোড করতে ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।');
    } finally {
      setLoadingAppointments(false);
    }
  }, [patientUser]);

  // Load medical history with improved error handling
  const loadMedicalHistory = useCallback(async (retry = false) => {
    if (!patientUser || !isSupabaseConfigured()) {
      setHistoryError('ডাটাবেস সংযোগ নেই। ইন্টারনেট সংযোগ পরীক্ষা করুন।');
      return;
    }
    
    // Clear previous errors on new load (unless retry)
    if (!retry) {
      setHistoryError(null);
      setRetryHistoryCount(0);
    }
    
    setLoadingHistory(true);
    try {
      const history = await getPatientMedicalHistory(patientUser.id);
      
      if (!history) {
        throw new Error('চিকিৎসা ইতিহাস লোড করতে ব্যর্থ হয়েছে।');
      }
      
      setMedicalHistory(history);
      setHistoryError(null);
      setRetryHistoryCount(0);
      console.log('[PatientDashboard] Loaded medical history:', history?.consultations.length || 0, 'consultations');
    } catch (e: any) {
      console.error('[PatientDashboard] Medical history load error:', e);
      
      let errorMessage = 'চিকিৎসা ইতিহাস লোড করতে ব্যর্থ হয়েছে।';
      if (e?.message) {
        errorMessage = e.message;
      } else if (e?.code === 'PGRST301' || e?.message?.includes('network')) {
        errorMessage = 'নেটওয়ার্ক ত্রুটি। ইন্টারনেট সংযোগ পরীক্ষা করুন।';
      }
      
      setHistoryError(errorMessage);
      
      // Auto-retry for network errors (max 2 retries)
      if (retryHistoryCount < 2 && (e?.message?.includes('network') || e?.code === 'PGRST301')) {
        setTimeout(() => {
          setRetryHistoryCount(prev => prev + 1);
          loadMedicalHistory(true);
        }, 2000);
      }
    } finally {
      setLoadingHistory(false);
    }
  }, [patientUser, retryHistoryCount]);

  // Load history when tab is active
  useEffect(() => {
    if (activeTab === 'medical-history') loadMedicalHistory();
  }, [activeTab, loadMedicalHistory]);

  // View appointment details (diagnosis, prescription, etc.)
  const viewAppointmentDetails = async (appointmentId: string) => {
    if (!patientUser) return;
    
    setShowAppointmentModal(true);
    setLoadingHistory(true);
    
    try {
      // Get consultation for this appointment
      const { data: consultation } = await supabase
        .from('consultations')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      // Get prescriptions for this appointment
      const { data: prescriptions } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: true });
      
      // Get appointment details
      const { data: appointment } = await supabase
        .from('appointments')
        .select('*, profiles!doctor_id(name)')
        .eq('id', appointmentId)
        .single();
      
      setSelectedAppointmentDetails({
        appointment,
        consultation,
        prescriptions: prescriptions || []
      });
    } catch (e) {
      console.error('[PatientDashboard] Error loading appointment details:', e);
    }
    
    setLoadingHistory(false);
  };

  // Load appointments when tab is active or on mount
  useEffect(() => {
    if (activeTab === 'appointments' || activeTab === 'home') loadMyAppointments();
  }, [activeTab, loadMyAppointments]);

  // Set up real-time subscription for appointments
  useEffect(() => {
    if (!patientUser || !isSupabaseConfigured()) return;

    const subscription = supabase
      .channel('patient-appointments')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          console.log('[PatientDashboard] Real-time appointment update');
          loadMyAppointments();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [patientUser, loadMyAppointments]);

  // Loading state
  if (isLoading || !patientUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 flex">
      {/* GLASSMORPHIC SIDEBAR */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} flex flex-col transition-all duration-300 fixed h-full z-40`}>
        {/* Glass Background */}
        <div className="absolute inset-0 glass-strong rounded-r-3xl"></div>
        
        {/* Content */}
        <div className="relative flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-slate-200/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 glass-card rounded-xl flex items-center justify-center">
                <span className="text-slate-700 font-bold text-xl">ন</span>
              </div>
              {sidebarOpen && <span className="font-bold text-lg text-slate-700">নির্ণয়</span>}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-3 overflow-y-auto">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all rounded-xl mb-1 ${
                  activeTab === item.id 
                    ? 'glass-card text-blue-600 font-medium shadow-lg' 
                    : 'text-slate-600 hover:glass-subtle'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {sidebarOpen && (
                  <div className="flex-1">
                    <span className="block text-sm font-medium">{item.labelBn}</span>
                    {item.paid && !isPremium && (
                      <span className="text-xs text-slate-400">🔒 প্রিমিয়াম</span>
                    )}
                    {item.comingSoon && (
                      <span className="text-xs text-amber-500">শীঘ্রই আসছে</span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-slate-200/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 glass-card rounded-full flex items-center justify-center">
                <span className="font-bold text-blue-600 text-lg">{patientUser.name.charAt(0)}</span>
              </div>
              {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{patientUser.name}</p>
                <p className="text-xs text-slate-500">{isPremium ? '⭐ Premium' : 'Free'}</p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button onClick={handleLogout} className="w-full mt-3 py-2 glass-card hover:glass-strong text-slate-700 rounded-xl text-sm transition-all">
              লগআউট
            </button>
          )}
        </div>

        {/* Toggle */}
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 w-8 h-8 glass-card text-slate-600 rounded-full shadow-lg flex items-center justify-center text-xs hover:scale-110 transition-transform"
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
        </div>
      </aside>

      {/* GLASSMORPHIC MAIN CONTENT */}
      <main className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300 min-h-screen`}>
        {/* Floating Glass Header */}
        <header className="glass-strong sticky top-4 z-30 mx-4 mt-4 rounded-2xl border border-white/60 shadow-xl">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-700">
                {NAV_ITEMS.find(n => n.id === activeTab)?.labelBn}
              </h1>
              <p className="text-sm text-slate-500">
                {NAV_ITEMS.find(n => n.id === activeTab)?.label}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-700">{patientUser.name}</p>
                <p className="text-xs text-slate-500">{patientUser.phone}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6">
          {/* HOME TAB */}
          {activeTab === 'home' && (
            <div className="space-y-6">
              {/* Health Score Card - Enhanced */}
              <div className="glass-strong rounded-3xl p-8 border border-white/60 shadow-2xl relative overflow-hidden">
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/20 pointer-events-none"></div>
                
                <div className="relative flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-700 flex items-center gap-2">
                      স্বাস্থ্য স্কোর
                      {healthMetrics.score >= 80 && <span className="text-2xl opacity-50">🌟</span>}
                      {healthMetrics.score >= 90 && <span className="text-2xl opacity-50">🏆</span>}
                    </h2>
                    <p className="text-slate-500 mt-1">আপনার সামগ্রিক স্বাস্থ্য অবস্থা</p>
                  </div>
                  <div className="text-center glass-card rounded-2xl px-6 py-4 shadow-lg">
                    <div className="text-6xl font-bold leading-none bg-gradient-to-br from-slate-600 to-slate-700 bg-clip-text text-transparent">{healthScore}</div>
                    <div className="text-sm text-slate-400 mt-1">/100</div>
                    <div className={`text-xs font-bold mt-3 px-3 py-1.5 rounded-full border ${
                      healthScore >= 90 ? 'bg-green-50/60 text-green-700 border-green-200/40' : 
                      healthScore >= 75 ? 'bg-amber-50/60 text-amber-700 border-amber-200/40' : 
                      healthScore >= 60 ? 'bg-orange-50/60 text-orange-700 border-orange-200/40' : 
                      'bg-red-50/60 text-red-700 border-red-200/40'
                    }`}>
                      {healthScore >= 90 ? 'চমৎকার' : 
                       healthScore >= 75 ? 'ভালো' : 
                       healthScore >= 60 ? 'সাবধান' : 'ঝুঁকিপূর্ণ'}
                    </div>
                  </div>
                </div>
                <div className="relative mt-6">
                  <div className="glass-subtle rounded-full h-4 overflow-hidden">
                    <div 
                      className={`h-4 rounded-full transition-all duration-1000 ${
                        healthScore >= 90 ? 'bg-gradient-to-r from-green-400/50 to-green-300/50' : 
                        healthScore >= 75 ? 'bg-gradient-to-r from-amber-300/50 to-green-300/50' : 
                        healthScore >= 60 ? 'bg-gradient-to-r from-orange-400/50 to-amber-300/50' : 
                        'bg-gradient-to-r from-red-400/50 to-orange-400/50'
                      }`} 
                      style={{ width: `${healthScore}%` }}
                    ></div>
                  </div>
                </div>
                <div className="relative mt-4 flex items-center justify-between text-sm text-slate-600">
                  <span>ঝুঁকি স্তর: <strong className={healthMetrics.riskLevel === 'High' ? 'text-red-600/80' : healthMetrics.riskLevel === 'Medium' ? 'text-amber-600/80' : 'text-green-600/80'}>
                    {healthMetrics.riskLevel === 'High' ? '⚠️ উচ্চ' : healthMetrics.riskLevel === 'Medium' ? '⚠️ মাঝারি' : '✅ নিম্ন'}
                  </strong></span>
                  {healthMetrics.age && <span>বয়স: <strong className="text-slate-700">{healthMetrics.age} বছর</strong></span>}
                </div>
              </div>

              {/* Health Metrics Grid - Enhanced */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Height */}
                <div className="glass-card p-6 border border-white/50 hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-3xl opacity-50">📏</div>
                    <span className="text-xs text-slate-400 font-medium tracking-wider">HEIGHT</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-700">{patientUser.heightCm || '-'}</div>
                  <div className="text-sm text-slate-500 mt-1">
                    {patientUser.heightCm ? `${patientUser.heightCm} cm` : 'উচ্চতা যোগ করুন'}
                  </div>
                </div>

                {/* Weight */}
                <div className="glass-card p-6 border border-white/50 hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-3xl opacity-50">⚖️</div>
                    <span className="text-xs text-slate-400 font-medium tracking-wider">WEIGHT</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-700">{patientUser.weightKg || '-'}</div>
                  <div className="text-sm text-slate-500 mt-1">
                    {patientUser.weightKg ? `${patientUser.weightKg} kg` : 'ওজন যোগ করুন'}
                  </div>
                </div>

                {/* Blood Group */}
                <div className="glass-card p-6 border border-white/50 hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-3xl opacity-50">🩸</div>
                    <span className="text-xs text-slate-400 font-medium tracking-wider">BLOOD</span>
                  </div>
                  <div className="text-2xl font-bold text-red-600/70">{patientUser.bloodGroup || '-'}</div>
                  <div className="text-sm text-slate-500 mt-1">
                    {patientUser.bloodGroup ? 'রক্তের গ্রুপ' : 'গ্রুপ যোগ করুন'}
                  </div>
                </div>

                {/* Points */}
                <div className="glass-card p-6 border border-white/50 hover:shadow-xl transition-all relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-50/30 to-yellow-50/20 pointer-events-none"></div>
                  <div className="relative flex items-center justify-between mb-3">
                    <div className="text-3xl opacity-50">🏆</div>
                    <span className="text-xs text-amber-600/60 font-medium tracking-wider">POINTS</span>
                  </div>
                  <div className="relative text-2xl font-bold text-amber-700/70">{patientUser.quizPoints || 0}</div>
                  <div className="relative text-sm text-slate-500 mt-1">পয়েন্ট</div>
                </div>
              </div>

              {/* BMI Card - New Comprehensive */}
              {healthMetrics.bmi && (
                <div className="glass-card p-6 border border-white/50 shadow-xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-50/20 via-transparent to-pink-50/15 pointer-events-none"></div>
                  
                  <div className="relative flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                        📊 Body Mass Index (BMI)
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">আপনার শরীরের ভর সূচক</p>
                    </div>
                    <div className="text-center glass-subtle rounded-2xl px-5 py-3 shadow-sm border border-white/40">
                      <div className="text-3xl font-bold text-purple-600/70">{healthMetrics.bmi}</div>
                      <div className="text-xs text-slate-400 mt-1">BMI</div>
                    </div>
                  </div>
                  
                  {/* BMI Category Badge */}
                  <div className="relative">
                    <div className={`inline-block px-4 py-2 rounded-xl text-sm font-bold border ${
                      healthMetrics.bmiCategory === 'Normal' ? 'bg-green-50/60 text-green-700 border-green-200/40' :
                      healthMetrics.bmiCategory === 'Overweight' || healthMetrics.bmiCategory === 'Underweight' ? 'bg-amber-50/60 text-amber-700 border-amber-200/40' :
                      'bg-red-50/60 text-red-700 border-red-200/40'
                    }`}>
                      {healthMetrics.bmiCategory === 'Normal' ? '✓ স্বাভাবিক' :
                       healthMetrics.bmiCategory === 'Overweight' ? '⚠ অতিরিক্ত ওজন' :
                       healthMetrics.bmiCategory === 'Underweight' ? '⚠ কম ওজন' :
                       healthMetrics.bmiCategory === 'Obese (Class I)' ? '⚠ স্থূলতা (মাত্রা ১)' :
                       healthMetrics.bmiCategory === 'Obese (Class II+)' ? '⚠ স্থূলতা (মাত্রা ২+)' :
                       healthMetrics.bmiCategory === 'Severely Underweight' ? '⚠ গুরুতর কম ওজন' :
                       healthMetrics.bmiCategory}
                    </div>
                  </div>

                  {/* BMI Visual Scale */}
                  <div className="relative mt-6">
                    <div className="h-3 rounded-full overflow-hidden flex glass-subtle">
                      <div className="bg-blue-300/30 flex-1"></div>
                      <div className="bg-green-400/30 flex-1"></div>
                      <div className="bg-amber-400/30 flex-1"></div>
                      <div className="bg-orange-400/30 flex-1"></div>
                      <div className="bg-red-400/30 flex-1"></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-2">
                      <span>16</span>
                      <span>18.5</span>
                      <span>25</span>
                      <span>30</span>
                      <span>35+</span>
                    </div>
                    {/* BMI Indicator */}
                    <div 
                      className="absolute -top-1 w-0.5 h-5 bg-slate-600 transition-all"
                      style={{ 
                        left: `${Math.min(Math.max(((healthMetrics.bmi - 16) / (35 - 16)) * 100, 0), 100)}%` 
                      }}
                    >
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-600 rounded-full border-2 border-white shadow-lg"></div>
                    </div>
                  </div>

                  {/* BMI Recommendations */}
                  {healthMetrics.bmiCategory !== 'Normal' && (
                    <div className="relative mt-5 p-4 glass-subtle rounded-xl border border-slate-200/30">
                      <p className="text-xs font-medium text-slate-600">
                        💡 <strong>পরামর্শ:</strong> {
                          healthMetrics.bmiCategory.includes('Underweight') 
                            ? 'পুষ্টিকর খাবার গ্রহণ করুন এবং একজন পুষ্টিবিদের সাথে পরামর্শ করুন।'
                            : healthMetrics.bmiCategory.includes('Overweight')
                            ? 'স্বাস্থ্যকর খাদ্যাভ্যাস এবং নিয়মিত ব্যায়াম করুন।'
                            : healthMetrics.bmiCategory.includes('Obese')
                            ? 'একজন ডাক্তার এবং পুষ্টিবিদের সাথে পরামর্শ করুন। ওজন কমাতে পরিকল্পনা করুন।'
                            : 'একজন বিশেষজ্ঞের সাথে পরামর্শ করুন।'
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Health Alerts */}
              {(patientUser.chronicConditions?.length || patientUser.allergies?.length) ? (
                <div className="glass-card p-6 border border-white/50 shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-50/15 to-orange-50/10 pointer-events-none"></div>
                  
                  <div className="relative flex items-center gap-2 mb-4">
                    <span className="text-2xl opacity-50">⚠️</span>
                    <h3 className="font-bold text-slate-700 text-lg">স্বাস্থ্য সতর্কতা</h3>
                  </div>
                  <div className="relative space-y-4">
                    {patientUser.chronicConditions?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-red-600/60 mb-2 uppercase tracking-wide">দীর্ঘমেয়াদী অবস্থা:</p>
                        <div className="flex flex-wrap gap-2">
                          {patientUser.chronicConditions.map((c, i) => (
                            <span key={i} className="px-3 py-2 glass-subtle text-red-700/80 rounded-xl text-sm font-medium border border-red-200/30">
                              <span className="text-red-500 opacity-40">●</span> {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {patientUser.allergies?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-amber-600/60 mb-2 uppercase tracking-wide">এলার্জি:</p>
                        <div className="flex flex-wrap gap-2">
                          {patientUser.allergies.map((a, i) => (
                            <span key={i} className="px-3 py-2 glass-subtle text-amber-700/80 rounded-xl text-sm font-medium border border-amber-200/30">
                              <span className="text-amber-500 opacity-40">⚠</span> {a}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Health Summary Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-5 border border-white/50 hover:shadow-xl transition-all relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 to-transparent pointer-events-none"></div>
                  <div className="relative text-2xl mb-2 opacity-50">📅</div>
                  <div className="relative text-2xl font-bold text-blue-600/70">{medicalHistory?.consultations.length || 0}</div>
                  <div className="relative text-xs text-slate-500 font-medium mt-1">মোট পরামর্শ</div>
                </div>
                <div className="glass-card p-5 border border-white/50 hover:shadow-xl transition-all relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-50/20 to-transparent pointer-events-none"></div>
                  <div className="relative text-2xl mb-2 opacity-50">💊</div>
                  <div className="relative text-2xl font-bold text-green-600/70">{medicalHistory?.prescriptions.length || 0}</div>
                  <div className="relative text-xs text-slate-500 font-medium mt-1">প্রেসক্রিপশন</div>
                </div>
                <div className="glass-card p-5 border border-white/50 hover:shadow-xl transition-all relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-50/20 to-transparent pointer-events-none"></div>
                  <div className="relative text-2xl mb-2 opacity-50">🔬</div>
                  <div className="relative text-2xl font-bold text-purple-600/70">{medicalHistory?.testReports.length || 0}</div>
                  <div className="relative text-xs text-slate-500 font-medium mt-1">টেস্ট রিপোর্ট</div>
                </div>
                <div className="glass-card p-5 border border-white/50 hover:shadow-xl transition-all relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-50/20 to-transparent pointer-events-none"></div>
                  <div className="relative text-2xl mb-2 opacity-50">👨‍⚕️</div>
                  <div className="relative text-2xl font-bold text-orange-600/70">{medicalHistory?.doctors.length || 0}</div>
                  <div className="relative text-xs text-slate-500 font-medium mt-1">ডাক্তার দেখেছেন</div>
                </div>
              </div>

              {/* Profile Summary */}
              <div className="bg-white rounded-xl p-4 border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800">👤 প্রোফাইল</h3>
                  <button onClick={() => { setActiveTab('home'); setIsEditing(true); }} className="text-blue-600 text-sm">সম্পাদনা →</button>
                </div>
                {isEditing ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { k: 'name', l: 'নাম' }, { k: 'email', l: 'ইমেইল' },
                      { k: 'dateOfBirth', l: 'জন্ম তারিখ', t: 'date' },
                      { k: 'gender', l: 'লিঙ্গ', sel: ['', 'male', 'female'] },
                      { k: 'bloodGroup', l: 'রক্তের গ্রুপ', sel: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
                      { k: 'heightCm', l: 'উচ্চতা (cm)', t: 'number' },
                      { k: 'weightKg', l: 'ওজন (kg)', t: 'number' },
                      { k: 'chronicConditions', l: 'দীর্ঘমেয়াদী রোগ' },
                      { k: 'allergies', l: 'এলার্জি' },
                    ].map(f => (
                      <div key={f.k}>
                        <label className="text-sm text-gray-600 block mb-1">{f.l}</label>
                        {f.sel ? (
                          <select value={(editForm as any)[f.k]} onChange={e => setEditForm({ ...editForm, [f.k]: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                            {f.sel.map(o => <option key={o} value={o}>{o || '-'}</option>)}
                          </select>
                        ) : (
                          <input type={f.t || 'text'} value={(editForm as any)[f.k]} onChange={e => setEditForm({ ...editForm, [f.k]: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                        )}
                      </div>
                    ))}
                    <div className="md:col-span-2 flex gap-2">
                      <button onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded-lg">বাতিল</button>
                      <button onClick={handleSaveProfile} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                        {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ'}
                      </button>
                      {saveMsg && <span className="self-center text-sm">{saveMsg}</span>}
                    </div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-500">নাম:</span> <span className="font-medium">{patientUser.name}</span></div>
                    <div><span className="text-gray-500">ফোন:</span> <span className="font-medium">{patientUser.phone}</span></div>
                    <div><span className="text-gray-500">জন্ম:</span> <span className="font-medium">{patientUser.dateOfBirth || '-'}</span></div>
                    <div><span className="text-gray-500">লিঙ্গ:</span> <span className="font-medium">{patientUser.gender || '-'}</span></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* APPOINTMENTS TAB */}
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              {/* Upcoming Appointments */}
              <div className="bg-white rounded-xl p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-800">📅 আমার অ্যাপয়েন্টমেন্ট</h2>
                  <button 
                    onClick={() => loadMyAppointments()} 
                    disabled={loadingAppointments}
                    className="text-blue-600 text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loadingAppointments ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        <span>লোড হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sync-alt"></i>
                        <span>রিফ্রেশ</span>
                      </>
                    )}
                  </button>
                </div>
                
                {/* Error Message */}
                {appointmentsError && (
                  <div className="mb-4 bg-red-50 border-2 border-red-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm">
                        <i className="fas fa-exclamation"></i>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">{appointmentsError}</p>
                        <button
                          onClick={() => {
                            setAppointmentsError(null);
                            loadMyAppointments();
                          }}
                          className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                        >
                          আবার চেষ্টা করুন
                        </button>
                      </div>
                      <button
                        onClick={() => setAppointmentsError(null)}
                        className="flex-shrink-0 text-red-400 hover:text-red-600 transition"
                        aria-label="বন্ধ করুন"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                )}
                
                {loadingAppointments ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">অ্যাপয়েন্টমেন্ট লোড হচ্ছে...</p>
                    <p className="text-gray-500 text-sm mt-2">অনুগ্রহ করে অপেক্ষা করুন</p>
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">📅</div>
                    <h3 className="text-lg font-medium text-gray-700">কোনো অ্যাপয়েন্টমেন্ট নেই</h3>
                    <p className="text-gray-500 mt-2">আপনার বুক করা অ্যাপয়েন্টমেন্ট এখানে দেখা যাবে।</p>
                    <button onClick={() => navigate('/doctors')} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg">
                      ডাক্তার খুঁজুন
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Separate upcoming and past appointments */}
                    {(() => {
                      const today = new Date().toISOString().split('T')[0];
                      const upcoming = appointments.filter(apt => apt.date >= today && apt.status !== 'cancelled');
                      const past = appointments.filter(apt => apt.date < today || apt.status === 'completed');
                      const cancelled = appointments.filter(apt => apt.status === 'cancelled');
                      
                      return (
                        <>
                          {/* Upcoming */}
                          {upcoming.length > 0 && (
                            <div className="mb-6">
                              <h3 className="text-sm font-bold text-green-600 uppercase mb-3">🟢 আসন্ন অ্যাপয়েন্টমেন্ট ({upcoming.length})</h3>
                              <div className="space-y-3">
                                {upcoming.map((apt) => (
                                  <div key={apt.id} className="p-4 bg-green-50 rounded-xl border border-green-200">
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-green-500 rounded-xl flex flex-col items-center justify-center text-white">
                                          <span className="text-xs font-medium">সিরিয়াল</span>
                                          <span className="text-xl font-bold">#{apt.serialNumber}</span>
                                        </div>
                                        <div>
                                          <h4 className="font-bold text-gray-800">{apt.doctorName}</h4>
                                          <p className="text-sm text-gray-500">{apt.doctorSpecialty}</p>
                                          <p className="text-xs text-gray-400">{apt.chamberName}</p>
                                          {apt.isFamilyBooking && (
                                            <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full mt-1">
                                              👪 {apt.familyMemberName} ({apt.familyRelation})
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-bold text-gray-800">{apt.date}</p>
                                        <p className="text-sm text-blue-600 font-medium">{apt.time?.substring(0, 5)}</p>
                                        <p className="text-sm text-gray-500">৳{apt.fee}</p>
                                      </div>
                                    </div>
                                    {apt.symptoms && (
                                      <div className="mt-3 pt-3 border-t border-green-200">
                                        <p className="text-xs text-gray-500">সমস্যা: <span className="text-gray-700">{apt.symptoms}</span></p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Past */}
                          {past.length > 0 && (
                            <div className="mb-6">
                              <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">⏳ পূর্ববর্তী ({past.length})</h3>
                              <div className="space-y-3">
                                {past.slice(0, 5).map((apt) => (
                                  <div key={apt.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition cursor-pointer" onClick={() => viewAppointmentDetails(apt.id)}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-400 rounded-lg flex items-center justify-center text-white">
                                          <span className="font-bold">#{apt.serialNumber}</span>
                                        </div>
                                        <div>
                                          <h4 className="font-medium text-gray-700">{apt.doctorName}</h4>
                                          <p className="text-sm text-gray-500">{apt.doctorSpecialty}</p>
                                          {apt.status === 'completed' && (
                                            <p className="text-xs text-blue-600 mt-1">📋 রোগ নির্ণয় দেখুন</p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-gray-600">{apt.date}</p>
                                        <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded-full">
                                          {apt.status === 'completed' ? '✓ সম্পন্ন' : 'পাস'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Cancelled */}
                          {cancelled.length > 0 && (
                            <div>
                              <h3 className="text-sm font-bold text-red-500 uppercase mb-3">❌ বাতিল ({cancelled.length})</h3>
                              <div className="space-y-2">
                                {cancelled.slice(0, 3).map((apt) => (
                                  <div key={apt.id} className="p-3 bg-red-50 rounded-lg border border-red-200 text-sm">
                                    <span className="text-gray-700">{apt.doctorName}</span>
                                    <span className="text-gray-400 mx-2">•</span>
                                    <span className="text-gray-500">{apt.date}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
              
              {/* Quick Actions */}
              <div className="bg-white rounded-xl p-4 border">
                <h3 className="font-bold text-gray-800 mb-3">⚡ দ্রুত কাজ</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => navigate('/doctors')} className="p-4 bg-blue-50 rounded-xl text-center hover:bg-blue-100 transition">
                    <span className="text-2xl mb-2 block">🔍</span>
                    <span className="text-sm font-medium text-blue-700">ডাক্তার খুঁজুন</span>
                  </button>
                  <button onClick={() => setActiveTab('ai')} className="p-4 bg-purple-50 rounded-xl text-center hover:bg-purple-100 transition">
                    <span className="text-2xl mb-2 block">🤖</span>
                    <span className="text-sm font-medium text-purple-700">এআই পরামর্শ</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MEDICAL HISTORY TAB */}
          {activeTab === 'medical-history' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-800">📋 চিকিৎসা ইতিহাস</h2>
                  <button 
                    onClick={() => loadMedicalHistory(false)} 
                    disabled={loadingHistory}
                    className="text-blue-600 text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loadingHistory ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        <span>লোড হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sync-alt"></i>
                        <span>রিফ্রেশ</span>
                      </>
                    )}
                  </button>
                </div>
                
                {/* Error Message */}
                {historyError && (
                  <div className="mb-4 bg-red-50 border-2 border-red-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm">
                        <i className="fas fa-exclamation"></i>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">{historyError}</p>
                        {retryHistoryCount > 0 && (
                          <p className="text-xs text-red-600 mt-1">
                            পুনরায় চেষ্টা করা হচ্ছে... ({retryHistoryCount}/2)
                          </p>
                        )}
                        {retryHistoryCount === 0 && (
                          <button
                            onClick={() => loadMedicalHistory(false)}
                            className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                          >
                            আবার চেষ্টা করুন
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setHistoryError(null);
                          setRetryHistoryCount(0);
                        }}
                        className="flex-shrink-0 text-red-400 hover:text-red-600 transition"
                        aria-label="বন্ধ করুন"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                )}
                
                {loadingHistory ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">চিকিৎসা ইতিহাস লোড হচ্ছে...</p>
                    <p className="text-gray-500 text-sm mt-2">অনুগ্রহ করে অপেক্ষা করুন</p>
                  </div>
                ) : !medicalHistory || (medicalHistory.consultations.length === 0 && medicalHistory.prescriptions.length === 0 && medicalHistory.testReports.length === 0) ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">📋</div>
                    <h3 className="text-lg font-medium text-gray-700">কোনো চিকিৎসা ইতিহাস নেই</h3>
                    <p className="text-gray-500 mt-2">আপনার পরামর্শ সম্পন্ন হলে এখানে দেখা যাবে।</p>
                    <button
                      onClick={() => navigate('/doctors')}
                      className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                    >
                      ডাক্তার খুঁজুন
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Doctors Summary */}
                    {medicalHistory.doctors.length > 0 && (
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                        <h3 className="font-bold text-blue-800 mb-3">👨‍⚕️ পরামর্শকৃত ডাক্তার ({medicalHistory.doctors.length})</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {medicalHistory.doctors.map((doc, i) => (
                            <div key={i} className="bg-white rounded-lg p-3 border border-blue-100">
                              <div className="font-medium text-gray-800">{doc.name}</div>
                              <div className="text-sm text-gray-600">{doc.specialty}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {doc.totalConsultations} বার পরামর্শ • শেষ: {new Date(doc.lastVisit).toLocaleDateString('bn-BD')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Consultations */}
                    {medicalHistory.consultations.length > 0 && (
                      <div>
                        <h3 className="font-bold text-gray-800 mb-3">🩺 পরামর্শের ইতিহাস ({medicalHistory.consultations.length})</h3>
                        <div className="space-y-4">
                          {medicalHistory.consultations.map((consultation) => (
                            <div key={consultation.id} className="bg-white rounded-xl p-5 border border-gray-200 hover:border-blue-300 transition">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <div className="font-bold text-gray-800">{consultation.doctorName}</div>
                                  <div className="text-sm text-gray-600">{consultation.doctorSpecialty}</div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {new Date(consultation.consultationDate).toLocaleDateString('bn-BD')} • {consultation.consultationTime}
                                  </div>
                                </div>
                              </div>
                              
                              {consultation.diagnosis && (
                                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                  <div className="text-xs font-bold text-blue-700 mb-1">রোগ নির্ণয়:</div>
                                  <div className="text-sm text-gray-800">{consultation.diagnosis}</div>
                                  {consultation.diagnosisBn && consultation.diagnosisBn !== consultation.diagnosis && (
                                    <div className="text-sm text-gray-600 mt-1">{consultation.diagnosisBn}</div>
                                  )}
                                </div>
                              )}
                              
                              {(consultation.subjective || consultation.objective || consultation.assessment || consultation.plan) && (
                                <div className="mt-3 space-y-2">
                                  {consultation.subjective && (
                                    <div className="text-xs">
                                      <span className="font-bold text-blue-600">S (Subjective):</span>
                                      <span className="text-gray-700 ml-2">{consultation.subjective}</span>
                                    </div>
                                  )}
                                  {consultation.objective && (
                                    <div className="text-xs">
                                      <span className="font-bold text-green-600">O (Objective):</span>
                                      <span className="text-gray-700 ml-2">{consultation.objective}</span>
                                    </div>
                                  )}
                                  {consultation.assessment && (
                                    <div className="text-xs">
                                      <span className="font-bold text-yellow-600">A (Assessment):</span>
                                      <span className="text-gray-700 ml-2">{consultation.assessment}</span>
                                    </div>
                                  )}
                                  {consultation.plan && (
                                    <div className="text-xs">
                                      <span className="font-bold text-purple-600">P (Plan):</span>
                                      <span className="text-gray-700 ml-2">{consultation.plan}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {consultation.advice && consultation.advice.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <div className="text-xs font-bold text-gray-600 mb-1">পরামর্শ:</div>
                                  <ul className="text-xs text-gray-700 space-y-1">
                                    {consultation.advice.map((adv, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <span className="text-blue-500 mt-0.5">•</span>
                                        <span>{adv}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Prescriptions */}
                    {medicalHistory.prescriptions.length > 0 && (
                      <div>
                        <h3 className="font-bold text-gray-800 mb-3">💊 প্রেসক্রিপশন ({medicalHistory.prescriptions.length})</h3>
                        <div className="space-y-4">
                          {medicalHistory.prescriptions.map((prescription) => (
                            <div key={prescription.id} className="bg-white rounded-xl p-4 border border-gray-200">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="font-bold text-gray-800">{prescription.medicineName}</div>
                                  {prescription.medicineNameBn && prescription.medicineNameBn !== prescription.medicineName && (
                                    <div className="text-sm text-gray-600">{prescription.medicineNameBn}</div>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(prescription.prescriptionDate).toLocaleDateString('bn-BD')}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                                <div>
                                  <span className="text-gray-500">মাত্রা:</span>
                                  <span className="ml-1 font-medium text-gray-800">{prescription.dosage}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">সময়কাল:</span>
                                  <span className="ml-1 font-medium text-gray-800">{prescription.duration}</span>
                                </div>
                                {prescription.instruction && (
                                  <div className="col-span-2">
                                    <span className="text-gray-500">নির্দেশনা:</span>
                                    <span className="ml-1 font-medium text-gray-800">{prescription.instruction}</span>
                                  </div>
                                )}
                              </div>
                              {prescription.followUpDate && (
                                <div className="mt-2 text-xs text-blue-600">
                                  পরবর্তী ভিজিট: {new Date(prescription.followUpDate).toLocaleDateString('bn-BD')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Test Reports */}
                    {medicalHistory.testReports.length > 0 && (
                      <div>
                        <h3 className="font-bold text-gray-800 mb-3">🔬 টেস্ট রিপোর্ট ({medicalHistory.testReports.length})</h3>
                        <div className="space-y-3">
                          {medicalHistory.testReports.map((report) => (
                            <div key={report.id} className="bg-white rounded-xl p-4 border border-gray-200">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="font-bold text-gray-800">{report.testName}</div>
                                  {report.testNameBn && (
                                    <div className="text-sm text-gray-600">{report.testNameBn}</div>
                                  )}
                                  <div className="text-xs text-gray-500 mt-1">
                                    {report.testType && `${report.testType} • `}
                                    {new Date(report.testDate).toLocaleDateString('bn-BD')}
                                  </div>
                                  {report.findings && (
                                    <div className="text-sm text-gray-700 mt-2">{report.findings}</div>
                                  )}
                                </div>
                                {report.fileUrl && (
                                  <a href={report.fileUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                                    দেখুন
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DOCTORS TAB */}
          {activeTab === 'doctors' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 border">
                <h2 className="text-lg font-bold text-gray-800 mb-4">👨‍⚕️ ডাক্তার খুঁজুন</h2>
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">🔍</div>
                  <h3 className="text-lg font-medium text-gray-700">আপনার প্রয়োজন অনুযায়ী ডাক্তার খুঁজুন</h3>
                  <p className="text-gray-500 mt-2">বিশেষজ্ঞ ডাক্তারদের সাথে অ্যাপয়েন্টমেন্ট বুক করুন।</p>
                  <button onClick={() => navigate('/doctors')} className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
                    🔍 ডাক্তার খুঁজুন
                  </button>
                </div>
              </div>
              
              {/* Recent visits */}
              {doctorVisits.length > 0 && (
                <div className="bg-white rounded-xl p-6 border">
                  <h3 className="font-bold text-gray-800 mb-4">📋 সাম্প্রতিক ভিজিট</h3>
                  <div className="space-y-3">
                    {doctorVisits.map((visit, i) => (
                      <div key={i} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-xl">👨‍⚕️</span>
                          </div>
                          <div>
                            <h4 className="font-medium">{visit.doctorName}</h4>
                            <p className="text-sm text-gray-500">{visit.specialty}</p>
                            <p className="text-xs text-gray-400">{visit.date}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI ASSISTANT TAB - Enhanced with Full Context */}
          {activeTab === 'ai' && (
            <div className="flex gap-4 h-[calc(100vh-200px)]">
              {/* Left Sidebar - Chat Sessions & Context */}
              <div className={`${showChatSessions ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden`}>
                <div className="glass-card rounded-2xl h-full overflow-hidden flex flex-col">
                  {/* Header */}
                  <div className="p-4 border-b border-white/30">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                      <span>📜</span> চ্যাট ইতিহাস
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{chatHistory.length} টি কথোপকথন সংরক্ষিত</p>
                  </div>
                  
                  {/* Chat Sessions List */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {chatHistory.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <div className="text-3xl mb-2">💬</div>
                        <p className="text-sm">কোনো আগের চ্যাট নেই</p>
                      </div>
                    ) : (
                      chatHistory.map((conv, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (conv.messages) setMessages(conv.messages);
                            setShowChatSessions(false);
                          }}
                          className="w-full text-left p-3 glass-subtle rounded-xl hover:glass transition group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg glass flex items-center justify-center text-blue-500 shrink-0">
                              💬
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">
                                {conv.summary || 'কথোপকথন'}
                              </p>
                              <p className="text-xs text-slate-400 mt-1">
                                {new Date(conv.created_at).toLocaleDateString('bn-BD', { 
                                  day: 'numeric', month: 'short', year: 'numeric' 
                                })}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  
                  {/* New Chat Button */}
                  <div className="p-3 border-t border-white/30">
                    <button
                      onClick={() => {
                        setMessages([{
                          role: 'assistant',
                          content: `আসসালামু আলাইকুম ${patientUser?.name}! 👋\n\nনতুন কথোপকথন শুরু করা হয়েছে। আপনার স্বাস্থ্য সমস্যা বলুন।`,
                          timestamp: new Date().toISOString()
                        }]);
                        setShowChatSessions(false);
                      }}
                      className="w-full py-2 btn-glass-primary rounded-xl text-sm font-medium"
                    >
                      ✨ নতুন কথোপকথন
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Main Chat Area */}
              <div className="flex-1 glass-card rounded-2xl overflow-hidden flex flex-col">
                {/* Header with AI Info */}
                <div className="glass-strong p-4 border-b border-white/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center">
                        <span className="text-2xl">🤖</span>
                      </div>
                      <div>
                        <h2 className="font-bold text-slate-700 flex items-center gap-2">
                          নির্ণয় এআই সহায়ক
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">Gemini 3 Pro</span>
                        </h2>
                        <p className="text-sm text-slate-500">
                          {aiContextMode === 'self' ? '👤 আপনার স্বাস্থ্য' : `👨‍👩‍👧‍👦 ${selectedFamilyMember || 'পরিবার'}`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Chat History Toggle */}
                      <button
                        onClick={() => setShowChatSessions(!showChatSessions)}
                        className={`p-2 rounded-xl transition ${showChatSessions ? 'glass text-blue-600' : 'hover:glass-subtle text-slate-500'}`}
                        title="চ্যাট ইতিহাস"
                      >
                        <span className="text-lg">📜</span>
                        {chatHistory.length > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[10px] rounded-full flex items-center justify-center">
                            {chatHistory.length}
                          </span>
                        )}
                      </button>
                      
                      {/* Context Toggle */}
                      <button
                        onClick={() => setShowAiContext(!showAiContext)}
                        className={`p-2 rounded-xl transition ${showAiContext ? 'glass text-blue-600' : 'hover:glass-subtle text-slate-500'}`}
                        title="AI যা জানে"
                      >
                        <span className="text-lg">🧠</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Context Mode Selector */}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => { setAiContextMode('self'); setSelectedFamilyMember(null); }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                        aiContextMode === 'self' ? 'glass text-blue-600 shadow' : 'text-slate-500 hover:glass-subtle'
                      }`}
                    >
                      👤 আমার স্বাস্থ্য
                    </button>
                    
                    {familyContext && familyContext.length > 0 && (
                      <div className="relative">
                        <button
                          onClick={() => setAiContextMode('family')}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                            aiContextMode === 'family' ? 'glass text-purple-600 shadow' : 'text-slate-500 hover:glass-subtle'
                          }`}
                        >
                          👨‍👩‍👧‍👦 পরিবার ({familyContext.length})
                        </button>
                        
                        {aiContextMode === 'family' && (
                          <div className="absolute top-full left-0 mt-2 glass-strong rounded-xl p-2 shadow-xl z-10 min-w-[200px]">
                            {familyContext.map((member, i) => (
                              <button
                                key={i}
                                onClick={() => setSelectedFamilyMember(member.name)}
                                className={`w-full text-left p-2 rounded-lg text-sm transition ${
                                  selectedFamilyMember === member.name ? 'glass text-purple-600' : 'hover:glass-subtle text-slate-600'
                                }`}
                              >
                                <span className="font-medium">{member.name}</span>
                                <span className="text-xs text-slate-400 ml-2">({member.relation})</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* AI Context Panel */}
                {showAiContext && (
                  <div className="glass-subtle p-4 border-b border-white/30 max-h-48 overflow-y-auto">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-slate-700 flex items-center gap-2">
                        🧠 AI যা জানে
                      </h4>
                      <button onClick={() => setShowAiContext(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="glass p-3 rounded-xl">
                        <div className="text-lg font-bold text-slate-700">{healthMetrics.score}</div>
                        <div className="text-xs text-slate-500">স্বাস্থ্য স্কোর</div>
                      </div>
                      <div className="glass p-3 rounded-xl">
                        <div className="text-lg font-bold text-slate-700">{healthMetrics.bmi || '-'}</div>
                        <div className="text-xs text-slate-500">BMI</div>
                      </div>
                      <div className="glass p-3 rounded-xl">
                        <div className="text-lg font-bold text-slate-700">{medicalHistory?.consultations.length || 0}</div>
                        <div className="text-xs text-slate-500">পরামর্শ</div>
                      </div>
                      <div className="glass p-3 rounded-xl">
                        <div className="text-lg font-bold text-slate-700">{medicalHistory?.prescriptions.length || 0}</div>
                        <div className="text-xs text-slate-500">ওষুধ</div>
                      </div>
                    </div>
                    {patientUser?.chronicConditions?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {patientUser.chronicConditions.map((c, i) => (
                          <span key={i} className="px-2 py-1 glass rounded-lg text-xs text-red-600">⚠️ {c}</span>
                        ))}
                      </div>
                    ) : null}
                    {patientUser?.allergies?.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {patientUser.allergies.map((a, i) => (
                          <span key={i} className="px-2 py-1 glass rounded-lg text-xs text-amber-600">🚫 {a}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
                
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] ${m.role === 'user' ? '' : 'flex gap-3'}`}>
                        {m.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-lg glass flex items-center justify-center shrink-0">
                            🤖
                          </div>
                        )}
                        <div className={`p-4 rounded-2xl text-sm whitespace-pre-wrap ${
                          m.role === 'user' 
                            ? 'glass text-slate-700 border border-blue-200/50' 
                            : 'glass-strong text-slate-700 border border-white/50'
                        }`}>
                          {m.content}
                          {m.timestamp && (
                            <div className="text-[10px] text-slate-400 mt-2 text-right">
                              {new Date(m.timestamp).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg glass flex items-center justify-center">
                          🤖
                        </div>
                        <div className="glass-strong p-4 rounded-2xl">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                            </div>
                            <span className="text-sm text-slate-500">চিন্তা করছি...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                
                {/* Input Area */}
                <div className="p-4 border-t border-white/30 glass-subtle">
                  <div className="flex gap-3">
                    <textarea
                      ref={inputRef}
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={aiContextMode === 'family' && selectedFamilyMember 
                        ? `${selectedFamilyMember} সম্পর্কে জিজ্ঞাসা করুন...`
                        : "আপনার স্বাস্থ্য সমস্যা লিখুন..."
                      }
                      className="flex-1 px-4 py-3 glass border border-white/50 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-700 placeholder-slate-400"
                      rows={2}
                      disabled={isTyping}
                    />
                    <button
                      onClick={handleSend}
                      disabled={isTyping || !chatInput.trim()}
                      className="px-6 btn-glass-primary rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed self-end py-3 font-medium"
                    >
                      {isTyping ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        </span>
                      ) : (
                        'পাঠান'
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 text-center">
                    Shift+Enter = নতুন লাইন • Enter = পাঠান
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* MEDICATION TAB */}
          {activeTab === 'medication' && (
            <div className="bg-white rounded-xl p-6 border">
              {isPremium ? (
                <div>
                  <h2 className="text-lg font-bold text-gray-800 mb-4">💊 ওষুধ রিমাইন্ডার</h2>
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">💊</div>
                    <h3 className="text-lg font-medium text-gray-700">শীঘ্রই আসছে</h3>
                    <p className="text-gray-500 mt-2">ওষুধ খাওয়ার সময় মনে করিয়ে দেবে</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">🔒</div>
                  <h3 className="text-lg font-medium text-gray-700">প্রিমিয়াম ফিচার</h3>
                  <p className="text-gray-500 mt-2">এই ফিচার ব্যবহার করতে প্রিমিয়াম সাবস্ক্রিপশন নিন</p>
                  <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg">আপগ্রেড করুন</button>
                </div>
              )}
            </div>
          )}

          {/* FOOD SCAN TAB */}
          {activeTab === 'food-scan' && (
            <div className="bg-white rounded-xl p-6 border">
              {isPremium ? (
                <div>
                  <h2 className="text-lg font-bold text-gray-800 mb-4">📷 কি খাচ্ছি?</h2>
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">📷</div>
                    <h3 className="text-lg font-medium text-gray-700">খাবারের ছবি তুলুন</h3>
                    <p className="text-gray-500 mt-2">এআই বলে দেবে এটা আপনার জন্য ভালো কিনা</p>
                    <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg">📷 ছবি তুলুন</button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">🔒</div>
                  <h3 className="text-lg font-medium text-gray-700">প্রিমিয়াম ফিচার</h3>
                  <p className="text-gray-500 mt-2">এই ফিচার ব্যবহার করতে প্রিমিয়াম সাবস্ক্রিপশন নিন</p>
                  <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg">আপগ্রেড করুন</button>
                </div>
              )}
            </div>
          )}

          {/* QUIZ TAB */}
          {activeTab === 'quiz' && (
            <div className="bg-white rounded-xl p-6 border">
              {isPremium ? (
                <div>
                  <h2 className="text-lg font-bold text-gray-800 mb-4">🎯 স্বাস্থ্য কুইজ</h2>
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">🎯</div>
                    <h3 className="text-lg font-medium text-gray-700">দৈনিক কুইজ</h3>
                    <p className="text-gray-500 mt-2">মজার প্রশ্নের মাধ্যমে স্বাস্থ্য জানুন</p>
                    <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg">শুরু করুন</button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">🔒</div>
                  <h3 className="text-lg font-medium text-gray-700">প্রিমিয়াম ফিচার</h3>
                  <p className="text-gray-500 mt-2">এই ফিচার ব্যবহার করতে প্রিমিয়াম সাবস্ক্রিপশন নিন</p>
                  <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg">আপগ্রেড করুন</button>
                </div>
              )}
            </div>
          )}

          {/* FOOD CHART TAB */}
          {activeTab === 'food-chart' && (
            <div className="bg-white rounded-xl p-6 border">
              {isPremium ? (
                <div>
                  <h2 className="text-lg font-bold text-gray-800 mb-4">🥗 কাস্টম খাদ্য তালিকা</h2>
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">🥗</div>
                    <h3 className="text-lg font-medium text-gray-700">আপনার জন্য বিশেষ খাদ্য তালিকা</h3>
                    <p className="text-gray-500 mt-2">আপনার স্বাস্থ্য অনুযায়ী তৈরি</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">🔒</div>
                  <h3 className="text-lg font-medium text-gray-700">প্রিমিয়াম ফিচার</h3>
                  <p className="text-gray-500 mt-2">এই ফিচার ব্যবহার করতে প্রিমিয়াম সাবস্ক্রিপশন নিন</p>
                  <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg">আপগ্রেড করুন</button>
                </div>
              )}
            </div>
          )}

          {/* INCENTIVES TAB */}
          {activeTab === 'incentives' && (
            <div className="bg-white rounded-xl p-6 border">
              <h2 className="text-lg font-bold text-gray-800 mb-4">🎁 পুরস্কার প্রোগ্রাম</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { icon: '🏆', title: 'দৈনিক চেক-ইন', desc: '১০ পয়েন্ট', done: false },
                  { icon: '💪', title: 'প্রোফাইল সম্পূর্ণ', desc: '৫০ পয়েন্ট', done: true },
                  { icon: '🎯', title: 'কুইজ খেলুন', desc: '২০ পয়েন্ট', done: false },
                ].map((reward, i) => (
                  <div key={i} className={`p-4 rounded-xl border-2 ${reward.done ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                    <div className="text-3xl mb-2">{reward.icon}</div>
                    <h3 className="font-medium">{reward.title}</h3>
                    <p className="text-sm text-gray-500">{reward.desc}</p>
                    {reward.done && <span className="text-green-600 text-sm">✓ সম্পন্ন</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ADVANCED AI TAB */}
          {activeTab === 'advanced-ai' && (
            <div className="bg-white rounded-xl p-6 border">
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🧠</div>
                <h3 className="text-lg font-medium text-gray-700">অ্যাডভান্সড এআই</h3>
                <p className="text-gray-500 mt-2">ভবিষ্যত স্বাস্থ্য পূর্বাভাস</p>
                <div className="mt-4 inline-block px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                  🚧 শীঘ্রই আসছে
                </div>
              </div>
            </div>
          )}

          {/* FEEDBACK TAB */}
          {activeTab === 'feedback' && (
            <div className="space-y-6">
              {/* Submit New Feedback */}
              <div className="bg-white rounded-xl p-6 border">
                <h2 className="text-lg font-bold text-gray-800 mb-4">💬 নতুন মতামত দিন</h2>
                {fbSent ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">✅</div>
                    <h3 className="font-medium text-gray-700">ধন্যবাদ!</h3>
                    <p className="text-gray-500 text-sm">আপনার মতামত পাঠানো হয়েছে</p>
                  </div>
                ) : (
                  <div className="max-w-lg">
                    <div className="mb-4">
                      <label className="text-sm text-gray-600 block mb-1">বিভাগ</label>
                      <select value={fbCat} onChange={e => setFbCat(e.target.value as any)} className="w-full px-4 py-2 border rounded-lg">
                        <option value="general">সাধারণ</option>
                        <option value="bug">সমস্যা রিপোর্ট</option>
                        <option value="feature">নতুন ফিচার</option>
                        <option value="complaint">অভিযোগ</option>
                      </select>
                    </div>
                    <div className="mb-4">
                      <label className="text-sm text-gray-600 block mb-1">আপনার মতামত</label>
                      <textarea value={fbText} onChange={e => setFbText(e.target.value)} placeholder="লিখুন..." className="w-full px-4 py-3 border rounded-lg h-24 resize-none" />
                    </div>
                    <button onClick={async () => { await submitFeedback(); loadMyFeedbacks(); }} disabled={!fbText.trim()} className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300">
                      পাঠান
                    </button>
                  </div>
                )}
              </div>

              {/* My Feedback History */}
              <div className="bg-white rounded-xl p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-800">📋 আমার মতামত ইতিহাস</h2>
                  <button onClick={loadMyFeedbacks} className="text-blue-600 text-sm hover:underline">
                    {loadingFeedbacks ? '...' : '🔄 রিফ্রেশ'}
                  </button>
                </div>
                
                {loadingFeedbacks ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-500 mt-2 text-sm">লোড হচ্ছে...</p>
                  </div>
                ) : myFeedbacks.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-gray-500">কোনো মতামত পাঠাননি</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myFeedbacks.map((fb) => (
                      <div key={fb.id} className="p-4 bg-gray-50 rounded-lg border">
                        {/* Feedback Header */}
                        <div className="flex items-center justify-between mb-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            fb.type === 'bug' ? 'bg-red-100 text-red-700' :
                            fb.type === 'feature' ? 'bg-purple-100 text-purple-700' :
                            fb.type === 'complaint' ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {fb.type === 'bug' ? '🐛 সমস্যা' : 
                             fb.type === 'feature' ? '✨ ফিচার' : 
                             fb.type === 'complaint' ? '⚠️ অভিযোগ' : '💬 সাধারণ'}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            fb.status === 'resolved' ? 'bg-green-100 text-green-700' :
                            fb.status === 'reviewed' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {fb.status === 'resolved' ? '✅ সমাধান হয়েছে' :
                             fb.status === 'reviewed' ? '👀 দেখা হয়েছে' : '🕐 অপেক্ষায়'}
                          </span>
                        </div>
                        
                        {/* User's Message */}
                        <p className="text-gray-800 mb-2">{fb.message}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(fb.timestamp).toLocaleDateString('bn-BD', { 
                            year: 'numeric', month: 'long', day: 'numeric', 
                            hour: '2-digit', minute: '2-digit' 
                          })}
                        </p>
                        
                        {/* Admin Reply */}
                        {fb.adminReply && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-blue-600 font-medium text-sm">💬 নির্ণয় টিমের উত্তর:</span>
                            </div>
                            <p className="text-gray-700 text-sm">{fb.adminReply}</p>
                            {fb.adminRepliedAt && (
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(fb.adminRepliedAt).toLocaleDateString('bn-BD')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PROFILE TAB */}
          {activeTab === 'profile' && patientUser && (
            <ProfileManager
              profile={patientUser}
              onSave={async (updates) => {
                if (updateProfile) {
                  await updateProfile(updates);
                }
              }}
            />
          )}

          {/* HEALTH INSIGHTS TAB */}
          {activeTab === 'health-insights' && patientUser && (
            <HealthDashboard
              profile={patientUser}
              vitals={[]}
              goals={[]}
              insights={[]}
              risks={[]}
              onAddVital={async (vital) => {
                console.log('Add vital:', vital);
                // TODO: Implement vital saving to Supabase
              }}
              onAddGoal={async (goal) => {
                console.log('Add goal:', goal);
                // TODO: Implement goal saving to Supabase
              }}
            />
          )}

          {/* HEALTH RECORDS TAB */}
          {activeTab === 'health-records' && patientUser && (
            <HealthRecords
              userId={patientUser.id}
              records={[]}
              onRecordAdd={async (record) => {
                console.log('Add record:', record);
                // TODO: Implement record saving to Supabase
              }}
              onRecordDelete={async (recordId) => {
                console.log('Delete record:', recordId);
                // TODO: Implement record deletion from Supabase
              }}
            />
          )}

          {/* MY DOCTORS TAB */}
          {activeTab === 'my-doctors' && patientUser && (
            <MyDoctors
              doctors={[]}
              onBookAppointment={(doctorId, chamberId) => {
                navigate(`/doctors/${doctorId}${chamberId ? `?chamber=${chamberId}` : ''}`);
              }}
              onViewProfile={(doctorId) => {
                navigate(`/doctors/${doctorId}`);
              }}
            />
          )}

          {/* PRESCRIPTIONS TAB */}
          {activeTab === 'prescriptions' && patientUser && (
            <PrescriptionTracker
              prescriptions={[]}
              onViewPDF={(prescription) => {
                console.log('View PDF:', prescription);
              }}
            />
          )}
        </div>
      </main>

      {/* Appointment Details Modal */}
      {showAppointmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAppointmentModal(false)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-blue-600 text-white p-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold">পরামর্শের বিস্তারিত</h2>
              <button onClick={() => setShowAppointmentModal(false)} className="text-white hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {loadingHistory ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-gray-500 mt-2 text-sm">লোড হচ্ছে...</p>
                </div>
              ) : selectedAppointmentDetails ? (
                <>
                  {/* Appointment Info */}
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">ডাক্তার:</span>
                        <span className="ml-2 font-medium">{selectedAppointmentDetails.appointment?.profiles?.name || 'Unknown'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">তারিখ:</span>
                        <span className="ml-2 font-medium">{selectedAppointmentDetails.appointment?.scheduled_date}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">সময়:</span>
                        <span className="ml-2 font-medium">{selectedAppointmentDetails.appointment?.scheduled_time}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">সিরিয়াল:</span>
                        <span className="ml-2 font-medium">#{selectedAppointmentDetails.appointment?.serial_number}</span>
                      </div>
                    </div>
                  </div>

                  {/* Diagnosis */}
                  {selectedAppointmentDetails.consultation?.diagnosis && (
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <h3 className="font-bold text-gray-800 mb-3">🩺 রোগ নির্ণয়</h3>
                      <p className="text-gray-700">{selectedAppointmentDetails.consultation.diagnosis}</p>
                      {selectedAppointmentDetails.consultation.diagnosis_bn && selectedAppointmentDetails.consultation.diagnosis_bn !== selectedAppointmentDetails.consultation.diagnosis && (
                        <p className="text-gray-600 mt-2">{selectedAppointmentDetails.consultation.diagnosis_bn}</p>
                      )}
                    </div>
                  )}

                  {/* SOAP Notes */}
                  {(selectedAppointmentDetails.consultation?.subjective || selectedAppointmentDetails.consultation?.objective || selectedAppointmentDetails.consultation?.assessment || selectedAppointmentDetails.consultation?.plan) && (
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <h3 className="font-bold text-gray-800 mb-3">📝 SOAP নোট</h3>
                      <div className="space-y-3 text-sm">
                        {selectedAppointmentDetails.consultation.subjective && (
                          <div>
                            <span className="font-bold text-blue-600">S (Subjective):</span>
                            <p className="text-gray-700 mt-1">{selectedAppointmentDetails.consultation.subjective}</p>
                          </div>
                        )}
                        {selectedAppointmentDetails.consultation.objective && (
                          <div>
                            <span className="font-bold text-green-600">O (Objective):</span>
                            <p className="text-gray-700 mt-1">{selectedAppointmentDetails.consultation.objective}</p>
                          </div>
                        )}
                        {selectedAppointmentDetails.consultation.assessment && (
                          <div>
                            <span className="font-bold text-yellow-600">A (Assessment):</span>
                            <p className="text-gray-700 mt-1">{selectedAppointmentDetails.consultation.assessment}</p>
                          </div>
                        )}
                        {selectedAppointmentDetails.consultation.plan && (
                          <div>
                            <span className="font-bold text-purple-600">P (Plan):</span>
                            <p className="text-gray-700 mt-1">{selectedAppointmentDetails.consultation.plan}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Prescriptions */}
                  {selectedAppointmentDetails.prescriptions.length > 0 && (
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <h3 className="font-bold text-gray-800 mb-3">💊 প্রেসক্রিপশন</h3>
                      <div className="space-y-3">
                        {selectedAppointmentDetails.prescriptions.map((presc: any, i: number) => (
                          <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="font-medium text-gray-800">{presc.medicine_name}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              <span>মাত্রা: {presc.dosage}</span>
                              <span className="mx-2">•</span>
                              <span>সময়কাল: {presc.duration}</span>
                              {presc.instruction && (
                                <>
                                  <span className="mx-2">•</span>
                                  <span>নির্দেশনা: {presc.instruction}</span>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Advice */}
                  {selectedAppointmentDetails.consultation?.advice && selectedAppointmentDetails.consultation.advice.length > 0 && (
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <h3 className="font-bold text-gray-800 mb-3">💡 পরামর্শ</h3>
                      <ul className="space-y-2">
                        {selectedAppointmentDetails.consultation.advice.map((adv: string, i: number) => (
                          <li key={i} className="text-gray-700 flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5">•</span>
                            <span>{adv}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!selectedAppointmentDetails.consultation && (
                    <div className="text-center py-8 text-gray-500">
                      <p>এই অ্যাপয়েন্টমেন্টের জন্য এখনো পরামর্শ সম্পন্ন হয়নি।</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>বিস্তারিত লোড করতে সমস্যা হয়েছে।</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
