import React, { useState, useMemo, useCallback } from 'react';

// ============ TYPES ============
export interface Medication {
  id: string;
  name: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  times: string[];
  duration: string;
  instruction: string;
  startDate: string;
  endDate?: string;
  prescriptionId?: string;
  doctorName?: string;
  isActive: boolean;
  
  // Tracking
  remindersEnabled?: boolean;
  takenHistory?: {
    date: string;
    time: string;
    taken: boolean;
  }[];
  
  // Refill
  currentStock?: number;
  refillReminder?: number;
  lastRefillDate?: string;
}

export interface Prescription {
  id: string;
  date: string;
  doctorName: string;
  doctorSpecialty: string;
  diagnosis: string;
  diagnosisBn?: string;
  medications: Medication[];
  advice?: string[];
  followUpDate?: string;
  documentUrl?: string;
}

interface MedicationTrackerProps {
  medications: Medication[];
  prescriptions: Prescription[];
  onToggleTaken?: (medicationId: string, date: string, time: string, taken: boolean) => void;
  onToggleReminder?: (medicationId: string, enabled: boolean) => void;
  onViewPrescription?: (prescription: Prescription) => void;
  onRefillRequest?: (medication: Medication) => void;
}

// ============ TIME SLOTS ============
const TIME_SLOTS = [
  { id: 'morning', label: 'সকাল', time: '08:00', icon: '🌅' },
  { id: 'noon', label: 'দুপুর', time: '13:00', icon: '☀️' },
  { id: 'evening', label: 'সন্ধ্যা', time: '18:00', icon: '🌆' },
  { id: 'night', label: 'রাত', time: '22:00', icon: '🌙' },
];

