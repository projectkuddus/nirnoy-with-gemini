import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { generatePatientSummary, chatWithDoctorAssistant } from '../services/geminiService';
import { Appointment, AppointmentStatus, Chamber, Doctor, PrescriptionItem, PatientSummary, ChatMessage } from '../types';

// --- Mock Data ---
const MOCK_CHAMBERS: Chamber[] = [
  { id: 'c1', name: 'PG Hospital', address: 'Shahbag, Dhaka', startTime: '10:00', endTime: '13:00', slotDuration: 10, fee: 1000 },
  { id: 'c2', name: 'Ibn Sina', address: 'Dhanmondi 9/A', startTime: '15:00', endTime: '18:00', slotDuration: 15, fee: 1500 },
  { id: 'c3', name: 'Labaid Specialized', address: 'Gulshan 2', startTime: '20:00', endTime: '23:00', slotDuration: 20, fee: 2000 },
];

const INITIAL_DOCTOR_PROFILE: Doctor = {
  id: '1', // Matched with MOCK_DOCTORS id
  name: 'Dr. Abul Kashem',
  specialties: ['Cardiology', 'Medicine'],
  degrees: 'MBBS, FCPS (Cardiology)',
  chambers: MOCK_CHAMBERS,
  image: 'https://picsum.photos/id/1005/300/300',
  experience: 15,
  rating: 4.8,
  patientCount: 1204,
  bio: 'Expert cardiologist with over 15 years of experience in interventional cardiology. Dedicated to providing comprehensive heart care.'
};

const MOCK_APPOINTMENTS_TODAY: Appointment[] = [
  // PG Hospital
  { id: 'a1', patientId: 'p1', patientName: 'Rahim Uddin', patientAge: 45, patientGender: 'Male', doctorId: '1', chamberId: 'c1', date: '2023-10-26', time: '10:00', status: AppointmentStatus.BOOKED, type: 'Chamber', visitCategory: 'New Consultation', symptomSummary: 'High fever (103F), severe body ache, nausea for 2 days.' },
  { id: 'a2', patientId: 'p2', patientName: 'Fatima Begum', patientAge: 62, patientGender: 'Female', doctorId: '1', chamberId: 'c1', date: '2023-10-26', time: '10:30', status: AppointmentStatus.BOOKED, type: 'Chamber', symptomSummary: 'Chronic knee pain, swelling in left joint.' },
  { id: 'a3', patientId: 'p3', patientName: 'Karim Ahmed', patientAge: 28, patientGender: 'Male', doctorId: '1', chamberId: 'c1', date: '2023-10-26', time: '11:00', status: AppointmentStatus.BOOKED, type: 'Chamber', symptomSummary: 'Skin rash on back, itchy.' },
  // Ibn Sina
  { id: 'a4', patientId: 'p4', patientName: 'Sultana Razia', patientAge: 35, patientGender: 'Female', doctorId: '1', chamberId: 'c2', date: '2023-10-26', time: '15:00', status: AppointmentStatus.BOOKED, type: 'Chamber', visitCategory: 'Follow-up', symptomSummary: 'Migraine headache, sensitivity to light.' },
  { id: 'a5', patientId: 'p5', patientName: 'Kuddus Boyati', patientAge: 50, patientGender: 'Male', doctorId: '1', chamberId: 'c2', date: '2023-10-26', time: '16:00', status: AppointmentStatus.BOOKED, type: 'Online', symptomSummary: 'Chest pain during exertion.' },
];

const MOCK_PATIENTS: PatientSummary[] = [
  { id: 'p1', name: 'Rahim Uddin', age: 45, gender: 'Male', lastVisit: '2023-10-26', totalVisits: 3, condition: 'Hypertension', phone: '01711000000' },
  { id: 'p2', name: 'Fatima Begum', age: 62, gender: 'Female', lastVisit: '2023-09-15', totalVisits: 5, condition: 'Osteoarthritis', phone: '01822000000' },
  { id: 'p3', name: 'Karim Ahmed', age: 28, gender: 'Male', lastVisit: '2023-10-26', totalVisits: 1, condition: 'Dermatitis', phone: '01933000000' },
  { id: 'p4', name: 'Sultana Razia', age: 35, gender: 'Female', lastVisit: '2023-08-10', totalVisits: 2, condition: 'Migraine', phone: '01544000000' },
  { id: 'p5', name: 'Kuddus Boyati', age: 50, gender: 'Male', lastVisit: '2023-10-01', totalVisits: 12, condition: 'Diabetes T2', phone: '01655000000' },
];

// Chart Data
const CHAMBER_STATS_DATA = [
  { name: 'PG Hospital', value: 650, color: '#0D9488' }, // primary
  { name: 'Ibn Sina', value: 350, color: '#F59E0B' }, // secondary color
  { name: 'Labaid', value: 204, color: '#6366F1' }, // indigo
];

const DISEASE_TREND_DATA = [
  { name: 'Hypertension', count: 120 },
  { name: 'Diabetes T2', count: 95 },
  { name: 'Viral Fever', count: 85 },
  { name: 'Osteoarthritis', count: 40 },
  { name: 'Bronchitis', count: 35 },
];

// --- Sub-Components ---

