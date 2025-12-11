import React, { useState, useMemo, useCallback } from 'react';

// ============ TYPES ============
export interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorNameBn?: string;
  doctorSpecialty: string;
  doctorImage?: string;
  chamberName: string;
  chamberAddress: string;
  chamberPhone?: string;
  date: string;
  time: string;
  serialNumber: number;
  visitType: 'new' | 'follow_up' | 'report' | 'emergency';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  fee: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  symptoms?: string;
  notes?: string;
  
  // Family booking
  isFamilyBooking?: boolean;
  familyMemberName?: string;
  familyMemberRelation?: string;
  
  // Queue info
  estimatedWaitTime?: number;
  currentPosition?: number;
  
  // Follow-up
  followUpDate?: string;
  prescriptionId?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt?: string;
}

interface AppointmentManagerProps {
  appointments: Appointment[];
  onCancelAppointment?: (appointmentId: string) => Promise<void>;
  onRescheduleAppointment?: (appointmentId: string, newDate: string, newTime: string) => Promise<void>;
  onRebookAppointment?: (appointment: Appointment) => void;
  onViewDetails?: (appointment: Appointment) => void;
  onGiveFeedback?: (appointmentId: string) => void;
}

// ============ CONSTANTS ============
const VISIT_TYPE_LABELS: Record<string, { label: string; labelBn: string; color: string }> = {
  new: { label: 'New Visit', labelBn: 'নতুন', color: 'bg-blue-100 text-blue-700' },
  follow_up: { label: 'Follow-up', labelBn: 'ফলো-আপ', color: 'bg-green-100 text-green-700' },
  report: { label: 'Report', labelBn: 'রিপোর্ট', color: 'bg-purple-100 text-purple-700' },
  emergency: { label: 'Emergency', labelBn: 'জরুরি', color: 'bg-red-100 text-red-700' },
};

const STATUS_LABELS: Record<string, { label: string; labelBn: string; color: string; icon: string }> = {
  pending: { label: 'Pending', labelBn: 'অপেক্ষমান', color: 'bg-amber-100 text-amber-700', icon: '⏳' },
  confirmed: { label: 'Confirmed', labelBn: 'নিশ্চিত', color: 'bg-green-100 text-green-700', icon: '✅' },
  completed: { label: 'Completed', labelBn: 'সম্পন্ন', color: 'bg-blue-100 text-blue-700', icon: '✓' },
  cancelled: { label: 'Cancelled', labelBn: 'বাতিল', color: 'bg-red-100 text-red-700', icon: '✗' },
  no_show: { label: 'No Show', labelBn: 'অনুপস্থিত', color: 'bg-slate-100 text-slate-700', icon: '⊘' },
};

