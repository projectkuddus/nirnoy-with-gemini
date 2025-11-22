
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatWithHealthAssistant } from '../services/geminiService';
import { Appointment, AppointmentStatus, ChatMessage, VisitRecord } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// --- Extended Mock Data for Trends ---
const VITALS_DATA = [
  { date: 'Jan', bpSys: 130, bpDia: 85, weight: 74 },
  { date: 'Mar', bpSys: 125, bpDia: 82, weight: 73.5 },
  { date: 'May', bpSys: 122, bpDia: 80, weight: 73 },
  { date: 'Aug', bpSys: 118, bpDia: 78, weight: 72 },
  { date: 'Oct', bpSys: 120, bpDia: 80, weight: 72 }
];

const MOCK_APPOINTMENTS: Appointment[] = [
  { 
    id: '1', 
    doctorName: 'Dr. Abul Kashem', 
    patientName: 'Me', 
    patientId: 'self', 
    patientAge: 30, 
    patientGender: 'Male',
    doctorId: '1',
    chamberId: 'c1',
    date: '2023-10-25', 
    time: '17:00', 
    status: AppointmentStatus.BOOKED, 
    type: 'Chamber' 
  },
  { 
    id: '2', 
    doctorName: 'Dr. Sarah Rahman', 
    patientName: 'Me', 
    patientId: 'self',
    patientAge: 30,
    patientGender: 'Male',
    doctorId: '2',
    chamberId: 'c2',
    date: '2023-09-10', 
    time: '18:30', 
    status: AppointmentStatus.COMPLETED, 
    type: 'Chamber' 
  }
];

const MOCK_HISTORY: VisitRecord[] = [
   {
     id: 'v1',
     date: '2023-08-15',
     doctorName: 'Dr. Abul Kashem',
     diagnosis: 'Viral Fever',
     notes: 'Patient presented with high grade fever (103F) and severe body ache. Hydration and rest advised.',
     prescription: [
       { medicine: 'Napa Extend', dosage: '1+1+1', duration: '5 Days', instruction: 'After meal' },
       { medicine: 'Orsaline-N', dosage: 'As needed', duration: '-', instruction: 'For dehydration' }
     ]
   },
   {
     id: 'v2',
     date: '2023-05-20',
     doctorName: 'Dr. Sarah Rahman',
     diagnosis: 'Contact Dermatitis',
     notes: 'Mild flare up on hands due to detergent exposure. Advised to use gloves.',
     prescription: [
       { medicine: 'Ecosporin Cream', dosage: 'Apply 2 times', duration: '7 Days', instruction: 'On affected area' },
       { medicine: 'Fexo 120', dosage: '0+0+1', duration: '10 Days', instruction: 'At night' }
     ]
   }
];