// ============ MEDICATION TRACKER COMPONENT ============
export const MedicationTracker: React.FC<MedicationTrackerProps> = ({
  medications,
  prescriptions,
  onToggleTaken,
  onToggleReminder,
  onViewPrescription,
  onRefillRequest,
}) => {
  // State
  const [activeTab, setActiveTab] = useState<'today' | 'all' | 'prescriptions' | 'history'>('today');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showMedicationDetail, setShowMedicationDetail] = useState<Medication | null>(null);

  // Get today's date
  const today = new Date().toISOString().split('T')[0];

  // Filter active medications
  const activeMedications = useMemo(() => 
    medications.filter(m => m.isActive),
    [medications]
  );

  // Get medications for today
  const todayMedications = useMemo(() => {
    return activeMedications.map(med => {
      const todayHistory = med.takenHistory?.filter(h => h.date === today) || [];
      return {
        ...med,
        todaySchedule: med.times.map(time => {
          const taken = todayHistory.find(h => h.time === time);
          return { time, taken: taken?.taken || false };
        }),
      };
    });
  }, [activeMedications, today]);

  // Calculate adherence
  const adherenceStats = useMemo(() => {
    const last7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push(date.toISOString().split('T')[0]);
    }

    let totalDoses = 0;
    let takenDoses = 0;

    activeMedications.forEach(med => {
      last7Days.forEach(date => {
        const dayHistory = med.takenHistory?.filter(h => h.date === date) || [];
        totalDoses += med.times.length;
        takenDoses += dayHistory.filter(h => h.taken).length;
      });
    });

    const adherenceRate = totalDoses > 0 ? (takenDoses / totalDoses * 100).toFixed(0) : 0;

    return {
      totalDoses,
      takenDoses,
      adherenceRate,
      last7Days,
    };
  }, [activeMedications]);

  // Medications needing refill
  const needsRefill = useMemo(() => 
    medications.filter(m => m.isActive && m.currentStock !== undefined && m.refillReminder !== undefined && m.currentStock <= m.refillReminder),
    [medications]
  );

  // Handle toggle taken
  const handleToggleTaken = useCallback((medicationId: string, time: string, taken: boolean) => {
    if (onToggleTaken) {
      onToggleTaken(medicationId, today, time, taken);
    }
  }, [today, onToggleTaken]);

  // Get time slot info
  const getTimeSlotInfo = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour >= 5 && hour < 12) return TIME_SLOTS[0];
    if (hour >= 12 && hour < 17) return TIME_SLOTS[1];
    if (hour >= 17 && hour < 21) return TIME_SLOTS[2];
    return TIME_SLOTS[3];
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get relative date
  const getRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'আজ';
    if (diffDays === 1) return 'গতকাল';
    if (diffDays < 7) return `${diffDays} দিন আগে`;
    return formatDate(dateStr);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">💊 ওষুধ ট্র্যাকার</h2>
          <p className="text-slate-500">আপনার ওষুধ সময়মতো খান</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Adherence Badge */}
          <div className={`px-4 py-2 rounded-full font-medium ${
            Number(adherenceStats.adherenceRate) >= 80 ? 'bg-green-100 text-green-700' :
            Number(adherenceStats.adherenceRate) >= 50 ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            📊 {adherenceStats.adherenceRate}% মেনে চলেছেন
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-slate-700">{activeMedications.length}</div>
          <div className="text-sm text-slate-500">চলমান ওষুধ</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-green-400">
          <div className="text-3xl font-bold text-green-600">{adherenceStats.takenDoses}</div>
          <div className="text-sm text-slate-500">গত ৭ দিনে খেয়েছেন</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-blue-400">
          <div className="text-3xl font-bold text-blue-600">{prescriptions.length}</div>
          <div className="text-sm text-slate-500">মোট প্রেসক্রিপশন</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-amber-400">
          <div className="text-3xl font-bold text-amber-600">{needsRefill.length}</div>
          <div className="text-sm text-slate-500">রিফিল দরকার</div>
        </div>
      </div>

      {/* Refill Alerts */}
      {needsRefill.length > 0 && (
        <div className="glass-card p-4 border-l-4 border-amber-400 bg-amber-50/50">
          <h3 className="font-semibold text-amber-700 mb-2">⚠️ রিফিল প্রয়োজন</h3>
          <div className="flex flex-wrap gap-2">
            {needsRefill.map(med => (
              <button
                key={med.id}
                onClick={() => onRefillRequest && onRefillRequest(med)}
                className="px-3 py-1.5 bg-white border border-amber-300 text-amber-700 rounded-full text-sm hover:bg-amber-50 flex items-center gap-2"
              >
                💊 {med.name} ({med.currentStock} বাকি)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {[
          { id: 'today', label: 'আজকের ওষুধ', icon: '📅' },
          { id: 'all', label: 'সব ওষুধ', icon: '💊' },
          { id: 'prescriptions', label: 'প্রেসক্রিপশন', icon: '📋' },
          { id: 'history', label: 'ইতিহাস', icon: '📊' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-blue-500 text-white'
                : 'glass-subtle text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Today's Schedule */}
      {activeTab === 'today' && (
        <div className="space-y-6">
          {TIME_SLOTS.map(slot => {
            const slotMeds = todayMedications.filter(med => 
              med.todaySchedule.some(s => getTimeSlotInfo(s.time).id === slot.id)
            );

            if (slotMeds.length === 0) return null;

            return (
              <div key={slot.id} className="glass-card p-4">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{slot.icon}</span>
                  <h3 className="font-semibold text-slate-700">{slot.label}</h3>
                  <span className="text-sm text-slate-500">{slot.time}</span>
                </div>

                <div className="space-y-3">
                  {slotMeds.map(med => {
                    const scheduleItem = med.todaySchedule.find(s => getTimeSlotInfo(s.time).id === slot.id);
                    if (!scheduleItem) return null;

                    return (
                      <div
                        key={`${med.id}-${slot.id}`}
                        className={`flex items-center gap-4 p-3 rounded-xl transition ${
                          scheduleItem.taken
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-white border border-slate-200'
                        }`}
                      >
                        {/* Toggle Button */}
                        <button
                          onClick={() => handleToggleTaken(med.id, scheduleItem.time, !scheduleItem.taken)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition ${
                            scheduleItem.taken
                              ? 'bg-green-500 text-white'
                              : 'bg-slate-100 text-slate-400 hover:bg-blue-100'
                          }`}
                        >
                          {scheduleItem.taken ? '✓' : '○'}
                        </button>

                        {/* Medication Info */}
                        <div className="flex-1">
                          <div className="font-medium text-slate-800">{med.name}</div>
                          <div className="text-sm text-slate-500">
                            {med.dosage} • {med.instruction}
                          </div>
                        </div>

                        {/* Time */}
                        <div className="text-sm text-slate-500">{scheduleItem.time}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {todayMedications.length === 0 && (
            <div className="glass-card p-12 text-center">
              <div className="text-6xl mb-4">💊</div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">আজ কোনো ওষুধ নেই</h3>
              <p className="text-slate-500">আপনার চলমান কোনো ওষুধ নেই</p>
            </div>
          )}
        </div>
      )}

      {/* All Medications */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {medications.map(med => (
            <div
              key={med.id}
              className={`glass-card p-4 cursor-pointer transition hover:shadow-lg ${
                !med.isActive ? 'opacity-60' : ''
              }`}
              onClick={() => setShowMedicationDetail(med)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                    med.isActive ? 'bg-blue-100' : 'bg-slate-100'
                  }`}>
                    💊
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">{med.name}</h4>
                    {med.genericName && (
                      <div className="text-xs text-slate-500">{med.genericName}</div>
                    )}
                    <div className="text-sm text-slate-600 mt-1">
                      {med.dosage} • {med.frequency} • {med.instruction}
                    </div>
                    {med.doctorName && (
                      <div className="text-xs text-slate-500 mt-1">
                        👨‍⚕️ {med.doctorName}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    med.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {med.isActive ? 'চলমান' : 'শেষ'}
                  </span>
                  {med.remindersEnabled && (
                    <div className="text-xs text-blue-600 mt-1">🔔 রিমাইন্ডার চালু</div>
                  )}
                </div>
              </div>

              {/* Stock indicator */}
              {med.isActive && med.currentStock !== undefined && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">বাকি স্টক</span>
                    <span className={`font-medium ${
                      med.currentStock <= (med.refillReminder || 5) ? 'text-amber-600' : 'text-slate-700'
                    }`}>
                      {med.currentStock} টি
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {medications.length === 0 && (
            <div className="glass-card p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">কোনো ওষুধ নেই</h3>
              <p className="text-slate-500">আপনার প্রেসক্রিপশন থেকে ওষুধ যোগ হবে</p>
            </div>
          )}
        </div>
      )}

      {/* Prescriptions */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-4">
          {prescriptions.map(prescription => (
            <div
              key={prescription.id}
              className="glass-card p-4 cursor-pointer transition hover:shadow-lg"
              onClick={() => onViewPrescription && onViewPrescription(prescription)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-slate-800">
                    {prescription.diagnosisBn || prescription.diagnosis}
                  </h4>
                  <p className="text-sm text-slate-500">
                    👨‍⚕️ {prescription.doctorName} • {prescription.doctorSpecialty}
                  </p>
                </div>
                <div className="text-sm text-slate-500">{getRelativeDate(prescription.date)}</div>
              </div>

              {/* Medications */}
              <div className="flex flex-wrap gap-2">
                {prescription.medications.slice(0, 3).map(med => (
                  <span key={med.id} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    💊 {med.name}
                  </span>
                ))}
                {prescription.medications.length > 3 && (
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                    +{prescription.medications.length - 3} আরও
                  </span>
                )}
              </div>

              {/* Follow-up */}
              {prescription.followUpDate && (
                <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-blue-600">
                  📅 ফলো-আপ: {formatDate(prescription.followUpDate)}
                </div>
              )}
            </div>
          ))}

          {prescriptions.length === 0 && (
            <div className="glass-card p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">কোনো প্রেসক্রিপশন নেই</h3>
              <p className="text-slate-500">ডাক্তার দেখালে এখানে দেখাবে</p>
            </div>
          )}
        </div>
      )}

      {/* History / Adherence Chart */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="font-semibold text-slate-700 mb-4">📊 গত ৭ দিনের অবস্থা</h3>
            
            <div className="grid grid-cols-7 gap-2">
              {adherenceStats.last7Days.map(date => {
                const dayData = activeMedications.reduce((acc, med) => {
                  const dayHistory = med.takenHistory?.filter(h => h.date === date) || [];
                  acc.total += med.times.length;
                  acc.taken += dayHistory.filter(h => h.taken).length;
                  return acc;
                }, { total: 0, taken: 0 });

                const percentage = dayData.total > 0 ? (dayData.taken / dayData.total * 100) : 0;
                const dayName = new Date(date).toLocaleDateString('bn-BD', { weekday: 'short' });

                return (
                  <div key={date} className="text-center">
                    <div className="text-xs text-slate-500 mb-2">{dayName}</div>
                    <div className={`w-full aspect-square rounded-lg flex items-center justify-center text-white font-bold ${
                      percentage >= 80 ? 'bg-green-500' :
                      percentage >= 50 ? 'bg-amber-500' :
                      percentage > 0 ? 'bg-red-500' : 'bg-slate-200 text-slate-400'
                    }`}>
                      {percentage > 0 ? `${Math.round(percentage)}%` : '-'}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {dayData.taken}/{dayData.total}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="glass-card p-4">
            <div className="flex flex-wrap gap-4 justify-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-slate-600">৮০%+ মেনে চলা</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-amber-500 rounded"></div>
                <span className="text-slate-600">৫০-৭৯% মেনে চলা</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-slate-600">৫০% এর কম</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Medication Detail Modal */}
      {showMedicationDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-strong rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 bg-blue-50">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{showMedicationDetail.name}</h2>
                  {showMedicationDetail.genericName && (
                    <p className="text-sm text-slate-500">{showMedicationDetail.genericName}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowMedicationDetail(null)}
                  className="p-2 hover:bg-white/50 rounded-full"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-subtle p-3 rounded-lg">
                  <div className="text-xs text-slate-500">মাত্রা</div>
                  <div className="font-medium text-slate-700">{showMedicationDetail.dosage}</div>
                </div>
                <div className="glass-subtle p-3 rounded-lg">
                  <div className="text-xs text-slate-500">ফ্রিকোয়েন্সি</div>
                  <div className="font-medium text-slate-700">{showMedicationDetail.frequency}</div>
                </div>
                <div className="glass-subtle p-3 rounded-lg">
                  <div className="text-xs text-slate-500">সময়কাল</div>
                  <div className="font-medium text-slate-700">{showMedicationDetail.duration}</div>
                </div>
                <div className="glass-subtle p-3 rounded-lg">
                  <div className="text-xs text-slate-500">নির্দেশনা</div>
                  <div className="font-medium text-slate-700">{showMedicationDetail.instruction}</div>
                </div>
              </div>

              {/* Times */}
              <div>
                <div className="text-sm font-medium text-slate-600 mb-2">সময়সূচী</div>
                <div className="flex flex-wrap gap-2">
                  {showMedicationDetail.times.map(time => {
                    const slot = getTimeSlotInfo(time);
                    return (
                      <span key={time} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1">
                        {slot.icon} {time}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Doctor */}
              {showMedicationDetail.doctorName && (
                <div className="glass-subtle p-3 rounded-lg">
                  <div className="text-xs text-slate-500">প্রেসক্রাইব করেছেন</div>
                  <div className="font-medium text-slate-700">👨‍⚕️ {showMedicationDetail.doctorName}</div>
                </div>
              )}

              {/* Stock */}
              {showMedicationDetail.currentStock !== undefined && (
                <div className="glass-subtle p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs text-slate-500">বর্তমান স্টক</div>
                      <div className="font-medium text-slate-700">{showMedicationDetail.currentStock} টি</div>
                    </div>
                    {onRefillRequest && (
                      <button
                        onClick={() => {
                          onRefillRequest(showMedicationDetail);
                          setShowMedicationDetail(null);
                        }}
                        className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm"
                      >
                        রিফিল করুন
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => {
                  if (onToggleReminder) {
                    onToggleReminder(showMedicationDetail.id, !showMedicationDetail.remindersEnabled);
                  }
                  setShowMedicationDetail(null);
                }}
                className={`flex-1 py-2 rounded-lg font-medium ${
                  showMedicationDetail.remindersEnabled
                    ? 'bg-blue-100 text-blue-700'
                    : 'glass-subtle text-slate-600'
                }`}
              >
                🔔 {showMedicationDetail.remindersEnabled ? 'রিমাইন্ডার বন্ধ' : 'রিমাইন্ডার চালু'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicationTracker;

