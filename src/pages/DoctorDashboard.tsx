import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { chatWithDoctorAssistant, getMedicalNews, searchMedicalGuidelines } from '../services/geminiService';
import { ChatMessage, PrescriptionItem } from '../types';
import { useAuth, DoctorProfile } from "../contexts/AuthContext";
import { openPrescriptionWindow, PrescriptionData } from '../utils/prescriptionPDF';
import { supabase, isSupabaseConfigured } from '../services/supabaseAuth';
import { getPatientHistoryForDoctor, CompleteMedicalHistory } from '../services/medicalHistoryService';
import { PatientManager, PatientRecord } from '../components/doctor/PatientManager';

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
  chamberId?: string; // Optional: specific to a chamber
}

// Chamber Management Types
interface DoctorChamber {
  id: string;
  name: string;
  nameBn: string;
  address: string;
  area: string;
  city: string;
  phone: string;
  fee: number;
  followUpFee: number;
  reportFee: number;
  schedule: Schedule[];
  holidays: Holiday[];
  isActive: boolean;
  isPrimary: boolean;
}

interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

type TabType = 'overview' | 'queue' | 'patients' | 'appointments' | 'chambers' | 'schedule' | 'consult' | 'analytics' | 'rnd' | 'settings';

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 rounded-3xl text-center">
          <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">লোড হচ্ছে...</p>
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
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-strong rounded-3xl p-8 max-w-md text-center border border-white/50 shadow-2xl">
          <div className="text-6xl mb-4">{doctorUser.status === 'pending' ? '⏳' : '❌'}</div>
          <h2 className="text-2xl font-bold text-slate-700 mb-2">
            {doctorUser.status === 'pending' ? 'অনুমোদনের অপেক্ষায়' : 'আবেদন প্রত্যাখ্যান করা হয়েছে'}
          </h2>
          <p className="text-slate-500 mb-4">
            {doctorUser.status === 'pending' 
              ? 'আপনার ডাক্তার অ্যাকাউন্ট এখনো অনুমোদিত হয়নি। অনুগ্রহ করে অপেক্ষা করুন।'
              : doctorUser.rejectionReason || 'আপনার আবেদন প্রত্যাখ্যান করা হয়েছে।'}
          </p>
          <button onClick={() => { logout(); navigate('/'); }} className="px-6 py-3 btn-glass-primary rounded-xl font-bold transition">
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
  
  // Multi-Chamber State
  const [chambers, setChambers] = useState<DoctorChamber[]>([]);
  const [activeChamber, setActiveChamber] = useState<string | null>(null);
  const [showAddChamber, setShowAddChamber] = useState(false);
  const [editingChamber, setEditingChamber] = useState<DoctorChamber | null>(null);
  const [chamberForm, setChamberForm] = useState<Partial<DoctorChamber>>({
    name: '', nameBn: '', address: '', area: '', city: 'ঢাকা', phone: '',
    fee: 500, followUpFee: 300, reportFee: 200, isActive: true, isPrimary: false
  });
  
  // Initialize chambers from doctor profile
  useEffect(() => {
    if (doctorUser?.chambers && Array.isArray(doctorUser.chambers)) {
      const existingChambers: DoctorChamber[] = doctorUser.chambers.map((c: any, idx: number) => ({
        id: c.id || `chamber-${idx}`,
        name: c.name || 'Chamber',
        nameBn: c.nameBn || c.name || 'চেম্বার',
        address: c.address || '',
        area: c.area || '',
        city: c.city || 'ঢাকা',
        phone: c.phone || user?.phone || '',
        fee: c.fee || 500,
        followUpFee: c.followUpFee || Math.round((c.fee || 500) * 0.5),
        reportFee: c.reportFee || Math.round((c.fee || 500) * 0.3),
        schedule: c.schedule || DEFAULT_SCHEDULE,
        holidays: c.holidays || [],
        isActive: c.isActive !== false,
        isPrimary: idx === 0
      }));
      setChambers(existingChambers);
      if (existingChambers.length > 0 && !activeChamber) {
        setActiveChamber(existingChambers[0].id);
      }
    } else {
      // Create default chamber if none exists
      const defaultChamber: DoctorChamber = {
        id: 'default-chamber',
        name: doctorProfile.hospital || 'Primary Chamber',
        nameBn: doctorProfile.hospitalBn || 'প্রধান চেম্বার',
        address: doctorProfile.chamberAddress || '',
        area: '',
        city: 'ঢাকা',
        phone: doctorProfile.chamberPhone || user?.phone || '',
        fee: doctorProfile.consultationFee || 500,
        followUpFee: Math.round((doctorProfile.consultationFee || 500) * 0.5),
        reportFee: Math.round((doctorProfile.consultationFee || 500) * 0.3),
        schedule: DEFAULT_SCHEDULE,
        holidays: [],
        isActive: true,
        isPrimary: true
      };
      setChambers([defaultChamber]);
      setActiveChamber(defaultChamber.id);
    }
  }, [doctorUser?.chambers]);
  
  // Get active chamber data
  const currentChamber = useMemo(() => 
    chambers.find(c => c.id === activeChamber) || chambers[0] || null,
    [chambers, activeChamber]
  );
  
  // Chamber CRUD operations
  const addChamber = async () => {
    if (!chamberForm.name?.trim()) return;
    
    const newChamber: DoctorChamber = {
      id: `chamber-${Date.now()}`,
      name: chamberForm.name || '',
      nameBn: chamberForm.nameBn || chamberForm.name || '',
      address: chamberForm.address || '',
      area: chamberForm.area || '',
      city: chamberForm.city || 'ঢাকা',
      phone: chamberForm.phone || '',
      fee: chamberForm.fee || 500,
      followUpFee: chamberForm.followUpFee || 300,
      reportFee: chamberForm.reportFee || 200,
      schedule: DEFAULT_SCHEDULE,
      holidays: [],
      isActive: true,
      isPrimary: chambers.length === 0
    };
    
    const updatedChambers = [...chambers, newChamber];
    setChambers(updatedChambers);
    
    // Save to Supabase
    if (isSupabaseConfigured() && user?.id) {
      try {
        await supabase
          .from('doctors')
          .update({ chambers: updatedChambers })
          .eq('profile_id', user.id);
        console.log('[Chambers] ✅ Added new chamber:', newChamber.name);
      } catch (e) {
        console.error('[Chambers] ❌ Error saving:', e);
      }
    }
    
    setShowAddChamber(false);
    setChamberForm({
      name: '', nameBn: '', address: '', area: '', city: 'ঢাকা', phone: '',
      fee: 500, followUpFee: 300, reportFee: 200, isActive: true, isPrimary: false
    });
  };
  
  const updateChamber = async (chamberId: string, updates: Partial<DoctorChamber>) => {
    const updatedChambers = chambers.map(c => 
      c.id === chamberId ? { ...c, ...updates } : c
    );
    setChambers(updatedChambers);
    
    // Save to Supabase
    if (isSupabaseConfigured() && user?.id) {
      try {
        await supabase
          .from('doctors')
          .update({ chambers: updatedChambers })
          .eq('profile_id', user.id);
        console.log('[Chambers] ✅ Updated chamber:', chamberId);
      } catch (e) {
        console.error('[Chambers] ❌ Error updating:', e);
      }
    }
  };
  
  const deleteChamber = async (chamberId: string) => {
    if (chambers.length <= 1) {
      alert('অন্তত একটি চেম্বার থাকতে হবে।');
      return;
    }
    
    const updatedChambers = chambers.filter(c => c.id !== chamberId);
    // Make first chamber primary if deleted was primary
    if (chambers.find(c => c.id === chamberId)?.isPrimary && updatedChambers.length > 0) {
      updatedChambers[0].isPrimary = true;
    }
    setChambers(updatedChambers);
    
    if (activeChamber === chamberId) {
      setActiveChamber(updatedChambers[0]?.id || null);
    }
    
    // Save to Supabase
    if (isSupabaseConfigured() && user?.id) {
      try {
        await supabase
          .from('doctors')
          .update({ chambers: updatedChambers })
          .eq('profile_id', user.id);
        console.log('[Chambers] ✅ Deleted chamber:', chamberId);
      } catch (e) {
        console.error('[Chambers] ❌ Error deleting:', e);
      }
    }
  };
  
  const setPrimaryChamber = async (chamberId: string) => {
    const updatedChambers = chambers.map(c => ({
      ...c,
      isPrimary: c.id === chamberId
    }));
    setChambers(updatedChambers);
    
    // Save to Supabase
    if (isSupabaseConfigured() && user?.id) {
      try {
        await supabase
          .from('doctors')
          .update({ chambers: updatedChambers })
          .eq('profile_id', user.id);
      } catch (e) {
        console.error('[Chambers] ❌ Error setting primary:', e);
      }
    }
  };
  
  // Update schedule for current chamber
  const updateChamberSchedule = (day: string, field: keyof Schedule, value: any) => {
    if (!currentChamber) return;
    
    const updatedSchedule = currentChamber.schedule.map(s => 
      s.day === day ? { ...s, [field]: value } : s
    );
    updateChamber(currentChamber.id, { schedule: updatedSchedule });
  };
  
  const toggleChamberScheduleDay = (day: string) => {
    if (!currentChamber) return;
    
    const updatedSchedule = currentChamber.schedule.map(s => 
      s.day === day ? { ...s, enabled: !s.enabled } : s
    );
    updateChamber(currentChamber.id, { schedule: updatedSchedule });
  };

  // Fetch real appointments from Supabase - optimized with useCallback
  const fetchAppointments = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured()) {
      console.log('[DoctorDashboard] ❌ Cannot fetch - no user or Supabase not configured');
      setAppointmentsLoading(false);
      return;
    }

    try {
      const profileId = user.id;
      
      // Optimized query - only fetch today and future appointments by default
      const today = new Date().toISOString().split('T')[0];
      
      // Simple query - just use profile_id as doctor_id
      // This should match what BookingModal saves
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', profileId)
        .gte('scheduled_date', today) // Only today and future
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true })
        .limit(100); // Limit to prevent huge queries

      if (error) {
        console.error('[DoctorDashboard] ❌ Query error:', error);
        setAppointmentsLoading(false);
        return;
      }

      console.log('[DoctorDashboard] Query returned:', data?.length || 0, 'appointments');

      if (data && data.length > 0) {
        const transformedAppointments: Appointment[] = data.map((apt, index) => ({
          id: apt.id,
          patientId: apt.patient_id || `guest-${apt.id}`,
          patientName: apt.patient_name || 'Unknown',
          patientNameBn: apt.patient_name || 'অজানা',
          patientImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(apt.patient_name || 'U')}&background=${apt.patient_id ? '3b82f6' : 'ec4899'}&color=fff&size=200`,
          patientPhone: apt.patient_phone || '',
          patientAge: 0,
          patientGender: 'Male' as const,
          date: apt.scheduled_date,
          time: apt.scheduled_time,
          serial: apt.serial_number || index + 1,
          type: apt.appointment_type === 'follow_up' ? 'Follow-up' : apt.appointment_type === 'report' ? 'Report' : 'New',
          status: apt.status === 'confirmed' ? 'Waiting' : apt.status === 'completed' ? 'Completed' : apt.status === 'cancelled' ? 'Cancelled' : 'Waiting',
          chiefComplaint: apt.symptoms,
          fee: apt.fee_paid || 500,
          paymentStatus: apt.payment_status === 'paid' ? 'Paid' : apt.payment_status === 'pending' ? 'Pending' : apt.payment_status === 'waived' ? 'Waived' : 'Pending' as const,
        }));

        console.log('[DoctorDashboard] ✅ Loaded', transformedAppointments.length, 'appointments');
        setAppointments(transformedAppointments);
      } else {
        console.log('[DoctorDashboard] ℹ️ No appointments found for this doctor');
        setAppointments([]);
      }
    } catch (e) {
      console.error('[DoctorDashboard] ❌ Fetch exception:', e);
    } finally {
      setAppointmentsLoading(false);
    }
  }, [user?.id]);

  // Debounce function for real-time updates
  const debouncedFetch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fetchAppointments();
      }, 500); // 500ms debounce
    };
  }, [fetchAppointments]);

  // Fetch appointments on mount and when user changes
  useEffect(() => {
    fetchAppointments();

    // Real-time subscription with debouncing
    if (!user?.id || !isSupabaseConfigured()) return;

    const subscription = supabase
      .channel('doctor-appointments-' + user.id)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'appointments',
          filter: `doctor_id=eq.${user.id}` // Only listen to this doctor's appointments
        },
        (payload) => {
          console.log('[DoctorDashboard] 🔄 Real-time update:', payload.eventType);
          debouncedFetch();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[DoctorDashboard] ✅ Real-time subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[DoctorDashboard] ❌ Real-time subscription error');
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, fetchAppointments, debouncedFetch]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [patientHistory, setPatientHistory] = useState<CompleteMedicalHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isEditingCompleted, setIsEditingCompleted] = useState(false);
  const [existingConsultationId, setExistingConsultationId] = useState<string | null>(null);
  const [existingPrescriptions, setExistingPrescriptions] = useState<PrescriptionItem[]>([]);
  const [consultationError, setConsultationError] = useState<string | null>(null);
  const [consultationSuccess, setConsultationSuccess] = useState(false);
  const [isSavingConsultation, setIsSavingConsultation] = useState(false);

  
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

  const callNextPatient = async () => {
    if (currentPatient) {
      updateAppointmentStatus(currentPatient.id, 'Completed');
      // Update in Supabase
      if (isSupabaseConfigured()) {
        await supabase
          .from('appointments')
          .update({ status: 'completed' })
          .eq('id', currentPatient.id);
      }
    }
    if (nextInQueue) {
      // Use startConsultation to properly load patient data
      startConsultation(nextInQueue);
    }
  };

  const markNoShow = (id: string) => {
    updateAppointmentStatus(id, 'No-Show');
  };

  // Load and view/edit a completed consultation
  const viewEditCompletedConsultation = async (apt: Appointment) => {
    if (!apt.patientId || apt.patientId.startsWith('guest-')) {
      alert('গেস্ট বুকিং সম্পাদনা করা যাবে না');
      return;
    }

    setIsEditingCompleted(true);
    setLoadingHistory(true);

    try {
      // Load existing consultation data
      const { data: consultationData, error: consultationError } = await supabase
        .from('consultations')
        .select('*')
        .eq('appointment_id', apt.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (consultationError && consultationError.code !== 'PGRST116') {
        console.error('[Consultation] Error loading consultation:', consultationError);
      }

      // Load existing prescriptions
      const { data: prescriptionData, error: prescriptionError } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('appointment_id', apt.id)
        .order('created_at', { ascending: true });

      if (prescriptionError) {
        console.error('[Consultation] Error loading prescriptions:', prescriptionError);
      }

      // Create patient record
      const patientFromAppointment: PatientRecord = {
        id: apt.patientId,
        name: apt.patientName,
        nameBn: apt.patientNameBn || apt.patientName,
        age: apt.patientAge || 0,
        gender: apt.patientGender || 'Male',
        phone: apt.patientPhone,
        bloodGroup: 'Unknown',
        profileImage: apt.patientImage,
        lastVisit: apt.date,
        totalVisits: 1,
        diagnosis: consultationData?.diagnosis || '',
        diagnosisBn: consultationData?.diagnosis_bn || '',
        riskLevel: 'Low',
        conditions: [],
        medications: [],
        allergies: [],
        familyHistory: [],
        vitals: consultationData?.vitals ? [consultationData.vitals] : [],
        consultations: []
      };

      // Try to fetch additional patient data
      if (isSupabaseConfigured()) {
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', apt.patientId)
            .single();
          
          if (profileData) {
            patientFromAppointment.name = profileData.name || apt.patientName;
            patientFromAppointment.nameBn = profileData.name_bn || profileData.name || apt.patientName;
            patientFromAppointment.phone = profileData.phone || apt.patientPhone;
            patientFromAppointment.profileImage = profileData.avatar_url || apt.patientImage;
            patientFromAppointment.gender = profileData.gender === 'female' ? 'Female' : 'Male';
            if (profileData.date_of_birth) {
              const birthDate = new Date(profileData.date_of_birth);
              const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
              patientFromAppointment.age = age;
            }
          }
        } catch (e) {
          console.log('[Consultation] Could not fetch additional patient data:', e);
        }
      }

      setSelectedPatient(patientFromAppointment);
      setSelectedAppointment(apt);
      setActiveTab('consult');

      // Load existing consultation data into form
      if (consultationData) {
        setExistingConsultationId(consultationData.id);
        setSoapNote({
          subjective: consultationData.subjective || apt.chiefComplaint || '',
          objective: consultationData.objective || '',
          assessment: consultationData.assessment || '',
          plan: consultationData.plan || ''
        });
        setDiagnosis(consultationData.diagnosis || '');
        setAdvice(consultationData.advice || []);
      } else {
        setExistingConsultationId(null);
        setSoapNote({ subjective: apt.chiefComplaint || '', objective: '', assessment: '', plan: '' });
        setDiagnosis('');
        setAdvice([]);
      }

      // Load existing prescriptions (keep them separate)
      if (prescriptionData && prescriptionData.length > 0) {
        const existingPresc: PrescriptionItem[] = prescriptionData.map(p => ({
          medicine: p.medicine_name,
          dosage: p.dosage,
          duration: p.duration,
          instruction: p.instruction || ''
        }));
        setExistingPrescriptions(existingPresc);
        setPrescription([]); // New prescriptions will be added here
      } else {
        setExistingPrescriptions([]);
        setPrescription([]);
      }

      // Load patient history
      const history = await getPatientHistoryForDoctor(apt.patientId, user?.id);
      setPatientHistory(history);
    } catch (e) {
      console.error('[Consultation] Error loading completed consultation:', e);
    }

    setLoadingHistory(false);
  };

  const startConsultation = async (apt: Appointment) => {
    // If there's a current patient, complete them first
    if (currentPatient && currentPatient.id !== apt.id) {
      updateAppointmentStatus(currentPatient.id, 'Completed');
    }
    updateAppointmentStatus(apt.id, 'In-Progress');
    
    // Update status in Supabase
    if (isSupabaseConfigured()) {
      await supabase
        .from('appointments')
        .update({ status: 'in_progress' })
        .eq('id', apt.id);
    }
    
    // Create patient record from appointment data (no mock lookup)
    const patientFromAppointment: PatientRecord = {
      id: apt.patientId,
      name: apt.patientName,
      nameBn: apt.patientNameBn || apt.patientName,
      age: apt.patientAge || 0,
      gender: apt.patientGender || 'Male',
      phone: apt.patientPhone,
      bloodGroup: 'Unknown',
      profileImage: apt.patientImage,
      lastVisit: apt.date,
      totalVisits: 1,
      diagnosis: '',
      diagnosisBn: '',
      riskLevel: 'Low',
      conditions: [],
      medications: [],
      allergies: [],
      familyHistory: [],
      vitals: [],
      consultations: []
    };
    
    // Try to fetch additional patient data from Supabase if patient_id exists
    if (apt.patientId && !apt.patientId.startsWith('guest-') && isSupabaseConfigured()) {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', apt.patientId)
          .single();
        
        if (profileData) {
          patientFromAppointment.name = profileData.name || apt.patientName;
          patientFromAppointment.nameBn = profileData.name_bn || profileData.name || apt.patientName;
          patientFromAppointment.phone = profileData.phone || apt.patientPhone;
          patientFromAppointment.profileImage = profileData.avatar_url || apt.patientImage;
          patientFromAppointment.gender = profileData.gender === 'female' ? 'Female' : 'Male';
          if (profileData.date_of_birth) {
            const birthDate = new Date(profileData.date_of_birth);
            const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            patientFromAppointment.age = age;
          }
        }
        
        // Fetch past appointments count
        const { count } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', apt.patientId);
        
        patientFromAppointment.totalVisits = count || 1;
      } catch (e) {
        console.log('[Consultation] Could not fetch additional patient data:', e);
      }
    }
    
    setIsEditingCompleted(false);
    setExistingConsultationId(null);
    setExistingPrescriptions([]);
    
    setSelectedPatient(patientFromAppointment);
    setSelectedAppointment(apt);
    setActiveTab('consult');
    
    // Reset consultation form
    setSoapNote({ subjective: apt.chiefComplaint || '', objective: '', assessment: '', plan: '' });
    setPrescription([]);
    setDiagnosis('');
    setAdvice([]);
    
    // Load patient history if patient_id exists
    if (apt.patientId && !apt.patientId.startsWith('guest-')) {
      setLoadingHistory(true);
      try {
        const history = await getPatientHistoryForDoctor(apt.patientId, user?.id);
        setPatientHistory(history);
        console.log('[Consultation] Loaded patient history:', history?.consultations.length || 0, 'consultations');
      } catch (e) {
        console.error('[Consultation] Error loading history:', e);
      }
      setLoadingHistory(false);
    } else {
      setPatientHistory(null);
    }
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
    if (!selectedAppointment) return;
    
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + followUpDays);

    // Use selectedPatient if available, otherwise use appointment data
    const patientName = selectedPatient?.nameBn || selectedPatient?.name || selectedAppointment.patientNameBn || selectedAppointment.patientName;
    const patientAge = selectedPatient?.age || selectedAppointment.patientAge || 0;
    const patientGender = (selectedPatient?.gender || selectedAppointment.patientGender || 'Male') === 'Male' ? 'পুরুষ' : 'মহিলা';
    const patientPhone = selectedPatient?.phone || selectedAppointment.patientPhone || '';

    // Combine existing and new prescriptions for printing
    const allPrescriptions = isEditingCompleted 
      ? [...existingPrescriptions, ...prescription]
      : prescription;

    const data: PrescriptionData = {
      doctorName: doctorProfile.name,
      doctorNameBn: doctorProfile.nameBn,
      doctorDegrees: doctorProfile.degrees,
      doctorSpecialty: doctorProfile.specialtyBn,
      doctorBmdcNo: doctorProfile.bmdcNo,
      chamberName: doctorProfile.hospitalBn,
      chamberAddress: doctorProfile.chamberAddress,
      chamberPhone: doctorProfile.chamberPhone,
      patientName: patientName,
      patientAge: patientAge,
      patientGender: patientGender,
      patientPhone: patientPhone,
      date: new Date().toLocaleDateString('bn-BD'),
      serialNumber: selectedAppointment.serial,
      diagnosis: diagnosis,
      diagnosisBn: diagnosis,
      clinicalNotes: soapNote.assessment,
      medicines: allPrescriptions, // Include both old and new
      advice: advice.filter(a => a.trim()),
      followUpDate: followUpDate.toLocaleDateString('bn-BD'),
    };

    openPrescriptionWindow(data);
  };

  const completeConsultation = async () => {
    if (!selectedAppointment || !selectedPatient) {
      setConsultationError('রোগী বা অ্যাপয়েন্টমেন্ট নির্বাচন করা হয়নি।');
      return;
    }

    // Clear previous errors/success
    setConsultationError(null);
    setConsultationSuccess(false);
    setIsSavingConsultation(true);

    try {
      // Update local state first for immediate feedback
      updateAppointmentStatus(selectedAppointment.id, 'Completed');
      
      // If payment status not set, default to Pending (doctor can change it)
      const finalPaymentStatus = selectedAppointment.paymentStatus || 'Pending';
      if (!selectedAppointment.paymentStatus) {
        updateAppointmentPaymentStatus(selectedAppointment.id, 'Pending');
      }
      
      // Save consultation data to Supabase
      if (isSupabaseConfigured()) {
        // 1. Update appointment status and payment
        const { error: appointmentUpdateError } = await supabase
          .from('appointments')
          .update({ 
            status: 'completed',
            payment_status: finalPaymentStatus.toLowerCase(), // 'paid', 'pending', 'waived'
          })
          .eq('id', selectedAppointment.id);
        
        if (appointmentUpdateError) {
          throw new Error(`অ্যাপয়েন্টমেন্ট আপডেট ব্যর্থ: ${appointmentUpdateError.message}`);
        }
        
        // 2. Get actual patient_id from appointment (check both patient_id and booked_by_id)
        let actualPatientId: string | null = null;
        if (!selectedAppointment.patientId.startsWith('guest-')) {
          actualPatientId = selectedAppointment.patientId;
        } else {
          // For guest bookings, check if there's a booked_by_id in the appointment
          const { data: appointmentData, error: appointmentFetchError } = await supabase
            .from('appointments')
            .select('patient_id, booked_by_id')
            .eq('id', selectedAppointment.id)
            .single();
          
          if (appointmentFetchError) {
            throw new Error(`রোগীর তথ্য লোড করতে ব্যর্থ: ${appointmentFetchError.message}`);
          }
          
          actualPatientId = appointmentData?.patient_id || appointmentData?.booked_by_id || null;
          console.log('[Consultation] Resolved patient_id from appointment:', actualPatientId);
        }
        
        // 3. Create or update consultation record
        const consultationDate = selectedAppointment.date || new Date().toISOString().split('T')[0];
        const consultationTime = selectedAppointment.time || new Date().toTimeString().split(' ')[0].substring(0, 5);
        
        let consultationData;
        
        if (isEditingCompleted && existingConsultationId) {
          // Update existing consultation
          const { data, error: consultationError } = await supabase
            .from('consultations')
            .update({
              subjective: soapNote.subjective,
              objective: soapNote.objective,
              assessment: soapNote.assessment,
              plan: soapNote.plan,
              diagnosis: diagnosis,
              diagnosis_bn: diagnosis,
              advice: advice.filter(a => a.trim()),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingConsultationId)
            .select()
            .single();
          
          if (consultationError) {
            throw new Error(`কনসাল্টেশন আপডেট ব্যর্থ: ${consultationError.message}`);
          }
          
          consultationData = data;
          console.log('[Consultation] ✅ Consultation updated:', consultationData?.id);
        } else {
          // Create new consultation
          const { data, error: consultationError } = await supabase
            .from('consultations')
            .insert({
              appointment_id: selectedAppointment.id,
              doctor_id: user?.id,
              patient_id: actualPatientId, // Use resolved patient_id
              subjective: soapNote.subjective,
              objective: soapNote.objective,
              assessment: soapNote.assessment,
              plan: soapNote.plan,
              diagnosis: diagnosis,
              diagnosis_bn: diagnosis,
              advice: advice.filter(a => a.trim()),
              consultation_date: consultationDate,
              consultation_time: consultationTime,
            })
            .select()
            .single();
          
          if (consultationError) {
            throw new Error(`কনসাল্টেশন সংরক্ষণ ব্যর্থ: ${consultationError.message}`);
          }
          
          consultationData = data;
          console.log('[Consultation] ✅ Consultation record created:', consultationData?.id);
        }
        
        // 4. Create new prescription records (existing ones are preserved)
        if (prescription.length > 0 && consultationData) {
          const prescriptionRecords = prescription.map(med => ({
            consultation_id: consultationData.id,
            appointment_id: selectedAppointment.id,
            doctor_id: user?.id,
            patient_id: actualPatientId, // Use resolved patient_id
            medicine_name: med.medicine,
            medicine_name_bn: med.medicine,
            dosage: med.dosage,
            duration: med.duration,
            instruction: med.instruction,
            prescription_date: consultationDate,
            follow_up_date: followUpDays > 0 
              ? new Date(Date.now() + followUpDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              : null,
          }));
          
          const { error: prescriptionError } = await supabase
            .from('prescriptions')
            .insert(prescriptionRecords);
          
          if (prescriptionError) {
            throw new Error(`প্রেসক্রিপশন সংরক্ষণ ব্যর্থ: ${prescriptionError.message}`);
          }
          
          console.log('[Consultation] ✅ New prescriptions saved:', prescriptionRecords.length);
        }
        
        console.log('[Consultation] ✅ All data saved to database');
        
        // Show success message
        setConsultationSuccess(true);
        
        // Generate prescription PDF
        generatePrescription();
        
        // Clear form and navigate after a short delay
        setTimeout(() => {
          setIsEditingCompleted(false);
          setExistingConsultationId(null);
          setExistingPrescriptions([]);
          setSelectedPatient(null);
          setSelectedAppointment(null);
          setConsultationSuccess(false);
          setActiveTab('queue');
        }, 2000);
      } else {
        throw new Error('ডাটাবেস সংযোগ নেই। ইন্টারনেট সংযোগ পরীক্ষা করুন।');
      }
    } catch (e: any) {
      console.error('[Consultation] ❌ Error saving:', e);
      setConsultationError(e.message || 'একটি ত্রুটি হয়েছে। পুনরায় চেষ্টা করুন।');
      
      // Revert appointment status on error
      if (selectedAppointment) {
        updateAppointmentStatus(selectedAppointment.id, 'In-Progress');
      }
    } finally {
      setIsSavingConsultation(false);
    }
  };

  // Set payment status directly
  const setPaymentStatus = async (appointmentId: string, status: Appointment['paymentStatus']) => {
    // Update local state
    updateAppointmentPaymentStatus(appointmentId, status);
    
    // Update in Supabase
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('appointments')
          .update({ 
            payment_status: status.toLowerCase() // 'paid', 'pending', 'waived'
          })
          .eq('id', appointmentId);
        
        console.log('[Payment] ✅ Updated to', status);
      } catch (e) {
        console.error('[Payment] ❌ Error updating:', e);
      }
    }
  };

  // Toggle payment status (for queue view - cycles through options)
  const togglePaymentStatus = async (appointmentId: string, currentStatus: Appointment['paymentStatus']) => {
    let newStatus: Appointment['paymentStatus'];
    
    // Cycle: Pending -> Paid -> Waived -> Pending
    if (currentStatus === 'Pending') {
      newStatus = 'Paid';
    } else if (currentStatus === 'Paid') {
      newStatus = 'Waived';
    } else {
      newStatus = 'Pending';
    }
    
    await setPaymentStatus(appointmentId, newStatus);
  };

  const updateAppointmentPaymentStatus = (id: string, status: Appointment['paymentStatus']) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, paymentStatus: status } : a));
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

      {/* Chambers Quick Overview */}
      {chambers.length > 0 && (
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              🏥 আপনার চেম্বারসমূহ
            </h3>
            <button onClick={() => setActiveTab('chambers')} className="text-sm text-blue-600 hover:underline">
              সব দেখুন →
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {chambers.filter(c => c.isActive).map((chamber) => (
              <div
                key={chamber.id}
                onClick={() => {
                  setActiveChamber(chamber.id);
                  setActiveTab('schedule');
                }}
                className={`flex-shrink-0 glass-subtle rounded-xl p-3 cursor-pointer hover:glass transition min-w-[180px] ${
                  chamber.isPrimary ? 'ring-2 ring-blue-300' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🏥</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate text-sm">{chamber.nameBn || chamber.name}</p>
                    {chamber.isPrimary && <span className="text-[10px] text-blue-600">⭐ প্রাথমিক</span>}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{chamber.area || chamber.city}</span>
                  <span className="font-bold text-blue-600">৳{chamber.fee}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current & Next Patient */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Current Patient */}
        <div className="glass-card rounded-2xl p-6">
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
              <button onClick={() => startConsultation(currentPatient)} className="px-4 py-2 btn-glass-primary text-blue-700 rounded-lg font-medium hover:shadow-lg">
                কনসাল্ট
              </button>
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">কোনো রোগী নেই</p>
          )}
        </div>

        {/* Next in Queue */}
        <div className="glass-card rounded-2xl p-6">
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
              <button onClick={callNextPatient} className="px-4 py-2 btn-glass-primary text-blue-700 rounded-lg font-medium hover:bg-blue-600">
                ডাকুন
              </button>
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">কিউতে কেউ নেই</p>
          )}
        </div>
      </div>

      {/* Business Panel */}
      <div className="glass-card rounded-2xl p-6">
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
          <button onClick={callNextPatient} disabled={!nextInQueue} className="px-4 py-2 btn-glass-primary text-blue-700 rounded-lg font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
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
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/30 glass-subtle">
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
            <div key={apt.id} className={`p-4 flex items-center gap-4 hover:glass-subtle transition ${apt.status === 'In-Progress' ? 'bg-green-50' : ''}`}>
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
                    <button onClick={() => startConsultation(apt)} className="px-3 py-1.5 btn-glass-primary text-blue-700 rounded-lg text-sm font-medium hover:shadow-lg">
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
                {apt.status === 'Completed' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => viewEditCompletedConsultation(apt)}
                      className="px-3 py-1.5 btn-glass-primary text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-600"
                      title="পরামর্শ দেখুন/সম্পাদনা করুন"
                    >
                      📋 দেখুন/সম্পাদনা
                    </button>
                    <button 
                      onClick={() => togglePaymentStatus(apt.id, apt.paymentStatus)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        apt.paymentStatus === 'Paid' 
                          ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                          : apt.paymentStatus === 'Pending'
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title="পেমেন্ট স্ট্যাটাস পরিবর্তন করুন"
                    >
                      {apt.paymentStatus === 'Paid' ? '✓ পেইড' : apt.paymentStatus === 'Pending' ? '⏳ বকেয়া' : '⊘ মওকুফ'}
                    </button>
                  </div>
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
          <button key={status} onClick={() => setStatusFilter(status)} className={`px-4 py-2 rounded-full text-sm font-medium transition ${statusFilter === status ? 'btn-glass-primary text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {status === 'all' ? 'সব' : status === 'Waiting' ? 'অপেক্ষমান' : status === 'In-Progress' ? 'চলমান' : status === 'Completed' ? 'সম্পন্ন' : status === 'No-Show' ? 'নো-শো' : 'বাতিল'}
          </button>
        ))}
      </div>

      {/* Day View */}
      {viewMode === 'day' && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/30 glass-subtle">
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
                <div key={apt.id} className="p-4 flex items-center gap-4 hover:glass-subtle">
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
        <div className="glass-card rounded-2xl overflow-hidden">
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

  // ============ RENDER CHAMBERS ============
  const renderChambers = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">🏥 চেম্বার ম্যানেজমেন্ট</h2>
          <p className="text-slate-500">আপনার সকল চেম্বার পরিচালনা করুন</p>
        </div>
        <button
          onClick={() => setShowAddChamber(true)}
          className="px-4 py-2 btn-glass-primary text-blue-700 rounded-xl font-medium flex items-center gap-2"
        >
          <span>➕</span> নতুন চেম্বার
        </button>
      </div>

      {/* Chamber Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {chambers.map((chamber) => (
          <div
            key={chamber.id}
            className={`glass-card rounded-2xl overflow-hidden transition-all ${
              chamber.isPrimary ? 'ring-2 ring-blue-400' : ''
            } ${!chamber.isActive ? 'opacity-60' : ''}`}
          >
            {/* Chamber Header */}
            <div className={`p-4 ${chamber.isPrimary ? 'bg-gradient-to-r from-blue-50 to-indigo-50' : 'glass-subtle'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800">{chamber.nameBn || chamber.name}</h3>
                    {chamber.isPrimary && (
                      <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">প্রাথমিক</span>
                    )}
                    {!chamber.isActive && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">নিষ্ক্রিয়</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{chamber.address}</p>
                  {chamber.area && <p className="text-xs text-slate-400">{chamber.area}, {chamber.city}</p>}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditingChamber(chamber);
                      setChamberForm(chamber);
                    }}
                    className="p-2 hover:glass-subtle rounded-lg text-slate-500 hover:text-blue-600 transition"
                    title="সম্পাদনা"
                  >
                    ✏️
                  </button>
                  {!chamber.isPrimary && (
                    <button
                      onClick={() => deleteChamber(chamber.id)}
                      className="p-2 hover:glass-subtle rounded-lg text-slate-500 hover:text-red-600 transition"
                      title="মুছুন"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Chamber Details */}
            <div className="p-4 space-y-3">
              {/* Fees */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="glass-subtle p-2 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">৳{chamber.fee}</div>
                  <div className="text-[10px] text-slate-500">নতুন</div>
                </div>
                <div className="glass-subtle p-2 rounded-lg">
                  <div className="text-lg font-bold text-green-600">৳{chamber.followUpFee}</div>
                  <div className="text-[10px] text-slate-500">ফলো-আপ</div>
                </div>
                <div className="glass-subtle p-2 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">৳{chamber.reportFee}</div>
                  <div className="text-[10px] text-slate-500">রিপোর্ট</div>
                </div>
              </div>
              
              {/* Phone */}
              {chamber.phone && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span>📞</span> {chamber.phone}
                </div>
              )}
              
              {/* Active Days */}
              <div className="flex flex-wrap gap-1">
                {chamber.schedule?.filter(s => s.enabled).map(s => (
                  <span key={s.day} className="px-2 py-0.5 glass-subtle rounded text-xs text-slate-600">
                    {s.dayBn}
                  </span>
                ))}
              </div>
              
              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {!chamber.isPrimary && (
                  <button
                    onClick={() => setPrimaryChamber(chamber.id)}
                    className="flex-1 py-2 text-xs glass-subtle hover:glass rounded-lg text-blue-600 transition"
                  >
                    ⭐ প্রাথমিক করুন
                  </button>
                )}
                <button
                  onClick={() => updateChamber(chamber.id, { isActive: !chamber.isActive })}
                  className={`flex-1 py-2 text-xs rounded-lg transition ${
                    chamber.isActive 
                      ? 'glass-subtle hover:glass text-orange-600' 
                      : 'btn-glass-primary text-blue-700'
                  }`}
                >
                  {chamber.isActive ? '⏸️ নিষ্ক্রিয়' : '▶️ সক্রিয়'}
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {/* Add Chamber Card */}
        <button
          onClick={() => setShowAddChamber(true)}
          className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-300 transition min-h-[250px]"
        >
          <div className="text-4xl mb-2">➕</div>
          <div className="font-medium">নতুন চেম্বার যোগ করুন</div>
        </button>
      </div>

      {/* Add/Edit Chamber Modal */}
      {(showAddChamber || editingChamber) && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-strong rounded-2xl p-6 border border-white/50 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              🏥 {editingChamber ? 'চেম্বার সম্পাদনা' : 'নতুন চেম্বার যোগ করুন'}
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-600 font-medium">নাম (English)</label>
                  <input
                    type="text"
                    value={chamberForm.name || ''}
                    onChange={(e) => setChamberForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Square Hospital"
                    className="w-full px-3 py-2 border rounded-xl mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600 font-medium">নাম (বাংলা)</label>
                  <input
                    type="text"
                    value={chamberForm.nameBn || ''}
                    onChange={(e) => setChamberForm(prev => ({ ...prev, nameBn: e.target.value }))}
                    placeholder="যেমন: স্কয়ার হাসপাতাল"
                    className="w-full px-3 py-2 border rounded-xl mt-1"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm text-slate-600 font-medium">ঠিকানা</label>
                <input
                  type="text"
                  value={chamberForm.address || ''}
                  onChange={(e) => setChamberForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="সম্পূর্ণ ঠিকানা"
                  className="w-full px-3 py-2 border rounded-xl mt-1"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-600 font-medium">এলাকা</label>
                  <input
                    type="text"
                    value={chamberForm.area || ''}
                    onChange={(e) => setChamberForm(prev => ({ ...prev, area: e.target.value }))}
                    placeholder="যেমন: ধানমণ্ডি"
                    className="w-full px-3 py-2 border rounded-xl mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600 font-medium">শহর</label>
                  <select
                    value={chamberForm.city || 'ঢাকা'}
                    onChange={(e) => setChamberForm(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl mt-1"
                  >
                    <option value="ঢাকা">ঢাকা</option>
                    <option value="চট্টগ্রাম">চট্টগ্রাম</option>
                    <option value="সিলেট">সিলেট</option>
                    <option value="রাজশাহী">রাজশাহী</option>
                    <option value="খুলনা">খুলনা</option>
                    <option value="বরিশাল">বরিশাল</option>
                    <option value="রংপুর">রংপুর</option>
                    <option value="ময়মনসিংহ">ময়মনসিংহ</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="text-sm text-slate-600 font-medium">ফোন নম্বর</label>
                <input
                  type="tel"
                  value={chamberForm.phone || ''}
                  onChange={(e) => setChamberForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="01XXX-XXXXXX"
                  className="w-full px-3 py-2 border rounded-xl mt-1"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-slate-600 font-medium">নতুন রোগী ফি (৳)</label>
                  <input
                    type="number"
                    value={chamberForm.fee || 500}
                    onChange={(e) => setChamberForm(prev => ({ ...prev, fee: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-xl mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600 font-medium">ফলো-আপ ফি (৳)</label>
                  <input
                    type="number"
                    value={chamberForm.followUpFee || 300}
                    onChange={(e) => setChamberForm(prev => ({ ...prev, followUpFee: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-xl mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600 font-medium">রিপোর্ট ফি (৳)</label>
                  <input
                    type="number"
                    value={chamberForm.reportFee || 200}
                    onChange={(e) => setChamberForm(prev => ({ ...prev, reportFee: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-xl mt-1"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddChamber(false);
                  setEditingChamber(null);
                  setChamberForm({
                    name: '', nameBn: '', address: '', area: '', city: 'ঢাকা', phone: '',
                    fee: 500, followUpFee: 300, reportFee: 200, isActive: true, isPrimary: false
                  });
                }}
                className="flex-1 px-4 py-3 border rounded-xl font-medium"
              >
                বাতিল
              </button>
              <button
                onClick={() => {
                  if (editingChamber) {
                    updateChamber(editingChamber.id, chamberForm);
                    setEditingChamber(null);
                  } else {
                    addChamber();
                  }
                  setChamberForm({
                    name: '', nameBn: '', address: '', area: '', city: 'ঢাকা', phone: '',
                    fee: 500, followUpFee: 300, reportFee: 200, isActive: true, isPrimary: false
                  });
                }}
                className="flex-1 px-4 py-3 btn-glass-primary text-blue-700 rounded-xl font-medium"
              >
                {editingChamber ? 'আপডেট করুন' : 'যোগ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ============ RENDER SCHEDULE ============
  const renderSchedule = () => (
    <div className="space-y-6">
      {/* Header with Chamber Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">সময়সূচী ম্যানেজমেন্ট</h2>
          <p className="text-slate-500">সাপ্তাহিক সময়সূচী ও ছুটির দিন</p>
        </div>
        
        {/* Chamber Selector */}
        {chambers.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">চেম্বার:</span>
            <select
              value={activeChamber || ''}
              onChange={(e) => setActiveChamber(e.target.value)}
              className="px-4 py-2 glass border border-white/50 rounded-xl text-slate-700 font-medium"
            >
              {chambers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nameBn || c.name} {c.isPrimary ? '⭐' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      {/* Current Chamber Info */}
      {currentChamber && (
        <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 glass rounded-xl flex items-center justify-center text-2xl">🏥</div>
            <div>
              <h3 className="font-bold text-slate-800">{currentChamber.nameBn || currentChamber.name}</h3>
              <p className="text-sm text-slate-500">{currentChamber.address}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">৳{currentChamber.fee}</div>
              <div className="text-xs text-slate-500">নতুন রোগী</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">৳{currentChamber.followUpFee}</div>
              <div className="text-xs text-slate-500">ফলো-আপ</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly Schedule */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/30 glass-subtle">
            <h3 className="font-bold text-slate-800">সাপ্তাহিক সময়সূচী</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {(currentChamber?.schedule || DEFAULT_SCHEDULE).map((day) => (
              <div key={day.day} className={`p-4 ${!day.enabled ? 'bg-slate-50/50' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleChamberScheduleDay(day.day)} className={`w-10 h-6 rounded-full transition ${day.enabled ? 'bg-blue-500' : 'bg-slate-300'}`}>
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
                      <input type="time" value={day.startTime} onChange={(e) => updateChamberSchedule(day.day, 'startTime', e.target.value)} className="w-full px-2 py-1 border rounded text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">শেষ</label>
                      <input type="time" value={day.endTime} onChange={(e) => updateChamberSchedule(day.day, 'endTime', e.target.value)} className="w-full px-2 py-1 border rounded text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">স্লট (মিনিট)</label>
                      <select value={day.slotDuration} onChange={(e) => updateChamberSchedule(day.day, 'slotDuration', Number(e.target.value))} className="w-full px-2 py-1 border rounded text-sm">
                        <option value={10}>১০</option>
                        <option value={15}>১৫</option>
                        <option value={20}>২০</option>
                        <option value={30}>৩০</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">সর্বোচ্চ</label>
                      <input type="number" value={day.maxPatients} onChange={(e) => updateChamberSchedule(day.day, 'maxPatients', Number(e.target.value))} className="w-full px-2 py-1 border rounded text-sm" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Holidays */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/30 glass-subtle flex items-center justify-between">
            <h3 className="font-bold text-slate-800">ছুটির দিন</h3>
            <button onClick={() => setShowAddHoliday(true)} className="px-3 py-1.5 btn-glass-primary text-blue-700 rounded-lg text-sm font-medium hover:shadow-lg">
              + যোগ করুন
            </button>
          </div>
          
          <div className="divide-y divide-slate-100">
            {(currentChamber?.holidays || []).length === 0 ? (
              <div className="p-8 text-center text-slate-400">কোনো ছুটি নির্ধারিত নেই</div>
            ) : (
              (currentChamber?.holidays || []).map((holiday) => (
                <div key={holiday.date} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800">{holiday.reasonBn || holiday.reason}</div>
                    <div className="text-sm text-slate-500">{new Date(holiday.date).toLocaleDateString('bn-BD')}</div>
                  </div>
                  <button onClick={() => {
                    if (currentChamber) {
                      const updatedHolidays = currentChamber.holidays.filter(h => h.date !== holiday.date);
                      updateChamber(currentChamber.id, { holidays: updatedHolidays });
                    }
                  }} className="text-red-500 hover:text-red-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add Holiday Modal */}
          {showAddHoliday && (
            <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="glass-strong rounded-2xl p-6 border border-white/50 shadow-2xl w-full max-w-md">
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
                  <button onClick={() => {
                    if (currentChamber && newHoliday.date && newHoliday.reason) {
                      const updatedHolidays = [...(currentChamber.holidays || []), newHoliday];
                      updateChamber(currentChamber.id, { holidays: updatedHolidays });
                      setNewHoliday({ date: '', reason: '', reasonBn: '' });
                      setShowAddHoliday(false);
                    }
                  }} className="flex-1 px-4 py-2 btn-glass-primary text-blue-700 rounded-lg">যোগ করুন</button>
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
    if (!selectedAppointment) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-slate-400">
          <div className="text-6xl mb-4">👨‍⚕️</div>
          <p>কনসাল্টেশন শুরু করতে কিউ থেকে রোগী নির্বাচন করুন</p>
          <button onClick={() => setActiveTab('queue')} className="mt-4 px-4 py-2 btn-glass-primary text-blue-700 rounded-lg">
            কিউতে যান
          </button>
        </div>
      );
    }

    // Safe getters for patient data (handle missing data gracefully)
    const patientName = selectedPatient?.nameBn || selectedPatient?.name || selectedAppointment.patientNameBn || selectedAppointment.patientName || 'রোগী';
    const patientAge = selectedPatient?.age || selectedAppointment.patientAge || 0;
    const patientGender = selectedPatient?.gender || selectedAppointment.patientGender || 'Male';
    const patientBloodGroup = selectedPatient?.bloodGroup || 'Unknown';
    const patientConditions = selectedPatient?.conditions || [];
    const patientAllergies = selectedPatient?.allergies || [];
    const patientPhone = selectedPatient?.phone || selectedAppointment.patientPhone || '';
    const patientImage = selectedAppointment.patientImage || selectedPatient?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(patientName)}&background=3b82f6&color=fff&size=200`;

    return (
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Patient Info & SOAP */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Header */}
          <div className={`rounded-2xl p-6 text-white ${isEditingCompleted ? 'bg-gradient-to-r from-orange-500 to-red-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}>
            <div className="flex items-center gap-4">
              <img src={patientImage} alt="" className="w-20 h-20 rounded-xl border-4 border-white/30" />
              <div className="flex-1">
                {isEditingCompleted && (
                  <div className="mb-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold inline-block">
                    📝 সম্পাদনা মোড
                  </div>
                )}
                <h2 className="text-2xl font-bold">{patientName}</h2>
                <p className="opacity-90">
                  {patientAge > 0 ? `${patientAge} বছর • ` : ''}
                  {patientGender === 'Male' ? 'পুরুষ' : 'মহিলা'}
                  {patientBloodGroup !== 'Unknown' ? ` • ${patientBloodGroup}` : ''}
                </p>
                <p className="opacity-80 text-sm">{patientPhone}</p>
                {patientConditions.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {patientConditions.map(c => (
                      <span key={c} className="px-2 py-0.5 bg-white/20 rounded text-xs">{c}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm opacity-80">সিরিয়াল</div>
                <div className="text-3xl font-bold">#{selectedAppointment.serial}</div>
              </div>
            </div>
            {patientAllergies.length > 0 && (
              <div className="mt-4 p-3 bg-red-500/30 rounded-lg">
                <span className="font-bold">⚠️ এলার্জি:</span> {patientAllergies.join(', ')}
              </div>
            )}
          </div>

          {/* SOAP Notes */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/30 glass-subtle">
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
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/30 glass-subtle flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">℞ প্রেসক্রিপশন</h3>
                {isEditingCompleted && (
                  <p className="text-xs text-blue-600 mt-1">📝 সম্পাদনা মোড: পূর্ববর্তী প্রেসক্রিপশন সংরক্ষিত থাকবে</p>
                )}
              </div>
              <div className="flex gap-2">
                <select onChange={(e) => { const t = PRESCRIPTION_TEMPLATES.find(t => t.name === e.target.value); if (t) addMedicine(t); e.target.value = ''; }} className="px-3 py-1.5 border rounded-lg text-sm">
                  <option value="">টেমপ্লেট থেকে যোগ করুন</option>
                  {PRESCRIPTION_TEMPLATES.map(t => (
                    <option key={t.name} value={t.name}>{t.name}</option>
                  ))}
                </select>
                <button onClick={() => addMedicine()} className="px-3 py-1.5 btn-glass-primary text-blue-700 rounded-lg text-sm font-medium">
                  + ওষুধ যোগ করুন
                </button>
              </div>
            </div>
            
            <div className="p-4">
              {/* Existing Prescriptions (if editing) */}
              {isEditingCompleted && existingPrescriptions.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-blue-800">📋 পূর্ববর্তী প্রেসক্রিপশন ({existingPrescriptions.length})</h4>
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">সংরক্ষিত</span>
                  </div>
                  <div className="space-y-2">
                    {existingPrescriptions.map((med, i) => (
                      <div key={i} className="bg-white rounded-lg p-3 border border-blue-100">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-slate-800">{med.medicine}</div>
                            <div className="text-sm text-slate-600 mt-1">
                              <span>মাত্রা: {med.dosage}</span>
                              <span className="mx-2">•</span>
                              <span>সময়কাল: {med.duration}</span>
                              {med.instruction && (
                                <>
                                  <span className="mx-2">•</span>
                                  <span>নির্দেশনা: {med.instruction}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

          {/* Error/Success Messages */}
          {consultationError && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm">
                  <i className="fas fa-exclamation"></i>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{consultationError}</p>
                </div>
                <button
                  onClick={() => setConsultationError(null)}
                  className="flex-shrink-0 text-red-400 hover:text-red-600 transition"
                  aria-label="বন্ধ করুন"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          )}

          {consultationSuccess && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                  <i className="fas fa-check"></i>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">
                    ✅ কনসাল্টেশন সফলভাবে সংরক্ষণ করা হয়েছে! কিউতে ফিরে যাচ্ছে...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Status & Action Buttons */}
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-slate-600">পেমেন্ট স্ট্যাটাস:</label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (selectedAppointment) {
                      setPaymentStatus(selectedAppointment.id, 'Pending');
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    selectedAppointment?.paymentStatus === 'Pending'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  }`}
                >
                  ⏳ বকেয়া
                </button>
                <button
                  onClick={() => {
                    if (selectedAppointment) {
                      setPaymentStatus(selectedAppointment.id, 'Paid');
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    selectedAppointment?.paymentStatus === 'Paid'
                      ? 'bg-green-500 text-white'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  ✓ পেইড (ক্যাশ/বিকাশ)
                </button>
                <button
                  onClick={() => {
                    if (selectedAppointment) {
                      setPaymentStatus(selectedAppointment.id, 'Waived');
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    selectedAppointment?.paymentStatus === 'Waived'
                      ? 'bg-slate-500 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  ⊘ মওকুফ
                </button>
              </div>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={generatePrescription} 
                disabled={isSavingConsultation}
                className="flex-1 px-6 py-3 btn-glass-primary text-blue-700 rounded-xl font-bold hover:bg-blue-600 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>🖨️</span> প্রেসক্রিপশন প্রিন্ট
              </button>
              <button 
                onClick={completeConsultation} 
                disabled={isSavingConsultation}
                className="flex-1 px-6 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingConsultation ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>সংরক্ষণ করা হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <span>✓</span> কনসাল্টেশন সম্পন্ন
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right: AI Assistant & History */}
        <div className="space-y-6">
          {/* AI Clinical Assistant - Improved */}
          <div className="glass-card rounded-2xl overflow-hidden shadow-lg">
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
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/30 glass-subtle">
              <h3 className="font-bold text-slate-800">রোগীর ইতিহাস</h3>
            </div>
            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
              {/* Current Appointment Info */}
              <div className="pb-3 border-b">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500">আজকের ভিজিট:</span>
                  <span className="font-medium">{new Date(selectedAppointment.date).toLocaleDateString('bn-BD')}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500">সমস্যা:</span>
                  <span className="font-medium text-blue-600">{selectedAppointment.chiefComplaint || 'উল্লেখ নেই'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">ভিজিটের ধরন:</span>
                  <span className="font-medium">
                    {selectedAppointment.type === 'New' ? 'নতুন রোগী' : 
                     selectedAppointment.type === 'Follow-up' ? 'ফলো-আপ' : 
                     selectedAppointment.type === 'Report' ? 'রিপোর্ট দেখানো' : 
                     selectedAppointment.type}
                  </span>
                </div>
              </div>

              {/* Medical History */}
              {loadingHistory ? (
                <div className="text-center py-4">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-slate-500 mt-2">ইতিহাস লোড হচ্ছে...</p>
                </div>
              ) : patientHistory && (patientHistory.consultations.length > 0 || patientHistory.prescriptions.length > 0) ? (
                <div className="space-y-4">
                  {/* Previous Consultations */}
                  {patientHistory.consultations.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-slate-600 mb-2">পূর্ববর্তী পরামর্শ ({patientHistory.consultations.length})</div>
                      <div className="space-y-2">
                        {patientHistory.consultations.slice(0, 3).map((consultation) => (
                          <div key={consultation.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="text-xs font-medium text-slate-700">
                              {new Date(consultation.consultationDate).toLocaleDateString('bn-BD')}
                            </div>
                            {consultation.diagnosis && (
                              <div className="text-xs text-blue-600 mt-1">রোগ নির্ণয়: {consultation.diagnosis}</div>
                            )}
                            {consultation.assessment && (
                              <div className="text-xs text-slate-600 mt-1 line-clamp-2">{consultation.assessment}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Current Medications */}
                  {patientHistory.prescriptions.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-slate-600 mb-2">বর্তমান ওষুধ</div>
                      <div className="space-y-1">
                        {patientHistory.prescriptions
                          .filter(p => {
                            const prescDate = new Date(p.prescriptionDate);
                            const daysSince = (Date.now() - prescDate.getTime()) / (1000 * 60 * 60 * 24);
                            return daysSince < 30; // Show medications from last 30 days
                          })
                          .slice(0, 5)
                          .map((prescription) => (
                            <div key={prescription.id} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                              {prescription.medicineName} ({prescription.dosage}) - {prescription.duration}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-slate-400">এই রোগীর পূর্ববর্তী তথ্য নেই</p>
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

    // Calculate real stats from appointments
    const monthlyStats = {
      totalPatients: appointments.length,
      totalRevenue: appointments.reduce((sum, a) => sum + a.fee, 0),
      avgPerDay: appointments.length > 0 ? Math.round(appointments.length / 30) : 0,
      noShowRate: appointments.length > 0 ? Math.round((appointments.filter(a => a.status === 'No-Show').length / appointments.length) * 100) : 0,
      newPatients: appointments.filter(a => a.type === 'New').length,
      followUps: appointments.filter(a => a.type === 'Follow-up').length,
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
        <div className="glass-card rounded-2xl overflow-hidden">
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
              <button onClick={fetchMedicalNews} disabled={newsLoading} className="px-4 py-2 btn-glass-primary text-blue-700 rounded-lg hover:bg-blue-600 disabled:opacity-50">
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
                  <div key={i} className="p-4 hover:glass-subtle">
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
          <div className="glass-card rounded-2xl overflow-hidden">
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
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/30 glass-subtle">
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

  // ============ RENDER PATIENTS ============
  const renderPatients = () => {
    // Handle patient selection for consultation
    const handleSelectPatient = (patient: PatientRecord) => {
      // Find or create an appointment for this patient
      const existingAppt = appointments.find(a => a.patientId === patient.id && a.status === 'Waiting');
      if (existingAppt) {
        setSelectedAppointment(existingAppt);
      } else {
        // Create a mock appointment for walk-in consultation
        setSelectedAppointment({
          id: `walk-in-${Date.now()}`,
          patientId: patient.id,
          patientName: patient.name,
          patientNameBn: patient.nameBn,
          patientImage: patient.profileImage,
          patientPhone: patient.phone,
          patientAge: patient.age,
          patientGender: patient.gender,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          serial: 0,
          type: 'Follow-up',
          status: 'In-Progress',
          chiefComplaint: patient.diagnosis,
          fee: doctorProfile.consultationFee,
          paymentStatus: 'Pending'
        });
      }
      setActiveTab('consult');
    };

    // Handle patient update
    const handleUpdatePatient = (updatedPatient: PatientRecord) => {
      // In real app, this would update in Supabase
      console.log('Patient updated:', updatedPatient);
      // For now, we'll just log - in real implementation, update the state
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">রোগী তালিকা</h2>
            <p className="text-slate-500">আপনার সকল রোগীর তথ্য দেখুন ও পরিচালনা করুন</p>
          </div>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2">
            <span>➕</span>
            <span>নতুন রোগী</span>
          </button>
        </div>

        <PatientManager
          patients={PATIENTS}
          onSelectPatient={handleSelectPatient}
          onUpdatePatient={handleUpdatePatient}
        />
      </div>
    );
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
        <div className="glass-card rounded-2xl p-4 h-fit">
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
                  settingsTab === item.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:glass-subtle'
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
              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-bold text-slate-800 mb-4">প্রোফাইল ছবি</h3>
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <img src={profileImage} alt="" className="w-24 h-24 rounded-2xl object-cover" />
                    <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center cursor-pointer hover:shadow-lg transition">
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

              <div className="glass-card rounded-2xl p-6">
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

              <div className="glass-card rounded-2xl p-6">
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
                  className="mt-4 px-6 py-2 btn-glass-primary text-blue-700 rounded-lg font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
            <div className="glass-card rounded-2xl p-6">
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
                <button onClick={handlePasswordChange} className="px-6 py-2 btn-glass-primary text-blue-700 rounded-lg font-medium hover:shadow-lg">
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
              <div className="glass-card rounded-2xl p-6">
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
                  className="mt-4 px-6 py-2 btn-glass-primary text-blue-700 rounded-lg font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
              <div className="glass-card rounded-2xl p-6">
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
              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-bold text-slate-800 mb-4">এই মাসের সারাংশ</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 rounded-xl">
                    <div className="text-2xl font-bold text-green-600">৳{appointments.reduce((sum, a) => sum + a.fee, 0).toLocaleString()}</div>
                    <div className="text-sm text-green-700">মোট আয়</div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <div className="text-2xl font-bold text-blue-600">{appointments.length}</div>
                    <div className="text-sm text-blue-700">মোট রোগী</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-xl">
                    <div className="text-2xl font-bold text-purple-600">৳{appointments.length > 0 ? Math.round(appointments.reduce((sum, a) => sum + a.fee, 0) / appointments.length) : 0}</div>
                    <div className="text-sm text-purple-700">গড় ফি</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {settingsTab === 'notifications' && (
            <div className="glass-card rounded-2xl p-6">
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
    { id: 'patients', icon: '👥', label: 'রোগী তালিকা', labelEn: 'Patients', badge: PATIENTS.length },
    { id: 'appointments', icon: '📅', label: 'অ্যাপয়েন্টমেন্ট', labelEn: 'Appointments' },
    { id: 'chambers', icon: '🏥', label: 'চেম্বার', labelEn: 'Chambers', badge: chambers.length },
    { id: 'schedule', icon: '⏰', label: 'সময়সূচী', labelEn: 'Schedule' },
    { id: 'consult', icon: '👨‍⚕️', label: 'কনসাল্টেশন', labelEn: 'Consultation' },
    { id: 'analytics', icon: '📊', label: 'বিশ্লেষণ', labelEn: 'Analytics' },
    { id: 'rnd', icon: '🔬', label: 'R&D', labelEn: 'Research' },
    { id: 'settings', icon: '⚙️', label: 'সেটিংস', labelEn: 'Settings' },
  ];

  // ============ MAIN RENDER ============
  return (
    <div className="min-h-screen flex">
      {/* Sidebar - Glassmorphism */}
      <aside className="w-64 glass-strong border-r border-white/40 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-white/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 glass-card rounded-xl flex items-center justify-center border border-blue-200/40">
              <span className="text-blue-500 font-bold text-lg">ন</span>
            </div>
            <div>
              <div className="font-bold text-slate-700">নির্ণয়</div>
              <div className="text-xs text-slate-500">ডাক্তার প্যানেল</div>
            </div>
          </div>
        </div>

        {/* Doctor Profile */}
        <div className="p-4 border-b border-white/30">
          <div className="flex items-center gap-3">
            <img src={doctorProfile.image} alt="" className="w-12 h-12 rounded-full border-2 border-white/50 shadow" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-700 truncate">{doctorProfile.nameBn}</div>
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
                  ? 'glass-card text-blue-600 font-medium shadow-lg border border-blue-200/40'
                  : 'text-slate-600 hover:glass-subtle'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="flex-1 text-left font-medium">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-2 py-0.5 glass-subtle text-amber-600 rounded-full text-xs font-medium border border-amber-200/40">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/30">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:glass-subtle transition"
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
          {activeTab === 'patients' && renderPatients()}
          {activeTab === 'appointments' && renderAppointments()}
          {activeTab === 'chambers' && renderChambers()}
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
