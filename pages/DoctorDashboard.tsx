
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, LineChart, Line } from 'recharts';
import { 
    chatWithDoctorAssistant, 
    generateClinicalPlan, 
    generateSOAPNote, 
    generatePatientEducation,
    analyzePatientCohorts,
    searchMedicalGuidelines 
} from '../services/geminiService';
import { Appointment, AppointmentStatus, Chamber, Doctor, PrescriptionItem, PatientSummary, ChatMessage, InboxMessage, AnalyticMetric, PatientCohort } from '../types';

// --- Mock Data ---
const getTodayStr = () => new Date().toISOString().split('T')[0];

const MOCK_CHAMBERS: Chamber[] = [
  { id: 'c1', name: 'PG Hospital', address: 'Shahbag, Dhaka', startTime: '10:00', endTime: '13:00', slotDuration: 10, fee: 1000 },
  { id: 'c2', name: 'Ibn Sina', address: 'Dhanmondi 9/A', startTime: '15:00', endTime: '18:00', slotDuration: 15, fee: 1500 },
];

const MOCK_INBOX: InboxMessage[] = [
  { id: 'm1', sender: 'Rahim Uddin', preview: 'Doctor, I have severe chest pain since morning.', fullText: 'Doctor, I have severe chest pain since morning. It is radiating to my left arm. Should I take Napa?', category: 'Emergency', timestamp: '10 mins ago', isRead: false },
  { id: 'm2', sender: 'Fatima Begum', preview: 'Is the clinic open on Friday?', fullText: 'Salam Doctor, just wanted to check if your Ibn Sina chamber is open this Friday?', category: 'Admin', timestamp: '1 hour ago', isRead: true },
  { id: 'm3', sender: 'Karim Ahmed', preview: 'Side effect of the new medicine?', fullText: 'The new skin cream is causing some redness. Is this normal?', category: 'Clarification', timestamp: '2 hours ago', isRead: false },
];

const MOCK_METRICS: AnalyticMetric[] = [
  { label: 'Total Revenue (This Week)', value: '৳ 42,500', trend: 'up', trendValue: '+12%' },
  { label: 'Patient Retention', value: '68%', trend: 'up', trendValue: '+5%' },
  { label: 'No-Show Rate', value: '15%', trend: 'down', trendValue: '-2%' },
];

const MOCK_PATIENTS: PatientSummary[] = [
  { id: 'p1', name: 'Rahim Uddin', age: 45, gender: 'Male', lastVisit: '2023-10-26', totalVisits: 3, condition: 'Hypertension', phone: '01711000000', riskLevel: 'High' },
  { id: 'p2', name: 'Fatima Begum', age: 62, gender: 'Female', lastVisit: '2023-09-15', totalVisits: 5, condition: 'Osteoarthritis', phone: '01822000000', riskLevel: 'Medium' },
  { id: 'p3', name: 'Karim Ahmed', age: 28, gender: 'Male', lastVisit: '2023-10-26', totalVisits: 1, condition: 'Dermatitis', phone: '01933000000', riskLevel: 'Low' },
  { id: 'p4', name: 'Sultana Razia', age: 35, gender: 'Female', lastVisit: '2023-08-10', totalVisits: 2, condition: 'Migraine', phone: '01544000000', riskLevel: 'Medium' },
  { id: 'p5', name: 'Kuddus Boyati', age: 50, gender: 'Male', lastVisit: '2023-10-01', totalVisits: 12, condition: 'Diabetes T2', phone: '01655000000', riskLevel: 'High' },
];

const REVENUE_DATA = [
    { name: 'Sat', revenue: 5000 },
    { name: 'Sun', revenue: 7500 },
    { name: 'Mon', revenue: 6000 },
    { name: 'Tue', revenue: 8200 },
    { name: 'Wed', revenue: 4000 },
    { name: 'Thu', revenue: 9000 },
    { name: 'Fri', revenue: 2800 },
];

// --- Components ---

