import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import appointmentService from '../services/appointmentService';

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
  currentSerial?: number;
  estimatedTime?: string;
  delayMinutes?: number;
  doctorMessage?: string;
}

/**
 * NOTE: Using appointmentService which handles both Supabase and localStorage fallback
 * No need for direct localStorage access
 */

// ============ MAIN COMPONENT ============
export const MyAppointments: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [loading, setLoading] = useState(true);

  // Load appointments from appointmentService (Supabase or localStorage fallback)
  useEffect(() => {
    const loadAppointments = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // appointmentService.getPatientAppointments expects a string patientId
        const data = await appointmentService.getPatientAppointments(user.id.toString());

        // Map to component's expected format
        const mappedAppointments = data.map(apt => ({
          id: apt.id,
          doctorId: apt.doctorId,
          doctorName: apt.doctor?.name || '',
          doctorNameBn: apt.doctor?.name || '', // TODO: Add Bengali name in backend
          doctorImage: apt.doctor?.profileImage || '/default-doctor.png',
          specialty: apt.doctor?.specialties?.[0] || '',
          specialtyBn: apt.doctor?.specialties?.[0] || '', // TODO: Add Bengali specialty
          chamberName: apt.chamber?.name || '',
          chamberAddress: apt.chamber?.address || '',
          date: apt.appointmentDate,
          time: apt.appointmentTime,
          serialNumber: apt.serialNumber,
          status: apt.status === 'booked' ? 'upcoming' :
                  apt.status === 'in_queue' ? 'in-queue' :
                  apt.status === 'in_progress' ? 'in-progress' :
                  apt.status === 'completed' ? 'completed' :
                  apt.status === 'cancelled' ? 'cancelled' : 'upcoming',
          visitType: apt.visitType === 'new' ? 'new' : apt.visitType === 'follow_up' ? 'follow-up' : 'report',
          fee: apt.fee,
          isPaid: apt.isPaid,
        }));

        setAppointments(mappedAppointments);
      } catch (error) {
        console.error('Failed to load appointments:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, [user?.id]);

  // Translations
  const t = {
    title: isBn ? 'আমার অ্যাপয়েন্টমেন্ট' : 'My Appointments',
    upcoming: isBn ? 'আসন্ন' : 'Upcoming',
    past: isBn ? 'পূর্ববর্তী' : 'Past',
    noUpcoming: isBn ? 'কোনো আসন্ন অ্যাপয়েন্টমেন্ট নেই' : 'No upcoming appointments',
    noPast: isBn ? 'কোনো পূর্ববর্তী অ্যাপয়েন্টমেন্ট নেই' : 'No past appointments',
    findDoctor: isBn ? 'ডাক্তার খুঁজুন' : 'Find Doctor',
    cancel: isBn ? 'বাতিল করুন' : 'Cancel',
    viewDetails: isBn ? 'বিস্তারিত' : 'Details',
    serial: isBn ? 'সিরিয়াল' : 'Serial',
    paid: isBn ? 'পেইড' : 'Paid',
    unpaid: isBn ? 'বাকি' : 'Unpaid',
    completed: isBn ? 'সম্পন্ন' : 'Completed',
    cancelled: isBn ? 'বাতিল' : 'Cancelled',
    noShow: isBn ? 'উপস্থিত হননি' : 'No Show',
    bookAgain: isBn ? 'আবার বুক করুন' : 'Book Again',
    viewPrescription: isBn ? 'প্রেসক্রিপশন দেখুন' : 'View Prescription',
    cancelTitle: isBn ? 'অ্যাপয়েন্টমেন্ট বাতিল' : 'Cancel Appointment',
    cancelConfirm: isBn ? 'আপনি কি নিশ্চিত?' : 'Are you sure?',
    cancelReason: isBn ? 'বাতিলের কারণ (ঐচ্ছিক)' : 'Reason (optional)',
    confirmCancel: isBn ? 'বাতিল নিশ্চিত করুন' : 'Confirm Cancel',
    keepAppointment: isBn ? 'রাখুন' : 'Keep',
    noAppointmentsYet: isBn ? 'আপনার এখনো কোনো অ্যাপয়েন্টমেন্ট নেই' : 'You don\'t have any appointments yet',
    bookFirstAppointment: isBn ? 'প্রথম অ্যাপয়েন্টমেন্ট নিন' : 'Book Your First Appointment',
    startHealthJourney: isBn ? 'আজই আপনার স্বাস্থ্য যাত্রা শুরু করুন' : 'Start your health journey today',
  };

  const upcomingAppointments = appointments.filter(a => ['upcoming', 'in-queue', 'in-progress'].includes(a.status));
  const pastAppointments = appointments.filter(a => ['completed', 'cancelled', 'no-show'].includes(a.status));

  const handleCancel = async (id: string) => {
    try {
      // Cancel via appointmentService
      const result = await appointmentService.cancelAppointment(
        id,
        user?.id.toString() || 'patient',
        cancelReason || 'Cancelled by patient'
      );

      if (result.success) {
        // Update local state
        const updatedAppointments = appointments.map(a =>
          a.id === id ? { ...a, status: 'cancelled' as const } : a
        );
        setAppointments(updatedAppointments);
        setShowCancelModal(null);
        setCancelReason('');
      } else {
        alert(isBn ? 'বাতিল করতে ব্যর্থ' : 'Failed to cancel');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      alert(isBn ? 'বাতিল করতে ব্যর্থ' : 'Failed to cancel');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateStr === today.toISOString().split('T')[0]) return isBn ? 'আজ' : 'Today';
    if (dateStr === tomorrow.toISOString().split('T')[0]) return isBn ? 'আগামীকাল' : 'Tomorrow';
    return date.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">{isBn ? 'লোড হচ্ছে...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader showNav={true} />
        <div className="max-w-7xl mx-auto px-6 py-24 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-lock text-3xl text-slate-400"></i>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{isBn ? 'লগইন করুন' : 'Please Login'}</h2>
          <p className="text-slate-500 mb-6">{isBn ? 'অ্যাপয়েন্টমেন্ট দেখতে লগইন করুন' : 'Login to view your appointments'}</p>
          <button onClick={() => navigate('/patient-auth')} className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg">
            {isBn ? 'লগইন / রেজিস্টার' : 'Login / Register'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader showNav={true} />
      
      <div className="bg-white border-b border-slate-100 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/patient-dashboard')} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition">
              <i className="fas fa-arrow-left text-slate-600"></i>
            </button>
            <h1 className="text-xl font-black text-slate-800">{t.title}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {appointments.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-calendar-plus text-4xl text-blue-500"></i>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{t.noAppointmentsYet}</h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">{t.startHealthJourney}</p>
            <button onClick={() => navigate('/search')} className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all flex items-center gap-2 mx-auto">
              <i className="fas fa-search"></i>
              {t.bookFirstAppointment}
            </button>
          </div>
        ) : (
          <>
            <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-100">
              {(['upcoming', 'past'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${activeTab === tab ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25' : 'text-slate-600 hover:bg-slate-50'}`}>
                  {tab === 'upcoming' ? t.upcoming : t.past}
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab ? 'bg-white/20' : 'bg-slate-100'}`}>
                    {tab === 'upcoming' ? upcomingAppointments.length : pastAppointments.length}
                  </span>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {activeTab === 'upcoming' ? (
                upcomingAppointments.length > 0 ? (
                  upcomingAppointments.map((apt) => (
                    <div key={apt.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                      <div className="flex items-start gap-3">
                        <img src={apt.doctorImage} alt="" className="w-14 h-14 rounded-xl" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-800">{isBn ? apt.doctorNameBn : apt.doctorName}</h3>
                          <p className="text-sm text-slate-500">{isBn ? apt.specialtyBn : apt.specialty}</p>
                          <p className="text-xs text-slate-400 mt-1">{apt.chamberName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">{formatDate(apt.date)}</p>
                          <p className="text-sm text-slate-500">{apt.time}</p>
                          <p className="text-xs text-slate-400 mt-1">{t.serial} #{apt.serialNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${apt.isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          ৳{apt.fee} • {apt.isPaid ? t.paid : t.unpaid}
                        </span>
                        <div className="flex gap-2">
                          <button onClick={() => setShowCancelModal(apt.id)} className="px-3 py-1.5 text-red-600 text-sm font-medium hover:bg-red-50 rounded-lg transition">{t.cancel}</button>
                          <button className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-bold rounded-lg">{t.viewDetails}</button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-slate-100">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-calendar-alt text-2xl text-slate-400"></i>
                    </div>
                    <p className="text-slate-500 mb-4">{t.noUpcoming}</p>
                    <button onClick={() => navigate('/search')} className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium">{t.findDoctor}</button>
                  </div>
                )
              ) : (
                pastAppointments.length > 0 ? (
                  pastAppointments.map((apt) => (
                    <div key={apt.id} className={`bg-white rounded-xl p-4 shadow-sm border border-slate-100 ${apt.status === 'cancelled' ? 'opacity-60' : ''}`}>
                      <div className="flex items-start gap-3">
                        <img src={apt.doctorImage} alt="" className="w-12 h-12 rounded-xl" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-800">{isBn ? apt.doctorNameBn : apt.doctorName}</h3>
                          <p className="text-sm text-slate-500">{isBn ? apt.specialtyBn : apt.specialty}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-600">{formatDate(apt.date)}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${apt.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {apt.status === 'completed' ? t.completed : t.cancelled}
                          </span>
                        </div>
                      </div>
                      {apt.status === 'completed' && (
                        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                          <button onClick={() => navigate(`/doctors/${apt.doctorId}`)} className="flex-1 py-2 border border-blue-500 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50">{t.bookAgain}</button>
                          <button className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg text-sm font-medium">{t.viewPrescription}</button>
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

            <button onClick={() => navigate('/search')} className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
              <i className="fas fa-plus"></i> {isBn ? 'নতুন অ্যাপয়েন্টমেন্ট নিন' : 'Book New Appointment'}
            </button>
          </>
        )}
      </div>

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
              <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none" rows={3} placeholder={isBn ? 'কেন বাতিল করছেন...' : 'Why are you cancelling...'} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(null)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50">{t.keepAppointment}</button>
              <button onClick={() => handleCancel(showCancelModal)} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600">{t.confirmCancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAppointments;
