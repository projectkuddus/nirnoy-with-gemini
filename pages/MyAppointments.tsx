import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

// ============ TYPES ============
interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorNameBn: string;
  doctorImage: string;
  specialty: string;
  specialtyBn: string;
  chamberName: string;
  chamberAddress: string;
  date: string;
  time: string;
  serialNumber: number;
  status: 'upcoming' | 'in-queue' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  visitType: 'new' | 'follow-up' | 'report';
  fee: number;
  isPaid: boolean;
  // Live queue data
  currentSerial?: number;
  estimatedTime?: string;
  delayMinutes?: number;
  doctorMessage?: string;
}

// ============ MOCK DATA ============
const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt1',
    doctorId: 'd1',
    doctorName: 'Dr. Abul Kashem',
    doctorNameBn: 'ডা. আবুল কাশেম',
    doctorImage: 'https://randomuser.me/api/portraits/men/85.jpg',
    specialty: 'Cardiology',
    specialtyBn: 'হৃদরোগ বিশেষজ্ঞ',
    chamberName: 'Square Hospital',
    chamberAddress: 'Panthapath, Dhaka',
    date: new Date().toISOString().split('T')[0], // Today
    time: '10:30 AM',
    serialNumber: 8,
    status: 'in-queue',
    visitType: 'follow-up',
    fee: 1200,
    isPaid: true,
    currentSerial: 5,
    estimatedTime: '11:15 AM',
    delayMinutes: 15,
    doctorMessage: 'সামান্য দেরি হচ্ছে, অপেক্ষা করুন',
  },
  {
    id: 'apt2',
    doctorId: 'd2',
    doctorName: 'Dr. Sarah Rahman',
    doctorNameBn: 'ডা. সারা রহমান',
    doctorImage: 'https://randomuser.me/api/portraits/women/65.jpg',
    specialty: 'Dermatology',
    specialtyBn: 'চর্মরোগ বিশেষজ্ঞ',
    chamberName: 'United Hospital',
    chamberAddress: 'Gulshan-2, Dhaka',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days later
    time: '5:00 PM',
    serialNumber: 3,
    status: 'upcoming',
    visitType: 'new',
    fee: 1500,
    isPaid: false,
  },
  {
    id: 'apt3',
    doctorId: 'd3',
    doctorName: 'Dr. Mohammad Ali',
    doctorNameBn: 'ডা. মোহাম্মদ আলী',
    doctorImage: 'https://randomuser.me/api/portraits/men/45.jpg',
    specialty: 'General Medicine',
    specialtyBn: 'মেডিসিন বিশেষজ্ঞ',
    chamberName: 'Labaid Hospital',
    chamberAddress: 'Dhanmondi, Dhaka',
    date: '2024-11-20',
    time: '11:00 AM',
    serialNumber: 5,
    status: 'completed',
    visitType: 'follow-up',
    fee: 800,
    isPaid: true,
  },
  {
    id: 'apt4',
    doctorId: 'd1',
    doctorName: 'Dr. Abul Kashem',
    doctorNameBn: 'ডা. আবুল কাশেম',
    doctorImage: 'https://randomuser.me/api/portraits/men/85.jpg',
    specialty: 'Cardiology',
    specialtyBn: 'হৃদরোগ বিশেষজ্ঞ',
    chamberName: 'Square Hospital',
    chamberAddress: 'Panthapath, Dhaka',
    date: '2024-09-15',
    time: '10:00 AM',
    serialNumber: 12,
    status: 'completed',
    visitType: 'new',
    fee: 1200,
    isPaid: true,
  },
];