const SidebarItem: React.FC<{ icon: string; label: string; active: boolean; onClick: () => void; badge?: number }> = ({ icon, label, active, onClick, badge }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 mb-1 ${
      active ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    }`}
  >
    <div className="flex items-center gap-3">
        <i className={`fas ${icon} w-5 text-center ${active ? 'text-teal-400' : ''}`}></i>
        <span className="font-medium text-sm">{label}</span>
    </div>
    {badge ? <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span> : null}
  </button>
);

const AIChatBubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-3 animate-fade-in`}>
        <div className={`max-w-[90%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
        msg.role === 'user' 
            ? 'bg-slate-700 text-white rounded-tr-none' 
            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
        }`}>
        {msg.role === 'model' && <div className="text-[10px] font-bold text-teal-600 uppercase mb-1 flex items-center gap-1"><i className="fas fa-robot"></i> Nirnoy Copilot</div>}
        {msg.text}
        </div>
    </div>
);

interface DoctorDashboardProps {
  onLogout: () => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  
  // Mock Profile
  const profile = {
    name: 'Dr. Abul Kashem',
    image: 'https://randomuser.me/api/portraits/men/85.jpg'
  };

  // --- Navigation State ---
  const [activeTab, setActiveTab] = useState<'home' | 'schedule' | 'patients' | 'consult' | 'inbox' | 'analytics' | 'library' | 'settings'>('home');
  
  // --- Consult Mode State (Clinical Copilot) ---
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [notes, setNotes] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const [vitals, setVitals] = useState({ bp: '', hr: '', temp: '', weight: '' });
  const [rxDraft, setRxDraft] = useState('');
  const [generatedDocs, setGeneratedDocs] = useState<{ type: string, content: string } | null>(null);

  // --- Cohort State (Patient Copilot) ---
  const [cohorts, setCohorts] = useState<PatientCohort[]>([]);
  const [loadingCohorts, setLoadingCohorts] = useState(false);

  // --- Inbox State ---
  const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>(MOCK_INBOX);
  