export const PatientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'chat' | 'history'>('overview');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hello! I am your personal health intelligence. I have analyzed your records. I see your Blood Pressure is trending downwards, which is great! How can I assist you today?', timestamp: Date.now() }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  const [showReminder, setShowReminder] = useState(false);
  const [reminderAppt, setReminderAppt] = useState<Appointment | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Simulate checking for upcoming appointments (e.g., next 24 hours)
  useEffect(() => {
      // For demo purposes, we'll just grab the first booked appointment
      const upcoming = MOCK_APPOINTMENTS.find(a => a.status === AppointmentStatus.BOOKED);
      if (upcoming) {
          setReminderAppt(upcoming);
          setShowReminder(true);
      }
  }, []);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg: ChatMessage = { role: 'user', text: chatInput, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    // Pass patient context to AI
    const context = `
      Patient Name: Rahim Uddin. Age: 30.
      Recent Vitals: BP 120/80, Weight 72kg.
      Trends: BP decreasing over last 6 months. Weight stable.
      History: Viral Fever (Aug 2023), Dermatitis (May 2023).
      Current Meds: None active.
    `;

    const responseText = await chatWithHealthAssistant(userMsg.text, messages.map(m => m.text), context);
    
    const modelMsg: ChatMessage = { role: 'model', text: responseText, timestamp: Date.now() };
    setMessages(prev => [...prev, modelMsg]);
    setIsTyping(false);
  };

  const sortedHistory = [...MOCK_HISTORY].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const renderOverview = () => (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-8">
       {showReminder && reminderAppt && (
           <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r shadow-sm flex justify-between items-start animate-fade-in-up">
               <div className="flex gap-3">
                   <div className="text-blue-500 text-xl"><i className="fas fa-bell"></i></div>
                   <div>
                       <h4 className="font-bold text-blue-800">Appointment Reminder</h4>
                       <p className="text-sm text-blue-700">
                           You have an appointment with <span className="font-bold">{reminderAppt.doctorName}</span> scheduled for tomorrow at <span className="font-bold">{reminderAppt.time}</span>.
                       </p>
                   </div>
               </div>
               <button onClick={() => setShowReminder(false)} className="text-blue-400 hover:text-blue-600"><i className="fas fa-times"></i></button>
           </div>
       )}

       <div className="flex justify-between items-end">
          <div>
             <h1 className="text-3xl font-bold text-slate-800">Health Overview</h1>
             <p className="text-slate-500">Your personal health intelligence hub.</p>
          </div>
          <div className="text-right hidden md:block">
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Health Score</p>
             <p className="text-3xl font-bold text-teal-600">92<span className="text-lg text-slate-400">/100</span></p>
          </div>
       </div>
       
       {/* AI Insights Card */}
       <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <i className="fas fa-brain text-9xl"></i>
          </div>
          <div className="relative z-10">
             <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <i className="fas fa-sparkles text-yellow-400"></i> AI Insights from your Data
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/10 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                   <p className="text-xs font-bold text-teal-300 uppercase mb-2">Positive Trends</p>
                   <ul className="space-y-2 text-sm text-slate-200">
                      <li className="flex items-start gap-2"><i className="fas fa-check-circle mt-1 text-teal-400"></i> Blood pressure has stabilized (avg 120/80).</li>
                      <li className="flex items-start gap-2"><i className="fas fa-check-circle mt-1 text-teal-400"></i> Consistent weight management over 6 months.</li>
                   </ul>
                </div>
                <div className="bg-white/10 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                   <p className="text-xs font-bold text-orange-300 uppercase mb-2">Areas to Watch</p>
                   <ul className="space-y-2 text-sm text-slate-200">
                      <li className="flex items-start gap-2"><i className="fas fa-exclamation-circle mt-1 text-orange-400"></i> Seasonal allergies (Dermatitis) recurrent in May.</li>
                      <li className="flex items-start gap-2"><i className="fas fa-exclamation-circle mt-1 text-orange-400"></i> Next dental checkup is overdue by 2 months.</li>
                   </ul>
                </div>
             </div>
          </div>
       </div>

       {/* Charts Section */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <h3 className="font-bold text-slate-800 mb-4">Blood Pressure Trend</h3>
             <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={VITALS_DATA}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <YAxis domain={[60, 160]} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Line type="monotone" dataKey="bpSys" stroke="#0d9488" strokeWidth={3} dot={{fill: '#0d9488', strokeWidth: 2}} activeDot={{r: 6}} name="Systolic" />
                      <Line type="monotone" dataKey="bpDia" stroke="#64748b" strokeWidth={2} dot={false} name="Diastolic" />
                   </LineChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <h3 className="font-bold text-slate-800 mb-4">Weight History</h3>
             <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={VITALS_DATA}>
                      <defs>
                         <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                         </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <YAxis domain={['dataMin - 2', 'dataMax + 2']} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Area type="monotone" dataKey="weight" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorWeight)" strokeWidth={3} />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>
       </div>

       {/* Active Appointments Queue */}
       <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
             <h3 className="font-bold text-slate-800">Upcoming Appointments</h3>
             <button onClick={() => navigate('/search')} className="text-sm text-primary font-bold hover:underline">Book New</button>
          </div>
          {MOCK_APPOINTMENTS.filter(a => a.status === AppointmentStatus.BOOKED).map((app) => (
             <div key={app.id} className="p-6 flex flex-col md:flex-row items-center gap-6 bg-teal-50/30">
                <div className="flex-1 flex items-center gap-4">
                   <div className="h-14 w-14 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl text-teal-600">
                      <i className="fas fa-user-md"></i>
                   </div>
                   <div>
                      <h4 className="font-bold text-slate-800 text-lg">{app.doctorName}</h4>
                      <p className="text-sm text-slate-500">{app.type} Visit • {app.date}</p>
                   </div>
                </div>
                
                {/* Live Queue Status Mockup */}
                <div className="w-full md:w-auto flex items-center gap-6 bg-white px-6 py-3 rounded-xl border border-teal-100 shadow-sm">
                   <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Serial</p>
                      <p className="text-2xl font-bold text-slate-800">14</p>
                   </div>
                   <div className="h-8 w-px bg-slate-200"></div>
                   <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current</p>
                      <p className="text-2xl font-bold text-teal-600 animate-pulse">09</p>
                   </div>
                   <div className="h-8 w-px bg-slate-200"></div>
                   <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Est. Time</p>
                      <p className="text-lg font-bold text-slate-800">5:45 PM</p>
                   </div>
                </div>
             </div>
          ))}
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
       {/* Sidebar (Mobile hidden usually, simplified here) */}
       <div className="w-64 bg-white border-r border-slate-200 hidden md:block flex-shrink-0 h-screen sticky top-0">
          <div className="p-6">
             <div className="h-20 w-20 rounded-full bg-slate-200 mx-auto mb-4 overflow-hidden border-4 border-slate-50 shadow-sm">
               <img src="https://picsum.photos/id/64/200/200" alt="Profile" className="h-full w-full object-cover" />
             </div>
             <h3 className="text-center font-bold text-slate-800">Rahim Uddin</h3>
             <p className="text-center text-xs text-slate-500">ID: P-98234</p>
          </div>
          <nav className="px-4 space-y-1">
             <button 
                onClick={() => setActiveTab('overview')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-teal-50 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}
             >
                <i className="fas fa-home w-6 text-center"></i> Overview
             </button>
             <button 
                onClick={() => setActiveTab('history')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-teal-50 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}
             >
                <i className="fas fa-history w-6 text-center"></i> Health History
             </button>
             <button 
                onClick={() => setActiveTab('chat')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center text-sm font-medium transition-colors ${activeTab === 'chat' ? 'bg-teal-50 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}
             >
                <i className="fas fa-robot w-6 text-center"></i> AI Assistant
             </button>
          </nav>
       </div>

       {/* Main Content */}
       <div className="flex-1 p-4 md:p-8 overflow-y-auto h-screen custom-scrollbar">
          {activeTab === 'overview' && renderOverview()}

          {activeTab === 'history' && (
             <div className="max-w-4xl mx-auto animate-fade-in">
                <h1 className="text-2xl font-bold text-slate-800 mb-6">Health History</h1>
                <div className="space-y-4">
                   {sortedHistory.map((visit) => (
                      <div key={visit.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition hover:shadow-md">
                         <div 
                            onClick={() => setExpandedVisitId(expandedVisitId === visit.id ? null : visit.id)}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer bg-slate-50 hover:bg-teal-50/50 transition"
                         >
                            <div className="flex items-center gap-4">
                               <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 flex-shrink-0">
                                  <i className="fas fa-file-medical-alt"></i>
                               </div>
                               <div>
                                  <h3 className="font-bold text-slate-800 text-lg">{visit.doctorName}</h3>
                                  <p className="text-sm text-slate-500"><i className="far fa-calendar-alt mr-1"></i> {visit.date}</p>
                               </div>
                            </div>
                            
                            <div className="flex items-center gap-4 mt-3 sm:mt-0">
                               <div className="text-xs text-slate-500 hidden sm:block" title={visit.prescription.map(p => p.medicine).join(', ')}>
                                  <i className="fas fa-pills mr-1 text-slate-400"></i> 
                                  {visit.prescription.length > 0 ? (
                                     <span className="truncate max-w-[150px] inline-block align-bottom">
                                        {visit.prescription[0].medicine} {visit.prescription.length > 1 && `+ ${visit.prescription.length - 1} more`}
                                     </span>
                                  ) : 'No Meds'}
                               </div>
                               <span className="px-3 py-1 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-full shadow-sm">
                                  {visit.diagnosis}
                               </span>
                               <i className={`fas fa-chevron-down text-slate-400 transition-transform duration-300 ${expandedVisitId === visit.id ? 'rotate-180' : ''}`}></i>
                            </div>
                         </div>

                         {expandedVisitId === visit.id && (
                            <div className="p-6 border-t border-slate-100 bg-white animate-fade-in">
                               <div className="mb-6">
                                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Clinical Notes</h4>
                                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    {visit.notes}
                                  </p>
                               </div>
                               <div>
                                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider">Prescription</h4>
                                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                     <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                           <tr>
                                              <th className="p-3">Medicine</th>
                                              <th className="p-3">Dosage</th>
                                              <th className="p-3">Duration</th>
                                              <th className="p-3">Instruction</th>
                                           </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                           {visit.prescription.map((item, i) => (
                                              <tr key={i}>
                                                 <td className="p-3 font-medium text-slate-800">{item.medicine}</td>
                                                 <td className="p-3 font-mono text-xs text-slate-600">{item.dosage}</td>
                                                 <td className="p-3 text-slate-600">{item.duration}</td>
                                                 <td className="p-3 text-slate-500 italic">{item.instruction}</td>
                                              </tr>
                                           ))}
                                        </tbody>
                                     </table>
                                  </div>
                               </div>
                               <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                                  <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition">
                                     <i className="fas fa-file-download"></i> Download Report
                                  </button>
                                  <button 
                                     onClick={(e) => {
                                        e.stopPropagation();
                                        setChatInput(`Can you explain my prescription for ${visit.diagnosis} from ${visit.date}?`);
                                        setActiveTab('chat');
                                     }}
                                     className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-purple-600 border border-purple-200 bg-purple-50 rounded-lg hover:bg-purple-100 transition"
                                  >
                                     <i className="fas fa-magic"></i> Explain with AI
                                  </button>
                               </div>
                            </div>
                         )}
                      </div>
                   ))}
                </div>
             </div>
          )}

          {activeTab === 'chat' && (
             <div className="max-w-3xl mx-auto h-[calc(100vh-100px)] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-100 bg-teal-50 rounded-t-xl flex items-center justify-between">
                   <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-teal-200 flex items-center justify-center text-teal-800 mr-3">
                         <i className="fas fa-robot"></i>
                      </div>
                      <div>
                         <h3 className="font-bold text-slate-800">Personal Health Intelligence</h3>
                         <p className="text-xs text-slate-500">Analyzes your history & trends</p>
                      </div>
                   </div>
                   <button 
                     onClick={() => setMessages([{ role: 'model', text: 'Hello! I am your personal health intelligence. I have analyzed your records. How can I assist you today?', timestamp: Date.now() }])}
                     className="text-xs text-slate-400 hover:text-red-500"
                   >
                     Reset
                   </button>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
                   {messages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                         <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                            msg.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'
                         }`}>
                            {msg.text}
                         </div>
                      </div>
                   ))}
                   {isTyping && (
                      <div className="flex justify-start">
                         <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none text-slate-500 text-xs flex items-center gap-2">
                            <i className="fas fa-circle-notch fa-spin"></i> Analyzing medical data...
                         </div>
                      </div>
                   )}
                   <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-slate-100">
                   <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Ask about your trends, symptoms, or prescription..."
                        className="flex-1 border border-slate-300 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                      />
                      <button 
                        onClick={handleSendMessage}
                        disabled={isTyping}
                        className="h-10 w-10 bg-primary rounded-full text-white hover:bg-secondary transition disabled:opacity-50"
                      >
                         <i className="fas fa-paper-plane"></i>
                      </button>
                   </div>
                </div>
             </div>
          )}
       </div>
    </div>
  );
};