// ============ APPOINTMENT MANAGER COMPONENT ============
export const AppointmentManager: React.FC<AppointmentManagerProps> = ({
  appointments,
  onCancelAppointment,
  onRescheduleAppointment,
  onRebookAppointment,
  onViewDetails,
  onGiveFeedback,
}) => {
  // State
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Categorize appointments
  const categorizedAppointments = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const upcoming: Appointment[] = [];
    const past: Appointment[] = [];
    const cancelled: Appointment[] = [];

    appointments.forEach(apt => {
      if (apt.status === 'cancelled') {
        cancelled.push(apt);
      } else if (apt.status === 'completed' || apt.date < today) {
        past.push(apt);
      } else {
        upcoming.push(apt);
      }
    });

    // Sort upcoming by date/time (nearest first)
    upcoming.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });

    // Sort past by date (most recent first)
    past.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateB.getTime() - dateA.getTime();
    });

    return { upcoming, past, cancelled };
  }, [appointments]);

  // Get active appointments
  const activeAppointments = useMemo(() => {
    switch (activeTab) {
      case 'upcoming': return categorizedAppointments.upcoming;
      case 'past': return categorizedAppointments.past;
      case 'cancelled': return categorizedAppointments.cancelled;
      default: return [];
    }
  }, [activeTab, categorizedAppointments]);

  // Stats
  const stats = useMemo(() => ({
    upcoming: categorizedAppointments.upcoming.length,
    past: categorizedAppointments.past.length,
    cancelled: categorizedAppointments.cancelled.length,
    totalSpent: categorizedAppointments.past.reduce((sum, apt) => sum + (apt.paymentStatus === 'paid' ? apt.fee : 0), 0),
  }), [categorizedAppointments]);

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('bn-BD', options);
  };

  // Format relative date
  const getRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'আজ';
    if (diffDays === 1) return 'আগামীকাল';
    if (diffDays === -1) return 'গতকাল';
    if (diffDays > 1 && diffDays <= 7) return `${diffDays} দিন পরে`;
    if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} দিন আগে`;
    return formatDate(dateStr);
  };

  // Check if appointment is today
  const isToday = (dateStr: string) => {
    return dateStr === new Date().toISOString().split('T')[0];
  };

  // Handle cancel
  const handleCancel = useCallback(async () => {
    if (!selectedAppointment || !onCancelAppointment) return;
    
    setIsProcessing(true);
    try {
      await onCancelAppointment(selectedAppointment.id);
      setShowCancelModal(false);
      setSelectedAppointment(null);
      setCancelReason('');
    } catch (error) {
      console.error('Error cancelling:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedAppointment, onCancelAppointment]);

  // Handle reschedule
  const handleReschedule = useCallback(async () => {
    if (!selectedAppointment || !onRescheduleAppointment || !newDate || !newTime) return;
    
    setIsProcessing(true);
    try {
      await onRescheduleAppointment(selectedAppointment.id, newDate, newTime);
      setShowRescheduleModal(false);
      setSelectedAppointment(null);
      setNewDate('');
      setNewTime('');
    } catch (error) {
      console.error('Error rescheduling:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedAppointment, onRescheduleAppointment, newDate, newTime]);

  // Render appointment card
  const renderAppointmentCard = (apt: Appointment, isUpcoming: boolean) => {
    const visitType = VISIT_TYPE_LABELS[apt.visitType] || VISIT_TYPE_LABELS.new;
    const status = STATUS_LABELS[apt.status] || STATUS_LABELS.pending;

    return (
      <div 
        key={apt.id} 
        className={`glass-card p-4 hover:shadow-lg transition cursor-pointer ${
          isToday(apt.date) ? 'border-l-4 border-blue-500' : ''
        }`}
        onClick={() => {
          setSelectedAppointment(apt);
          setShowDetailsModal(true);
        }}
      >
        <div className="flex items-start gap-4">
          {/* Doctor Image */}
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
            {apt.doctorImage ? (
              <img src={apt.doctorImage} alt={apt.doctorName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">👨‍⚕️</div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-800">{apt.doctorNameBn || apt.doctorName}</h3>
                <p className="text-sm text-slate-500">{apt.doctorSpecialty}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                {status.icon} {status.labelBn}
              </span>
            </div>

            {/* Date & Time */}
            <div className="flex items-center gap-4 mt-2 text-sm">
              <div className={`flex items-center gap-1 ${isToday(apt.date) ? 'text-blue-600 font-medium' : 'text-slate-600'}`}>
                📅 {getRelativeDate(apt.date)}
              </div>
              <div className="flex items-center gap-1 text-slate-600">
                🕐 {apt.time}
              </div>
              <div className="flex items-center gap-1 text-slate-600">
                #️⃣ সিরিয়াল {apt.serialNumber}
              </div>
            </div>

            {/* Chamber */}
            <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
              <span>📍 {apt.chamberName}</span>
              <span className={`px-2 py-0.5 rounded text-xs ${visitType.color}`}>
                {visitType.labelBn}
              </span>
            </div>

            {/* Family booking indicator */}
            {apt.isFamilyBooking && (
              <div className="mt-2 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs inline-flex items-center gap-1">
                👨‍👩‍👧 {apt.familyMemberName} ({apt.familyMemberRelation})
              </div>
            )}

            {/* Queue position for upcoming */}
            {isUpcoming && apt.currentPosition && apt.estimatedWaitTime && (
              <div className="mt-3 p-2 bg-amber-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-amber-700">🎫 কিউতে অবস্থান: {apt.currentPosition}</span>
                  <span className="text-amber-600">⏱️ আনুমানিক অপেক্ষা: {apt.estimatedWaitTime} মিনিট</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col gap-2">
            {isUpcoming && apt.status !== 'cancelled' && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAppointment(apt);
                    setShowRescheduleModal(true);
                  }}
                  className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                >
                  📅 পুনঃনির্ধারণ
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAppointment(apt);
                    setShowCancelModal(true);
                  }}
                  className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                >
                  ✗ বাতিল
                </button>
              </>
            )}
            {!isUpcoming && apt.status === 'completed' && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onRebookAppointment) onRebookAppointment(apt);
                  }}
                  className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                >
                  🔄 পুনরায় বুক
                </button>
                {onGiveFeedback && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onGiveFeedback(apt.id);
                    }}
                    className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                  >
                    ⭐ মতামত
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{stats.upcoming}</div>
          <div className="text-sm text-slate-500">আসন্ন অ্যাপয়েন্টমেন্ট</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{stats.past}</div>
          <div className="text-sm text-slate-500">সম্পন্ন ভিজিট</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-red-600">{stats.cancelled}</div>
          <div className="text-sm text-slate-500">বাতিল</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-purple-600">৳{stats.totalSpent.toLocaleString('bn-BD')}</div>
          <div className="text-sm text-slate-500">মোট খরচ</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card p-2 flex gap-1">
        {[
          { id: 'upcoming', label: 'আসন্ন', icon: '📅', count: stats.upcoming },
          { id: 'past', label: 'পূর্ববর্তী', icon: '✓', count: stats.past },
          { id: 'cancelled', label: 'বাতিল', icon: '✗', count: stats.cancelled },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
              activeTab === tab.id
                ? 'bg-blue-500 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === tab.id ? 'bg-white/30' : 'bg-slate-200'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {activeAppointments.map(apt => renderAppointmentCard(apt, activeTab === 'upcoming'))}

        {activeAppointments.length === 0 && (
          <div className="glass-card p-12 text-center">
            <div className="text-6xl mb-4">
              {activeTab === 'upcoming' ? '📅' : activeTab === 'past' ? '📋' : '🚫'}
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              {activeTab === 'upcoming' ? 'কোনো আসন্ন অ্যাপয়েন্টমেন্ট নেই' :
               activeTab === 'past' ? 'কোনো পূর্ববর্তী ভিজিট নেই' :
               'কোনো বাতিল অ্যাপয়েন্টমেন্ট নেই'}
            </h3>
            {activeTab === 'upcoming' && (
              <button className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600">
                🔍 ডাক্তার খুঁজুন
              </button>
            )}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-strong rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">অ্যাপয়েন্টমেন্টের বিবরণ</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Doctor Info */}
              <div className="flex items-center gap-4 p-4 glass-subtle rounded-xl">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100">
                  {selectedAppointment.doctorImage ? (
                    <img src={selectedAppointment.doctorImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">👨‍⚕️</div>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">{selectedAppointment.doctorNameBn || selectedAppointment.doctorName}</h4>
                  <p className="text-slate-500">{selectedAppointment.doctorSpecialty}</p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 glass-subtle rounded-lg">
                  <div className="text-xs text-slate-500">তারিখ</div>
                  <div className="font-medium text-slate-800">{formatDate(selectedAppointment.date)}</div>
                </div>
                <div className="p-3 glass-subtle rounded-lg">
                  <div className="text-xs text-slate-500">সময়</div>
                  <div className="font-medium text-slate-800">{selectedAppointment.time}</div>
                </div>
                <div className="p-3 glass-subtle rounded-lg">
                  <div className="text-xs text-slate-500">সিরিয়াল</div>
                  <div className="font-medium text-slate-800">#{selectedAppointment.serialNumber}</div>
                </div>
                <div className="p-3 glass-subtle rounded-lg">
                  <div className="text-xs text-slate-500">ফি</div>
                  <div className="font-medium text-slate-800">৳{selectedAppointment.fee}</div>
                </div>
              </div>

              {/* Chamber */}
              <div className="p-4 glass-subtle rounded-xl">
                <div className="text-xs text-slate-500 mb-1">চেম্বার</div>
                <div className="font-medium text-slate-800">{selectedAppointment.chamberName}</div>
                <div className="text-sm text-slate-600">{selectedAppointment.chamberAddress}</div>
                {selectedAppointment.chamberPhone && (
                  <a href={`tel:${selectedAppointment.chamberPhone}`} className="text-sm text-blue-600 mt-1 inline-block">
                    📞 {selectedAppointment.chamberPhone}
                  </a>
                )}
              </div>

              {/* Symptoms */}
              {selectedAppointment.symptoms && (
                <div className="p-4 glass-subtle rounded-xl">
                  <div className="text-xs text-slate-500 mb-1">সমস্যা</div>
                  <div className="text-slate-700">{selectedAppointment.symptoms}</div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="flex-1 py-3 glass-subtle text-slate-600 rounded-xl font-medium"
              >
                বন্ধ করুন
              </button>
              {selectedAppointment.status !== 'cancelled' && selectedAppointment.status !== 'completed' && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowCancelModal(true);
                  }}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium"
                >
                  বাতিল করুন
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-strong rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">অ্যাপয়েন্টমেন্ট বাতিল করুন?</h3>
            <p className="text-slate-600 mb-4">
              আপনি কি নিশ্চিত {selectedAppointment.doctorName} এর সাথে {formatDate(selectedAppointment.date)} তারিখের অ্যাপয়েন্টমেন্ট বাতিল করতে চান?
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="বাতিলের কারণ (ঐচ্ছিক)"
              rows={2}
              className="w-full p-3 border border-slate-200 rounded-lg mb-4 resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
                className="flex-1 py-3 glass-subtle text-slate-600 rounded-xl font-medium"
              >
                না
              </button>
              <button
                onClick={handleCancel}
                disabled={isProcessing}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {isProcessing ? '⏳ বাতিল হচ্ছে...' : 'হ্যাঁ, বাতিল করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-strong rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">অ্যাপয়েন্টমেন্ট পুনঃনির্ধারণ</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">নতুন তারিখ</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-3 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">নতুন সময়</label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRescheduleModal(false);
                  setNewDate('');
                  setNewTime('');
                }}
                className="flex-1 py-3 glass-subtle text-slate-600 rounded-xl font-medium"
              >
                বাতিল
              </button>
              <button
                onClick={handleReschedule}
                disabled={isProcessing || !newDate || !newTime}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {isProcessing ? '⏳ পরিবর্তন হচ্ছে...' : 'নিশ্চিত করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentManager;