  // --- AI Copilot State ---
  const [aiChatHistory, setAiChatHistory] = useState<ChatMessage[]>([
      { role: 'model', text: "Hello Doctor. I am Nirnoy Copilot. I'm analyzing your schedule and patient data. How can I help optimize your practice today?", timestamp: Date.now() }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const aiChatRef = useRef<HTMLDivElement>(null);

  // Auto-scroll AI chat
  useEffect(() => {
      aiChatRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiChatHistory]);

  // --- Feature: Cohort Analysis ---
  useEffect(() => {
      if (activeTab === 'patients' && cohorts.length === 0) {
          setLoadingCohorts(true);
          analyzePatientCohorts(JSON.stringify(MOCK_PATIENTS)).then(res => {
              try {
                  const parsed = JSON.parse(res);
                  setCohorts(parsed);
              } catch(e) { console.error("Failed to parse cohorts"); }
              setLoadingCohorts(false);
          });
      }
  }, [activeTab]);

  // --- Handlers ---

  const handleAiSubmit = async () => {
      if (!aiInput.trim()) return;
      const userText = aiInput;
      setAiInput('');
      setAiChatHistory(prev => [...prev, { role: 'user', text: userText, timestamp: Date.now() }]);
      setIsAiThinking(true);

      // Build Context based on active view
      let contextData = `Active Tab: ${activeTab}.`;
      if (activeTab === 'consult' && selectedPatientId) {
          const p = MOCK_PATIENTS.find(p => p.id === selectedPatientId);
          contextData += ` Patient: ${p?.name} (${p?.age}y). Condition: ${p?.condition}. Current Notes: ${JSON.stringify(notes)}. Vitals: ${JSON.stringify(vitals)}.`;
      } else if (activeTab === 'analytics') {
          contextData += ` Metrics: Revenue 42k, Retention 68%.`;
      } 

      const response = activeTab === 'library' 
          ? await searchMedicalGuidelines(userText)
          : await chatWithDoctorAssistant(userText, aiChatHistory.map(m => m.text), contextData);
      
      setAiChatHistory(prev => [...prev, { role: 'model', text: response, timestamp: Date.now() }]);
      setIsAiThinking(false);
  };

  const handleAutoSOAP = async () => {
      setIsAiThinking(true);
      const raw = `Complaint: ${notes.subjective}. Observations: ${notes.objective}.`;
      const vitalStr = `BP: ${vitals.bp}, HR: ${vitals.hr}, T: ${vitals.temp}`;
      const result = await generateSOAPNote(raw, vitalStr);
      try {
          const soap = JSON.parse(result);
          setNotes(prev => ({ ...prev, assessment: soap.assessment || '', plan: soap.plan || '' }));
          setAiChatHistory(prev => [...prev, { role: 'model', text: "I've structured the clinical notes into SOAP format based on your input.", timestamp: Date.now() }]);
      } catch(e) {
          setAiChatHistory(prev => [...prev, { role: 'model', text: "Failed to structure notes. Please try providing more details.", timestamp: Date.now() }]);
      }
      setIsAiThinking(false);
  };

  const handlePatientEducation = async () => {
      if (!notes.assessment) return alert("Please enter a diagnosis/assessment first.");
      setIsAiThinking(true);
      const edu = await generatePatientEducation(notes.assessment, rxDraft);
      setGeneratedDocs({ type: 'Bangla Instructions', content: edu });
      setAiChatHistory(prev => [...prev, { role: 'model', text: "I've generated patient instructions in Bangla. You can print or SMS this.", timestamp: Date.now() }]);
      setIsAiThinking(false);
  };

  const handleDraftRx = async () => {
      setIsAiThinking(true);
      const result = await generateClinicalPlan(notes.subjective, "Hypertension"); // Mock history for now
      try {
          const parsed = JSON.parse(result);
          setRxDraft(parsed.treatmentDraft || "Error generating draft.");
          setAiChatHistory(prev => [...prev, { 
              role: 'model', 
              text: `Treatment plan drafted. Red Flags: ${parsed.redFlags || 'None'}. Investigations: ${parsed.investigations?.join(', ')}.`, 
              timestamp: Date.now() 
          }]);
      } catch(e) {}
      setIsAiThinking(false);
  };

  // --- Render Views ---

  const renderHome = () => (
      <div className="space-y-6 animate-fade-in">
          {/* AI Daily Brief */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <h1 className="text-3xl font-bold mb-2">Good Afternoon, {profile.name}</h1>
              <div className="flex items-start gap-4 mt-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                 <div className="h-8 w-8 bg-teal-500 rounded-full flex items-center justify-center shrink-0"><i className="fas fa-sparkles"></i></div>
                 <div>
                    <h3 className="font-bold text-teal-300 text-sm uppercase">Today's AI Brief</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">You have 12 appointments remaining. 3 patients are flagged as 'High Risk' (Uncontrolled HTN). Your 'PG Hospital' slot is running 15 mins late. Recommended: Prioritize the high-risk follow-ups.</p>
                 </div>
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                 <h3 className="font-bold text-slate-800 mb-4">Smart Queue</h3>
                 <div className="space-y-3">
                    {[1,2,3].map((i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-teal-200 transition cursor-pointer" onClick={() => { setSelectedPatientId('p'+i); setActiveTab('consult'); }}>
                           <div className="flex items-center gap-4">
                              <div className="h-10 w-10 bg-white border-2 border-teal-500 text-teal-700 rounded-full flex items-center justify-center font-bold shadow-sm">{i}</div>
                              <div>
                                 <h4 className="font-bold text-slate-800">Patient #{100+i}</h4>
                                 <p className="text-xs text-slate-500">Check-in: 10 mins ago • <span className="text-orange-500 font-bold">Est Wait: 5 min</span></p>
                              </div>
                           </div>
                           <button className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700">Call In</button>
                        </div>
                    ))}
                 </div>
             </div>
             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                 <h3 className="font-bold text-slate-800 mb-4">Workflow Alerts</h3>
                 <div className="space-y-3">
                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700 flex items-start gap-2">
                       <i className="fas fa-exclamation-circle mt-0.5"></i> 
                       <span><strong>Emergency msg</strong> in Inbox from Rahim. <br/><span className="underline cursor-pointer" onClick={() => setActiveTab('inbox')}>View</span></span>
                    </div>
                    <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-xs text-yellow-700 flex items-start gap-2">
                       <i className="fas fa-clock mt-0.5"></i> 
                       <span><strong>Schedule Gap</strong>: 3 slots open at 7 PM.</span>
                    </div>
                 </div>
             </div>
          </div>
      </div>
  );

  const renderSchedule = () => (
    <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-bold text-slate-800">Smart Schedule & Workflow</h2>
        
        {/* AI Insights for Scheduling */}
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-start gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><i className="fas fa-lightbulb"></i></div>
            <div>
                <h4 className="font-bold text-indigo-900 text-sm">Workflow Copilot Suggestion</h4>
                <p className="text-sm text-indigo-800 mt-1">Your <strong>Mirpur evening slot</strong> (5-7 PM) is consistently under-utilized (35% filled). Patients in that area prefer 7-9 PM.</p>
                <button className="mt-2 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded font-bold hover:bg-indigo-700 transition">
                    Adjust Timing to 7-9 PM
                </button>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800">Today's Timeline</h3>
                <div className="flex gap-2">
                    <button className="text-xs font-bold px-3 py-1.5 rounded bg-slate-100 text-slate-600">Filter by Chamber</button>
                </div>
            </div>
            
            <div className="relative pl-8 border-l-2 border-slate-100 space-y-8">
                {MOCK_CHAMBERS.map((chamber, i) => (
                    <div key={chamber.id} className="relative">
                        <div className="absolute -left-[41px] top-0 h-5 w-5 rounded-full border-4 border-white bg-teal-500 shadow-sm"></div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="flex justify-between mb-2">
                                <h4 className="font-bold text-slate-800">{chamber.name}</h4>
                                <span className="text-xs font-bold text-slate-500">{chamber.startTime} - {chamber.endTime}</span>
                            </div>
                            <div className="flex gap-2 overflow-x-auto py-2 custom-scrollbar">
                                {[...Array(5)].map((_, idx) => (
                                    <div key={idx} className={`flex-shrink-0 w-24 p-2 rounded-lg border text-center ${idx < 3 ? 'bg-teal-50 border-teal-200' : 'bg-white border-slate-200 border-dashed opacity-60'}`}>
                                        <p className="text-xs font-bold text-slate-700">Slot {idx+1}</p>
                                        <p className="text-[10px] text-slate-500">{idx < 3 ? 'Booked' : 'Open'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );

  const renderInbox = () => (
      <div className="h-full flex flex-col animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Smart Inbox <span className="text-sm font-normal text-slate-500 ml-2">(AI Triaged)</span></h2>
            <div className="flex gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200">1 Emergency</span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-600 border border-blue-200">2 Admin</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
              {inboxMessages.map(msg => (
                  <div key={msg.id} className={`p-5 border-b border-slate-100 hover:bg-slate-50 transition cursor-pointer ${!msg.isRead ? 'bg-blue-50/30' : ''}`}>
                      <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-3">
                              {msg.category === 'Emergency' && <i className="fas fa-exclamation-triangle text-red-500 animate-pulse"></i>}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                  msg.category === 'Emergency' ? 'bg-red-100 text-red-700' : 
                                  msg.category === 'Admin' ? 'bg-slate-200 text-slate-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                  {msg.category}
                              </span>
                              <h4 className="font-bold text-slate-800">{msg.sender}</h4>
                          </div>
                          <span className="text-xs text-slate-400">{msg.timestamp}</span>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">{msg.fullText}</p>
                      <div className="flex gap-2">
                          <button 
                            onClick={() => { setAiChatHistory(prev => [...prev, { role: 'model', text: `Draft for ${msg.sender}: "Please visit the ER immediately."`, timestamp: Date.now() }]); }}
                            className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-lg font-bold text-slate-600 hover:bg-slate-100 transition"
                          >
                             <i className="fas fa-pen-fancy mr-1"></i> AI Draft Reply
                          </button>
                          {msg.category === 'Emergency' && (
                              <button className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-red-700 transition">
                                  Call Patient
                              </button>
                          )}
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );

  const renderAnalytics = () => (
      <div className="space-y-6 animate-fade-in">
          <h2 className="text-2xl font-bold text-slate-800">Business Intelligence</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {MOCK_METRICS.map((m, i) => (
                 <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{m.label}</p>
                     <div className="flex items-end justify-between">
                         <span className="text-3xl font-bold text-slate-800">{m.value}</span>
                         <span className={`text-sm font-bold px-2 py-1 rounded ${m.trend==='up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                             <i className={`fas fa-arrow-${m.trend}`}></i> {m.trendValue}
                         </span>
                     </div>
                 </div>
             ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[300px]">
                  <h3 className="font-bold text-slate-800 mb-4">Revenue Trend</h3>
                  <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={REVENUE_DATA}>
                          <defs>
                              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                          <YAxis axisLine={false} tickLine={false} fontSize={12} />
                          <RechartsTooltip />
                          <Area type="monotone" dataKey="revenue" stroke="#0d9488" fillOpacity={1} fill="url(#colorRev)" />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4">Fee Optimization (AI)</h3>
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 mb-4">
                      <p className="text-sm text-blue-800 leading-relaxed">
                          <strong>Insight:</strong> Your fee is <strong>BDT 1000</strong>. Median for similar cardiologists in Dhanmondi is <strong>BDT 1200</strong>.
                      </p>
                  </div>
                  <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-sm font-medium text-slate-700">Suggestion 1: Raise fee to 1200</span>
                          <button className="text-xs bg-white border border-slate-200 px-3 py-1 rounded font-bold hover:bg-slate-100">Simulate Impact</button>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-sm font-medium text-slate-700">Suggestion 2: Introduce 500 BDT Follow-up</span>
                          <button className="text-xs bg-white border border-slate-200 px-3 py-1 rounded font-bold hover:bg-slate-100">Apply</button>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );

  const renderLibrary = () => (
      <div className="h-full flex flex-col animate-fade-in">
          <div className="text-center py-10">
               <div className="inline-block p-4 bg-teal-100 rounded-full text-teal-600 mb-4 text-3xl">
                   <i className="fas fa-book-medical"></i>
               </div>
               <h2 className="text-2xl font-bold text-slate-800">Learning Copilot</h2>
               <p className="text-slate-500 mt-2">Access latest guidelines and clinical evidence instantly.</p>
          </div>

          <div className="max-w-2xl mx-auto w-full mb-10">
              <div className="relative group">
                  <input 
                      type="text" 
                      className="w-full p-4 pl-12 border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-teal-500 outline-none transition" 
                      placeholder="Search guidelines (e.g., 'Dengue Management 2024 BD')..."
                      onKeyPress={(e) => { if (e.key==='Enter') { setAiInput((e.target as HTMLInputElement).value); handleAiSubmit(); } }}
                  />
                  <i className="fas fa-search absolute left-4 top-4.5 text-slate-400 group-focus-within:text-teal-500"></i>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto w-full">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-teal-300 transition cursor-pointer">
                  <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded uppercase mb-2 inline-block">Update</span>
                  <h3 className="font-bold text-slate-800 mb-2">Dengue Management Protocol 2024</h3>
                  <p className="text-sm text-slate-500">National Guidelines for Clinical Management of Dengue Syndrome.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-teal-300 transition cursor-pointer">
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded uppercase mb-2 inline-block">Refresher</span>
                  <h3 className="font-bold text-slate-800 mb-2">Hypertension in Diabetics</h3>
                  <p className="text-sm text-slate-500">Latest evidence on ACE inhibitors vs ARBs selection.</p>
              </div>
          </div>
      </div>
  );

  const renderConsult = () => {
      if (!selectedPatientId) return (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <i className="fas fa-user-md text-6xl mb-4 opacity-20"></i>
              <p className="text-lg">Select a patient to activate Clinical Copilot</p>
              <button onClick={() => setActiveTab('schedule')} className="mt-4 bg-teal-600 text-white px-6 py-2 rounded-lg font-bold">View Queue</button>
          </div>
      );

      const patient = MOCK_PATIENTS.find(p => p.id === selectedPatientId);

      return (
          <div className="h-full flex flex-col animate-fade-in">
              {/* Patient Header */}
              <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center shadow-sm z-10">
                  <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold text-xl border border-slate-200">
                          {patient?.name.charAt(0)}
                      </div>
                      <div>
                          <h2 className="font-bold text-slate-800 text-lg">{patient?.name} <span className="text-sm font-normal text-slate-500">({patient?.gender}, {patient?.age}y)</span></h2>
                          <p className="text-xs text-slate-500">ID: {patient?.id} • {patient?.phone}</p>
                      </div>
                  </div>
                  <div className="flex gap-2">
                      {patient?.riskLevel === 'High' && (
                          <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200 flex items-center gap-1">
                              <i className="fas fa-biohazard"></i> High Risk
                          </span>
                      )}
                      <button onClick={() => setSelectedPatientId(null)} className="text-slate-400 hover:text-slate-600 p-2"><i className="fas fa-times text-lg"></i></button>
                  </div>
              </div>

              {/* Clinical Workspace */}
              <div className="flex-1 overflow-hidden flex">
                  {/* Left: Vitals & History */}
                  <div className="w-1/4 bg-slate-50 border-r border-slate-200 p-4 overflow-y-auto custom-scrollbar">
                      <div className="mb-6">
                          <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Vitals Input</h4>
                          <div className="space-y-3">
                              <input type="text" placeholder="BP (e.g. 120/80)" className="w-full p-2 border rounded text-sm" value={vitals.bp} onChange={e => setVitals({...vitals, bp: e.target.value})} />
                              <div className="grid grid-cols-2 gap-2">
                                  <input type="text" placeholder="HR" className="p-2 border rounded text-sm" value={vitals.hr} onChange={e => setVitals({...vitals, hr: e.target.value})} />
                                  <input type="text" placeholder="Wt (kg)" className="p-2 border rounded text-sm" value={vitals.weight} onChange={e => setVitals({...vitals, weight: e.target.value})} />
                              </div>
                          </div>
                      </div>
                      <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Medical Ledger</h4>
                          <div className="space-y-2">
                              {[1,2,3].map(i => (
                                  <div key={i} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-xs cursor-pointer hover:border-teal-300">
                                      <div className="flex justify-between font-bold text-slate-700 mb-1">
                                          <span>Visit #{4-i}</span>
                                          <span>20 Oct 23</span>
                                      </div>
                                      <p className="text-slate-500 truncate">Hypertension follow-up...</p>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>

                  {/* Center: SOAP & Rx */}
                  <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-white">
                      <div className="flex gap-4 mb-6">
                          <div className="flex-1">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Subjective (Complaint)</label>
                              <textarea 
                                  className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none" 
                                  placeholder="Patient's words..."
                                  value={notes.subjective}
                                  onChange={e => setNotes({...notes, subjective: e.target.value})}
                              ></textarea>
                          </div>
                          <div className="flex-1">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Objective (Exam)</label>
                              <textarea 
                                  className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none" 
                                  placeholder="Observations..."
                                  value={notes.objective}
                                  onChange={e => setNotes({...notes, objective: e.target.value})}
                              ></textarea>
                          </div>
                      </div>
                      
                      <div className="flex justify-end mb-6">
                          <button onClick={handleAutoSOAP} className="bg-purple-50 text-purple-600 px-4 py-2 rounded-lg text-xs font-bold border border-purple-100 hover:bg-purple-100 transition flex items-center gap-2">
                              <i className="fas fa-magic"></i> AI: Generate Full SOAP
                          </button>
                      </div>

                      <div className="mb-6">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Assessment & Plan (AI Assisted)</label>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                              <input 
                                  type="text" 
                                  placeholder="Diagnosis..." 
                                  className="p-3 border border-slate-200 rounded-lg text-sm font-bold"
                                  value={notes.assessment}
                                  onChange={e => setNotes({...notes, assessment: e.target.value})}
                              />
                              <button onClick={handleDraftRx} className="bg-teal-50 text-teal-600 px-4 py-2 rounded-lg text-xs font-bold border border-teal-100 hover:bg-teal-100 transition">
                                  Generate Treatment Plan
                              </button>
                          </div>
                          <textarea 
                              className="w-full h-40 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none"
                              placeholder="Prescription Draft..."
                              value={rxDraft}
                              onChange={e => setRxDraft(e.target.value)}
                          ></textarea>
                      </div>

                      <div className="flex gap-3 pt-4 border-t border-slate-100">
                          <button onClick={handlePatientEducation} className="flex-1 py-3 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition flex items-center justify-center gap-2">
                              <i className="fas fa-language"></i> Generate Bangla Instructions
                          </button>
                          <button className="flex-[2] py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition shadow-lg shadow-teal-500/20">
                              Finalize & Print Prescription
                          </button>
                      </div>

                      {generatedDocs && (
                          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-100 rounded-xl relative animate-fade-in">
                              <button onClick={() => setGeneratedDocs(null)} className="absolute top-2 right-2 text-yellow-600 hover:text-yellow-800"><i className="fas fa-times"></i></button>
                              <h4 className="font-bold text-yellow-800 mb-2">{generatedDocs.type}</h4>
                              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">{generatedDocs.content}</pre>
                              <button className="mt-3 text-xs bg-white border border-yellow-200 px-3 py-1 rounded font-bold text-yellow-700">Copy to Clipboard</button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  const renderPatients = () => (
      <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">Patient Cohorts (AI Analysis)</h2>
              <button onClick={() => setLoadingCohorts(true)} className="text-sm text-teal-600 font-bold hover:underline"><i className="fas fa-sync-alt mr-1"></i> Refresh Analysis</button>
          </div>

          {loadingCohorts ? (
              <div className="p-12 text-center text-slate-400"><i className="fas fa-circle-notch fa-spin text-3xl mb-3"></i><p>AI is analyzing patient risk profiles...</p></div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {cohorts.length > 0 ? cohorts.map(cohort => (
                     <div key={cohort.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition group">
                         <div className="flex justify-between items-start mb-4">
                             <div className="h-10 w-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                 <i className="fas fa-users"></i>
                             </div>
                             <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">{cohort.count} Patients</span>
                         </div>
                         <h3 className="font-bold text-slate-800 text-lg mb-1">{cohort.name}</h3>
                         <p className="text-sm text-slate-500 mb-4 h-10 line-clamp-2">{cohort.description}</p>
                         <button className="w-full py-2 bg-purple-50 text-purple-700 text-sm font-bold rounded-lg hover:bg-purple-100 transition">
                             {cohort.action}
                         </button>
                     </div>
                 )) : (
                     <div className="col-span-3 p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500">
                         No cohorts generated yet.
                     </div>
                 )}
              </div>
          )}
          
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
             <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                 <h3 className="font-bold text-slate-700">All Patients Directory</h3>
                 <input type="text" placeholder="Search..." className="bg-white border border-slate-200 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
             </div>
             <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 text-slate-500 font-bold">
                     <tr>
                         <th className="p-4">Name</th>
                         <th className="p-4">Condition</th>
                         <th className="p-4">Last Visit</th>
                         <th className="p-4">Risk</th>
                         <th className="p-4 text-right">Action</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                     {MOCK_PATIENTS.map(p => (
                         <tr key={p.id} className="hover:bg-slate-50 transition">
                             <td className="p-4 font-bold text-slate-800">{p.name}</td>
                             <td className="p-4 text-slate-600">{p.condition}</td>
                             <td className="p-4 text-slate-500">{p.lastVisit}</td>
                             <td className="p-4">
                                 <span className={`px-2 py-1 rounded text-xs font-bold ${p.riskLevel === 'High' ? 'bg-red-100 text-red-700' : p.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                     {p.riskLevel}
                                 </span>
                             </td>
                             <td className="p-4 text-right">
                                 <button onClick={() => { setSelectedPatientId(p.id); setActiveTab('consult'); }} className="text-teal-600 hover:text-teal-800 font-bold text-xs">Open Chart</button>
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
          </div>
      </div>
  );

  // --- Main Layout ---
  return (
    <div className="flex h-screen bg-slate-900 text-slate-300 font-sans overflow-hidden">
       {/* 1. Left Sidebar (Navigation) */}
       <div className="w-20 lg:w-64 flex-shrink-0 flex flex-col border-r border-slate-800 bg-slate-900 z-20">
          <div className="p-6 flex items-center gap-3 mb-4">
             <div className="h-8 w-8 bg-teal-500 rounded-lg flex items-center justify-center text-slate-900 font-bold shadow-lg shadow-teal-500/50">N</div>
             <span className="font-bold text-white text-lg hidden lg:block tracking-tight">Nirnoy Copilot</span>
          </div>

          <div className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
             <SidebarItem icon="fa-home" label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
             <SidebarItem icon="fa-calendar-alt" label="Schedule" active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} />
             <SidebarItem icon="fa-users" label="Patients" active={activeTab === 'patients'} onClick={() => setActiveTab('patients')} />
             <SidebarItem icon="fa-stethoscope" label="Consult" active={activeTab === 'consult'} onClick={() => setActiveTab('consult')} />
             <SidebarItem icon="fa-inbox" label="Inbox" active={activeTab === 'inbox'} onClick={() => setActiveTab('inbox')} badge={3} />
             <div className="my-4 border-t border-slate-800"></div>
             <SidebarItem icon="fa-chart-pie" label="Analytics" active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
             <SidebarItem icon="fa-book-medical" label="Library" active={activeTab === 'library'} onClick={() => setActiveTab('library')} />
             <SidebarItem icon="fa-cog" label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          </div>

          <div className="p-4 border-t border-slate-800">
             <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-red-400 transition">
                <i className="fas fa-sign-out-alt"></i>
                <span className="hidden lg:inline text-sm font-bold">Logout</span>
             </button>
          </div>
       </div>

       {/* 2. Center Content Area */}
       <div className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden">
          {/* Top Bar */}
          <div className="h-16 border-b border-slate-200 bg-white flex justify-between items-center px-6 shadow-sm z-10">
             <h2 className="text-lg font-bold text-slate-800 capitalize">{activeTab}</h2>
             <div className="flex items-center gap-4">
                 <button className="text-slate-400 hover:text-slate-600"><i className="far fa-bell text-xl"></i></button>
                 <div className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden border border-slate-300">
                    <img src={profile.image} alt="Profile" className="h-full w-full object-cover" />
                 </div>
             </div>
          </div>

          {/* Scrollable Viewport */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar text-slate-800">
              {activeTab === 'home' && renderHome()}
              {activeTab === 'consult' && renderConsult()}
              {activeTab === 'patients' && renderPatients()}
              {activeTab === 'schedule' && renderSchedule()}
              {activeTab === 'inbox' && renderInbox()}
              {activeTab === 'analytics' && renderAnalytics()}
              {activeTab === 'library' && renderLibrary()}
              
              {activeTab === 'settings' && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <i className="fas fa-tools text-4xl mb-4 opacity-20"></i>
                      <p>General Settings Module</p>
                  </div>
              )}
          </div>
       </div>

       {/* 3. Right Sidebar (Persistent AI Panel) */}
       <div className="w-80 flex-shrink-0 border-l border-slate-200 bg-white flex flex-col shadow-xl z-30">
           {/* AI Header */}
           <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
               <div className="flex items-center gap-2">
                   <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                   <span className="font-bold text-slate-800 text-sm">Ask Nirnoy</span>
               </div>
               <button onClick={() => setAiChatHistory([])} className="text-slate-400 hover:text-slate-600 text-xs"><i className="fas fa-trash"></i></button>
           </div>
           
           {/* AI Chat Area */}
           <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 custom-scrollbar space-y-2">
               {aiChatHistory.map((msg, i) => <AIChatBubble key={i} msg={msg} />)}
               {isAiThinking && (
                   <div className="flex items-center gap-2 text-xs text-slate-400 italic p-2">
                       <i className="fas fa-circle-notch fa-spin"></i> Thinking...
                   </div>
               )}
               <div ref={aiChatRef} />
           </div>

           {/* Suggestions Chips (Context Aware) */}
           <div className="p-2 bg-white border-t border-slate-100 overflow-x-auto whitespace-nowrap custom-scrollbar flex gap-2">
               {activeTab === 'consult' && (
                   <>
                    <button onClick={() => setAiInput("Draft a prescription")} className="text-[10px] font-bold px-2 py-1 rounded bg-purple-50 text-purple-600 border border-purple-100 hover:bg-purple-100">Draft Rx</button>
                    <button onClick={() => setAiInput("Check for drug interactions")} className="text-[10px] font-bold px-2 py-1 rounded bg-red-50 text-red-600 border border-red-100 hover:bg-red-100">Interactions?</button>
                   </>
               )}
               {activeTab === 'analytics' && (
                   <button onClick={() => setAiInput("Explain the revenue trend")} className="text-[10px] font-bold px-2 py-1 rounded bg-green-50 text-green-600 border border-green-100 hover:bg-green-100">Explain Trend</button>
               )}
               <button onClick={() => setAiInput("Summarize this view")} className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200">Summarize</button>
           </div>

           {/* Input Area */}
           <div className="p-4 border-t border-slate-200 bg-white">
               <div className="relative">
                   <input 
                      type="text" 
                      value={aiInput} 
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAiSubmit()}
                      placeholder="Ask anything..." 
                      className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                   />
                   <button 
                      onClick={handleAiSubmit}
                      disabled={!aiInput.trim() || isAiThinking}
                      className="absolute right-2 top-2 h-8 w-8 bg-slate-800 text-white rounded-lg flex items-center justify-center hover:bg-black transition disabled:opacity-50"
                   >
                       <i className="fas fa-arrow-up text-xs"></i>
                   </button>
               </div>
           </div>
       </div>
    </div>
  );
};
