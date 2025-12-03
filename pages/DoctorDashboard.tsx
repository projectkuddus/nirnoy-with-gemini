import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { chatWithDoctorAssistant, getMedicalNews, searchMedicalGuidelines } from '../services/geminiService';
import { ChatMessage, PrescriptionItem } from '../types';
import { useAuth, DoctorProfile } from "../contexts/AuthContext";
import { openPrescriptionWindow, PrescriptionData } from '../utils/prescriptionPDF';
import { supabase, isSupabaseConfigured } from '../services/supabaseAuth';

// ============ TYPES ============
interface PatientRecord {
  id: string;
  name: string;
  nameBn: string;
  age: number;
  gender: 'Male' | 'Female';
  phone: string;
  bloodGroup: string;
  profileImage: string;
  lastVisit: string;
  totalVisits: number;
  diagnosis: string;
  diagnosisBn: string;
  riskLevel: 'High' | 'Medium' | 'Low';
  conditions: string[];
  medications: string[];
  allergies: string[];
  familyHistory: { condition: string; relation: string }[];
  vitals: { date: string; bp: string; hr: number; weight: number; temp?: number }[];
  consultations: { date: string; diagnosis: string; notes: string; prescription: PrescriptionItem[] }[];
  aiSummary?: string;
}

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientNameBn: string;
  patientImage: string;
  patientPhone: string;
  patientAge: number;
  patientGender: 'Male' | 'Female';
  date: string;
  time: string;
  serial: number;
  type: 'New' | 'Follow-up' | 'Report' | 'Emergency';
  status: 'Waiting' | 'In-Progress' | 'Completed' | 'No-Show' | 'Cancelled';
  chiefComplaint?: string;
  fee: number;
  paymentStatus: 'Paid' | 'Pending' | 'Waived';
}

interface Schedule {
  day: string;
  dayBn: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
  slotDuration: number;
  maxPatients: number;
}

interface Holiday {
  date: string;
  reason: string;
  reasonBn: string;
}

interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

type TabType = 'overview' | 'queue' | 'appointments' | 'schedule' | 'consult' | 'analytics' | 'rnd' | 'settings';

// ============ MOCK DATA ============
const DOCTOR_PROFILE = {
  id: 'd1',
  name: 'Dr. Abul Kashem',
  nameBn: 'ডা. আবুল কাশেম',
  specialty: 'Cardiology',
  specialtyBn: 'হৃদরোগ বিশেষজ্ঞ',
  degrees: 'MBBS, FCPS (Cardiology), MD',
  image: 'https://ui-avatars.com/api/?name=M&background=3b82f6&color=fff&size=200',
  hospital: 'Square Hospital, Dhaka',
  hospitalBn: 'স্কয়ার হাসপাতাল, ঢাকা',
  experience: 15,
  bmdcNo: 'A-32145',
  chamberAddress: 'House 42, Road 11, Dhanmondi, Dhaka',
  chamberPhone: '01700-123456',
  consultationFee: 1000,
};

const PATIENTS: PatientRecord[] = [
  {
    id: 'p1', name: 'Rahim Uddin', nameBn: 'রহিম উদ্দিন', age: 45, gender: 'Male',
    phone: '01712345678', bloodGroup: 'A+', profileImage: 'https://ui-avatars.com/api/?name=M&background=3b82f6&color=fff&size=200',
    lastVisit: '2024-11-20', totalVisits: 8, diagnosis: 'Hypertension', diagnosisBn: 'উচ্চ রক্তচাপ',
    riskLevel: 'High', conditions: ['Hypertension', 'Pre-diabetic'], medications: ['Amlodipine 5mg', 'Aspirin 75mg'],
    allergies: ['Penicillin'], familyHistory: [{ condition: 'Heart Disease', relation: 'Father' }],
    vitals: [{ date: '2024-11', bp: '145/92', hr: 82, weight: 78, temp: 98.4 }],
    consultations: [{ date: '2024-11-20', diagnosis: 'Hypertension', notes: 'BP elevated', prescription: [] }]
  },
  {
    id: 'p2', name: 'Fatima Begum', nameBn: 'ফাতিমা বেগম', age: 52, gender: 'Female',
    phone: '01812345679', bloodGroup: 'B+', profileImage: 'https://ui-avatars.com/api/?name=F&background=ec4899&color=fff&size=200',
    lastVisit: '2024-11-22', totalVisits: 5, diagnosis: 'Diabetes Type 2', diagnosisBn: 'ডায়াবেটিস টাইপ ২',
    riskLevel: 'Medium', conditions: ['Diabetes Type 2'], medications: ['Metformin 500mg'],
    allergies: [], familyHistory: [{ condition: 'Diabetes', relation: 'Mother' }],
    vitals: [{ date: '2024-11', bp: '130/85', hr: 76, weight: 68, temp: 98.6 }],
    consultations: []
  },
  {
    id: 'p3', name: 'Karim Ahmed', nameBn: 'করিম আহমেদ', age: 38, gender: 'Male',
    phone: '01912345680', bloodGroup: 'O+', profileImage: 'https://ui-avatars.com/api/?name=M&background=3b82f6&color=fff&size=200',
    lastVisit: '2024-11-25', totalVisits: 3, diagnosis: 'Chest Pain', diagnosisBn: 'বুকে ব্যথা',
    riskLevel: 'High', conditions: ['Angina'], medications: ['Sorbitrate 5mg'],
    allergies: ['Sulfa drugs'], familyHistory: [],
    vitals: [{ date: '2024-11', bp: '138/88', hr: 88, weight: 82, temp: 98.2 }],
    consultations: []
  },
  {
    id: 'p4', name: 'Nasreen Akter', nameBn: 'নাসরিন আক্তার', age: 28, gender: 'Female',
    phone: '01612345681', bloodGroup: 'AB+', profileImage: 'https://ui-avatars.com/api/?name=F&background=ec4899&color=fff&size=200',
    lastVisit: '2024-11-28', totalVisits: 2, diagnosis: 'Palpitations', diagnosisBn: 'বুক ধড়ফড়',
    riskLevel: 'Low', conditions: ['Anxiety-related palpitations'], medications: [],
    allergies: [], familyHistory: [],
    vitals: [{ date: '2024-11', bp: '118/75', hr: 92, weight: 55, temp: 98.4 }],
    consultations: []
  },
];

const generateTodayAppointments = (): Appointment[] => {
  const today = new Date().toISOString().split('T')[0];
  return [
    { id: 'a1', patientId: 'p1', patientName: 'Rahim Uddin', patientNameBn: 'রহিম উদ্দিন', patientImage: 'https://ui-avatars.com/api/?name=M&background=3b82f6&color=fff&size=200', patientPhone: '01712345678', patientAge: 45, patientGender: 'Male', date: today, time: '09:00', serial: 1, type: 'Follow-up', status: 'Completed', chiefComplaint: 'BP check', fee: 500, paymentStatus: 'Paid' },
    { id: 'a2', patientId: 'p2', patientName: 'Fatima Begum', patientNameBn: 'ফাতিমা বেগম', patientImage: 'https://ui-avatars.com/api/?name=F&background=ec4899&color=fff&size=200', patientPhone: '01812345679', patientAge: 52, patientGender: 'Female', date: today, time: '09:15', serial: 2, type: 'Follow-up', status: 'In-Progress', chiefComplaint: 'Sugar level review', fee: 500, paymentStatus: 'Paid' },
    { id: 'a3', patientId: 'p3', patientName: 'Karim Ahmed', patientNameBn: 'করিম আহমেদ', patientImage: 'https://ui-avatars.com/api/?name=M&background=3b82f6&color=fff&size=200', patientPhone: '01912345680', patientAge: 38, patientGender: 'Male', date: today, time: '09:30', serial: 3, type: 'New', status: 'Waiting', chiefComplaint: 'Chest pain for 2 days', fee: 1000, paymentStatus: 'Paid' },
    { id: 'a4', patientId: 'p4', patientName: 'Nasreen Akter', patientNameBn: 'নাসরিন আক্তার', patientImage: 'https://ui-avatars.com/api/?name=F&background=ec4899&color=fff&size=200', patientPhone: '01612345681', patientAge: 28, patientGender: 'Female', date: today, time: '09:45', serial: 4, type: 'New', status: 'Waiting', chiefComplaint: 'Heart racing', fee: 1000, paymentStatus: 'Pending' },
    { id: 'a5', patientId: 'p1', patientName: 'Jamal Hossain', patientNameBn: 'জামাল হোসেন', patientImage: 'https://ui-avatars.com/api/?name=M&background=3b82f6&color=fff&size=200', patientPhone: '01512345682', patientAge: 60, patientGender: 'Male', date: today, time: '10:00', serial: 5, type: 'Report', status: 'Waiting', chiefComplaint: 'ECG report', fee: 500, paymentStatus: 'Paid' },
    { id: 'a6', patientId: 'p2', patientName: 'Salma Khatun', patientNameBn: 'সালমা খাতুন', patientImage: 'https://ui-avatars.com/api/?name=F&background=ec4899&color=fff&size=200', patientPhone: '01412345683', patientAge: 48, patientGender: 'Female', date: today, time: '10:15', serial: 6, type: 'New', status: 'Waiting', chiefComplaint: 'Breathing difficulty', fee: 1000, paymentStatus: 'Paid' },
    { id: 'a7', patientId: 'p3', patientName: 'Rafiq Islam', patientNameBn: 'রফিক ইসলাম', patientImage: 'https://ui-avatars.com/api/?name=M&background=3b82f6&color=fff&size=200', patientPhone: '01312345684', patientAge: 55, patientGender: 'Male', date: today, time: '10:30', serial: 7, type: 'Follow-up', status: 'Waiting', fee: 500, paymentStatus: 'Waived' },
    { id: 'a8', patientId: 'p4', patientName: 'Amina Sultana', patientNameBn: 'আমিনা সুলতানা', patientImage: 'https://ui-avatars.com/api/?name=F&background=ec4899&color=fff&size=200', patientPhone: '01212345685', patientAge: 35, patientGender: 'Female', date: today, time: '10:45', serial: 8, type: 'Emergency', status: 'Waiting', chiefComplaint: 'Severe chest pain', fee: 1500, paymentStatus: 'Pending' },
  ];
};

