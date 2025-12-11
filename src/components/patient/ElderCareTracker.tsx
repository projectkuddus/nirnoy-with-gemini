import React, { useState, useMemo } from 'react';

// ============ TYPES ============
export interface ElderProfile {
  id: string;
  name: string;
  nameBn?: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female';
  bloodGroup?: string;
  phone?: string;
  address?: string;
  
  // Health Status
  chronicConditions: string[];
  allergies: string[];
  currentMedications: MedicationSchedule[];
  mobilityStatus: 'independent' | 'assisted' | 'wheelchair' | 'bedridden';
  cognitiveStatus: 'normal' | 'mild_impairment' | 'moderate_impairment' | 'severe_impairment';
  
  // Care Information
  primaryCaregiver?: {
    name: string;
    phone: string;
    relation: string;
  };
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  preferredHospital?: string;
  insuranceInfo?: string;
  
  // Daily Living
  dailyActivities: DailyActivity[];
  checkIns: CheckIn[];
}

export interface MedicationSchedule {
  id: string;
  name: string;
  nameBn?: string;
  dosage: string;
  frequency: string;
  times: string[];
  purpose?: string;
  prescribedBy?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  notes?: string;
  adherenceRate?: number;
}

export interface DailyActivity {
  id: string;
  type: 'eating' | 'walking' | 'bathing' | 'medication' | 'exercise' | 'sleep' | 'social' | 'other';
  scheduledTime: string;
  completedAt?: string;
  isCompleted: boolean;
  notes?: string;
  caregiverNotes?: string;
}

export interface CheckIn {
  id: string;
  date: string;
  time: string;
  type: 'morning' | 'afternoon' | 'evening' | 'night' | 'emergency';
  moodRating: 1 | 2 | 3 | 4 | 5;
  healthStatus: 'good' | 'fair' | 'poor' | 'emergency';
  vitals?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    bloodSugar?: number;
    oxygenLevel?: number;
  };
  concerns?: string[];
  notes?: string;
  recordedBy?: string;
}

export interface HealthAlert {
  id: string;
  type: 'medication' | 'vitals' | 'activity' | 'checkIn' | 'emergency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  titleBn?: string;
  description: string;
  createdAt: string;
  isResolved: boolean;
}

interface ElderCareTrackerProps {
  elder: ElderProfile;
  alerts?: HealthAlert[];
  onRecordCheckIn?: (checkIn: Omit<CheckIn, 'id'>) => void;
  onCompleteActivity?: (activityId: string) => void;
  onRecordMedicationTaken?: (medicationId: string, time: string) => void;
  onEmergencyCall?: () => void;
  onCallCaregiver?: () => void;
  onUpdateProfile?: (updates: Partial<ElderProfile>) => void;
}

// ============ CONSTANTS ============
const MOOD_EMOJI: Record<number, string> = {
  1: '😢',
  2: '😔',
  3: '😐',
  4: '🙂',
  5: '😊',
};

const ACTIVITY_CONFIG: Record<string, { icon: string; label: string; labelBn: string }> = {
  eating: { icon: '🍽️', label: 'Eating', labelBn: 'খাওয়া' },
  walking: { icon: '🚶', label: 'Walking', labelBn: 'হাঁটা' },
  bathing: { icon: '🛁', label: 'Bathing', labelBn: 'গোসল' },
  medication: { icon: '💊', label: 'Medication', labelBn: 'ওষুধ' },
  exercise: { icon: '🏃', label: 'Exercise', labelBn: 'ব্যায়াম' },
  sleep: { icon: '😴', label: 'Sleep', labelBn: 'ঘুম' },
  social: { icon: '👥', label: 'Social', labelBn: 'সামাজিক' },
  other: { icon: '📋', label: 'Other', labelBn: 'অন্যান্য' },
};

