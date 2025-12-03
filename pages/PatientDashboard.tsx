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

// ============ TYPES ============
type TabId = 'home' | 'appointments' | 'medical-history' | 'doctors' | 'ai' | 'medication' | 'food-scan' | 'quiz' | 'food-chart' | 'incentives' | 'advanced-ai' | 'feedback';

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
  { id: 'appointments', icon: '📅', label: 'My Appointments', labelBn: 'আমার অ্যাপয়েন্টমেন্ট' },
  { id: 'medical-history', icon: '📋', label: 'Medical History', labelBn: 'চিকিৎসা ইতিহাস' },
  { id: 'doctors', icon: '👨‍⚕️', label: 'Find Doctors', labelBn: 'ডাক্তার খুঁজুন' },
  { id: 'ai', icon: '🤖', label: 'AI Assistant', labelBn: 'এআই সহায়ক' },
  { id: 'medication', icon: '💊', label: 'Medication', labelBn: 'ওষুধ রিমাইন্ডার', paid: true },
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
  
  // Medical History state
  const [medicalHistory, setMedicalHistory] = useState<CompleteMedicalHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState<any>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  
  // Doctor visits (mock for now, will be from Supabase)
  const [doctorVisits, setDoctorVisits] = useState<any[]>([]);
  
  const patientUser = useMemo(() => (user && (role === 'patient' || role === 'PATIENT')) ? user as PatientProfile : null, [user, role]);

  // Health score calculation
  const healthScore = useMemo(() => {
    if (!patientUser) return 75;
    let score = 75;
    if (patientUser.heightCm && patientUser.weightKg) {
      const bmi = patientUser.weightKg / Math.pow(patientUser.heightCm / 100, 2);
      if (bmi >= 18.5 && bmi <= 24.9) score += 10;
      else if (bmi < 18.5 || bmi > 30) score -= 10;
    }
    if (patientUser.chronicConditions?.length) score -= patientUser.chronicConditions.length * 5;
    if (patientUser.allergies?.length) score -= patientUser.allergies.length * 2;
    return Math.max(20, Math.min(100, score));
  }, [patientUser]);

  // Patient context for AI
  const patientContext = useMemo(() => {
    if (!patientUser) return '';
    const parts = [`Name: ${patientUser.name}`];
    if (patientUser.gender) parts.push(`Gender: ${patientUser.gender}`);
    if (patientUser.dateOfBirth) parts.push(`DOB: ${patientUser.dateOfBirth}`);
    if (patientUser.bloodGroup) parts.push(`Blood: ${patientUser.bloodGroup}`);
    if (patientUser.chronicConditions?.length) parts.push(`Conditions: ${patientUser.chronicConditions.join(', ')}`);
    if (patientUser.allergies?.length) parts.push(`Allergies: ${patientUser.allergies.join(', ')}`);
    if (patientUser.heightCm) parts.push(`Height: ${patientUser.heightCm}cm`);
    if (patientUser.weightKg) parts.push(`Weight: ${patientUser.weightKg}kg`);
    return parts.join(', ');
  }, [patientUser]);

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

  // Initialize AI chat
  useEffect(() => {
    if (patientUser && messages.length === 0) {
      setMessages([{ 
        role: 'assistant', 
        content: `আসসালামু আলাইকুম ${patientUser.name}! 👋\n\nআমি নির্ণয় এআই। আপনার স্বাস্থ্য সমস্যা বলুন।`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [patientUser, messages.length]);

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

  // AI Chat
  const handleSend = async () => {
    if (!chatInput.trim() || isTyping) return;
    const msg = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg, timestamp: new Date().toISOString() }]);
    setIsTyping(true);
    
    try {
      const prevContext = await aiChatService.getLatestMessages(patientUser?.id || '');
      const allHistory = [...prevContext, ...messages].map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`);
      const reply = await chatWithHealthAssistant(msg, allHistory, patientContext);
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

  // Load user's appointments
  const loadMyAppointments = useCallback(async () => {
    if (!patientUser || !isSupabaseConfigured()) return;
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
        setLoadingAppointments(false);
        return;
      }

      if (data && data.length > 0) {
        // Get doctor info for each appointment
        const doctorIds = [...new Set(data.map(apt => apt.doctor_id))];
        
        // Fetch doctor profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', doctorIds);
        
        // Fetch doctor specialties
        const { data: doctors } = await supabase
          .from('doctors')
          .select('profile_id, specialties')
          .in('profile_id', doctorIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const doctorMap = new Map(doctors?.map(d => [d.profile_id, d]) || []);
        
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
      } else {
        setAppointments([]);
      }
    } catch (e) {
      console.error('[PatientDashboard] Appointment load error:', e);
    }
    setLoadingAppointments(false);
  }, [patientUser]);

  // Load medical history
  const loadMedicalHistory = useCallback(async () => {
    if (!patientUser || !isSupabaseConfigured()) return;
    setLoadingHistory(true);
    try {
      const history = await getPatientMedicalHistory(patientUser.id);
      setMedicalHistory(history);
      console.log('[PatientDashboard] Loaded medical history:', history?.consultations.length || 0, 'consultations');
    } catch (e) {
      console.error('[PatientDashboard] Medical history load error:', e);
    }
    setLoadingHistory(false);
  }, [patientUser]);

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
    <div className="min-h-screen bg-slate-50 flex">
      {/* LEFT SIDEBAR - 60% Blue */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-blue-600 text-white flex flex-col transition-all duration-300 fixed h-full z-40`}>
        {/* Logo */}
        <div className="p-4 border-b border-blue-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-xl">ন</span>
            </div>
            {sidebarOpen && <span className="font-bold text-lg">নির্ণয়</span>}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                activeTab === item.id 
                  ? 'bg-blue-700 border-r-4 border-white' 
                  : 'hover:bg-blue-500'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && (
                <div className="flex-1">
                  <span className="block text-sm font-medium">{item.labelBn}</span>
                  {item.paid && !isPremium && (
                    <span className="text-xs text-blue-200">🔒 প্রিমিয়াম</span>
                  )}
                  {item.comingSoon && (
                    <span className="text-xs text-yellow-300">শীঘ্রই আসছে</span>
                  )}
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-blue-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="font-bold">{patientUser.name.charAt(0)}</span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{patientUser.name}</p>
                <p className="text-xs text-blue-200">{isPremium ? '⭐ Premium' : 'Free'}</p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button onClick={handleLogout} className="w-full mt-3 py-2 bg-blue-500 hover:bg-blue-400 rounded text-sm">
              লগআউট
            </button>
          )}
        </div>

        {/* Toggle */}
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white text-blue-600 rounded-full shadow flex items-center justify-center text-xs"
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </aside>

      {/* MAIN CONTENT - 30% White/Light, 10% Accent */}
      <main className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
        {/* Header */}
        <header className="bg-white border-b px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {NAV_ITEMS.find(n => n.id === activeTab)?.labelBn}
              </h1>
              <p className="text-sm text-gray-500">
                {NAV_ITEMS.find(n => n.id === activeTab)?.label}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">{patientUser.name}</p>
                <p className="text-xs text-gray-500">{patientUser.phone}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6">
          {/* HOME TAB */}
          {activeTab === 'home' && (
            <div className="space-y-6">
              {/* Health Score Card */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">স্বাস্থ্য স্কোর</h2>
                    <p className="text-blue-100">আপনার সামগ্রিক স্বাস্থ্য অবস্থা</p>
                  </div>
                  <div className="text-center">
                    <div className="text-5xl font-bold">{healthScore}</div>
                    <div className="text-sm text-blue-200">/100</div>
                  </div>
                </div>
                <div className="mt-4 bg-blue-500 rounded-full h-3">
                  <div className="bg-white rounded-full h-3 transition-all" style={{ width: `${healthScore}%` }}></div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: '📏', value: patientUser.heightCm ? `${patientUser.heightCm} cm` : '-', label: 'উচ্চতা' },
                  { icon: '⚖️', value: patientUser.weightKg ? `${patientUser.weightKg} kg` : '-', label: 'ওজন' },
                  { icon: '🩸', value: patientUser.bloodGroup || '-', label: 'রক্তের গ্রুপ' },
                  { icon: '🏆', value: patientUser.quizPoints || 0, label: 'পয়েন্ট' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 border">
                    <div className="text-2xl mb-2">{stat.icon}</div>
                    <div className="text-xl font-bold text-gray-800">{stat.value}</div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Health Alerts */}
              {(patientUser.chronicConditions?.length || patientUser.allergies?.length) ? (
                <div className="bg-white rounded-xl p-4 border">
                  <h3 className="font-bold text-gray-800 mb-3">⚠️ স্বাস্থ্য সতর্কতা</h3>
                  <div className="flex flex-wrap gap-2">
                    {patientUser.chronicConditions?.map((c, i) => (
                      <span key={i} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">{c}</span>
                    ))}
                    {patientUser.allergies?.map((a, i) => (
                      <span key={i} className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">এলার্জি: {a}</span>
                    ))}
                  </div>
                </div>
              ) : null}

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
                  <button onClick={loadMyAppointments} className="text-blue-600 text-sm hover:underline">
                    {loadingAppointments ? '...' : '🔄 রিফ্রেশ'}
                  </button>
                </div>
                
                {loadingAppointments ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-500 mt-2 text-sm">লোড হচ্ছে...</p>
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
                  <button onClick={loadMedicalHistory} className="text-blue-600 text-sm hover:underline">
                    {loadingHistory ? '...' : '🔄 রিফ্রেশ'}
                  </button>
                </div>
                
                {loadingHistory ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-500 mt-2 text-sm">লোড হচ্ছে...</p>
                  </div>
                ) : !medicalHistory || (medicalHistory.consultations.length === 0 && medicalHistory.prescriptions.length === 0 && medicalHistory.testReports.length === 0) ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">📋</div>
                    <h3 className="text-lg font-medium text-gray-700">কোনো চিকিৎসা ইতিহাস নেই</h3>
                    <p className="text-gray-500 mt-2">আপনার পরামর্শ সম্পন্ন হলে এখানে দেখা যাবে।</p>
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

          {/* AI ASSISTANT TAB */}
          {activeTab === 'ai' && (
            <div className="bg-white rounded-xl border overflow-hidden h-[calc(100vh-200px)] flex flex-col">
              <div className="bg-blue-600 p-4 text-white">
                <h2 className="font-bold">🤖 নির্ণয় এআই সহায়ক</h2>
                <p className="text-sm text-blue-100">আপনার স্বাস্থ্য সমস্যা বলুন • Shift+Enter = নতুন লাইন</p>
              </div>
              
              {/* Chat History Button */}
              {chatHistory.length > 0 && (
                <div className="px-4 py-2 bg-gray-50 border-b">
                  <details className="text-sm">
                    <summary className="cursor-pointer text-blue-600">📜 পূর্ববর্তী কথোপকথন ({chatHistory.length})</summary>
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {chatHistory.slice(0, 5).map((conv, i) => (
                        <button key={i} onClick={() => conv.messages && setMessages(conv.messages)} className="block w-full text-left p-2 bg-white rounded border text-xs hover:bg-blue-50">
                          {conv.summary || 'কথোপকথন'} - {new Date(conv.created_at).toLocaleDateString('bn-BD')}
                        </button>
                      ))}
                    </div>
                  </details>
                </div>
              )}
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] p-3 rounded-xl text-sm whitespace-pre-wrap ${
                      m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 p-3 rounded-xl text-sm animate-pulse">চিন্তা করছি...</div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              <div className="border-t p-4 flex gap-3">
                <textarea
                  ref={inputRef}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="আপনার সমস্যা লিখুন..."
                  className="flex-1 px-4 py-3 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  disabled={isTyping}
                />
                <button onClick={handleSend} disabled={isTyping || !chatInput.trim()} className="px-6 bg-blue-600 text-white rounded-xl disabled:bg-gray-300 self-end py-3">
                  পাঠান
                </button>
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