const DEFAULT_SCHEDULE: Schedule[] = [
  { day: 'Saturday', dayBn: 'শনিবার', enabled: true, startTime: '09:00', endTime: '14:00', slotDuration: 15, maxPatients: 20 },
  { day: 'Sunday', dayBn: 'রবিবার', enabled: true, startTime: '09:00', endTime: '14:00', slotDuration: 15, maxPatients: 20 },
  { day: 'Monday', dayBn: 'সোমবার', enabled: true, startTime: '17:00', endTime: '21:00', slotDuration: 15, maxPatients: 16 },
  { day: 'Tuesday', dayBn: 'মঙ্গলবার', enabled: true, startTime: '17:00', endTime: '21:00', slotDuration: 15, maxPatients: 16 },
  { day: 'Wednesday', dayBn: 'বুধবার', enabled: false, startTime: '09:00', endTime: '14:00', slotDuration: 15, maxPatients: 0 },
  { day: 'Thursday', dayBn: 'বৃহস্পতিবার', enabled: true, startTime: '09:00', endTime: '14:00', slotDuration: 15, maxPatients: 20 },
  { day: 'Friday', dayBn: 'শুক্রবার', enabled: false, startTime: '09:00', endTime: '14:00', slotDuration: 15, maxPatients: 0 },
];

const HOLIDAYS: Holiday[] = [
  { date: '2024-12-16', reason: 'Victory Day', reasonBn: 'বিজয় দিবস' },
  { date: '2024-12-25', reason: 'Christmas', reasonBn: 'বড়দিন' },
];

const PRESCRIPTION_TEMPLATES = [
  { name: 'Hypertension', namebn: 'উচ্চ রক্তচাপ', medicines: [
    { medicine: 'Amlodipine 5mg', dosage: '1+0+0', duration: '30 days', instruction: 'সকালে খাবারের পর' },
    { medicine: 'Aspirin 75mg', dosage: '0+0+1', duration: '30 days', instruction: 'রাতে খাবারের পর' },
  ]},
  { name: 'Diabetes', nameBn: 'ডায়াবেটিস', medicines: [
    { medicine: 'Metformin 500mg', dosage: '1+0+1', duration: '30 days', instruction: 'খাবারের সাথে' },
  ]},
  { name: 'Chest Pain', nameBn: 'বুকে ব্যথা', medicines: [
    { medicine: 'Sorbitrate 5mg', dosage: 'SOS', duration: 'As needed', instruction: 'জিহ্বার নিচে রাখুন' },
    { medicine: 'Ecosprin 75mg', dosage: '0+1+0', duration: '30 days', instruction: 'দুপুরে খাবারের পর' },
  ]},
];

// ============ MAIN COMPONENT ============
interface DoctorDashboardProps {
  onLogout?: () => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { user, role, logout, isLoading, updateProfile } = useAuth();
  
  // Debug: Log user state
  console.log('DoctorDashboard - user:', user);
  console.log('DoctorDashboard - isLoading:', isLoading);
  