// ============ COMPONENT ============
export const ElderCareTracker: React.FC<ElderCareTrackerProps> = ({
  elder,
  alerts = [],
  onRecordCheckIn,
  onCompleteActivity,
  onRecordMedicationTaken,
  onEmergencyCall,
  onCallCaregiver,
  onUpdateProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'medications' | 'activities' | 'checkIns' | 'alerts'>('overview');
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInForm, setCheckInForm] = useState({
    moodRating: 3 as 1 | 2 | 3 | 4 | 5,
    healthStatus: 'good' as 'good' | 'fair' | 'poor' | 'emergency',
    bp: '',
    hr: '',
    temp: '',
    sugar: '',
    spo2: '',
    concerns: '',
    notes: '',
  });

  // Calculate age
  const age = useMemo(() => {
    const birth = new Date(elder.dateOfBirth);
    const now = new Date();
    return Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365));
  }, [elder.dateOfBirth]);

  // Today's activities status
  const todayActivities = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return elder.dailyActivities.filter(a => a.scheduledTime.startsWith(today));
  }, [elder.dailyActivities]);

  const completedActivities = todayActivities.filter(a => a.isCompleted).length;

  // Medication adherence today
  const todayMedications = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    return elder.currentMedications.filter(m => m.isActive).map(med => {
      const takenTimes = med.times.filter(t => {
        const medHour = parseInt(t.split(':')[0]);
        return medHour <= currentHour;
      });
      return {
        ...med,
        dueTimes: takenTimes.length,
        status: takenTimes.length === 0 ? 'upcoming' : 'due',
      };
    });
  }, [elder.currentMedications]);

  // Last check-in
  const lastCheckIn = elder.checkIns[0];
  const hoursSinceCheckIn = lastCheckIn 
    ? Math.floor((Date.now() - new Date(`${lastCheckIn.date}T${lastCheckIn.time}`).getTime()) / (1000 * 60 * 60))
    : 999;

  // Critical alerts
  const criticalAlerts = alerts.filter(a => !a.isResolved && (a.severity === 'high' || a.severity === 'critical'));

  // Handle check-in submission
  const handleCheckIn = () => {
    const now = new Date();
    const hour = now.getHours();
    const type = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';

    onRecordCheckIn?.({
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      type: type as any,
      moodRating: checkInForm.moodRating,
      healthStatus: checkInForm.healthStatus,
      vitals: {
        bloodPressure: checkInForm.bp || undefined,
        heartRate: checkInForm.hr ? parseInt(checkInForm.hr) : undefined,
        temperature: checkInForm.temp ? parseFloat(checkInForm.temp) : undefined,
        bloodSugar: checkInForm.sugar ? parseInt(checkInForm.sugar) : undefined,
        oxygenLevel: checkInForm.spo2 ? parseInt(checkInForm.spo2) : undefined,
      },
      concerns: checkInForm.concerns ? checkInForm.concerns.split(',').map(s => s.trim()) : undefined,
      notes: checkInForm.notes || undefined,
    });
    setShowCheckInModal(false);
    setCheckInForm({
      moodRating: 3,
      healthStatus: 'good',
      bp: '',
      hr: '',
      temp: '',
      sugar: '',
      spo2: '',
      concerns: '',
      notes: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Emergency Banner */}
      {criticalAlerts.length > 0 && (
        <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🚨</span>
              <div>
                <h3 className="font-bold text-red-700">জরুরি সতর্কতা</h3>
                <p className="text-red-600 text-sm">{criticalAlerts[0].description}</p>
              </div>
            </div>
            <button
              onClick={onEmergencyCall}
              className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700"
            >
              🆘 জরুরি কল
            </button>
          </div>
        </div>
      )}

      {/* Elder Header */}
      <div className="glass-strong rounded-2xl p-6 border border-white/60">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-3xl">
              {elder.gender === 'Male' ? '👴' : '👵'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-700">{elder.nameBn || elder.name}</h2>
              <p className="text-slate-500">
                {age} বছর • {elder.gender === 'Male' ? 'পুরুষ' : 'মহিলা'}
                {elder.bloodGroup && ` • ${elder.bloodGroup}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCallCaregiver}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              📞 পরিচর্যাকারী
            </button>
            <button
              onClick={onEmergencyCall}
              className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700"
            >
              🆘 জরুরি
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`rounded-xl p-3 text-center ${
            hoursSinceCheckIn > 12 ? 'bg-amber-100' : 'bg-green-50'
          }`}>
            <div className="text-2xl font-bold">
              {lastCheckIn ? MOOD_EMOJI[lastCheckIn.moodRating] : '❓'}
            </div>
            <div className="text-xs text-slate-500">সর্বশেষ মেজাজ</div>
            <div className="text-xs text-slate-400">
              {hoursSinceCheckIn < 24 ? `${hoursSinceCheckIn}ঘ আগে` : 'আজ চেক-ইন হয়নি'}
            </div>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{todayMedications.length}</div>
            <div className="text-xs text-slate-500">আজকের ওষুধ</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {completedActivities}/{todayActivities.length}
            </div>
            <div className="text-xs text-slate-500">কার্যক্রম সম্পন্ন</div>
          </div>
          <div className={`rounded-xl p-3 text-center ${
            criticalAlerts.length > 0 ? 'bg-red-100' : 'bg-green-50'
          }`}>
            <div className={`text-2xl font-bold ${
              criticalAlerts.length > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {criticalAlerts.length > 0 ? `⚠️ ${criticalAlerts.length}` : '✓'}
            </div>
            <div className="text-xs text-slate-500">
              {criticalAlerts.length > 0 ? 'সতর্কতা' : 'সব ঠিক আছে'}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Check-In Button */}
      <button
        onClick={() => setShowCheckInModal(true)}
        className="w-full glass-card rounded-xl p-4 text-center hover:bg-white/60 border-2 border-dashed border-blue-300"
      >
        <span className="text-2xl">🕐</span>
        <span className="ml-2 font-medium text-blue-600">এখনই চেক-ইন করুন</span>
      </button>

      {/* Check-In Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-bold mb-4">📋 দৈনিক চেক-ইন</h3>
            
            {/* Mood */}
            <div className="mb-4">
              <label className="text-sm text-slate-600 mb-2 block">আজকে কেমন আছেন?</label>
              <div className="flex justify-between">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    onClick={() => setCheckInForm(p => ({ ...p, moodRating: rating as any }))}
                    className={`w-12 h-12 rounded-xl text-2xl transition-all ${
                      checkInForm.moodRating === rating 
                        ? 'bg-blue-100 ring-2 ring-blue-500 scale-110' 
                        : 'bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    {MOOD_EMOJI[rating]}
                  </button>
                ))}
              </div>
            </div>

            {/* Health Status */}
            <div className="mb-4">
              <label className="text-sm text-slate-600 mb-2 block">শারীরিক অবস্থা</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'good', label: '✅ ভালো', color: 'green' },
                  { value: 'fair', label: '🙂 মোটামুটি', color: 'amber' },
                  { value: 'poor', label: '😔 খারাপ', color: 'orange' },
                  { value: 'emergency', label: '🚨 জরুরি', color: 'red' },
                ].map(status => (
                  <button
                    key={status.value}
                    onClick={() => setCheckInForm(p => ({ ...p, healthStatus: status.value as any }))}
                    className={`p-2 rounded-lg text-sm font-medium transition-all ${
                      checkInForm.healthStatus === status.value
                        ? `bg-${status.color}-100 ring-2 ring-${status.color}-500`
                        : 'bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Vitals */}
            <div className="mb-4">
              <label className="text-sm text-slate-600 mb-2 block">ভাইটালস (ঐচ্ছিক)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="BP (120/80)"
                  value={checkInForm.bp}
                  onChange={(e) => setCheckInForm(p => ({ ...p, bp: e.target.value }))}
                  className="px-3 py-2 border rounded-lg text-sm"
                />
                <input
                  type="number"
                  placeholder="হার্ট রেট"
                  value={checkInForm.hr}
                  onChange={(e) => setCheckInForm(p => ({ ...p, hr: e.target.value }))}
                  className="px-3 py-2 border rounded-lg text-sm"
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="তাপমাত্রা"
                  value={checkInForm.temp}
                  onChange={(e) => setCheckInForm(p => ({ ...p, temp: e.target.value }))}
                  className="px-3 py-2 border rounded-lg text-sm"
                />
                <input
                  type="number"
                  placeholder="সুগার"
                  value={checkInForm.sugar}
                  onChange={(e) => setCheckInForm(p => ({ ...p, sugar: e.target.value }))}
                  className="px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="text-sm text-slate-600 mb-2 block">মন্তব্য</label>
              <textarea
                placeholder="কোনো সমস্যা বা মন্তব্য..."
                value={checkInForm.notes}
                onChange={(e) => setCheckInForm(p => ({ ...p, notes: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleCheckIn}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
              >
                চেক-ইন সম্পন্ন
              </button>
              <button
                onClick={() => setShowCheckInModal(false)}
                className="px-4 py-3 border rounded-xl hover:bg-slate-50"
              >
                বাতিল
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'overview', label: 'সারসংক্ষেপ', icon: '📊' },
          { id: 'medications', label: 'ওষুধ', icon: '💊' },
          { id: 'activities', label: 'কার্যক্রম', icon: '📋' },
          { id: 'checkIns', label: 'চেক-ইন', icon: '✓' },
          { id: 'alerts', label: 'সতর্কতা', icon: '🔔' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white' 
                : 'glass-card text-slate-600 hover:bg-white/60'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Chronic Conditions */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              🏥 দীর্ঘমেয়াদী রোগ
            </h3>
            {elder.chronicConditions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {elder.chronicConditions.map((condition, i) => (
                  <span key={i} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                    {condition}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">কোনো দীর্ঘমেয়াদী রোগ নেই</p>
            )}
          </div>

          {/* Mobility & Cognitive Status */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="font-bold text-slate-700 mb-3">📊 স্বাস্থ্য অবস্থা</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">চলাফেরা:</span>
                <span className="font-medium">
                  {{
                    independent: '🚶 স্বনির্ভর',
                    assisted: '🧑‍🦯 সাহায্য প্রয়োজন',
                    wheelchair: '♿ হুইলচেয়ার',
                    bedridden: '🛏️ শয্যাশায়ী',
                  }[elder.mobilityStatus]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">স্মৃতি:</span>
                <span className="font-medium">
                  {{
                    normal: '✅ স্বাভাবিক',
                    mild_impairment: '🟡 হালকা সমস্যা',
                    moderate_impairment: '🟠 মাঝারি সমস্যা',
                    severe_impairment: '🔴 গুরুতর সমস্যা',
                  }[elder.cognitiveStatus]}
                </span>
              </div>
            </div>
          </div>

          {/* Caregiver Info */}
          {elder.primaryCaregiver && (
            <div className="glass-card rounded-xl p-4">
              <h3 className="font-bold text-slate-700 mb-3">👨‍⚕️ পরিচর্যাকারী</h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{elder.primaryCaregiver.name}</p>
                <p className="text-slate-500">{elder.primaryCaregiver.relation}</p>
                <a 
                  href={`tel:${elder.primaryCaregiver.phone}`}
                  className="text-blue-600 hover:underline"
                >
                  📞 {elder.primaryCaregiver.phone}
                </a>
              </div>
            </div>
          )}

          {/* Emergency Contact */}
          {elder.emergencyContact && (
            <div className="glass-card rounded-xl p-4 border-l-4 border-red-500">
              <h3 className="font-bold text-slate-700 mb-3">🆘 জরুরি যোগাযোগ</h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{elder.emergencyContact.name}</p>
                <p className="text-slate-500">{elder.emergencyContact.relation}</p>
                <a 
                  href={`tel:${elder.emergencyContact.phone}`}
                  className="text-red-600 hover:underline font-bold"
                >
                  📞 {elder.emergencyContact.phone}
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Medications Tab */}
      {activeTab === 'medications' && (
        <div className="space-y-4">
          <h3 className="font-bold text-slate-700">💊 ওষুধের তালিকা</h3>
          {elder.currentMedications.filter(m => m.isActive).length > 0 ? (
            <div className="space-y-3">
              {elder.currentMedications.filter(m => m.isActive).map(med => (
                <div key={med.id} className="glass-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{med.nameBn || med.name}</h4>
                      <p className="text-sm text-slate-500">{med.dosage} • {med.frequency}</p>
                    </div>
                    {med.adherenceRate !== undefined && (
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        med.adherenceRate >= 80 ? 'bg-green-100 text-green-700' :
                        med.adherenceRate >= 50 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {med.adherenceRate}% মেনে চলা
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {med.times.map((time, i) => (
                      <button
                        key={i}
                        onClick={() => onRecordMedicationTaken?.(med.id, time)}
                        className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100"
                      >
                        ⏰ {time}
                      </button>
                    ))}
                  </div>
                  {med.purpose && (
                    <p className="text-xs text-slate-400 mt-2">কারণ: {med.purpose}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <div className="text-4xl mb-2">💊</div>
              <p>কোনো চলমান ওষুধ নেই</p>
            </div>
          )}
        </div>
      )}

      {/* Activities Tab */}
      {activeTab === 'activities' && (
        <div className="space-y-4">
          <h3 className="font-bold text-slate-700">📋 আজকের কার্যক্রম</h3>
          {todayActivities.length > 0 ? (
            <div className="space-y-2">
              {todayActivities.map(activity => (
                <div 
                  key={activity.id} 
                  className={`glass-card rounded-xl p-4 flex items-center justify-between ${
                    activity.isCompleted ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                      activity.isCompleted ? 'bg-green-100' : 'bg-slate-100'
                    }`}>
                      {ACTIVITY_CONFIG[activity.type]?.icon || '📋'}
                    </div>
                    <div>
                      <div className="font-medium">
                        {ACTIVITY_CONFIG[activity.type]?.labelBn || activity.type}
                      </div>
                      <div className="text-sm text-slate-500">
                        নির্ধারিত: {activity.scheduledTime.split('T')[1]?.substring(0, 5) || activity.scheduledTime}
                      </div>
                    </div>
                  </div>
                  {!activity.isCompleted && (
                    <button
                      onClick={() => onCompleteActivity?.(activity.id)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                    >
                      সম্পন্ন
                    </button>
                  )}
                  {activity.isCompleted && (
                    <span className="text-green-600">✓ সম্পন্ন</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <div className="text-4xl mb-2">📋</div>
              <p>আজকের জন্য কোনো কার্যক্রম নির্ধারিত নেই</p>
            </div>
          )}
        </div>
      )}

      {/* Check-Ins Tab */}
      {activeTab === 'checkIns' && (
        <div className="space-y-4">
          <h3 className="font-bold text-slate-700">✓ সাম্প্রতিক চেক-ইন</h3>
          {elder.checkIns.length > 0 ? (
            <div className="space-y-3">
              {elder.checkIns.slice(0, 10).map(checkIn => (
                <div key={checkIn.id} className="glass-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{MOOD_EMOJI[checkIn.moodRating]}</span>
                      <div>
                        <div className="font-medium">
                          {new Date(checkIn.date).toLocaleDateString('bn-BD')}
                        </div>
                        <div className="text-sm text-slate-500">
                          {checkIn.time.substring(0, 5)} • {{
                            morning: 'সকাল',
                            afternoon: 'দুপুর',
                            evening: 'সন্ধ্যা',
                            night: 'রাত',
                            emergency: 'জরুরি',
                          }[checkIn.type]}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      checkIn.healthStatus === 'good' ? 'bg-green-100 text-green-700' :
                      checkIn.healthStatus === 'fair' ? 'bg-amber-100 text-amber-700' :
                      checkIn.healthStatus === 'poor' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {{
                        good: 'ভালো',
                        fair: 'মোটামুটি',
                        poor: 'খারাপ',
                        emergency: 'জরুরি',
                      }[checkIn.healthStatus]}
                    </span>
                  </div>
                  {checkIn.vitals && (
                    <div className="flex gap-3 text-xs text-slate-500 flex-wrap">
                      {checkIn.vitals.bloodPressure && <span>BP: {checkIn.vitals.bloodPressure}</span>}
                      {checkIn.vitals.heartRate && <span>HR: {checkIn.vitals.heartRate}</span>}
                      {checkIn.vitals.temperature && <span>Temp: {checkIn.vitals.temperature}°</span>}
                      {checkIn.vitals.bloodSugar && <span>Sugar: {checkIn.vitals.bloodSugar}</span>}
                    </div>
                  )}
                  {checkIn.notes && (
                    <p className="text-sm text-slate-600 mt-2">{checkIn.notes}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <div className="text-4xl mb-2">📋</div>
              <p>কোনো চেক-ইন নেই</p>
            </div>
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <h3 className="font-bold text-slate-700">🔔 সতর্কতা</h3>
          {alerts.filter(a => !a.isResolved).length > 0 ? (
            <div className="space-y-2">
              {alerts.filter(a => !a.isResolved).map(alert => (
                <div 
                  key={alert.id} 
                  className={`glass-card rounded-xl p-4 border-l-4 ${
                    alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                    alert.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                    alert.severity === 'medium' ? 'border-amber-500 bg-amber-50' :
                    'border-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{alert.titleBn || alert.title}</h4>
                      <p className="text-sm text-slate-600">{alert.description}</p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(alert.createdAt).toLocaleTimeString('bn-BD')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <div className="text-4xl mb-2">✓</div>
              <p>কোনো সক্রিয় সতর্কতা নেই</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ElderCareTracker;

