import React, { useState, useMemo, useCallback } from 'react';

// ============ TYPES ============
export interface PrescribedMedicine {
  id: string;
  name: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  duration: string;
  instruction?: string;
  instructionBn?: string;
  remainingDays?: number;
  startDate?: string;
  endDate?: string;
  reminder?: boolean;
  reminderTimes?: string[];
}

export interface Prescription {
  id: string;
  appointmentId?: string;
  doctorId: string;
  doctorName: string;
  doctorNameBn?: string;
  doctorSpecialty: string;
  doctorImage?: string;
  chamberName?: string;
  date: string;
  diagnosis?: string;
  diagnosisBn?: string;
  medicines: PrescribedMedicine[];
  advice?: string[];
  followUpDate?: string;
  notes?: string;
  fileUrl?: string;
  isActive: boolean;
}

interface PrescriptionTrackerProps {
  prescriptions: Prescription[];
  onToggleReminder?: (prescriptionId: string, medicineId: string, enabled: boolean, times?: string[]) => Promise<void>;
  onMarkComplete?: (prescriptionId: string) => Promise<void>;
  onViewPDF?: (prescription: Prescription) => void;
  onReorderMedicine?: (medicine: PrescribedMedicine) => void;
}

// ============ PRESCRIPTION TRACKER COMPONENT ============
export const PrescriptionTracker: React.FC<PrescriptionTrackerProps> = ({
  prescriptions,
  onToggleReminder,
  onMarkComplete,
  onViewPDF,
  onReorderMedicine,
}) => {
  // State
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<PrescribedMedicine | null>(null);
  const [reminderTimes, setReminderTimes] = useState<string[]>(['08:00', '20:00']);

  // Filter prescriptions
  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter(p => activeTab === 'active' ? p.isActive : !p.isActive);
  }, [prescriptions, activeTab]);

  // All active medicines across all prescriptions
  const allActiveMedicines = useMemo(() => {
    const medicines: (PrescribedMedicine & { prescription: Prescription })[] = [];
    prescriptions.filter(p => p.isActive).forEach(p => {
      p.medicines.forEach(m => {
        medicines.push({ ...m, prescription: p });
      });
    });
    return medicines;
  }, [prescriptions]);

  // Medicines due today
  const medicinesToday = useMemo(() => {
    // Group by time of day based on frequency
    const morning: (PrescribedMedicine & { prescription: Prescription })[] = [];
    const afternoon: (PrescribedMedicine & { prescription: Prescription })[] = [];
    const evening: (PrescribedMedicine & { prescription: Prescription })[] = [];
    const night: (PrescribedMedicine & { prescription: Prescription })[] = [];

    allActiveMedicines.forEach(med => {
      const freq = med.frequency.toLowerCase();
      if (freq.includes('1-') || freq.includes('সকাল') || freq.includes('morning')) {
        morning.push(med);
      }
      if (freq.includes('-1-') || freq.includes('দুপুর') || freq.includes('noon') || freq.includes('afternoon')) {
        afternoon.push(med);
      }
      if (freq.includes('-1') || freq.includes('রাত') || freq.includes('evening') || freq.includes('night')) {
        if (freq.includes('0-0-1') || freq.includes('-1')) {
          evening.push(med);
        }
      }
      // For 1-1-1 pattern, add to all three
      if (freq === '1-1-1' || freq === '১-১-১') {
        if (!morning.includes(med)) morning.push(med);
        if (!afternoon.includes(med)) afternoon.push(med);
        if (!evening.includes(med)) evening.push(med);
      }
    });

    return { morning, afternoon, evening, night };
  }, [allActiveMedicines]);

  // Stats
  const stats = useMemo(() => ({
    activePrescriptions: prescriptions.filter(p => p.isActive).length,
    totalMedicines: allActiveMedicines.length,
    withReminders: allActiveMedicines.filter(m => m.reminder).length,
    nearingEnd: allActiveMedicines.filter(m => m.remainingDays && m.remainingDays <= 3).length,
  }), [prescriptions, allActiveMedicines]);

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Handle set reminder
  const handleSetReminder = useCallback(async () => {
    if (!selectedPrescription || !selectedMedicine || !onToggleReminder) return;
    
    await onToggleReminder(selectedPrescription.id, selectedMedicine.id, true, reminderTimes);
    setShowReminderModal(false);
    setSelectedMedicine(null);
  }, [selectedPrescription, selectedMedicine, reminderTimes, onToggleReminder]);

  return (
    <div className="space-y-6">
      {/* Today's Medicine Schedule */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">💊 আজকের ওষুধ</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Morning */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🌅</span>
              <span className="font-medium text-amber-800">সকাল</span>
              <span className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full text-xs">
                {medicinesToday.morning.length}
              </span>
            </div>
            <div className="space-y-2">
              {medicinesToday.morning.slice(0, 3).map((med, idx) => (
                <div key={idx} className="p-2 bg-white/70 rounded-lg text-sm">
                  <div className="font-medium text-slate-700">{med.name}</div>
                  <div className="text-slate-500 text-xs">{med.dosage}</div>
                </div>
              ))}
              {medicinesToday.morning.length === 0 && (
                <p className="text-sm text-amber-600 text-center">কোনো ওষুধ নেই</p>
              )}
            </div>
          </div>

          {/* Afternoon */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">☀️</span>
              <span className="font-medium text-blue-800">দুপুর</span>
              <span className="px-2 py-0.5 bg-blue-200 text-blue-800 rounded-full text-xs">
                {medicinesToday.afternoon.length}
              </span>
            </div>
            <div className="space-y-2">
              {medicinesToday.afternoon.slice(0, 3).map((med, idx) => (
                <div key={idx} className="p-2 bg-white/70 rounded-lg text-sm">
                  <div className="font-medium text-slate-700">{med.name}</div>
                  <div className="text-slate-500 text-xs">{med.dosage}</div>
                </div>
              ))}
              {medicinesToday.afternoon.length === 0 && (
                <p className="text-sm text-blue-600 text-center">কোনো ওষুধ নেই</p>
              )}
            </div>
          </div>

          {/* Evening/Night */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🌙</span>
              <span className="font-medium text-purple-800">রাত</span>
              <span className="px-2 py-0.5 bg-purple-200 text-purple-800 rounded-full text-xs">
                {medicinesToday.evening.length}
              </span>
            </div>
            <div className="space-y-2">
              {medicinesToday.evening.slice(0, 3).map((med, idx) => (
                <div key={idx} className="p-2 bg-white/70 rounded-lg text-sm">
                  <div className="font-medium text-slate-700">{med.name}</div>
                  <div className="text-slate-500 text-xs">{med.dosage}</div>
                </div>
              ))}
              {medicinesToday.evening.length === 0 && (
                <p className="text-sm text-purple-600 text-center">কোনো ওষুধ নেই</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{stats.activePrescriptions}</div>
          <div className="text-sm text-slate-500">সক্রিয় প্রেসক্রিপশন</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-teal-600">{stats.totalMedicines}</div>
          <div className="text-sm text-slate-500">চলমান ওষুধ</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-purple-600">{stats.withReminders}</div>
          <div className="text-sm text-slate-500">রিমাইন্ডার সেট</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-amber-400">
          <div className="text-3xl font-bold text-amber-600">{stats.nearingEnd}</div>
          <div className="text-sm text-slate-500">শেষ হওয়ার কাছাকাছি</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card p-2 flex gap-1">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
            activeTab === 'active'
              ? 'bg-blue-500 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          📋 সক্রিয় প্রেসক্রিপশন
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
            activeTab === 'completed'
              ? 'bg-blue-500 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          ✓ পূর্ববর্তী
        </button>
      </div>

      {/* Prescriptions List */}
      <div className="space-y-4">
        {filteredPrescriptions.map(prescription => (
          <div key={prescription.id} className="glass-card p-4">
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                {prescription.doctorImage ? (
                  <img src={prescription.doctorImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">👨‍⚕️</div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800">{prescription.doctorNameBn || prescription.doctorName}</h3>
                <p className="text-sm text-slate-500">{prescription.doctorSpecialty}</p>
                <p className="text-sm text-slate-400">📅 {formatDate(prescription.date)}</p>
              </div>
              <div className="flex gap-2">
                {prescription.fileUrl && onViewPDF && (
                  <button
                    onClick={() => onViewPDF(prescription)}
                    className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                  >
                    📄 দেখুন
                  </button>
                )}
                {prescription.isActive && onMarkComplete && (
                  <button
                    onClick={() => onMarkComplete(prescription.id)}
                    className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                  >
                    ✓ সম্পন্ন
                  </button>
                )}
              </div>
            </div>

            {/* Diagnosis */}
            {prescription.diagnosis && (
              <div className="mb-4 p-3 bg-amber-50 rounded-lg">
                <div className="text-xs text-amber-600 mb-1">রোগ নির্ণয়</div>
                <div className="text-slate-700">{prescription.diagnosisBn || prescription.diagnosis}</div>
              </div>
            )}

            {/* Medicines */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-600 flex items-center gap-2">
                💊 ওষুধের তালিকা
                <span className="px-2 py-0.5 bg-slate-100 rounded-full text-xs">
                  {prescription.medicines.length}
                </span>
              </h4>
              
              {prescription.medicines.map(medicine => (
                <div key={medicine.id} className="p-3 glass-subtle rounded-lg flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-slate-800">{medicine.name}</div>
                    <div className="text-sm text-slate-500 flex items-center gap-3">
                      <span>{medicine.dosage}</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{medicine.frequency}</span>
                      <span>{medicine.duration}</span>
                    </div>
                    {medicine.instructionBn && (
                      <div className="text-xs text-slate-400 mt-1">{medicine.instructionBn}</div>
                    )}
                    {medicine.remainingDays !== undefined && medicine.remainingDays <= 3 && (
                      <div className="text-xs text-amber-600 mt-1">⚠️ {medicine.remainingDays} দিন বাকি</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {medicine.reminder ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs">
                        🔔 রিমাইন্ডার সেট
                      </span>
                    ) : onToggleReminder && (
                      <button
                        onClick={() => {
                          setSelectedPrescription(prescription);
                          setSelectedMedicine(medicine);
                          setShowReminderModal(true);
                        }}
                        className="px-2 py-1 text-sm text-slate-500 hover:text-blue-600"
                      >
                        🔔 রিমাইন্ডার
                      </button>
                    )}
                    {onReorderMedicine && medicine.remainingDays !== undefined && medicine.remainingDays <= 3 && (
                      <button
                        onClick={() => onReorderMedicine(medicine)}
                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg"
                      >
                        🛒 অর্ডার
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Advice */}
            {prescription.advice && prescription.advice.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <div className="text-xs text-green-600 mb-2">📝 পরামর্শ</div>
                <ul className="space-y-1">
                  {prescription.advice.map((item, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Follow-up */}
            {prescription.followUpDate && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs text-blue-600">পরবর্তী ভিজিট</div>
                  <div className="font-medium text-slate-700">{formatDate(prescription.followUpDate)}</div>
                </div>
                <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">
                  📅 বুক করুন
                </button>
              </div>
            )}
          </div>
        ))}

        {filteredPrescriptions.length === 0 && (
          <div className="glass-card p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              {activeTab === 'active' ? 'কোনো সক্রিয় প্রেসক্রিপশন নেই' : 'কোনো পূর্ববর্তী প্রেসক্রিপশন নেই'}
            </h3>
          </div>
        )}
      </div>

      {/* Reminder Modal */}
      {showReminderModal && selectedMedicine && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-strong rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">🔔 রিমাইন্ডার সেট করুন</h3>
            <p className="text-slate-600 mb-4">
              {selectedMedicine.name} এর জন্য রিমাইন্ডার সেট করুন
            </p>

            <div className="space-y-3 mb-6">
              <label className="block text-sm font-medium text-slate-600">রিমাইন্ডার সময়</label>
              {reminderTimes.map((time, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => {
                      const newTimes = [...reminderTimes];
                      newTimes[idx] = e.target.value;
                      setReminderTimes(newTimes);
                    }}
                    className="flex-1 p-3 border border-slate-200 rounded-lg"
                  />
                  {reminderTimes.length > 1 && (
                    <button
                      onClick={() => setReminderTimes(prev => prev.filter((_, i) => i !== idx))}
                      className="px-3 text-red-500"
                    >
                      ✗
                    </button>
                  )}
                </div>
              ))}
              {reminderTimes.length < 4 && (
                <button
                  onClick={() => setReminderTimes(prev => [...prev, '12:00'])}
                  className="text-sm text-blue-600"
                >
                  + আরেকটি সময় যোগ করুন
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReminderModal(false);
                  setSelectedMedicine(null);
                }}
                className="flex-1 py-3 glass-subtle text-slate-600 rounded-xl font-medium"
              >
                বাতিল
              </button>
              <button
                onClick={handleSetReminder}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium"
              >
                সেট করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrescriptionTracker;