  // Redirect if not logged in as doctor (after loading completes)
  useEffect(() => {
    if (!isLoading && (!user || role !== 'doctor')) {
      console.log('Redirecting to doctor-registration - no valid doctor user');
      navigate('/doctor-registration');
    }
  }, [user, isLoading, navigate]);
  
  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }
  
  // If no user after loading, show nothing (will redirect)
  if (!user || role !== 'doctor') {
    return null;
  }
  
  // Check if doctor is approved
  const doctorUser = user as DoctorProfile;
  if (doctorUser.status !== 'approved') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-8 max-w-md text-center border border-slate-700">
          <div className="text-6xl mb-4">{doctorUser.status === 'pending' ? '⏳' : '❌'}</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {doctorUser.status === 'pending' ? 'অনুমোদনের অপেক্ষায়' : 'আবেদন প্রত্যাখ্যান করা হয়েছে'}
          </h2>
          <p className="text-slate-400 mb-4">
            {doctorUser.status === 'pending' 
              ? 'আপনার ডাক্তার অ্যাকাউন্ট এখনো অনুমোদিত হয়নি। অনুগ্রহ করে অপেক্ষা করুন।'
              : doctorUser.rejectionReason || 'আপনার আবেদন প্রত্যাখ্যান করা হয়েছে।'}
          </p>
          <button onClick={() => { logout(); navigate('/'); }} className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-700 transition">
            হোমে ফিরে যান
          </button>
        </div>
      </div>
    );
  }
  
  // Use real doctor data - NO DEMO DATA
  // Use real doctor data - with safe fallbacks
  const doctorProfile = {
    id: user.id,
    name: user.name,
    nameBn: user.nameBn || user.name,
    specialty: (Array.isArray(doctorUser.specializations) && doctorUser.specializations.length > 0) 
      ? (typeof doctorUser.specializations[0] === 'string' ? doctorUser.specializations[0] : doctorUser.specializations[0]?.name || 'General')
      : 'General',
    specialtyBn: (Array.isArray(doctorUser.specializations) && doctorUser.specializations.length > 0) 
      ? (typeof doctorUser.specializations[0] === 'string' ? doctorUser.specializations[0] : doctorUser.specializations[0]?.name || 'সাধারণ চিকিৎসা')
      : 'সাধারণ চিকিৎসা',
    degrees: (Array.isArray(doctorUser.qualifications) && doctorUser.qualifications.length > 0)
      ? doctorUser.qualifications.map(q => typeof q === 'string' ? q : q.degree).join(', ')
      : 'MBBS',
    image: user.profileImage || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=0d9488&color=fff&size=200',
    hospital: (Array.isArray(doctorUser.chambers) && doctorUser.chambers.length > 0) ? doctorUser.chambers[0]?.name : 'Chamber',
    hospitalBn: (Array.isArray(doctorUser.chambers) && doctorUser.chambers.length > 0) ? doctorUser.chambers[0]?.name : 'চেম্বার',
    experience: doctorUser.experienceYears || 0,
    bmdcNo: doctorUser.bmdcNumber || '',
    chamberAddress: (Array.isArray(doctorUser.chambers) && doctorUser.chambers.length > 0) ? doctorUser.chambers[0]?.address : '',
    chamberPhone: user.phone,
    consultationFee: doctorUser.consultationFee || 500,
  };
  
  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
    navigate('/');
  };
  
  // State
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [schedule, setSchedule] = useState<Schedule[]>(DEFAULT_SCHEDULE);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // Fetch real appointments from Supabase
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user?.id || !isSupabaseConfigured()) {
        setAppointmentsLoading(false);
        return;
      }

      try {
        // First, get the doctors table ID for this profile
        const { data: doctorRecord } = await supabase
          .from('doctors')
          .select('id')
          .eq('profile_id', user.id)
          .single();

        const doctorsTableId = doctorRecord?.id;
        const profileId = user.id;
        
        console.log('[DoctorDashboard] Looking for appointments with:');
        console.log('  - profile_id (user.id):', profileId);
        console.log('  - doctors.id:', doctorsTableId);
        
        // Query appointments using BOTH possible IDs (profile_id OR doctors.id)
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .or(`doctor_id.eq.${profileId}${doctorsTableId ? `,doctor_id.eq.${doctorsTableId}` : ''}`)
          .order('appointment_date', { ascending: true })
          .order('appointment_time', { ascending: true });

        if (error) {
          console.error('[DoctorDashboard] Error fetching appointments:', error);
          setAppointmentsLoading(false);
          return;
        }

        console.log('[DoctorDashboard] Raw appointments data:', data);

        if (data && data.length > 0) {
          // Transform Supabase data to match Appointment interface
          const transformedAppointments: Appointment[] = data.map((apt, index) => ({
            id: apt.id,
            patientId: apt.patient_id || `guest-${apt.id}`,
            patientName: apt.patient_name,
            patientNameBn: apt.patient_name,
            patientImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(apt.patient_name)}&background=${apt.patient_id ? '3b82f6' : 'ec4899'}&color=fff&size=200`,
            patientPhone: apt.patient_phone,
            patientAge: 0,
            patientGender: 'Male' as const,
            date: apt.appointment_date,
            time: apt.appointment_time,
            serial: apt.serial_number || index + 1,
            type: apt.visit_type === 'follow_up' ? 'Follow-up' : apt.visit_type === 'report' ? 'Report' : 'New',
            status: apt.status === 'confirmed' ? 'Waiting' : apt.status === 'completed' ? 'Completed' : apt.status === 'cancelled' ? 'Cancelled' : 'Waiting',
            chiefComplaint: apt.symptoms,
            fee: apt.fee || 500,
            paymentStatus: 'Paid' as const,
          }));

          console.log('[DoctorDashboard] Loaded', transformedAppointments.length, 'appointments');
          setAppointments(transformedAppointments);
        } else {
          console.log('[DoctorDashboard] No appointments found');
          setAppointments([]);
        }
      } catch (e) {
        console.error('[DoctorDashboard] Fetch error:', e);
      }

      setAppointmentsLoading(false);
    };

    fetchAppointments();

    // Set up real-time subscription for new appointments
    const subscription = supabase
      .channel('appointments-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'appointments' },
        (payload) => {
          console.log('[DoctorDashboard] Real-time update:', payload);
          fetchAppointments(); // Refresh appointments on any change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  
  // Consultation state
  const [soapNote, setSoapNote] = useState<SOAPNote>({ subjective: '', objective: '', assessment: '', plan: '' });
  const [prescription, setPrescription] = useState<PrescriptionItem[]>([]);
  const [diagnosis, setDiagnosis] = useState('');
  const [followUpDays, setFollowUpDays] = useState(7);
  const [advice, setAdvice] = useState<string[]>([]);
  
  // Filters
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  
  // Modals
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ date: '', reason: '', reasonBn: '' });

  // AI Chat
  const [aiChat, setAiChat] = useState<ChatMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // ============ COMPUTED VALUES ============
  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayAppts = appointments.filter(a => a.date === today);
    const completed = todayAppts.filter(a => a.status === 'Completed').length;
    const noShow = todayAppts.filter(a => a.status === 'No-Show').length;
    const waiting = todayAppts.filter(a => a.status === 'Waiting').length;
    const inProgress = todayAppts.filter(a => a.status === 'In-Progress').length;
    const revenue = todayAppts.filter(a => a.paymentStatus === 'Paid').reduce((sum, a) => sum + a.fee, 0);
    const pending = todayAppts.filter(a => a.paymentStatus === 'Pending').reduce((sum, a) => sum + a.fee, 0);
    
    return { total: todayAppts.length, completed, noShow, waiting, inProgress, revenue, pending, noShowRate: todayAppts.length ? Math.round((noShow / todayAppts.length) * 100) : 0 };
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    let filtered = appointments.filter(a => a.date === dateFilter);
    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter);
    }
    return filtered.sort((a, b) => a.serial - b.serial);
  }, [appointments, dateFilter, statusFilter]);

  const currentPatient = useMemo(() => {
    return appointments.find(a => a.status === 'In-Progress');
  }, [appointments]);

  const nextInQueue = useMemo(() => {
    return appointments.filter(a => a.status === 'Waiting').sort((a, b) => a.serial - b.serial)[0];
  }, [appointments]);

  // ============ HANDLERS ============
  const updateAppointmentStatus = (id: string, status: Appointment['status']) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const callNextPatient = () => {
    if (currentPatient) {
      updateAppointmentStatus(currentPatient.id, 'Completed');
    }
    if (nextInQueue) {
      updateAppointmentStatus(nextInQueue.id, 'In-Progress');
      const patient = PATIENTS.find(p => p.id === nextInQueue.patientId);
      if (patient) setSelectedPatient(patient);
      setSelectedAppointment(nextInQueue);
    }
  };

  const markNoShow = (id: string) => {
    updateAppointmentStatus(id, 'No-Show');
  };

  const startConsultation = (apt: Appointment) => {
    // If there's a current patient, complete them first
    if (currentPatient && currentPatient.id !== apt.id) {
      updateAppointmentStatus(currentPatient.id, 'Completed');
    }
    updateAppointmentStatus(apt.id, 'In-Progress');
    const patient = PATIENTS.find(p => p.id === apt.patientId);
    if (patient) setSelectedPatient(patient);
    setSelectedAppointment(apt);
    setActiveTab('consult');
    // Reset consultation form
    setSoapNote({ subjective: apt.chiefComplaint || '', objective: '', assessment: '', plan: '' });
    setPrescription([]);
    setDiagnosis('');
    setAdvice([]);
  };

  const addMedicine = (template?: typeof PRESCRIPTION_TEMPLATES[0]) => {
    if (template) {
      setPrescription(prev => [...prev, ...template.medicines]);
    } else {
      setPrescription(prev => [...prev, { medicine: '', dosage: '', duration: '', instruction: '' }]);
    }
  };

  const updateMedicine = (index: number, field: keyof PrescriptionItem, value: string) => {
    setPrescription(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const removeMedicine = (index: number) => {
    setPrescription(prev => prev.filter((_, i) => i !== index));
  };

  const generatePrescription = () => {
    if (!selectedPatient || !selectedAppointment) return;
    
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + followUpDays);

    const data: PrescriptionData = {
      doctorName: doctorProfile.name,
      doctorNameBn: doctorProfile.nameBn,
      doctorDegrees: doctorProfile.degrees,
      doctorSpecialty: doctorProfile.specialtyBn,
      doctorBmdcNo: doctorProfile.bmdcNo,
      chamberName: doctorProfile.hospitalBn,
      chamberAddress: doctorProfile.chamberAddress,
      chamberPhone: doctorProfile.chamberPhone,
      patientName: selectedPatient.nameBn,
      patientAge: selectedPatient.age,
      patientGender: selectedPatient.gender === 'Male' ? 'পুরুষ' : 'মহিলা',
      patientPhone: selectedPatient.phone,
      date: new Date().toLocaleDateString('bn-BD'),
      serialNumber: selectedAppointment.serial,
      diagnosis: diagnosis,
      diagnosisBn: diagnosis,
      clinicalNotes: soapNote.assessment,
      medicines: prescription,
      advice: advice.filter(a => a.trim()),
      followUpDate: followUpDate.toLocaleDateString('bn-BD'),
    };

    openPrescriptionWindow(data);
  };

  const completeConsultation = () => {
    if (selectedAppointment) {
      updateAppointmentStatus(selectedAppointment.id, 'Completed');
      generatePrescription();
      setSelectedPatient(null);
      setSelectedAppointment(null);
      setActiveTab('queue');
    }
  };

  const toggleScheduleDay = (day: string) => {
    setSchedule(prev => prev.map(s => s.day === day ? { ...s, enabled: !s.enabled } : s));
  };

  const updateSchedule = (day: string, field: keyof Schedule, value: any) => {
    setSchedule(prev => prev.map(s => s.day === day ? { ...s, [field]: value } : s));
  };

  const addHoliday = () => {
    if (newHoliday.date && newHoliday.reason) {
      setHolidays(prev => [...prev, newHoliday]);
      setNewHoliday({ date: '', reason: '', reasonBn: '' });
      setShowAddHoliday(false);
    }
  };

  const removeHoliday = (date: string) => {
    setHolidays(prev => prev.filter(h => h.date !== date));
  };

  // AI Chat handler
  const handleAIChat = async () => {
    if (!aiInput.trim() || !selectedPatient) return;
    
    const userMsg: ChatMessage = { role: 'user', text: aiInput, timestamp: Date.now() };
    setAiChat(prev => [...prev, userMsg]);
    setAiInput('');
    setIsAiThinking(true);

    try {
      const context = `Patient: ${selectedPatient.name}, ${selectedPatient.age}y ${selectedPatient.gender}
Conditions: ${selectedPatient.conditions.join(', ')}
Current Medications: ${selectedPatient.medications.join(', ')}
Allergies: ${selectedPatient.allergies.join(', ') || 'None'}
Chief Complaint: ${selectedAppointment?.chiefComplaint || 'Not specified'}
SOAP Notes: S: ${soapNote.subjective}, O: ${soapNote.objective}, A: ${soapNote.assessment}`;

      const response = await chatWithDoctorAssistant(`${context}\n\nDoctor's Query: "${aiInput}"`, aiChat.map(m => m.text));
      setAiChat(prev => [...prev, { role: 'assistant', text: response, timestamp: Date.now() }]);
    } catch (e) {
      setAiChat(prev => [...prev, { role: 'assistant', text: 'AI সহায়তা পেতে সমস্যা হচ্ছে।', timestamp: Date.now() }]);
    }
    setIsAiThinking(false);
  };

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [aiChat]);

  // ============ RENDER OVERVIEW ============
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Welcome & Quick Stats */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{doctorProfile.nameBn}</h1>
            <p className="opacity-90">{doctorProfile.specialtyBn} • {doctorProfile.hospital}</p>
          </div>
          <img src={doctorProfile.image} alt="" className="w-16 h-16 rounded-full border-4 border-white/30" />
        </div>
        
        {/* Today's Summary */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white/20 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold">{todayStats.total}</div>
            <div className="text-sm opacity-90">মোট রোগী</div>
          </div>
          <div className="bg-white/20 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold">{todayStats.completed}</div>
            <div className="text-sm opacity-90">সম্পন্ন</div>
          </div>
          <div className="bg-white/20 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold">{todayStats.waiting}</div>
            <div className="text-sm opacity-90">অপেক্ষমান</div>
          </div>
          <div className="bg-white/20 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold">৳{todayStats.revenue.toLocaleString()}</div>
            <div className="text-sm opacity-90">আয়</div>
          </div>
        </div>
      </div>

      {/* Current & Next Patient */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Current Patient */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
            বর্তমান রোগী
          </h3>
          {currentPatient ? (
            <div className="flex items-center gap-4">
              <img src={currentPatient.patientImage} alt="" className="w-16 h-16 rounded-xl" />
              <div className="flex-1">
                <p className="font-bold text-lg">{currentPatient.patientNameBn}</p>
                <p className="text-slate-500 text-sm">সিরিয়াল #{currentPatient.serial} • {currentPatient.type}</p>
                <p className="text-slate-600 text-sm mt-1">{currentPatient.chiefComplaint}</p>
              </div>
              <button onClick={() => startConsultation(currentPatient)} className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-700">
                কনসাল্ট
              </button>
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">কোনো রোগী নেই</p>
          )}
        </div>

        {/* Next in Queue */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
            পরবর্তী রোগী
          </h3>
          {nextInQueue ? (
            <div className="flex items-center gap-4">
              <img src={nextInQueue.patientImage} alt="" className="w-16 h-16 rounded-xl" />
              <div className="flex-1">
                <p className="font-bold text-lg">{nextInQueue.patientNameBn}</p>
                <p className="text-slate-500 text-sm">সিরিয়াল #{nextInQueue.serial} • {nextInQueue.type}</p>
                <p className="text-slate-600 text-sm mt-1">{nextInQueue.chiefComplaint}</p>
              </div>
              <button onClick={callNextPatient} className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600">
                ডাকুন
              </button>
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">কিউতে কেউ নেই</p>
          )}
        </div>
      </div>

      {/* Business Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-bold text-slate-800 mb-4">আজকের ব্যবসায়িক সারাংশ</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-600">৳{todayStats.revenue.toLocaleString()}</div>
            <div className="text-sm text-green-700">মোট আয়</div>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-yellow-600">৳{todayStats.pending.toLocaleString()}</div>
            <div className="text-sm text-yellow-700">বকেয়া</div>
          </div>
          <div className="bg-red-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-red-600">{todayStats.noShowRate}%</div>
            <div className="text-sm text-red-700">নো-শো রেট</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-600">{todayStats.completed}/{todayStats.total}</div>
            <div className="text-sm text-blue-700">সম্পন্ন/মোট</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-4">
        <button onClick={() => setActiveTab('queue')} className="bg-white rounded-xl p-4 border border-slate-200 hover:border-teal-300 hover:bg-teal-50 transition text-left">
          <div className="text-2xl mb-2">📋</div>
          <div className="font-bold text-slate-800">আজকের কিউ</div>
          <div className="text-sm text-slate-500">{todayStats.waiting} জন অপেক্ষমান</div>
        </button>
        <button onClick={() => setActiveTab('appointments')} className="bg-white rounded-xl p-4 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition text-left">
          <div className="text-2xl mb-2">📅</div>
          <div className="font-bold text-slate-800">অ্যাপয়েন্টমেন্ট</div>
          <div className="text-sm text-slate-500">দিন/সপ্তাহ ভিউ</div>
        </button>
        <button onClick={() => setActiveTab('schedule')} className="bg-white rounded-xl p-4 border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition text-left">
          <div className="text-2xl mb-2">⏰</div>
          <div className="font-bold text-slate-800">সময়সূচী</div>
          <div className="text-sm text-slate-500">স্লট ম্যানেজমেন্ট</div>
        </button>
        <button onClick={() => setActiveTab('analytics')} className="bg-white rounded-xl p-4 border border-slate-200 hover:border-green-300 hover:bg-green-50 transition text-left">
          <div className="text-2xl mb-2">📊</div>
          <div className="font-bold text-slate-800">রিপোর্ট</div>
          <div className="text-sm text-slate-500">বিশ্লেষণ</div>
        </button>
      </div>
    </div>
  );

  // ============ RENDER QUEUE ============
  const renderQueue = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">আজকের কিউ</h2>
          <p className="text-slate-500">{new Date().toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={callNextPatient} disabled={!nextInQueue} className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <span>📢</span> পরবর্তী রোগী ডাকুন
          </button>
        </div>
      </div>

      {/* Current Patient Banner */}
      {currentPatient && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={currentPatient.patientImage} alt="" className="w-20 h-20 rounded-xl border-4 border-white/30" />
              <div>
                <div className="text-sm opacity-90 mb-1">বর্তমানে দেখা হচ্ছে</div>
                <h3 className="text-2xl font-bold">{currentPatient.patientNameBn}</h3>
                <p className="opacity-90">সিরিয়াল #{currentPatient.serial} • {currentPatient.patientAge} বছর • {currentPatient.patientGender === 'Male' ? 'পুরুষ' : 'মহিলা'}</p>
                <p className="mt-1 text-white/80">{currentPatient.chiefComplaint}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => startConsultation(currentPatient)} className="px-6 py-3 bg-white text-green-600 rounded-xl font-bold hover:bg-green-50">
                কনসাল্টেশন শুরু করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Queue Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{todayStats.waiting}</div>
          <div className="text-sm text-yellow-700">অপেক্ষমান</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{todayStats.inProgress}</div>
          <div className="text-sm text-green-700">চলমান</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{todayStats.completed}</div>
          <div className="text-sm text-blue-700">সম্পন্ন</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{todayStats.noShow}</div>
          <div className="text-sm text-red-700">নো-শো</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{todayStats.total}</div>
          <div className="text-sm text-purple-700">মোট</div>
        </div>
      </div>

      {/* Queue List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800">রোগীর তালিকা</h3>
            <div className="flex items-center gap-2">
              {appointmentsLoading && <span className="text-blue-500 text-sm"><i className="fas fa-spinner fa-spin mr-1"></i>লোড হচ্ছে...</span>}
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm">
                <option value="all">সব স্ট্যাটাস</option>
                <option value="Waiting">অপেক্ষমান</option>
                <option value="In-Progress">চলমান</option>
                <option value="Completed">সম্পন্ন</option>
                <option value="No-Show">নো-শো</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-slate-100">
          {appointmentsLoading ? (
            <div className="p-8 text-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-slate-500">অ্যাপয়েন্টমেন্ট লোড হচ্ছে...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-slate-700">আজ কোনো অ্যাপয়েন্টমেন্ট নেই</h3>
              <p className="text-slate-500 mt-2">নতুন অ্যাপয়েন্টমেন্ট এলে এখানে দেখা যাবে।</p>
              <p className="text-sm text-blue-500 mt-4">
                <i className="fas fa-info-circle mr-1"></i>
                রিয়েল-টাইম আপডেট চালু আছে
              </p>
            </div>
          ) : filteredAppointments.map((apt) => (
            <div key={apt.id} className={`p-4 flex items-center gap-4 hover:bg-slate-50 transition ${apt.status === 'In-Progress' ? 'bg-green-50' : ''}`}>
              <div className="w-12 text-center">
                <div className={`text-lg font-bold ${apt.status === 'Completed' ? 'text-green-600' : apt.status === 'No-Show' ? 'text-red-400' : 'text-slate-800'}`}>
                  #{apt.serial}
                </div>
                <div className="text-xs text-slate-500">{apt.time}</div>
              </div>
              
              <img src={apt.patientImage} alt="" className="w-12 h-12 rounded-lg" />
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">{apt.patientNameBn}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    apt.type === 'New' ? 'bg-blue-100 text-blue-700' :
                    apt.type === 'Follow-up' ? 'bg-purple-100 text-purple-700' :
                    apt.type === 'Emergency' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>{apt.type}</span>
                </div>
                <div className="text-sm text-slate-500">{apt.patientAge} বছর • {apt.patientGender === 'Male' ? 'পুরুষ' : 'মহিলা'} • {apt.patientPhone}</div>
                {apt.chiefComplaint && <div className="text-sm text-slate-600 mt-1">{apt.chiefComplaint}</div>}
              </div>

              <div className="text-right">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  apt.status === 'Waiting' ? 'bg-yellow-100 text-yellow-700' :
                  apt.status === 'In-Progress' ? 'bg-green-100 text-green-700' :
                  apt.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {apt.status === 'Waiting' ? 'অপেক্ষমান' : apt.status === 'In-Progress' ? 'চলমান' : apt.status === 'Completed' ? 'সম্পন্ন' : 'নো-শো'}
                </div>
                <div className={`text-sm mt-1 ${apt.paymentStatus === 'Paid' ? 'text-green-600' : apt.paymentStatus === 'Pending' ? 'text-yellow-600' : 'text-slate-400'}`}>
                  ৳{apt.fee} • {apt.paymentStatus === 'Paid' ? 'পেইড' : apt.paymentStatus === 'Pending' ? 'বকেয়া' : 'মওকুফ'}
                </div>
              </div>

              <div className="flex gap-2">
                {apt.status === 'Waiting' && (
                  <>
                    <button onClick={() => startConsultation(apt)} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                      শুরু
                    </button>
                    <button onClick={() => markNoShow(apt.id)} className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200">
                      নো-শো
                    </button>
                  </>
                )}
                {apt.status === 'In-Progress' && (
                  <button onClick={() => startConsultation(apt)} className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600">
                    কনসাল্ট
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============ RENDER APPOINTMENTS ============
  const renderAppointments = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">অ্যাপয়েন্টমেন্ট</h2>
          <p className="text-slate-500">দিন বা সপ্তাহ অনুযায়ী দেখুন</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button onClick={() => setViewMode('day')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${viewMode === 'day' ? 'bg-white shadow text-slate-800' : 'text-slate-600'}`}>
              দিন
            </button>
            <button onClick={() => setViewMode('week')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${viewMode === 'week' ? 'bg-white shadow text-slate-800' : 'text-slate-600'}`}>
              সপ্তাহ
            </button>
          </div>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-4 py-2 border rounded-lg" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'Waiting', 'In-Progress', 'Completed', 'No-Show', 'Cancelled'].map(status => (
          <button key={status} onClick={() => setStatusFilter(status)} className={`px-4 py-2 rounded-full text-sm font-medium transition ${statusFilter === status ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {status === 'all' ? 'সব' : status === 'Waiting' ? 'অপেক্ষমান' : status === 'In-Progress' ? 'চলমান' : status === 'Completed' ? 'সম্পন্ন' : status === 'No-Show' ? 'নো-শো' : 'বাতিল'}
          </button>
        ))}
      </div>

      {/* Day View */}
      {viewMode === 'day' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-800">
              {new Date(dateFilter).toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h3>
            <p className="text-sm text-slate-500">{filteredAppointments.length} টি অ্যাপয়েন্টমেন্ট</p>
          </div>
          
          <div className="divide-y divide-slate-100">
            {filteredAppointments.length === 0 ? (
              <div className="p-8 text-center text-slate-400">এই দিনে কোনো অ্যাপয়েন্টমেন্ট নেই</div>
            ) : (
              filteredAppointments.map((apt) => (
                <div key={apt.id} className="p-4 flex items-center gap-4 hover:bg-slate-50">
                  <div className="w-20 text-center">
                    <div className="text-lg font-bold text-slate-800">{apt.time}</div>
                    <div className="text-xs text-slate-500">#{apt.serial}</div>
                  </div>
                  <img src={apt.patientImage} alt="" className="w-12 h-12 rounded-lg" />
                  <div className="flex-1">
                    <div className="font-bold text-slate-800">{apt.patientNameBn}</div>
                    <div className="text-sm text-slate-500">{apt.patientAge} বছর • {apt.type} • {apt.chiefComplaint || 'N/A'}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    apt.status === 'Waiting' ? 'bg-yellow-100 text-yellow-700' :
                    apt.status === 'In-Progress' ? 'bg-green-100 text-green-700' :
                    apt.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {apt.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200">
            {['শনি', 'রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র'].map((day, i) => (
              <div key={day} className={`p-3 text-center border-r last:border-r-0 ${i === 5 ? 'bg-slate-50' : ''}`}>
                <div className="font-bold text-slate-800">{day}</div>
                <div className="text-xs text-slate-500">
                  {new Date(new Date(dateFilter).setDate(new Date(dateFilter).getDate() - new Date(dateFilter).getDay() + i)).getDate()}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 min-h-[400px]">
            {[0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
              const dayDate = new Date(dateFilter);
              dayDate.setDate(dayDate.getDate() - dayDate.getDay() + dayOffset);
              const dayStr = dayDate.toISOString().split('T')[0];
              const dayAppts = appointments.filter(a => a.date === dayStr);
              
              return (
                <div key={dayOffset} className="border-r last:border-r-0 p-2 space-y-1">
                  {dayAppts.slice(0, 5).map(apt => (
                    <div key={apt.id} className={`p-2 rounded text-xs ${
                      apt.status === 'Completed' ? 'bg-green-100' :
                      apt.status === 'No-Show' ? 'bg-red-100' :
                      'bg-blue-100'
                    }`}>
                      <div className="font-medium truncate">{apt.patientName}</div>
                      <div className="text-slate-500">{apt.time}</div>
                    </div>
                  ))}
                  {dayAppts.length > 5 && (
                    <div className="text-xs text-slate-500 text-center">+{dayAppts.length - 5} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // ============ RENDER SCHEDULE ============
  const renderSchedule = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">সময়সূচী ম্যানেজমেন্ট</h2>
          <p className="text-slate-500">সাপ্তাহিক সময়সূচী ও ছুটির দিন</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly Schedule */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-800">সাপ্তাহিক সময়সূচী</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {schedule.map((day) => (
              <div key={day.day} className={`p-4 ${!day.enabled ? 'bg-slate-50' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleScheduleDay(day.day)} className={`w-10 h-6 rounded-full transition ${day.enabled ? 'bg-blue-500' : 'bg-slate-300'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition transform ${day.enabled ? 'translate-x-5' : 'translate-x-1'}`}></div>
                    </button>
                    <span className={`font-bold ${day.enabled ? 'text-slate-800' : 'text-slate-400'}`}>{day.dayBn}</span>
                  </div>
                  {day.enabled && (
                    <span className="text-sm text-blue-600 font-medium">সর্বোচ্চ {day.maxPatients} জন</span>
                  )}
                </div>
                
                {day.enabled && (
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-slate-500">শুরু</label>
                      <input type="time" value={day.startTime} onChange={(e) => updateSchedule(day.day, 'startTime', e.target.value)} className="w-full px-2 py-1 border rounded text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">শেষ</label>
                      <input type="time" value={day.endTime} onChange={(e) => updateSchedule(day.day, 'endTime', e.target.value)} className="w-full px-2 py-1 border rounded text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">স্লট (মিনিট)</label>
                      <select value={day.slotDuration} onChange={(e) => updateSchedule(day.day, 'slotDuration', Number(e.target.value))} className="w-full px-2 py-1 border rounded text-sm">
                        <option value={10}>১০</option>
                        <option value={15}>১৫</option>
                        <option value={20}>২০</option>
                        <option value={30}>৩০</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">সর্বোচ্চ</label>
                      <input type="number" value={day.maxPatients} onChange={(e) => updateSchedule(day.day, 'maxPatients', Number(e.target.value))} className="w-full px-2 py-1 border rounded text-sm" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Holidays */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">ছুটির দিন</h3>
            <button onClick={() => setShowAddHoliday(true)} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              + যোগ করুন
            </button>
          </div>
          
          <div className="divide-y divide-slate-100">
            {holidays.length === 0 ? (
              <div className="p-8 text-center text-slate-400">কোনো ছুটি নির্ধারিত নেই</div>
            ) : (
              holidays.map((holiday) => (
                <div key={holiday.date} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800">{holiday.reasonBn || holiday.reason}</div>
                    <div className="text-sm text-slate-500">{new Date(holiday.date).toLocaleDateString('bn-BD')}</div>
                  </div>
                  <button onClick={() => removeHoliday(holiday.date)} className="text-red-500 hover:text-red-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add Holiday Modal */}
          {showAddHoliday && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">নতুন ছুটি যোগ করুন</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-600">তারিখ</label>
                    <input type="date" value={newHoliday.date} onChange={(e) => setNewHoliday(prev => ({ ...prev, date: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">কারণ (বাংলা)</label>
                    <input type="text" value={newHoliday.reasonBn} onChange={(e) => setNewHoliday(prev => ({ ...prev, reasonBn: e.target.value }))} placeholder="যেমন: ঈদ" className="w-full px-3 py-2 border rounded-lg mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">কারণ (English)</label>
                    <input type="text" value={newHoliday.reason} onChange={(e) => setNewHoliday(prev => ({ ...prev, reason: e.target.value }))} placeholder="e.g. Eid" className="w-full px-3 py-2 border rounded-lg mt-1" />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowAddHoliday(false)} className="flex-1 px-4 py-2 border rounded-lg">বাতিল</button>
                  <button onClick={addHoliday} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg">যোগ করুন</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ============ RENDER CONSULTATION ============
  const renderConsultation = () => {
    if (!selectedPatient || !selectedAppointment) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-slate-400">
          <div className="text-6xl mb-4">👨‍⚕️</div>
          <p>কনসাল্টেশন শুরু করতে কিউ থেকে রোগী নির্বাচন করুন</p>
          <button onClick={() => setActiveTab('queue')} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg">
            কিউতে যান
          </button>
        </div>
      );
    }

    return (
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Patient Info & SOAP */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Header */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-4">
              <img src={selectedAppointment.patientImage} alt="" className="w-20 h-20 rounded-xl border-4 border-white/30" />
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{selectedPatient.nameBn}</h2>
                <p className="opacity-90">{selectedPatient.age} বছর • {selectedPatient.gender === 'Male' ? 'পুরুষ' : 'মহিলা'} • {selectedPatient.bloodGroup}</p>
                <div className="flex gap-2 mt-2">
                  {selectedPatient.conditions.map(c => (
                    <span key={c} className="px-2 py-0.5 bg-white/20 rounded text-xs">{c}</span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-80">সিরিয়াল</div>
                <div className="text-3xl font-bold">#{selectedAppointment.serial}</div>
              </div>
            </div>
            {selectedPatient.allergies.length > 0 && (
              <div className="mt-4 p-3 bg-red-500/30 rounded-lg">
                <span className="font-bold">⚠️ এলার্জি:</span> {selectedPatient.allergies.join(', ')}
              </div>
            )}
          </div>

          {/* SOAP Notes */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-800">SOAP নোট</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-blue-600 mb-2">
                  <span className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">S</span>
                  Subjective (রোগীর বর্ণনা)
                </label>
                <textarea value={soapNote.subjective} onChange={(e) => setSoapNote(prev => ({ ...prev, subjective: e.target.value }))} placeholder="রোগীর সমস্যার বর্ণনা..." className="w-full px-4 py-3 border rounded-xl resize-none h-24" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-green-600 mb-2">
                  <span className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">O</span>
                  Objective (পরীক্ষা-নিরীক্ষা)
                </label>
                <textarea value={soapNote.objective} onChange={(e) => setSoapNote(prev => ({ ...prev, objective: e.target.value }))} placeholder="BP, HR, Physical exam findings..." className="w-full px-4 py-3 border rounded-xl resize-none h-24" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-yellow-600 mb-2">
                  <span className="w-6 h-6 bg-yellow-100 rounded flex items-center justify-center">A</span>
                  Assessment (মূল্যায়ন)
                </label>
                <textarea value={soapNote.assessment} onChange={(e) => setSoapNote(prev => ({ ...prev, assessment: e.target.value }))} placeholder="রোগ নির্ণয় ও মূল্যায়ন..." className="w-full px-4 py-3 border rounded-xl resize-none h-24" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-purple-600 mb-2">
                  <span className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">P</span>
                  Plan (চিকিৎসা পরিকল্পনা)
                </label>
                <textarea value={soapNote.plan} onChange={(e) => setSoapNote(prev => ({ ...prev, plan: e.target.value }))} placeholder="চিকিৎসা পরিকল্পনা..." className="w-full px-4 py-3 border rounded-xl resize-none h-24" />
              </div>
            </div>
          </div>

          {/* Prescription */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">℞ প্রেসক্রিপশন</h3>
              <div className="flex gap-2">
                <select onChange={(e) => { const t = PRESCRIPTION_TEMPLATES.find(t => t.name === e.target.value); if (t) addMedicine(t); e.target.value = ''; }} className="px-3 py-1.5 border rounded-lg text-sm">
                  <option value="">টেমপ্লেট থেকে যোগ করুন</option>
                  {PRESCRIPTION_TEMPLATES.map(t => (
                    <option key={t.name} value={t.name}>{t.name}</option>
                  ))}
                </select>
                <button onClick={() => addMedicine()} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium">
                  + ওষুধ যোগ করুন
                </button>
              </div>
            </div>
            
            <div className="p-4">
              {/* Diagnosis */}
              <div className="mb-4">
                <label className="text-sm font-medium text-slate-600">রোগ নির্ণয় (Diagnosis)</label>
                <input type="text" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="যেমন: উচ্চ রক্তচাপ / Hypertension" className="w-full px-4 py-2 border rounded-lg mt-1" />
              </div>

              {/* Medicines Table */}
              {prescription.length > 0 && (
                <div className="border rounded-xl overflow-hidden mb-4">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">ওষুধ</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">মাত্রা</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">সময়কাল</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">নির্দেশনা</th>
                        <th className="px-4 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {prescription.map((med, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2">
                            <input type="text" value={med.medicine} onChange={(e) => updateMedicine(i, 'medicine', e.target.value)} placeholder="ওষুধের নাম" className="w-full px-2 py-1 border rounded" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="text" value={med.dosage} onChange={(e) => updateMedicine(i, 'dosage', e.target.value)} placeholder="1+0+1" className="w-full px-2 py-1 border rounded" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="text" value={med.duration} onChange={(e) => updateMedicine(i, 'duration', e.target.value)} placeholder="৭ দিন" className="w-full px-2 py-1 border rounded" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="text" value={med.instruction} onChange={(e) => updateMedicine(i, 'instruction', e.target.value)} placeholder="খাবারের পর" className="w-full px-2 py-1 border rounded" />
                          </td>
                          <td className="px-4 py-2">
                            <button onClick={() => removeMedicine(i)} className="text-red-500 hover:text-red-600">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Advice */}
              <div className="mb-4">
                <label className="text-sm font-medium text-slate-600">পরামর্শ</label>
                <textarea value={advice.join('\n')} onChange={(e) => setAdvice(e.target.value.split('\n'))} placeholder="প্রতিটি পরামর্শ নতুন লাইনে লিখুন..." className="w-full px-4 py-2 border rounded-lg mt-1 h-20" />
              </div>

              {/* Follow-up */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-slate-600">পরবর্তী ভিজিট:</label>
                <select value={followUpDays} onChange={(e) => setFollowUpDays(Number(e.target.value))} className="px-3 py-2 border rounded-lg">
                  <option value={7}>৭ দিন পর</option>
                  <option value={14}>১৪ দিন পর</option>
                  <option value={30}>৩০ দিন পর</option>
                  <option value={60}>২ মাস পর</option>
                  <option value={90}>৩ মাস পর</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button onClick={generatePrescription} className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 flex items-center justify-center gap-2">
              <span>🖨️</span> প্রেসক্রিপশন প্রিন্ট
            </button>
            <button onClick={completeConsultation} className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
              <span>✓</span> কনসাল্টেশন সম্পন্ন
            </button>
          </div>
        </div>

        {/* Right: AI Assistant & History */}
        <div className="space-y-6">
          {/* AI Clinical Assistant - Improved */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold flex items-center gap-2 text-lg">
                    <span>🧠</span> Nirnoy Medical AI
                  </h3>
                  <p className="text-sm opacity-90">Evidence-based clinical support</p>
                </div>
                <div className="px-2 py-1 bg-white/20 rounded-full text-xs">
                  Gemini Pro
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-3 border-b border-slate-100 bg-slate-50">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setAiInput('Differential diagnosis?')} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-200">
                  DDx
                </button>
                <button onClick={() => setAiInput('Drug interactions?')} className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium hover:bg-orange-200">
                  Drug Interactions
                </button>
                <button onClick={() => setAiInput('Treatment guidelines?')} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-medium hover:bg-green-200">
                  Guidelines
                </button>
                <button onClick={() => setAiInput('Red flags to watch?')} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-xs font-medium hover:bg-red-200">
                  Red Flags
                </button>
              </div>
            </div>
            
            {/* Chat Area - Improved */}
            <div ref={chatRef} className="h-72 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-50 to-white">
              {aiChat.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-5xl mb-3">🩺</div>
                  <p className="text-slate-500 font-medium">Clinical Decision Support</p>
                  <p className="text-slate-400 text-sm mt-1">Ask about diagnosis, treatment, or guidelines</p>
                </div>
              )}
              {aiChat.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] ${msg.role === 'user' ? '' : ''}`}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">AI</span>
                        </div>
                        <span className="text-xs text-slate-400">Nirnoy AI</span>
                      </div>
                    )}
                    <div className={`px-4 py-3 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-md' 
                        : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md shadow-sm'
                    }`}>
                      <pre className="whitespace-pre-wrap font-sans text-sm">{msg.text}</pre>
                    </div>
                  </div>
                </div>
              ))}
              {isAiThinking && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
                      <span className="text-white text-xs">AI</span>
                    </div>
                    <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                        <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Input Area - Improved */}
            <div className="p-4 border-t border-slate-200 bg-white">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={aiInput} 
                  onChange={(e) => setAiInput(e.target.value)} 
                  onKeyPress={(e) => e.key === 'Enter' && handleAIChat()} 
                  placeholder="Ask about diagnosis, treatment, drug interactions..." 
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
                <button 
                  onClick={handleAIChat} 
                  disabled={isAiThinking || !aiInput.trim()} 
                  className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-purple-500/25"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">AI-powered clinical support • Always verify with current guidelines</p>
            </div>
          </div>

          {/* Patient History */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-800">রোগীর ইতিহাস</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">মোট ভিজিট:</span>
                <span className="font-medium">{selectedPatient.totalVisits} বার</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">শেষ ভিজিট:</span>
                <span className="font-medium">{new Date(selectedPatient.lastVisit).toLocaleDateString('bn-BD')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">ঝুঁকির মাত্রা:</span>
                <span className={`font-medium ${selectedPatient.riskLevel === 'High' ? 'text-red-600' : selectedPatient.riskLevel === 'Medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                  {selectedPatient.riskLevel === 'High' ? 'উচ্চ' : selectedPatient.riskLevel === 'Medium' ? 'মাঝারি' : 'কম'}
                </span>
              </div>
              
              <div className="pt-3 border-t">
                <div className="text-sm font-medium text-slate-600 mb-2">বর্তমান ওষুধ:</div>
                <div className="space-y-1">
                  {selectedPatient.medications.map((med, i) => (
                    <div key={i} className="text-sm px-2 py-1 bg-blue-50 text-blue-700 rounded">{med}</div>
                  ))}
                </div>
              </div>

              {selectedPatient.familyHistory.length > 0 && (
                <div className="pt-3 border-t">
                  <div className="text-sm font-medium text-slate-600 mb-2">পারিবারিক ইতিহাস:</div>
                  <div className="space-y-1">
                    {selectedPatient.familyHistory.map((h, i) => (
                      <div key={i} className="text-sm text-slate-600">{h.condition} ({h.relation})</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============ RENDER ANALYTICS ============
  const renderAnalytics = () => {
    const weeklyData = [
      { day: 'শনি', patients: 18, revenue: 15000 },
      { day: 'রবি', patients: 22, revenue: 18500 },
      { day: 'সোম', patients: 15, revenue: 12000 },
      { day: 'মঙ্গল', patients: 20, revenue: 17000 },
      { day: 'বুধ', patients: 0, revenue: 0 },
      { day: 'বৃহ', patients: 25, revenue: 21000 },
      { day: 'শুক্র', patients: 0, revenue: 0 },
    ];

    const monthlyStats = {
      totalPatients: 156,
      totalRevenue: 145000,
      avgPerDay: 22,
      noShowRate: 8,
      newPatients: 45,
      followUps: 111,
    };

    const diagnosisData = [
      { name: 'উচ্চ রক্তচাপ', value: 35, color: '#ef4444' },
      { name: 'ডায়াবেটিস', value: 28, color: '#f97316' },
      { name: 'বুকে ব্যথা', value: 22, color: '#eab308' },
      { name: 'হার্ট ফেইলিওর', value: 15, color: '#22c55e' },
      { name: 'অন্যান্য', value: 20, color: '#6366f1' },
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">বিশ্লেষণ ও রিপোর্ট</h2>
            <p className="text-slate-500">এই মাসের সারাংশ</p>
          </div>
        </div>

        {/* Monthly Stats */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <div className="text-2xl font-bold text-blue-600">{monthlyStats.totalPatients}</div>
            <div className="text-sm text-slate-500">মোট রোগী</div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="text-2xl font-bold text-green-600">৳{(monthlyStats.totalRevenue/1000).toFixed(0)}K</div>
            <div className="text-sm text-slate-500">মোট আয়</div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="text-2xl font-bold text-blue-600">{monthlyStats.avgPerDay}</div>
            <div className="text-sm text-slate-500">গড়/দিন</div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="text-2xl font-bold text-red-600">{monthlyStats.noShowRate}%</div>
            <div className="text-sm text-slate-500">নো-শো</div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="text-2xl font-bold text-purple-600">{monthlyStats.newPatients}</div>
            <div className="text-sm text-slate-500">নতুন রোগী</div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="text-2xl font-bold text-indigo-600">{monthlyStats.followUps}</div>
            <div className="text-sm text-slate-500">ফলো-আপ</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Weekly Chart */}
          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-bold text-slate-800 mb-4">সাপ্তাহিক রোগী</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip />
                <Bar dataKey="patients" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-bold text-slate-800 mb-4">সাপ্তাহিক আয়</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip formatter={(value: number) => [`৳${value.toLocaleString()}`, 'আয়']} />
                <Area type="monotone" dataKey="revenue" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Diagnosis Distribution */}
          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-bold text-slate-800 mb-4">রোগ বিতরণ</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={diagnosisData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                  {diagnosisData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} জন`, '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {diagnosisData.map((d, i) => (
                <div key={i} className="flex items-center gap-1 text-xs">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: d.color }}></div>
                  <span>{d.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Performance */}
          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-bold text-slate-800 mb-4">পারফরম্যান্স</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>রোগী সন্তুষ্টি</span>
                  <span className="font-medium">4.8/5.0</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full" style={{ width: '96%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>সময়মতো শুরু</span>
                  <span className="font-medium">85%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>ফলো-আপ রেট</span>
                  <span className="font-medium">72%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '72%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>প্রেসক্রিপশন সম্পূর্ণতা</span>
                  <span className="font-medium">98%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '98%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };


  // ============ R&D / MEDICAL NEWS STATE ============
  const [medicalNews, setMedicalNews] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState('Cardiology');
  const [guidelineQuery, setGuidelineQuery] = useState('');
  const [guidelineResult, setGuidelineResult] = useState('');
  const [guidelineLoading, setGuidelineLoading] = useState(false);

  const fetchMedicalNews = async () => {
    setNewsLoading(true);
    try {
      const result = await getMedicalNews(selectedSpecialty);
      const parsed = JSON.parse(result);
      setMedicalNews(Array.isArray(parsed) ? parsed : []);
    } catch (e) {
      console.error(e);
      setMedicalNews([]);
    }
    setNewsLoading(false);
  };

  const searchGuidelines = async () => {
    if (!guidelineQuery.trim()) return;
    setGuidelineLoading(true);
    try {
      const result = await searchMedicalGuidelines(guidelineQuery);
      setGuidelineResult(result);
    } catch (e) {
      setGuidelineResult('Error fetching guidelines.');
    }
    setGuidelineLoading(false);
  };

  // ============ RENDER R&D ============
  const renderRnD = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">R&D - গবেষণা ও উন্নয়ন</h2>
          <p className="text-slate-500">সর্বশেষ মেডিকেল জার্নাল ও গাইডলাইন</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Medical News Feed */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
            <h3 className="font-bold flex items-center gap-2">
              <span>📰</span> মেডিকেল নিউজ ফিড
            </h3>
            <p className="text-sm opacity-90">সাম্প্রতিক গবেষণা ও আপডেট</p>
          </div>
          
          <div className="p-4 border-b border-slate-100">
            <div className="flex gap-2">
              <select value={selectedSpecialty} onChange={(e) => setSelectedSpecialty(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg">
                <option value="Cardiology">হৃদরোগ (Cardiology)</option>
                <option value="Endocrinology">ডায়াবেটিস (Endocrinology)</option>
                <option value="Internal Medicine">মেডিসিন (Internal Medicine)</option>
                <option value="Neurology">স্নায়ুরোগ (Neurology)</option>
                <option value="Oncology">ক্যান্সার (Oncology)</option>
                <option value="Pediatrics">শিশুরোগ (Pediatrics)</option>
                <option value="General Medicine">সাধারণ চিকিৎসা</option>
              </select>
              <button onClick={fetchMedicalNews} disabled={newsLoading} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
                {newsLoading ? '...' : 'লোড করুন'}
              </button>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            {medicalNews.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <div className="text-4xl mb-2">🔬</div>
                <p>বিশেষত্ব নির্বাচন করে "লোড করুন" ক্লিক করুন</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {medicalNews.map((item, i) => (
                  <div key={i} className="p-4 hover:bg-slate-50">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg ${
                        item.category === 'Research' ? 'bg-purple-500' :
                        item.category === 'Guideline' ? 'bg-green-500' :
                        item.category === 'Drug' ? 'bg-orange-500' :
                        'bg-blue-500'
                      }`}>
                        {item.category === 'Research' ? '📊' : item.category === 'Guideline' ? '📋' : item.category === 'Drug' ? '💊' : '🔬'}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-800 text-sm">{item.title}</h4>
                        <p className="text-xs text-slate-500 mt-1">{item.source} • {item.date}</p>
                        <p className="text-sm text-slate-600 mt-2">{item.summary}</p>
                        <p className="text-xs text-blue-600 mt-2 font-medium">{item.relevance}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Guidelines Search */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-green-500 to-teal-600 text-white">
              <h3 className="font-bold flex items-center gap-2">
                <span>📚</span> গাইডলাইন সার্চ
              </h3>
              <p className="text-sm opacity-90">WHO, AHA, ESC, NICE গাইডলাইন</p>
            </div>
            
            <div className="p-4">
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  value={guidelineQuery} 
                  onChange={(e) => setGuidelineQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchGuidelines()}
                  placeholder="যেমন: Hypertension management, Diabetes treatment..."
                  className="flex-1 px-4 py-2 border rounded-lg"
                />
                <button onClick={searchGuidelines} disabled={guidelineLoading} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50">
                  {guidelineLoading ? '...' : 'সার্চ'}
                </button>
              </div>

              {/* Quick Searches */}
              <div className="flex flex-wrap gap-2 mb-4">
                {['Hypertension 2024', 'Diabetes ADA', 'Heart Failure ESC', 'Antibiotic Guidelines'].map(q => (
                  <button key={q} onClick={() => { setGuidelineQuery(q); }} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs hover:bg-slate-200">
                    {q}
                  </button>
                ))}
              </div>

              {guidelineResult && (
                <div className="bg-slate-50 rounded-xl p-4 max-h-80 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">{guidelineResult}</pre>
                </div>
              )}
            </div>
          </div>

          {/* Quick Reference */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-800">দ্রুত রেফারেন্স</h3>
            </div>
            <div className="p-4 space-y-3">
              <a href="https://www.uptodate.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
                <span className="text-2xl">📖</span>
                <div>
                  <div className="font-medium text-blue-700">UpToDate</div>
                  <div className="text-xs text-blue-600">Evidence-based clinical decisions</div>
                </div>
              </a>
              <a href="https://pubmed.ncbi.nlm.nih.gov" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition">
                <span className="text-2xl">🔬</span>
                <div>
                  <div className="font-medium text-green-700">PubMed</div>
                  <div className="text-xs text-green-600">Medical literature database</div>
                </div>
              </a>
              <a href="https://www.who.int/publications" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition">
                <span className="text-2xl">🌍</span>
                <div>
                  <div className="font-medium text-purple-700">WHO Guidelines</div>
                  <div className="text-xs text-purple-600">World Health Organization</div>
                </div>
              </a>
              <a href="https://www.nejm.org" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-red-50 rounded-lg hover:bg-red-100 transition">
                <span className="text-2xl">📰</span>
                <div>
                  <div className="font-medium text-red-700">NEJM</div>
                  <div className="text-xs text-red-600">New England Journal of Medicine</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );



  // ============ SETTINGS STATE ============
  const [profileForm, setProfileForm] = useState({
    name: doctorProfile.name,
    nameBn: doctorProfile.nameBn,
    email: doctorUser.email || '',
    phone: doctorUser.phone || '',
    specialty: doctorProfile.specialty,
    degrees: doctorProfile.degrees,
    bmdcNo: doctorProfile.bmdcNo,
    experience: doctorProfile.experience,
    bio: doctorUser.bio || `Experienced ${doctorProfile.specialty} specialist.`,
    consultationFee: doctorProfile.consultationFee,
    followUpFee: doctorUser.followUpFee || Math.round(doctorProfile.consultationFee * 0.5),
  });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [profileImage, setProfileImage] = useState(doctorProfile.image);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'security' | 'billing' | 'notifications'>('profile');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      const updates = {
        name: profileForm.name,
        email: profileForm.email || undefined,
        phone: profileForm.phone || undefined,
        specializations: [profileForm.specialty],
        qualifications: profileForm.degrees.split(',').map(d => d.trim()),
        bmdcNumber: profileForm.bmdcNo,
        experienceYears: profileForm.experience,
        bio: profileForm.bio,
        consultationFee: profileForm.consultationFee,
        followUpFee: profileForm.followUpFee,
      };
      
      console.log('[DoctorDashboard] Saving profile updates:', updates);
      const success = await updateProfile(updates);
      
      if (success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        console.log('[DoctorDashboard] Profile saved successfully');
      } else {
        alert('সংরক্ষণ ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।');
      }
    } catch (error) {
      console.error('[DoctorDashboard] Save error:', error);
      alert('একটি ত্রুটি হয়েছে');
    }
    setSaving(false);
  };

  const handlePasswordChange = () => {
    if (passwordForm.new !== passwordForm.confirm) {
      alert('পাসওয়ার্ড মিলছে না!');
      return;
    }
    if (passwordForm.new.length < 6) {
      alert('পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে');
      return;
    }
    setPasswordForm({ current: '', new: '', confirm: '' });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // ============ RENDER SETTINGS ============
  const renderSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">সেটিংস</h2>
          <p className="text-slate-500">প্রোফাইল, নিরাপত্তা ও বিলিং</p>
        </div>
        {saveSuccess && (
          <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg flex items-center gap-2">
            <span>✓</span> সংরক্ষিত হয়েছে!
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 h-fit">
          <nav className="space-y-1">
            {[
              { id: 'profile', icon: '👤', label: 'প্রোফাইল' },
              { id: 'security', icon: '🔒', label: 'নিরাপত্তা' },
              { id: 'billing', icon: '💳', label: 'বিলিং' },
              { id: 'notifications', icon: '🔔', label: 'নোটিফিকেশন' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setSettingsTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-left ${
                  settingsTab === item.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {settingsTab === 'profile' && (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 mb-4">প্রোফাইল ছবি</h3>
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <img src={profileImage} alt="" className="w-24 h-24 rounded-2xl object-cover" />
                    <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition">
                      <span className="text-white text-sm">📷</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">JPG, PNG বা GIF আপলোড করুন</p>
                    <p className="text-xs text-slate-400 mt-1">সর্বোচ্চ ২MB</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 mb-4">মৌলিক তথ্য</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-600">নাম (English)</label>
                    <input type="text" value={profileForm.name} onChange={(e) => setProfileForm(p => ({...p, name: e.target.value}))} className="w-full px-4 py-2 border rounded-lg mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">নাম (বাংলা)</label>
                    <input type="text" value={profileForm.nameBn} onChange={(e) => setProfileForm(p => ({...p, nameBn: e.target.value}))} className="w-full px-4 py-2 border rounded-lg mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">ইমেইল</label>
                    <input type="email" value={profileForm.email} onChange={(e) => setProfileForm(p => ({...p, email: e.target.value}))} className="w-full px-4 py-2 border rounded-lg mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">মোবাইল</label>
                    <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm(p => ({...p, phone: e.target.value}))} className="w-full px-4 py-2 border rounded-lg mt-1" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 mb-4">পেশাগত তথ্য</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-600">বিশেষত্ব</label>
                    <select value={profileForm.specialty} onChange={(e) => setProfileForm(p => ({...p, specialty: e.target.value}))} className="w-full px-4 py-2 border rounded-lg mt-1">
                      <option value="Cardiology">হৃদরোগ (Cardiology)</option>
                      <option value="Medicine">মেডিসিন</option>
                      <option value="Orthopedics">হাড় ও জোড়া</option>
                      <option value="Gynecology">স্ত্রীরোগ</option>
                      <option value="Pediatrics">শিশুরোগ</option>
                      <option value="Dermatology">চর্মরোগ</option>
                      <option value="ENT">নাক-কান-গলা</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">BMDC নম্বর</label>
                    <input type="text" value={profileForm.bmdcNo} onChange={(e) => setProfileForm(p => ({...p, bmdcNo: e.target.value}))} className="w-full px-4 py-2 border rounded-lg mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">ডিগ্রি</label>
                    <input type="text" value={profileForm.degrees} onChange={(e) => setProfileForm(p => ({...p, degrees: e.target.value}))} className="w-full px-4 py-2 border rounded-lg mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">অভিজ্ঞতা (বছর)</label>
                    <input type="number" value={profileForm.experience} onChange={(e) => setProfileForm(p => ({...p, experience: parseInt(e.target.value)}))} className="w-full px-4 py-2 border rounded-lg mt-1" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-600">বায়ো / পরিচিতি</label>
                    <textarea value={profileForm.bio} onChange={(e) => setProfileForm(p => ({...p, bio: e.target.value}))} rows={3} className="w-full px-4 py-2 border rounded-lg mt-1" />
                  </div>
                </div>
                <button 
                  onClick={handleProfileSave} 
                  disabled={saving}
                  className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      সংরক্ষণ হচ্ছে...
                    </>
                  ) : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </>
          )}

          {settingsTab === 'security' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-800 mb-4">পাসওয়ার্ড পরিবর্তন</h3>
              <div className="max-w-md space-y-4">
                <div>
                  <label className="text-sm text-slate-600">বর্তমান পাসওয়ার্ড</label>
                  <input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm(p => ({...p, current: e.target.value}))} className="w-full px-4 py-2 border rounded-lg mt-1" />
                </div>
                <div>
                  <label className="text-sm text-slate-600">নতুন পাসওয়ার্ড</label>
                  <input type="password" value={passwordForm.new} onChange={(e) => setPasswordForm(p => ({...p, new: e.target.value}))} className="w-full px-4 py-2 border rounded-lg mt-1" />
                </div>
                <div>
                  <label className="text-sm text-slate-600">নতুন পাসওয়ার্ড নিশ্চিত করুন</label>
                  <input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm(p => ({...p, confirm: e.target.value}))} className="w-full px-4 py-2 border rounded-lg mt-1" />
                </div>
                <button onClick={handlePasswordChange} className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-700">
                  পাসওয়ার্ড পরিবর্তন করুন
                </button>
              </div>
              <div className="mt-8 pt-6 border-t">
                <h4 className="font-bold text-slate-800 mb-4">টু-ফ্যাক্টর অথেনটিকেশন</h4>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-medium text-slate-800">SMS ভেরিফিকেশন</p>
                    <p className="text-sm text-slate-500">লগইনের সময় OTP পাঠানো হবে</p>
                  </div>
                  <button className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">✓ সক্রিয়</button>
                </div>
              </div>
            </div>
          )}

          {settingsTab === 'billing' && (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 mb-4">ফি সেটিংস</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-600">নতুন রোগী ফি (৳)</label>
                    <input type="number" value={profileForm.consultationFee} onChange={(e) => setProfileForm(p => ({...p, consultationFee: parseInt(e.target.value)}))} className="w-full px-4 py-2 border rounded-lg mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">ফলো-আপ ফি (৳)</label>
                    <input type="number" value={profileForm.followUpFee} onChange={(e) => setProfileForm(p => ({...p, followUpFee: parseInt(e.target.value)}))} className="w-full px-4 py-2 border rounded-lg mt-1" />
                  </div>
                </div>
                <button 
                  onClick={handleProfileSave} 
                  disabled={saving}
                  className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 mb-4">পেমেন্ট মেথড</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center"><span className="text-2xl">📱</span></div>
                      <div><p className="font-medium">বিকাশ</p><p className="text-sm text-slate-500">01700-123456</p></div>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">প্রাইমারি</span>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center"><span className="text-2xl">📱</span></div>
                      <div><p className="font-medium">নগদ</p><p className="text-sm text-slate-500">01700-123456</p></div>
                    </div>
                    <button className="text-blue-600 text-sm font-medium">এডিট</button>
                  </div>
                  <button className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-teal-500 hover:text-blue-600 transition">+ নতুন পেমেন্ট মেথড যোগ করুন</button>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 mb-4">এই মাসের সারাংশ</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 rounded-xl"><div className="text-2xl font-bold text-green-600">৳১,৪৫,০০০</div><div className="text-sm text-green-700">মোট আয়</div></div>
                  <div className="p-4 bg-blue-50 rounded-xl"><div className="text-2xl font-bold text-blue-600">১৫৬</div><div className="text-sm text-blue-700">মোট রোগী</div></div>
                  <div className="p-4 bg-purple-50 rounded-xl"><div className="text-2xl font-bold text-purple-600">৳৯৩০</div><div className="text-sm text-purple-700">গড় ফি</div></div>
                </div>
              </div>
            </>
          )}

          {settingsTab === 'notifications' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-800 mb-4">নোটিফিকেশন সেটিংস</h3>
              <div className="space-y-4">
                {[
                  { label: 'নতুন অ্যাপয়েন্টমেন্ট', desc: 'নতুন সিরিয়াল হলে SMS পাবেন', enabled: true },
                  { label: 'অ্যাপয়েন্টমেন্ট রিমাইন্ডার', desc: 'প্রতিদিন সকালে আজকের তালিকা', enabled: true },
                  { label: 'রোগীর মেসেজ', desc: 'রোগী মেসেজ পাঠালে নোটিফিকেশন', enabled: false },
                  { label: 'পেমেন্ট আপডেট', desc: 'পেমেন্ট সম্পন্ন হলে জানাবে', enabled: true },
                  { label: 'সাপ্তাহিক রিপোর্ট', desc: 'প্রতি সপ্তাহে সারাংশ ইমেইল', enabled: false },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-xl">
                    <div><p className="font-medium text-slate-800">{item.label}</p><p className="text-sm text-slate-500">{item.desc}</p></div>
                    <button className={`w-12 h-6 rounded-full transition ${item.enabled ? 'bg-blue-500' : 'bg-slate-300'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow transform transition ${item.enabled ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );


  // ============ SIDEBAR ============
  const sidebarItems = [
    { id: 'overview', icon: '🏠', label: 'ওভারভিউ', labelEn: 'Overview' },
    { id: 'queue', icon: '📋', label: 'আজকের কিউ', labelEn: 'Today Queue', badge: todayStats.waiting },
    { id: 'appointments', icon: '📅', label: 'অ্যাপয়েন্টমেন্ট', labelEn: 'Appointments' },
    { id: 'schedule', icon: '⏰', label: 'সময়সূচী', labelEn: 'Schedule' },
    { id: 'consult', icon: '👨‍⚕️', label: 'কনসাল্টেশন', labelEn: 'Consultation' },
    { id: 'analytics', icon: '📊', label: 'বিশ্লেষণ', labelEn: 'Analytics' },
    { id: 'rnd', icon: '🔬', label: 'R&D', labelEn: 'Research' },
    { id: 'settings', icon: '⚙️', label: 'সেটিংস', labelEn: 'Settings' },
  ];

  // ============ MAIN RENDER ============
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">ন</span>
            </div>
            <div>
              <div className="font-bold text-slate-800">নির্ণয়</div>
              <div className="text-xs text-slate-500">ডাক্তার প্যানেল</div>
            </div>
          </div>
        </div>

        {/* Doctor Profile */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <img src={doctorProfile.image} alt="" className="w-12 h-12 rounded-full" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-800 truncate">{doctorProfile.nameBn}</div>
              <div className="text-xs text-slate-500">{doctorProfile.specialtyBn}</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                activeTab === item.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="flex-1 text-left font-medium">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition"
          >
            <span className="text-xl">🚪</span>
            <span className="font-medium">লগ আউট</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'queue' && renderQueue()}
          {activeTab === 'appointments' && renderAppointments()}
          {activeTab === 'schedule' && renderSchedule()}
          {activeTab === 'consult' && renderConsultation()}
          {activeTab === 'analytics' && renderAnalytics()}
          {activeTab === 'rnd' && renderRnD()}
          {activeTab === 'settings' && renderSettings()}
        </div>
      </main>
    </div>
  );
};

export default DoctorDashboard;