// ============ LIVE QUEUE CARD ============
const LiveQueueCard: React.FC<{ appointment: Appointment; isBn: boolean }> = ({ appointment, isBn }) => {
  const [currentSerial, setCurrentSerial] = useState(appointment.currentSerial || 1);
  const [pulseAnimation, setPulseAnimation] = useState(false);

  // Simulate live updates
  useEffect(() => {
    if (appointment.status !== 'in-queue') return;
    
    const interval = setInterval(() => {
      setCurrentSerial(prev => {
        if (prev < appointment.serialNumber - 1) {
          setPulseAnimation(true);
          setTimeout(() => setPulseAnimation(false), 1000);
          return prev + 1;
        }
        return prev;
      });
    }, 30000); // Update every 30 seconds for demo

    return () => clearInterval(interval);
  }, [appointment]);

  const patientsAhead = Math.max(0, appointment.serialNumber - currentSerial - 1);
  const isYourTurn = currentSerial === appointment.serialNumber - 1;
  const isNow = currentSerial === appointment.serialNumber;

  return (
    <div className={`bg-gradient-to-br ${isNow ? 'from-green-500 to-emerald-600' : isYourTurn ? 'from-amber-500 to-orange-600' : 'from-teal-500 to-emerald-600'} rounded-2xl p-5 text-white shadow-xl relative overflow-hidden`}>
      {/* Background Animation */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src={appointment.doctorImage} alt="" className="w-12 h-12 rounded-xl border-2 border-white/30" />
            <div>
              <h3 className="font-bold">{isBn ? appointment.doctorNameBn : appointment.doctorName}</h3>
              <p className="text-sm text-white/80">{appointment.chamberName}</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${isNow ? 'bg-white text-green-600' : isYourTurn ? 'bg-white text-amber-600' : 'bg-white/20'}`}>
            {isNow ? (isBn ? '🔔 আপনার পালা!' : '🔔 Your Turn!') : isYourTurn ? (isBn ? '⏳ পরের পালা' : '⏳ Next') : (isBn ? '🎫 কিউতে আছেন' : '🎫 In Queue')}
          </div>
        </div>

        {/* Live Queue Status */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-white/70 mb-1">{isBn ? 'আপনার সিরিয়াল' : 'Your Serial'}</p>
              <p className="text-3xl font-bold">{appointment.serialNumber}</p>
            </div>
            <div className="border-x border-white/20">
              <p className="text-xs text-white/70 mb-1">{isBn ? 'বর্তমান সিরিয়াল' : 'Current'}</p>
              <p className={`text-3xl font-bold ${pulseAnimation ? 'animate-pulse' : ''}`}>{currentSerial}</p>
            </div>
            <div>
              <p className="text-xs text-white/70 mb-1">{isBn ? 'আগে আছেন' : 'Ahead'}</p>
              <p className="text-3xl font-bold">{patientsAhead}</p>
            </div>
          </div>
        </div>

        {/* Estimated Time */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <i className="fas fa-clock text-white/80"></i>
            <span className="text-sm">{isBn ? 'আনুমানিক সময়:' : 'Est. Time:'}</span>
            <span className="font-bold">{appointment.estimatedTime}</span>
          </div>
          {appointment.delayMinutes && appointment.delayMinutes > 0 && (
            <span className="px-2 py-1 bg-amber-500/30 rounded-full text-xs">
              +{appointment.delayMinutes} {isBn ? 'মিনিট দেরি' : 'min delay'}
            </span>
          )}
        </div>

        {/* Doctor Message */}
        {appointment.doctorMessage && (
          <div className="bg-white/10 rounded-xl p-3 flex items-start gap-2">
            <i className="fas fa-bullhorn text-amber-300 mt-0.5"></i>
            <div>
              <p className="text-xs text-white/70 mb-0.5">{isBn ? 'ডাক্তারের বার্তা:' : 'Doctor\'s Message:'}</p>
              <p className="text-sm font-medium">{appointment.doctorMessage}</p>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(100, (currentSerial / appointment.serialNumber) * 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ MAIN COMPONENT ============
export const MyAppointments: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [appointments, setAppointments] = useState(MOCK_APPOINTMENTS);
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [notificationSettings, setNotificationSettings] = useState({
    sms: true,
    email: false,
    push: true,
  });
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Translations
  const t = {
    title: isBn ? 'আমার অ্যাপয়েন্টমেন্ট' : 'My Appointments',
    upcoming: isBn ? 'আসন্ন' : 'Upcoming',
    past: isBn ? 'পূর্ববর্তী' : 'Past',
    noUpcoming: isBn ? 'কোনো আসন্ন অ্যাপয়েন্টমেন্ট নেই' : 'No upcoming appointments',
    noPast: isBn ? 'কোনো পূর্ববর্তী অ্যাপয়েন্টমেন্ট নেই' : 'No past appointments',
    findDoctor: isBn ? 'ডাক্তার খুঁজুন' : 'Find Doctor',
    cancel: isBn ? 'বাতিল করুন' : 'Cancel',
    reschedule: isBn ? 'পুনঃনির্ধারণ' : 'Reschedule',
    viewDetails: isBn ? 'বিস্তারিত' : 'Details',
    serial: isBn ? 'সিরিয়াল' : 'Serial',
    fee: isBn ? 'ফি' : 'Fee',
    paid: isBn ? 'পেইড' : 'Paid',
    unpaid: isBn ? 'বাকি' : 'Unpaid',
    payNow: isBn ? 'পে করুন' : 'Pay Now',
    completed: isBn ? 'সম্পন্ন' : 'Completed',
    cancelled: isBn ? 'বাতিল' : 'Cancelled',
    noShow: isBn ? 'উপস্থিত হননি' : 'No Show',
    inQueue: isBn ? 'কিউতে আছেন' : 'In Queue',
    bookAgain: isBn ? 'আবার বুক করুন' : 'Book Again',
    viewPrescription: isBn ? 'প্রেসক্রিপশন দেখুন' : 'View Prescription',
    liveTracking: isBn ? 'লাইভ ট্র্যাকিং' : 'Live Tracking',
    notifications: isBn ? 'নোটিফিকেশন' : 'Notifications',
    cancelTitle: isBn ? 'অ্যাপয়েন্টমেন্ট বাতিল' : 'Cancel Appointment',
    cancelConfirm: isBn ? 'আপনি কি নিশ্চিত?' : 'Are you sure?',
    cancelReason: isBn ? 'বাতিলের কারণ (ঐচ্ছিক)' : 'Reason (optional)',
    confirmCancel: isBn ? 'বাতিল নিশ্চিত করুন' : 'Confirm Cancel',
    keepAppointment: isBn ? 'রাখুন' : 'Keep',
    notifTitle: isBn ? 'নোটিফিকেশন সেটিংস' : 'Notification Settings',
    smsNotif: isBn ? 'SMS নোটিফিকেশন' : 'SMS Notifications',
    emailNotif: isBn ? 'ইমেইল নোটিফিকেশন' : 'Email Notifications',
    pushNotif: isBn ? 'পুশ নোটিফিকেশন' : 'Push Notifications',
    save: isBn ? 'সংরক্ষণ করুন' : 'Save',
  };

  const upcomingAppointments = appointments.filter(a => ['upcoming', 'in-queue', 'in-progress'].includes(a.status));
  const pastAppointments = appointments.filter(a => ['completed', 'cancelled', 'no-show'].includes(a.status));
  const liveQueueAppointment = appointments.find(a => a.status === 'in-queue');

  const handleCancel = (id: string) => {
    setAppointments(prev => prev.map(a => 
      a.id === id ? { ...a, status: 'cancelled' as const } : a
    ));
    setShowCancelModal(null);
    setCancelReason('');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateStr === today.toISOString().split('T')[0]) {
      return isBn ? 'আজ' : 'Today';
    }
    if (dateStr === tomorrow.toISOString().split('T')[0]) {
      return isBn ? 'আগামীকাল' : 'Tomorrow';
    }
    return date.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/my-health')} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition">
                <i className="fas fa-arrow-left text-slate-600"></i>
              </button>
              <h1 className="text-lg font-bold text-slate-800">{t.title}</h1>
            </div>
            <button onClick={() => setShowNotificationModal(true)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition relative">
              <i className="fas fa-bell text-slate-600"></i>
              {notificationSettings.sms || notificationSettings.push ? (
                <span className="absolute top-2 right-2 w-2 h-2 bg-teal-500 rounded-full"></span>
              ) : null}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Live Queue Alert */}
        {liveQueueAppointment && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="text-sm font-bold text-red-600">{t.liveTracking}</span>
            </div>
            <LiveQueueCard appointment={liveQueueAppointment} isBn={isBn} />
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-100">
          {(['upcoming', 'past'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === tab ? 'bg-teal-500 text-white shadow' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab === 'upcoming' ? t.upcoming : t.past}
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab ? 'bg-white/20' : 'bg-slate-100'}`}>
                {tab === 'upcoming' ? upcomingAppointments.length : pastAppointments.length}
              </span>
            </button>
          ))}
        </div>

        {/* Appointments List */}
        <div className="space-y-3">
          {activeTab === 'upcoming' ? (
            upcomingAppointments.length > 0 ? (
              upcomingAppointments.filter(a => a.status !== 'in-queue').map((apt) => (
                <div key={apt.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="flex items-start gap-3">
                    <img src={apt.doctorImage} alt="" className="w-14 h-14 rounded-xl" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800">{isBn ? apt.doctorNameBn : apt.doctorName}</h3>
                      <p className="text-sm text-slate-500">{isBn ? apt.specialtyBn : apt.specialty}</p>
                      <p className="text-xs text-slate-400 mt-1">{apt.chamberName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-teal-600">{formatDate(apt.date)}</p>
                      <p className="text-sm text-slate-500">{apt.time}</p>
                      <p className="text-xs text-slate-400 mt-1">{t.serial} #{apt.serialNumber}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        apt.visitType === 'new' ? 'bg-blue-100 text-blue-700' :
                        apt.visitType === 'follow-up' ? 'bg-purple-100 text-purple-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {apt.visitType === 'new' ? (isBn ? 'নতুন' : 'New') : 
                         apt.visitType === 'follow-up' ? (isBn ? 'ফলো-আপ' : 'Follow-up') : 
                         (isBn ? 'রিপোর্ট' : 'Report')}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${apt.isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        ৳{apt.fee} • {apt.isPaid ? t.paid : t.unpaid}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowCancelModal(apt.id)} className="px-3 py-1.5 text-red-600 text-sm font-medium hover:bg-red-50 rounded-lg transition">
                        {t.cancel}
                      </button>
                      <button className="px-3 py-1.5 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition">
                        {t.viewDetails}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : !liveQueueAppointment ? (
              <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-slate-100">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-calendar-alt text-2xl text-slate-400"></i>
                </div>
                <p className="text-slate-500 mb-4">{t.noUpcoming}</p>
                <button onClick={() => navigate('/search')} className="px-6 py-2.5 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition">
                  {t.findDoctor}
                </button>
              </div>
            ) : null
          ) : (
            pastAppointments.length > 0 ? (
              pastAppointments.map((apt) => (
                <div key={apt.id} className={`bg-white rounded-xl p-4 shadow-sm border border-slate-100 ${apt.status === 'cancelled' || apt.status === 'no-show' ? 'opacity-60' : ''}`}>
                  <div className="flex items-start gap-3">
                    <img src={apt.doctorImage} alt="" className="w-12 h-12 rounded-xl" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800">{isBn ? apt.doctorNameBn : apt.doctorName}</h3>
                      <p className="text-sm text-slate-500">{isBn ? apt.specialtyBn : apt.specialty}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-600">{formatDate(apt.date)}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                        apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {apt.status === 'completed' ? t.completed : apt.status === 'cancelled' ? t.cancelled : t.noShow}
                      </span>
                    </div>
                  </div>

                  {apt.status === 'completed' && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                      <button onClick={() => navigate(`/doctors/${apt.doctorId}`)} className="flex-1 py-2 border border-teal-500 text-teal-600 rounded-lg text-sm font-medium hover:bg-teal-50 transition">
                        {t.bookAgain}
                      </button>
                      <button className="flex-1 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition">
                        {t.viewPrescription}
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-slate-100">
                <p className="text-slate-500">{t.noPast}</p>
              </div>
            )
          )}
        </div>

        {/* Find Doctor CTA */}
        <button
          onClick={() => navigate('/search')}
          className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
        >
          <i className="fas fa-plus"></i> {isBn ? 'নতুন অ্যাপয়েন্টমেন্ট নিন' : 'Book New Appointment'}
        </button>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-times text-red-500 text-xl"></i>
              </div>
              <h3 className="text-lg font-bold text-slate-800">{t.cancelTitle}</h3>
              <p className="text-sm text-slate-500 mt-1">{t.cancelConfirm}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.cancelReason}</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none"
                rows={3}
                placeholder={isBn ? 'কেন বাতিল করছেন...' : 'Why are you cancelling...'}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(null)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition">
                {t.keepAppointment}
              </button>
              <button onClick={() => handleCancel(showCancelModal)} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition">
                {t.confirmCancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Settings Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">{t.notifTitle}</h3>
              <button onClick={() => setShowNotificationModal(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="space-y-4">
              {[
                { key: 'sms', label: t.smsNotif, icon: 'fa-sms', desc: isBn ? 'অ্যাপয়েন্টমেন্ট রিমাইন্ডার ও আপডেট' : 'Appointment reminders & updates' },
                { key: 'email', label: t.emailNotif, icon: 'fa-envelope', desc: isBn ? 'ইমেইলে নোটিফিকেশন পান' : 'Get notifications via email' },
                { key: 'push', label: t.pushNotif, icon: 'fa-bell', desc: isBn ? 'লাইভ কিউ আপডেট ও অ্যালার্ট' : 'Live queue updates & alerts' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <i className={`fas ${item.icon} text-teal-500`}></i>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotificationSettings(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                    className={`w-12 h-6 rounded-full transition relative ${notificationSettings[item.key as keyof typeof notificationSettings] ? 'bg-teal-500' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${notificationSettings[item.key as keyof typeof notificationSettings] ? 'right-1' : 'left-1'}`}></span>
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowNotificationModal(false)}
              className="w-full mt-6 py-3 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition"
            >
              {t.save}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAppointments;