const SidebarItem: React.FC<{ icon: string; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 mb-1 ${
      active ? 'bg-teal-600 text-white shadow-md' : 'text-teal-100 hover:bg-teal-800 hover:text-white'
    }`}
  >
    <i className={`fas ${icon} w-5 text-center`}></i>
    <span className="font-medium text-sm hidden md:inline">{label}</span>
  </button>
);

// --- Main Component ---

interface DoctorDashboardProps {
  onLogout: () => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'patients' | 'profile' | 'ai-assistant' | 'help' | 'pricing'>('overview');
  const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS_TODAY);
  
  // Profile State
  const [profile, setProfile] = useState<Doctor>(INITIAL_DOCTOR_PROFILE);
  const [isSaving, setIsSaving] = useState(false);
  
  // Patients Tab State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);

  // Visit Mode State
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);
  const [visitNote, setVisitNote] = useState('');
  const [prescription, setPrescription] = useState<PrescriptionItem[]>([]);
  const [completionType, setCompletionType] = useState<string>('New Consultation');
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  
  // Schedule / Calendar State
  const [calendarDate, setCalendarDate] = useState<string>('2023-10-26'); // Default mock date
  const [filterChamberId, setFilterChamberId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  
  // Timer State
  const [elapsedTime, setElapsedTime] = useState(0);

  // AI Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hello Doctor. I have access to your practice data. I can analyze trends, summarize patient groups, or help with differential diagnosis. How can I assist you?', timestamp: Date.now() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const activeAppointment = appointments.find(a => a.id === activeVisitId);

  // --- Effects ---

  // Load profile from local storage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('nirnoy_doctor_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        parsed.id = '1'; // Force correct ID for mock data consistency
        setProfile(parsed);
      } catch (e) {
        console.error("Error parsing saved profile", e);
      }
    }
  }, []);
  
  // Initialize active visit if one is marked IN_PROGRESS on load
  useEffect(() => {
    const inProgress = appointments.find(a => a.status === AppointmentStatus.IN_PROGRESS);
    if (inProgress && !activeVisitId) {
       // Prevent auto-opening unless explicitly intended in real app
       // setActiveVisitId(inProgress.id); 
    }
  }, [appointments, activeVisitId]);

  // Timer Logic
  useEffect(() => {
    let interval: any;
    if (activeVisitId) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [activeVisitId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Profile Logic Helpers ---

  const handleProfileChange = (field: keyof Doctor, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleChamberChange = (index: number, field: keyof Chamber, value: any) => {
    const newChambers = [...profile.chambers];
    newChambers[index] = { ...newChambers[index], [field]: value };
    setProfile(prev => ({ ...prev, chambers: newChambers }));
  };

  const addChamber = () => {
    const newChamber: Chamber = {
      id: `c${Date.now()}`,
      name: 'New Chamber',
      address: 'Dhaka',
      startTime: '09:00',
      endTime: '12:00',
      slotDuration: 15,
      fee: 1000
    };
    setProfile(prev => ({ ...prev, chambers: [...prev.chambers, newChamber] }));
  };

  const removeChamber = (index: number) => {
    if (window.confirm("Are you sure you want to remove this chamber?")) {
      const newChambers = profile.chambers.filter((_, i) => i !== index);
      setProfile(prev => ({ ...prev, chambers: newChambers }));
    }
  };

  const saveProfile = () => {
    setIsSaving(true);
    setTimeout(() => {
      localStorage.setItem('nirnoy_doctor_profile', JSON.stringify(profile));
      setIsSaving(false);
      alert("Profile updated successfully!");
    }, 800);
  };

  // --- Visit Logic Helpers ---

  const handleStartVisit = async (appt: Appointment) => {
    setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, status: AppointmentStatus.IN_PROGRESS } : a));
    setActiveVisitId(appt.id);
    setVisitNote('');
    setPrescription([{ medicine: '', dosage: '', duration: '', instruction: '' }]);
    setCompletionType('New Consultation'); // Reset to default
    setElapsedTime(0); 
    
    setLoadingSummary(true);
    const summary = await generatePatientSummary(`
      Name: ${appt.patientName}, Age: ${appt.patientAge}, Gender: ${appt.patientGender}. 
      Reported Symptoms: ${appt.symptomSummary}. 
      History: [Mock History: Hypertensive, Diabetic Type 2].
    `);
    setAiSummary(summary);
    setLoadingSummary(false);
  };

  const handleResumeVisit = (appt: Appointment) => {
      setActiveVisitId(appt.id);
      // Attempt to restore type if it exists, else default
      setCompletionType(appt.visitCategory || 'New Consultation');
      // Restore notes and prescription
      setVisitNote(appt.diagnosis || '');
      setPrescription(appt.prescription && appt.prescription.length > 0 ? appt.prescription : [{ medicine: '', dosage: '', duration: '', instruction: '' }]);
      
      if (!aiSummary) {
          setAiSummary("Resumed session. Previous summary not loaded."); 
      }
  };

  const handleCompleteVisit = () => {
    if (!activeVisitId) return;
    if (window.confirm(`Mark as COMPLETED (${completionType}) and save prescription?`)) {
        
        console.log("Saving to Backend:", {
            appointmentId: activeVisitId,
            diagnosis: visitNote,
            prescription: prescription
        });

        setAppointments(prev => prev.map(a => a.id === activeVisitId ? { 
            ...a, 
            status: AppointmentStatus.COMPLETED,
            visitCategory: completionType as any,
            diagnosis: visitNote,
            prescription: [...prescription]
        } : a));
        setActiveVisitId(null);
    }
  };

  const handleNoShow = (id: string) => {
     if (window.confirm("Mark patient as No Show?")) {
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: AppointmentStatus.NO_SHOW } : a));
     }
  };

  const addMedicineRow = () => {
    setPrescription(prev => [...prev, { medicine: '', dosage: '', duration: '', instruction: '' }]);
  };

  const updateMedicine = (index: number, field: keyof PrescriptionItem, value: string) => {
    const newPrescription = [...prescription];
    newPrescription[index][field] = value;
    setPrescription(newPrescription);
  };

  // --- Chat Logic ---
  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg: ChatMessage = { role: 'user', text: chatInput, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatTyping(true);

    // Provide practice context
    const practiceContext = `
      Total Patients: ${profile.patientCount}.
      Retention Rate: 24%.
      Top 5 Conditions (Mock): Hypertension (120), Diabetes T2 (95), Viral Fever (85), Osteoarthritis (40), Bronchitis (35).
      Revenue: 850k BDT.
    `;

    const responseText = await chatWithDoctorAssistant(userMsg.text, chatMessages.map(m => m.text), practiceContext);
    
    const modelMsg: ChatMessage = { role: 'model', text: responseText, timestamp: Date.now() };
    setChatMessages(prev => [...prev, modelMsg]);
    setIsChatTyping(false);
  };

  // --- Views ---

  const renderOverview = () => (
    <div className="space-y-8 animate-fade-in pb-10">
      <h2 className="text-2xl font-bold text-slate-800">Practice Intelligence</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Total Patients</h3>
             <div className="bg-teal-100 text-primary h-10 w-10 flex items-center justify-center rounded-full"><i className="fas fa-users"></i></div>
          </div>
          <p className="text-4xl font-bold text-slate-800">{profile.patientCount}</p>
          <p className="text-green-500 text-xs mt-2 flex items-center font-medium"><i className="fas fa-arrow-up mr-1"></i> 12% vs last month</p>
        </div>

         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Recurring</h3>
             <div className="bg-purple-100 text-purple-600 h-10 w-10 flex items-center justify-center rounded-full"><i className="fas fa-sync-alt"></i></div>
          </div>
          <p className="text-4xl font-bold text-slate-800">24%</p>
          <p className="text-slate-400 text-xs mt-2 font-medium">Retention Rate</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Est. Revenue</h3>
             <div className="bg-blue-100 text-blue-600 h-10 w-10 flex items-center justify-center rounded-full"><i className="fas fa-wallet"></i></div>
          </div>
          <p className="text-4xl font-bold text-slate-800">৳ 850k</p>
          <p className="text-slate-400 text-xs mt-2 font-medium">Current Fin. Year</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Satisfaction</h3>
             <div className="bg-yellow-100 text-yellow-600 h-10 w-10 flex items-center justify-center rounded-full"><i className="fas fa-star"></i></div>
          </div>
          <p className="text-4xl font-bold text-slate-800">{profile.rating}<span className="text-lg text-slate-400">/5</span></p>
          <p className="text-slate-400 text-xs mt-2 font-medium">402 Reviews</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Chart 1: Clinical Trends */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[350px] flex flex-col">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
               <i className="fas fa-chart-bar text-teal-500"></i> Top Diagnoses (Last 30 Days)
            </h3>
            <div className="flex-1">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={DISEASE_TREND_DATA}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} interval={0} />
                     <YAxis axisLine={false} tickLine={false} />
                     <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                     <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Chart 2: Location Split */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[350px] flex flex-col">
            <h3 className="font-bold text-slate-800 mb-4">Patients by Location</h3>
            <div className="flex-1">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={CHAMBER_STATS_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {CHAMBER_STATS_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                       contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>
    </div>
  );

  const renderSchedule = () => {
    // Filter displayed chambers
    const displayedChambers = filterChamberId === 'all' 
        ? profile.chambers 
        : profile.chambers.filter(c => c.id === filterChamberId);

    // Filter appointments based on date, status, and filtered chambers
    const filteredAppointments = appointments.filter(a => {
        const matchDate = a.date === calendarDate;
        const matchChamber = filterChamberId === 'all' || a.chamberId === filterChamberId;
        const matchStatus = filterStatus === 'all' || a.status === filterStatus;
        
        // New Type Filter Logic
        let matchType = true;
        if (filterType !== 'all') {
             if (filterType === 'Chamber' || filterType === 'Online') {
                 matchType = a.type === filterType;
             } else {
                 matchType = a.visitCategory === filterType;
             }
        }

        return matchDate && matchChamber && matchStatus && matchType;
    });

    // Generate Time Slots (08:00 to 23:00)
    const timeSlots = Array.from({ length: 16 }, (_, i) => {
        const hour = i + 8;
        return `${hour.toString().padStart(2, '0')}:00`;
    });

    return (
      <div className="flex flex-col h-[calc(100vh-140px)] animate-fade-in">
         {/* Calendar Header & Controls */}
         <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4 flex-shrink-0">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <button className="h-8 w-8 flex items-center justify-center bg-slate-100 rounded-full hover:bg-slate-200 text-slate-600 transition">
                        <i className="fas fa-chevron-left"></i>
                    </button>
                    <input 
                        type="date" 
                        value={calendarDate}
                        onChange={(e) => setCalendarDate(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button className="h-8 w-8 flex items-center justify-center bg-slate-100 rounded-full hover:bg-slate-200 text-slate-600 transition">
                        <i className="fas fa-chevron-right"></i>
                    </button>
                </div>
                <span className="text-slate-400 text-sm hidden md:inline">|</span>
                <h2 className="text-lg font-bold text-slate-800 hidden md:block">Daily Schedule</h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                {/* Chamber Filter */}
                <select 
                    value={filterChamberId}
                    onChange={(e) => setFilterChamberId(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                >
                    <option value="all">All Chambers</option>
                    {profile.chambers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>

                {/* Consultation Type Filter */}
                <select 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                >
                    <option value="all">All Types</option>
                    <option value="Chamber">In-Person</option>
                    <option value="Online">Online</option>
                    <option value="New Consultation">New Consultation</option>
                    <option value="Follow-up">Follow-up</option>
                </select>

                {/* Status Filter */}
                <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                >
                    <option value="all">All Status</option>
                    <option value={AppointmentStatus.BOOKED}>Booked</option>
                    <option value={AppointmentStatus.COMPLETED}>Completed</option>
                    <option value={AppointmentStatus.NO_SHOW}>No Show</option>
                </select>
                
                <button 
                    onClick={() => setAppointments(MOCK_APPOINTMENTS_TODAY)}
                    className="bg-teal-50 text-teal-600 px-3 py-2 rounded-lg hover:bg-teal-100 transition"
                    title="Refresh Data"
                >
                    <i className="fas fa-sync-alt"></i>
                </button>
            </div>
         </div>

         {/* Calendar Grid */}
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
            {/* Header Row */}
            <div className="flex border-b border-slate-200 bg-slate-50">
                <div className="w-20 flex-shrink-0 p-4 border-r border-slate-200"></div> {/* Time Column Header */}
                {displayedChambers.map(chamber => (
                    <div key={chamber.id} className="flex-1 p-4 text-center border-r border-slate-200 last:border-r-0">
                        <h3 className="font-bold text-slate-800 truncate">{chamber.name}</h3>
                        <p className="text-xs text-slate-500">{chamber.startTime} - {chamber.endTime}</p>
                    </div>
                ))}
            </div>

            {/* Scrollable Time Grid */}
            <div className="overflow-y-auto flex-1 custom-scrollbar relative">
                {timeSlots.map((time) => (
                    <div key={time} className="flex border-b border-slate-100 min-h-[100px] group">
                        {/* Time Label */}
                        <div className="w-20 flex-shrink-0 p-2 text-right text-xs font-medium text-slate-400 border-r border-slate-200 bg-slate-50/30 sticky left-0">
                            {time}
                        </div>
                        
                        {/* Chamber Columns */}
                        {displayedChambers.map((chamber) => {
                            const appsInSlot = filteredAppointments.filter(a => 
                                a.chamberId === chamber.id && a.time.startsWith(time.split(':')[0])
                            );
                            
                            return (
                                <div key={chamber.id} className="flex-1 border-r border-slate-200 last:border-r-0 relative p-2 transition hover:bg-slate-50/50">
                                    {appsInSlot.map((appt) => (
                                        <div 
                                            key={appt.id}
                                            className={`
                                                mb-2 p-3 rounded-lg border shadow-sm cursor-pointer transition hover:shadow-md relative overflow-hidden
                                                ${appt.status === AppointmentStatus.IN_PROGRESS ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}
                                                ${appt.status === AppointmentStatus.COMPLETED ? 'opacity-70 bg-slate-100' : ''}
                                            `}
                                        >
                                            {appt.status === AppointmentStatus.IN_PROGRESS && (
                                                <div className="absolute top-0 right-0 bg-red-500 text-white text-[8px] px-1.5 py-0.5 font-bold rounded-bl">LIVE</div>
                                            )}
                                            
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-slate-800 text-sm">{appt.time}</span>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                    appt.type === 'Online' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                                }`}>{appt.type}</span>
                                            </div>
                                            
                                            <h4 className="font-bold text-slate-700 text-sm truncate">{appt.patientName}</h4>
                                            <p className="text-xs text-slate-500 truncate mb-2">{appt.symptomSummary || 'No complaints'}</p>
                                            
                                            <div className="flex gap-2 mt-2">
                                                {appt.status === AppointmentStatus.BOOKED && (
                                                    <button 
                                                        onClick={() => handleStartVisit(appt)}
                                                        className="flex-1 bg-primary text-white text-xs py-1.5 rounded font-bold hover:bg-secondary transition"
                                                    >
                                                        Start
                                                    </button>
                                                )}
                                                {appt.status === AppointmentStatus.IN_PROGRESS && (
                                                    <button 
                                                        onClick={() => handleResumeVisit(appt)}
                                                        className="flex-1 bg-teal-600 text-white text-xs py-1.5 rounded font-bold hover:bg-teal-700 animate-pulse"
                                                    >
                                                        Resume
                                                    </button>
                                                )}
                                                {(appt.status === AppointmentStatus.BOOKED) && (
                                                     <button 
                                                        onClick={() => handleNoShow(appt.id)}
                                                        className="px-2 bg-slate-100 text-slate-400 rounded hover:bg-red-50 hover:text-red-500 transition"
                                                        title="No Show"
                                                     >
                                                        <i className="fas fa-ban"></i>
                                                     </button>
                                                )}
                                                {appt.status === AppointmentStatus.COMPLETED && (
                                                    <div className="w-full text-center text-xs font-bold text-green-600 flex items-center justify-center gap-1">
                                                        <i className="fas fa-check-circle"></i> Done
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
         </div>
      </div>
    );
  };

  const renderPatients = () => {
    const filteredPatients = MOCK_PATIENTS.filter(p => 
       p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       p.phone.includes(searchTerm) ||
       p.condition.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (selectedPatient) {
       return (
          <div className="animate-fade-in pb-12">
             <div className="flex items-center gap-4 mb-6">
               <button 
                  onClick={() => setSelectedPatient(null)} 
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition"
               >
                  <i className="fas fa-arrow-left"></i> Back to Patient List
               </button>
               <span className="text-slate-400 text-sm">|</span>
               <span className="text-slate-500 font-medium">Viewing Record: {selectedPatient.name}</span>
             </div>
             
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                   <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-teal-100 flex items-center justify-center text-2xl text-primary">
                         {selectedPatient.gender === 'Male' ? <i className="fas fa-user-tie"></i> : <i className="fas fa-user"></i>}
                      </div>
                      <div>
                         <h2 className="text-2xl font-bold text-slate-800">{selectedPatient.name}</h2>
                         <p className="text-slate-500">{selectedPatient.gender}, {selectedPatient.age} years • {selectedPatient.phone}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-sm text-slate-500 uppercase tracking-wider font-bold">Condition</p>
                      <span className="inline-block mt-1 px-3 py-1 bg-red-50 text-red-600 rounded-full text-sm font-bold border border-red-100">{selectedPatient.condition}</span>
                   </div>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="col-span-2 space-y-6">
                      <div>
                         <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><i className="fas fa-file-medical-alt text-teal-500"></i> Medical Ledger</h3>
                         <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                            {[1, 2, 3].map((visit, i) => (
                               <div key={i} className="p-4 border-b border-slate-100 last:border-0 hover:bg-white transition">
                                  <div className="flex justify-between mb-2">
                                     <span className="font-bold text-slate-700">Visit #{4-i-1}</span>
                                     <span className="text-xs text-slate-400">2{i} Oct, 2023</span>
                                  </div>
                                  <p className="text-sm text-slate-600 mb-1"><strong>Dx:</strong> {selectedPatient.condition}</p>
                                  <p className="text-xs text-slate-500">Rx: Napa Extend, Seclo 20, Indever 10...</p>
                               </div>
                            ))}
                         </div>
                      </div>
                   </div>
                   
                   <div>
                      <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-xl p-5 shadow-sm">
                         <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                            <i className="fas fa-robot text-purple-600"></i> AI Summary
                         </h3>
                         <p className="text-sm text-slate-600 leading-relaxed">
                            {selectedPatient.name} has a history of recurring {selectedPatient.condition}. Response to medication has been consistent. Last BP check showed 130/85. Recommended to monitor weight.
                         </p>
                         <button className="mt-4 w-full py-2 bg-white border border-purple-200 text-purple-600 rounded-lg text-xs font-bold hover:bg-purple-50 transition">
                            Generate Full Report
                         </button>
                      </div>
                   </div>
                </div>
             </div>
          </div>
       );
    }

    return (
       <div className="space-y-6 animate-fade-in pb-12">
          <h2 className="text-2xl font-bold text-slate-800">Patient Database</h2>
          
          {/* Search & Filter */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
             <div className="flex-1 relative">
                <i className="fas fa-search absolute left-4 top-3.5 text-slate-400"></i>
                <input 
                  type="text" 
                  placeholder="Search by Name, Phone, or Condition..." 
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-50 border-none focus:ring-2 focus:ring-primary outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
               />
             </div>
             <div className="relative">
                <input 
                   type="date" 
                   value={filterDate}
                   onChange={(e) => setFilterDate(e.target.value)}
                   className="w-full md:w-auto pl-4 pr-10 py-3 rounded-lg bg-slate-50 border-none focus:ring-2 focus:ring-primary outline-none text-slate-600 cursor-pointer"
                />
                <i className="fas fa-calendar-alt absolute right-4 top-3.5 text-slate-400 pointer-events-none"></i>
             </div>
             <button className="px-6 py-3 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 transition">
                <i className="fas fa-filter mr-2"></i> Advanced
             </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                   <tr>
                      <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Patient Name</th>
                      <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Details</th>
                      <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Condition</th>
                      <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-wider text-right">Last Visit</th>
                      <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-wider text-center">Action</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {filteredPatients.length === 0 ? (
                      <tr>
                         <td colSpan={5} className="p-8 text-center text-slate-400 italic">No patients found.</td>
                      </tr>
                   ) : (
                      filteredPatients.map(patient => (
                         <tr key={patient.id} className="hover:bg-slate-50 transition group">
                            <td className="p-4">
                               <p className="font-bold text-slate-800">{patient.name}</p>
                               <p className="text-xs text-slate-400">ID: {patient.id}</p>
                            </td>
                            <td className="p-4">
                               <p className="text-sm text-slate-600">{patient.gender}, {patient.age}y</p>
                               <p className="text-xs text-slate-500">{patient.phone}</p>
                            </td>
                            <td className="p-4">
                               <span className="inline-block px-2 py-1 bg-orange-50 text-orange-600 text-xs font-bold rounded border border-orange-100">
                                  {patient.condition}
                               </span>
                            </td>
                            <td className="p-4 text-right text-sm text-slate-600">
                               {patient.lastVisit}
                            </td>
                            <td className="p-4 text-center">
                               <button 
                                  onClick={() => setSelectedPatient(patient)}
                                  className="text-primary hover:bg-teal-50 p-2 rounded-lg transition" title="View Profile"
                               >
                                  <i className="fas fa-eye"></i>
                               </button>
                            </td>
                         </tr>
                      ))
                   )}
                </tbody>
             </table>
          </div>
       </div>
    );
  };

  const renderProfile = () => (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-8 pb-12">
      <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-sm">
        <div className="flex items-center gap-4">
           <h2 className="text-2xl font-bold text-slate-800">Edit Profile</h2>
           <button 
             onClick={() => navigate(`/doctors/${profile.id}`)} 
             className="text-sm text-primary font-bold hover:underline flex items-center gap-1"
           >
             <i className="fas fa-external-link-alt"></i> View Public Profile
           </button>
        </div>
        <button 
          onClick={saveProfile}
          disabled={isSaving}
          className="bg-primary hover:bg-secondary text-white px-6 py-2 rounded-lg font-bold flex items-center shadow-lg shadow-teal-500/20 transition disabled:opacity-70"
        >
          {isSaving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Personal Info */}
        <div className="space-y-6">
           {/* Photo & Basic */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex flex-col items-center mb-6">
                 <div className="relative group cursor-pointer">
                    <img src={profile.image} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-teal-50 shadow-sm transition group-hover:border-teal-100" />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-full transition flex items-center justify-center">
                       <i className="fas fa-camera text-white opacity-0 group-hover:opacity-100"></i>
                    </div>
                 </div>
              </div>
              
              <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={profile.name} 
                      onChange={(e) => handleProfileChange('name', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-800 font-medium"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Degrees</label>
                    <input 
                      type="text" 
                      value={profile.degrees} 
                      onChange={(e) => handleProfileChange('degrees', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Specialties (comma separated)</label>
                    <input 
                      type="text" 
                      value={profile.specialties.join(', ')} 
                      onChange={(e) => handleProfileChange('specialties', e.target.value.split(',').map(s => s.trim()))}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Experience (Years)</label>
                    <input 
                      type="number" 
                      value={profile.experience} 
                      onChange={(e) => handleProfileChange('experience', parseInt(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    />
                 </div>
              </div>
           </div>

           {/* Bio */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Bio / About Me</label>
              <textarea 
                 value={profile.bio}
                 onChange={(e) => handleProfileChange('bio', e.target.value)}
                 rows={6}
                 className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none text-sm leading-relaxed"
              ></textarea>
           </div>
        </div>

        {/* Right Column: Chambers */}
        <div className="lg:col-span-2 space-y-6">
           <div className="flex justify-between items-center">
              <div>
                 <h3 className="font-bold text-slate-700 text-lg">Practice Locations</h3>
                 <p className="text-slate-500 text-xs">Manage your chambers and visiting hours</p>
              </div>
              <button onClick={addChamber} className="bg-teal-50 text-primary px-4 py-2 rounded-lg text-sm font-bold hover:bg-teal-100 border border-teal-100 transition">
                 <i className="fas fa-plus mr-1"></i> Add Chamber
              </button>
           </div>

           {profile.chambers.map((chamber, index) => (
              <div key={chamber.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative group transition hover:border-teal-200">
                 <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => removeChamber(index)} className="text-red-400 hover:text-red-600 p-2 bg-red-50 rounded hover:bg-red-100 transition" title="Remove Chamber">
                       <i className="fas fa-trash-alt"></i>
                    </button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="col-span-2">
                       <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Hospital / Chamber Name</label>
                       <input 
                         type="text" 
                         value={chamber.name} 
                         onChange={(e) => handleChamberChange(index, 'name', e.target.value)}
                         className="w-full p-2 border border-slate-200 rounded font-bold text-slate-800 focus:border-primary outline-none bg-slate-50 focus:bg-white transition"
                       />
                    </div>
                    <div className="col-span-2">
                       <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Address</label>
                       <input 
                         type="text" 
                         value={chamber.address} 
                         onChange={(e) => handleChamberChange(index, 'address', e.target.value)}
                         className="w-full p-2 border border-slate-200 rounded text-sm focus:border-primary outline-none"
                       />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Consultation Fee (৳)</label>
                       <div className="relative">
                          <span className="absolute left-3 top-2 text-slate-400">৳</span>
                          <input 
                            type="number" 
                            value={chamber.fee} 
                            onChange={(e) => handleChamberChange(index, 'fee', parseInt(e.target.value))}
                            className="w-full pl-8 p-2 border border-slate-200 rounded text-sm focus:border-primary outline-none font-mono"
                          />
                       </div>
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Slot Duration (mins)</label>
                       <input 
                         type="number" 
                         value={chamber.slotDuration} 
                         onChange={(e) => handleChamberChange(index, 'slotDuration', parseInt(e.target.value))}
                         className="w-full p-2 border border-slate-200 rounded text-sm focus:border-primary outline-none"
                       />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Start Time</label>
                       <input 
                         type="time" 
                         value={chamber.startTime} 
                         onChange={(e) => handleChamberChange(index, 'startTime', e.target.value)}
                         className="w-full p-2 border border-slate-200 rounded text-sm focus:border-primary outline-none cursor-pointer"
                       />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-400 uppercase mb-1">End Time</label>
                       <input 
                         type="time" 
                         value={chamber.endTime} 
                         onChange={(e) => handleChamberChange(index, 'endTime', e.target.value)}
                         className="w-full p-2 border border-slate-200 rounded text-sm focus:border-primary outline-none cursor-pointer"
                       />
                    </div>
                 </div>
              </div>
           ))}

           {profile.chambers.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
                 <i className="fas fa-map-marker-alt text-slate-300 text-3xl mb-3"></i>
                 <p className="text-slate-500 font-medium">No chambers added yet.</p>
                 <button onClick={addChamber} className="mt-2 text-primary text-sm hover:underline">Add your first location</button>
              </div>
           )}
        </div>
      </div>
    </div>
  );

  const renderAIAssistant = () => (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 animate-fade-in">
        <div className="p-4 border-b border-slate-100 bg-teal-50 rounded-t-xl flex items-center justify-between">
           <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-teal-200 flex items-center justify-center text-teal-800 mr-3">
                 <i className="fas fa-robot"></i>
              </div>
              <div>
                 <h3 className="font-bold text-slate-800">Clinical Intelligence & Assistant</h3>
                 <p className="text-xs text-slate-500">Data Analytics • Differential Dx • Protocols</p>
              </div>
           </div>
           <button 
             onClick={() => setChatMessages([{ role: 'model', text: 'Hello Doctor. I have access to your practice data. I can analyze trends, summarize patient groups, or help with differential diagnosis. How can I assist you?', timestamp: Date.now() }])}
             className="text-xs text-slate-500 hover:text-red-500 font-medium"
           >
             Clear Chat
           </button>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar bg-slate-50/50">
           {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                 <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                 }`}>
                    {msg.text}
                 </div>
              </div>
           ))}
           {isChatTyping && (
              <div className="flex justify-start">
                 <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-none text-slate-500 text-xs shadow-sm flex items-center gap-2">
                    <i className="fas fa-circle-notch fa-spin"></i> Analyzing medical database...
                 </div>
              </div>
           )}
           <div ref={chatEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="px-4 pt-2 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {['Analyze Practice Trends', 'Top 3 Diagnoses', 'Drug Interactions', 'Treatment Guidelines'].map(prompt => (
                <button 
                    key={prompt}
                    onClick={() => setChatInput(prompt)}
                    className="whitespace-nowrap px-3 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-600 hover:bg-slate-50 hover:border-primary hover:text-primary transition"
                >
                    {prompt}
                </button>
            ))}
        </div>

        <div className="p-4 border-t border-slate-100 bg-white rounded-b-xl">
           <div className="flex gap-2 relative">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                placeholder="Ask about trends, diagnosis, or medical queries..."
                className="flex-1 border border-slate-300 rounded-full pl-5 pr-12 py-3 text-sm focus:ring-2 focus:ring-primary outline-none shadow-sm"
              />
              <button 
                onClick={handleSendChatMessage}
                disabled={isChatTyping || !chatInput.trim()}
                className="absolute right-2 top-1.5 h-9 w-9 bg-primary rounded-full text-white hover:bg-secondary transition disabled:opacity-50 flex items-center justify-center shadow-sm"
              >
                 <i className="fas fa-paper-plane"></i>
              </button>
           </div>
           <p className="text-[10px] text-slate-400 text-center mt-2">AI can make mistakes. Please verify critical medical information.</p>
        </div>
    </div>
  );
  
  const renderPricing = () => (
      <div className="max-w-6xl mx-auto py-8 animate-fade-in">
          <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-800 mb-4">Choose Your Practice Plan</h2>
              <p className="text-slate-500 max-w-2xl mx-auto">Scale your practice with Nirnoy Care. From solo practitioners to multi-chamber specialists, we have a plan for you.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
              {/* Basic Plan */}
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-lg transition flex flex-col">
                  <div className="mb-4">
                      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Starter</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">Free</h3>
                  <p className="text-slate-500 text-sm mb-6">Essential tools for individual doctors starting their digital journey.</p>
                  <div className="text-4xl font-bold text-slate-900 mb-6">৳0<span className="text-base text-slate-400 font-normal">/mo</span></div>
                  
                  <ul className="space-y-4 mb-8 flex-1">
                      <li className="flex items-center text-sm text-slate-600"><i className="fas fa-check text-green-500 mr-3"></i> 1 Chamber Location</li>
                      <li className="flex items-center text-sm text-slate-600"><i className="fas fa-check text-green-500 mr-3"></i> Up to 100 Appointments/mo</li>
                      <li className="flex items-center text-sm text-slate-600"><i className="fas fa-check text-green-500 mr-3"></i> Basic Patient Profile</li>
                      <li className="flex items-center text-sm text-slate-400"><i className="fas fa-times text-slate-300 mr-3"></i> AI Assistant</li>
                  </ul>
                  
                  <button className="w-full py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:border-slate-800 hover:text-slate-800 transition">Current Plan</button>
              </div>

              {/* Pro Plan */}
              <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col transform md:-translate-y-4">
                  <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-xl">POPULAR</div>
                  <div className="mb-4">
                      <span className="bg-teal-500/20 text-teal-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Professional</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Pro Practice</h3>
                  <p className="text-slate-400 text-sm mb-6">For busy specialists managing multiple chambers and high patient volume.</p>
                  <div className="text-4xl font-bold text-white mb-6">৳2,500<span className="text-base text-slate-500 font-normal">/mo</span></div>
                  
                  <ul className="space-y-4 mb-8 flex-1">
                      <li className="flex items-center text-sm text-slate-300"><i className="fas fa-check text-teal-400 mr-3"></i> Unlimited Chambers</li>
                      <li className="flex items-center text-sm text-slate-300"><i className="fas fa-check text-teal-400 mr-3"></i> Unlimited Appointments</li>
                      <li className="flex items-center text-sm text-slate-300"><i className="fas fa-check text-teal-400 mr-3"></i> Advanced Analytics</li>
                      <li className="flex items-center text-sm text-slate-300"><i className="fas fa-check text-teal-400 mr-3"></i> AI Medical Assistant</li>
                      <li className="flex items-center text-sm text-slate-300"><i className="fas fa-check text-teal-400 mr-3"></i> SMS Notifications</li>
                  </ul>
                  
                  <button className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-secondary transition shadow-lg shadow-teal-500/25">Upgrade Now</button>
              </div>

              {/* Enterprise */}
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-lg transition flex flex-col">
                  <div className="mb-4">
                      <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Clinic</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">Enterprise</h3>
                  <p className="text-slate-500 text-sm mb-6">Complete management solution for hospitals and multi-doctor clinics.</p>
                  <div className="text-4xl font-bold text-slate-900 mb-6">Custom</div>
                  
                  <ul className="space-y-4 mb-8 flex-1">
                      <li className="flex items-center text-sm text-slate-600"><i className="fas fa-check text-purple-500 mr-3"></i> Multiple Doctor Profiles</li>
                      <li className="flex items-center text-sm text-slate-600"><i className="fas fa-check text-purple-500 mr-3"></i> Receptionist Dashboard</li>
                      <li className="flex items-center text-sm text-slate-600"><i className="fas fa-check text-purple-500 mr-3"></i> Accounting Module</li>
                      <li className="flex items-center text-sm text-slate-600"><i className="fas fa-check text-purple-500 mr-3"></i> 24/7 Priority Support</li>
                  </ul>
                  
                  <button className="w-full py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:border-purple-600 hover:text-purple-600 transition">Contact Sales</button>
              </div>
          </div>
      </div>
  );

  const renderHelp = () => (
      <div className="max-w-4xl mx-auto py-8 animate-fade-in">
          <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-800 mb-4">Help & Support</h2>
              <p className="text-slate-500">How can we assist you today?</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer group">
                  <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                      <i className="fas fa-book"></i>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Documentation</h3>
                  <p className="text-slate-500 text-sm">Detailed guides on using the dashboard, managing chambers, and handling appointments.</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer group">
                  <div className="h-12 w-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                      <i className="fas fa-video"></i>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Video Tutorials</h3>
                  <p className="text-slate-500 text-sm">Watch step-by-step videos to master the Nirnoy Care platform features.</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer group">
                  <div className="h-12 w-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                      <i className="fas fa-headset"></i>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Contact Support</h3>
                  <p className="text-slate-500 text-sm">Our support team is available 24/7 to assist you with any technical issues.</p>
                  <div className="mt-4 text-purple-600 font-bold text-sm">Call 16263</div>
              </div>

               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer group">
                  <div className="h-12 w-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                      <i className="fas fa-shield-alt"></i>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Privacy & Security</h3>
                  <p className="text-slate-500 text-sm">Learn how we protect your data and your patients' medical records.</p>
              </div>
          </div>
      </div>
  );

  const renderVisitOverlay = () => {
     if (!activeAppointment) return null;

     return (
       <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-fade-in">
          {/* Header */}
          <div className="h-16 bg-slate-900 text-white flex items-center justify-between px-6 shadow-md">
             <div className="flex items-center gap-4">
                <button onClick={() => setActiveVisitId(null)} className="text-slate-400 hover:text-white transition"><i className="fas fa-arrow-left mr-1"></i> Dashboard</button>
                <div className="h-6 w-px bg-slate-700"></div>
                <div>
                   <h2 className="font-bold text-lg flex items-center gap-2">
                     {activeAppointment.patientName}
                     <span className="bg-slate-700 text-[10px] px-2 py-0.5 rounded-full text-slate-300 font-normal">ID: {activeAppointment.patientId}</span>
                   </h2>
                   <p className="text-xs text-slate-400">{activeAppointment.patientGender}, {activeAppointment.patientAge} years</p>
                </div>
             </div>
             <div className="flex items-center gap-4">
                <div className="bg-red-900/50 border border-red-800 px-3 py-1 rounded text-xs font-bold text-red-200 animate-pulse flex items-center gap-2">
                   <i className="fas fa-circle text-[8px] text-red-500"></i> LIVE {formatTime(elapsedTime)}
                </div>

                {/* Consultation Type Selector */}
                <div className="mr-2">
                   <select 
                      value={completionType}
                      onChange={(e) => setCompletionType(e.target.value)}
                      className="bg-slate-800 text-slate-200 border border-slate-600 text-xs rounded px-3 py-1.5 outline-none focus:border-teal-500 focus:text-white transition cursor-pointer"
                   >
                      <option value="New Consultation">New Consultation</option>
                      <option value="Follow-up">Follow-up</option>
                      <option value="Report Analysis">Report Analysis</option>
                      <option value="Online Consult">Online Consult</option>
                      <option value="Chamber Visit">Chamber Visit</option>
                   </select>
                </div>

                <button onClick={handleCompleteVisit} className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded font-bold shadow-lg shadow-teal-500/20 transition">
                   <i className="fas fa-print mr-2"></i> Finish & Print
                </button>
             </div>
          </div>

          {/* Workspace */}
          <div className="flex-1 flex overflow-hidden">
             {/* Left Panel: Patient Data & AI */}
             <div className="w-1/3 bg-slate-50 border-r border-slate-200 overflow-y-auto p-6 custom-scrollbar">
                {/* Symptom Card */}
                <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                   <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider"><i className="fas fa-clipboard-list mr-1"></i> Intake Summary</h3>
                   <p className="text-sm font-medium text-slate-800 mb-1">Chief Complaint</p>
                   <p className="text-sm text-slate-600 mb-3 leading-relaxed">{activeAppointment.symptomSummary}</p>
                   
                   <div className="flex gap-4">
                      <div>
                         <p className="text-xs font-medium text-slate-800">History</p>
                         <p className="text-xs text-slate-500">Diabetes T2</p>
                      </div>
                      <div>
                         <p className="text-xs font-medium text-slate-800">Allergies</p>
                         <p className="text-xs text-slate-500">None</p>
                      </div>
                   </div>
                </div>

                {/* AI Summary */}
                <div className="mb-6">
                   <div className="flex justify-between items-center mb-2">
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Insight</h3>
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                         <i className="fas fa-sparkles text-[8px]"></i> Gemini
                      </span>
                   </div>
                   <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-xl border border-purple-100 text-sm text-slate-700 leading-relaxed shadow-sm">
                      {loadingSummary ? (
                         <div className="flex items-center gap-2 text-purple-400 py-2"><i className="fas fa-circle-notch fa-spin"></i> Analyzing patient history...</div>
                      ) : (
                         aiSummary
                      )}
                   </div>
                </div>

                {/* Past Visits */}
                <div>
                   <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-wider">Previous Visits</h3>
                   <div className="space-y-2">
                      <div className="p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-primary transition group">
                         <div className="flex justify-between mb-1">
                            <span className="font-bold text-slate-700 text-xs group-hover:text-primary">12 Aug, 2023</span>
                            <span className="text-[10px] text-slate-400">Dr. Abul Kashem</span>
                         </div>
                         <p className="text-xs text-slate-500 truncate">Viral Fever. Rx: Napa, Ceevit...</p>
                      </div>
                   </div>
                </div>
             </div>

             {/* Right Panel: Doctor Inputs */}
             <div className="flex-1 overflow-y-auto p-8 bg-white custom-scrollbar">
                <div className="max-w-4xl mx-auto">
                   <div className="mb-8">
                      <label className="block text-sm font-bold text-slate-700 mb-2"><i className="fas fa-stethoscope mr-1 text-slate-400"></i> Clinical Notes & Diagnosis</label>
                      <textarea 
                        value={visitNote}
                        onChange={(e) => setVisitNote(e.target.value)}
                        className="w-full h-40 p-4 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:bg-white outline-none transition text-sm leading-relaxed resize-none"
                        placeholder="Start typing examination findings..."
                      ></textarea>
                   </div>

                   <div>
                      <div className="flex justify-between items-end mb-4">
                         <label className="block text-sm font-bold text-slate-700"><i className="fas fa-pills mr-1 text-slate-400"></i> Prescription</label>
                         <button onClick={addMedicineRow} className="text-xs bg-teal-50 text-primary px-3 py-1.5 rounded-lg font-bold hover:bg-teal-100 transition border border-teal-100">
                            <i className="fas fa-plus mr-1"></i> Add Medicine
                         </button>
                      </div>
                      
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                         <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                               <tr>
                                  <th className="p-3 w-1/3 pl-4">Medicine Name</th>
                                  <th className="p-3 w-1/4">Dosage</th>
                                  <th className="p-3 w-1/4">Duration</th>
                                  <th className="p-3">Instruction</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                               {prescription.map((row, idx) => (
                                  <tr key={idx} className="group hover:bg-slate-50 transition">
                                     <td className="p-2 pl-4">
                                        <input 
                                          type="text" 
                                          placeholder="Type medicine..." 
                                          className="w-full p-2 border border-slate-200 rounded focus:border-primary outline-none text-sm font-medium group-hover:bg-white transition"
                                          value={row.medicine}
                                          onChange={(e) => updateMedicine(idx, 'medicine', e.target.value)}
                                        />
                                     </td>
                                     <td className="p-2">
                                        <input 
                                          type="text" 
                                          placeholder="1+0+1" 
                                          className="w-full p-2 border border-slate-200 rounded focus:border-primary outline-none text-sm font-mono text-center group-hover:bg-white transition"
                                          value={row.dosage}
                                          onChange={(e) => updateMedicine(idx, 'dosage', e.target.value)}
                                        />
                                     </td>
                                     <td className="p-2">
                                        <input 
                                          type="text" 
                                          placeholder="Days" 
                                          className="w-full p-2 border border-slate-200 rounded focus:border-primary outline-none text-sm text-center group-hover:bg-white transition"
                                          value={row.duration}
                                          onChange={(e) => updateMedicine(idx, 'duration', e.target.value)}
                                        />
                                     </td>
                                     <td className="p-2">
                                        <input 
                                          type="text" 
                                          placeholder="e.g. After meal" 
                                          className="w-full p-2 border border-slate-200 rounded focus:border-primary outline-none text-sm group-hover:bg-white transition"
                                          value={row.instruction}
                                          onChange={(e) => updateMedicine(idx, 'instruction', e.target.value)}
                                        />
                                     </td>
                                  </tr>
                               ))}
                            </tbody>
                         </table>
                         {prescription.length === 0 && (
                            <div className="p-8 text-center text-slate-400 italic text-sm bg-slate-50/50">
                               <i className="fas fa-prescription-bottle-alt text-2xl mb-2 opacity-20 block"></i>
                               List is empty. Add medicines above.
                            </div>
                         )}
                      </div>
                   </div>
                   
                   <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100 flex justify-between items-center">
                      <div>
                         <h4 className="text-blue-800 text-sm font-bold mb-1"><i className="fas fa-microscope mr-2"></i>Investigations</h4>
                         <p className="text-blue-600/70 text-xs">Select lab tests for this patient.</p>
                      </div>
                      <button className="bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-50 transition shadow-sm">
                         Select Tests
                      </button>
                   </div>
                </div>
             </div>
          </div>
       </div>
     );
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
       {/* Sidebar Navigation */}
       <div className="w-20 md:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col h-screen sticky top-0 z-20 shadow-xl">
          <div className="p-6 flex items-center justify-center md:justify-start border-b border-slate-800">
             <div className="h-10 w-10 bg-teal-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-teal-500/30 bg-gradient-to-br from-teal-400 to-teal-600">
                D
             </div>
             <span className="ml-3 font-bold text-lg hidden md:block tracking-wide text-slate-100">Dr. Portal</span>
          </div>

          <div className="flex-1 py-6 px-2 space-y-1 overflow-y-auto custom-scrollbar">
             <SidebarItem icon="fa-chart-pie" label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
             <SidebarItem icon="fa-calendar-check" label="Live Schedule" active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} />
             <SidebarItem icon="fa-user-injured" label="Patients" active={activeTab === 'patients'} onClick={() => setActiveTab('patients')} />
             <SidebarItem icon="fa-robot" label="AI Assistant" active={activeTab === 'ai-assistant'} onClick={() => setActiveTab('ai-assistant')} />
             <SidebarItem icon="fa-user-md" label="My Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
             <SidebarItem icon="fa-tag" label="Pricing" active={activeTab === 'pricing'} onClick={() => setActiveTab('pricing')} />
             <div className="pt-6 border-t border-slate-800 mt-6">
               <SidebarItem icon="fa-question-circle" label="Help Center" active={activeTab === 'help'} onClick={() => setActiveTab('help')} />
             </div>
          </div>
          
          <div className="p-4 border-t border-slate-800 bg-slate-900">
             <button 
                onClick={() => navigate('/')}
                className="w-full text-slate-400 text-xs mb-2 hover:text-white text-left flex items-center gap-2 font-bold p-2 rounded transition hover:bg-slate-800"
             >
                <i className="fas fa-globe"></i> Go to Website
             </button>
             <button 
                onClick={onLogout}
                className="w-full text-red-400 text-xs mb-4 hover:text-red-300 text-left flex items-center gap-2 font-bold bg-slate-800/50 p-2 rounded transition"
             >
                <i className="fas fa-sign-out-alt"></i> Logout
             </button>
             <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer">
                <img src={profile.image} className="h-10 w-10 rounded-full bg-slate-700 border-2 border-slate-600 object-cover" alt="Dr Profile" />
                <div className="hidden md:block overflow-hidden">
                   <p className="text-sm font-medium truncate text-slate-200">{profile.name}</p>
                   <p className="text-[10px] text-slate-400 uppercase tracking-wider">{profile.specialties[0] || 'Specialist'}</p>
                </div>
             </div>
          </div>
       </div>

       {/* Main Content Area */}
       <div className="flex-1 overflow-y-auto h-screen relative custom-scrollbar flex flex-col">
          {/* Top Navigation Bar */}
          <div className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-3 flex justify-between items-center shadow-sm flex-shrink-0">
             <div className="flex items-center gap-2">
                <i className="fas fa-bars text-slate-400 md:hidden mr-2 cursor-pointer"></i>
                <h2 className="text-lg font-bold text-slate-800 capitalize">{activeTab.replace('-', ' ')}</h2>
             </div>
             <button 
                onClick={() => navigate('/')}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm px-4 py-2 rounded-lg shadow-sm transition"
             >
                <i className="fas fa-home"></i>
                <span>Back to Home</span>
             </button>
          </div>
          
          <div className="p-4 md:p-8 flex-1">
             {activeTab === 'overview' && renderOverview()}
             {activeTab === 'schedule' && renderSchedule()}
             {activeTab === 'patients' && renderPatients()}
             {activeTab === 'profile' && renderProfile()}
             {activeTab === 'ai-assistant' && renderAIAssistant()}
             {activeTab === 'pricing' && renderPricing()}
             {activeTab === 'help' && renderHelp()}
          </div>
       </div>

       {/* Visit Overlay */}
       {activeVisitId && renderVisitOverlay()}
    </div>
  );
};