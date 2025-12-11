import React, { useState, useMemo } from 'react';

// ============ TYPES ============
export interface GrowthRecord {
  id: string;
  date: string;
  heightCm: number;
  weightKg: number;
  headCircumferenceCm?: number;
  bmiPercentile?: number;
  heightPercentile?: number;
  weightPercentile?: number;
  notes?: string;
}

export interface Vaccination {
  id: string;
  name: string;
  nameBn: string;
  recommendedAgeMonths: number;
  dueDate: string;
  givenDate?: string;
  isGiven: boolean;
  batchNumber?: string;
  givenBy?: string;
  notes?: string;
}

export interface Milestone {
  id: string;
  category: 'motor' | 'social' | 'language' | 'cognitive';
  name: string;
  nameBn: string;
  expectedAgeMonths: number;
  achievedDate?: string;
  isAchieved: boolean;
  notes?: string;
}

export interface ChildProfile {
  id: string;
  name: string;
  nameBn?: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female';
  birthWeight?: number;
  birthHeight?: number;
  bloodGroup?: string;
  growthRecords: GrowthRecord[];
  vaccinations: Vaccination[];
  milestones: Milestone[];
  allergies?: string[];
  specialNeeds?: string;
}

interface ChildHealthTrackerProps {
  child: ChildProfile;
  onAddGrowthRecord?: (record: Omit<GrowthRecord, 'id'>) => void;
  onMarkVaccination?: (vaccinationId: string, givenDate: string, batchNumber?: string) => void;
  onAchieveMilestone?: (milestoneId: string, date: string) => void;
  onUpdateChild?: (updates: Partial<ChildProfile>) => void;
}

// ============ STANDARD VACCINATIONS (BANGLADESH EPI) ============
export const STANDARD_VACCINATIONS = [
  { name: 'BCG', nameBn: 'বিসিজি', ageMonths: 0, description: 'যক্ষ্মা প্রতিরোধ' },
  { name: 'Hepatitis B (Birth)', nameBn: 'হেপাটাইটিস বি (জন্মের সময়)', ageMonths: 0, description: 'হেপাটাইটিস বি প্রতিরোধ' },
  { name: 'OPV-0', nameBn: 'ওপিভি-০', ageMonths: 0, description: 'পোলিও প্রতিরোধ' },
  { name: 'Pentavalent-1', nameBn: 'পেন্টাভ্যালেন্ট-১', ageMonths: 1.5, description: 'ডিপথেরিয়া, হুপিং কাশি, টিটেনাস, হেপ-বি, হিব' },
  { name: 'OPV-1', nameBn: 'ওপিভি-১', ageMonths: 1.5, description: 'পোলিও প্রতিরোধ' },
  { name: 'PCV-1', nameBn: 'পিসিভি-১', ageMonths: 1.5, description: 'নিউমোনিয়া প্রতিরোধ' },
  { name: 'Pentavalent-2', nameBn: 'পেন্টাভ্যালেন্ট-২', ageMonths: 2.5, description: 'ডিপথেরিয়া, হুপিং কাশি, টিটেনাস, হেপ-বি, হিব' },
  { name: 'OPV-2', nameBn: 'ওপিভি-২', ageMonths: 2.5, description: 'পোলিও প্রতিরোধ' },
  { name: 'PCV-2', nameBn: 'পিসিভি-২', ageMonths: 2.5, description: 'নিউমোনিয়া প্রতিরোধ' },
  { name: 'Pentavalent-3', nameBn: 'পেন্টাভ্যালেন্ট-৩', ageMonths: 3.5, description: 'ডিপথেরিয়া, হুপিং কাশি, টিটেনাস, হেপ-বি, হিব' },
  { name: 'OPV-3', nameBn: 'ওপিভি-৩', ageMonths: 3.5, description: 'পোলিও প্রতিরোধ' },
  { name: 'PCV-3', nameBn: 'পিসিভি-৩', ageMonths: 3.5, description: 'নিউমোনিয়া প্রতিরোধ' },
  { name: 'IPV', nameBn: 'আইপিভি', ageMonths: 3.5, description: 'পোলিও প্রতিরোধ (ইনজেকশন)' },
  { name: 'MR-1', nameBn: 'এমআর-১', ageMonths: 9, description: 'হাম ও রুবেলা প্রতিরোধ' },
  { name: 'MR-2', nameBn: 'এমআর-২', ageMonths: 15, description: 'হাম ও রুবেলা প্রতিরোধ (বুস্টার)' },
];

// ============ DEVELOPMENTAL MILESTONES ============
export const DEVELOPMENTAL_MILESTONES = [
  // Motor
  { category: 'motor' as const, name: 'Head Control', nameBn: 'মাথা ধরে রাখা', ageMonths: 3 },
  { category: 'motor' as const, name: 'Rolls Over', nameBn: 'গড়াগড়ি দেওয়া', ageMonths: 4 },
  { category: 'motor' as const, name: 'Sits Without Support', nameBn: 'সাহায্য ছাড়া বসা', ageMonths: 6 },
  { category: 'motor' as const, name: 'Crawls', nameBn: 'হামাগুড়ি দেওয়া', ageMonths: 8 },
  { category: 'motor' as const, name: 'Stands With Support', nameBn: 'ধরে দাঁড়ানো', ageMonths: 9 },
  { category: 'motor' as const, name: 'Walks Independently', nameBn: 'একা হাঁটা', ageMonths: 12 },
  // Social
  { category: 'social' as const, name: 'Social Smile', nameBn: 'সামাজিক হাসি', ageMonths: 2 },
  { category: 'social' as const, name: 'Recognizes Parents', nameBn: 'মা-বাবাকে চেনা', ageMonths: 3 },
  { category: 'social' as const, name: 'Stranger Anxiety', nameBn: 'অপরিচিতে ভয়', ageMonths: 8 },
  { category: 'social' as const, name: 'Waves Bye-Bye', nameBn: 'টাটা করা', ageMonths: 10 },
  // Language
  { category: 'language' as const, name: 'Coos', nameBn: 'আওয়াজ করা', ageMonths: 2 },
  { category: 'language' as const, name: 'Babbles', nameBn: 'বুলি বলা', ageMonths: 6 },
  { category: 'language' as const, name: 'Says Mama/Dada', nameBn: 'মা/বাবা বলা', ageMonths: 10 },
  { category: 'language' as const, name: 'First Words', nameBn: 'প্রথম শব্দ', ageMonths: 12 },
  // Cognitive
  { category: 'cognitive' as const, name: 'Follows Moving Object', nameBn: 'চলমান বস্তু দেখা', ageMonths: 2 },
  { category: 'cognitive' as const, name: 'Object Permanence', nameBn: 'বস্তু স্থায়িত্ব বোঝা', ageMonths: 8 },
  { category: 'cognitive' as const, name: 'Points to Objects', nameBn: 'আঙুল দিয়ে দেখানো', ageMonths: 10 },
];

// ============ COMPONENT ============
export const ChildHealthTracker: React.FC<ChildHealthTrackerProps> = ({
  child,
  onAddGrowthRecord,
  onMarkVaccination,
  onAchieveMilestone,
  onUpdateChild,
}) => {
  const [activeTab, setActiveTab] = useState<'growth' | 'vaccines' | 'milestones' | 'overview'>('overview');
  const [showAddGrowth, setShowAddGrowth] = useState(false);
  const [growthForm, setGrowthForm] = useState({ heightCm: '', weightKg: '', headCm: '', notes: '' });

  // Calculate age
  const ageData = useMemo(() => {
    const birth = new Date(child.dateOfBirth);
    const now = new Date();
    const diffMs = now.getTime() - birth.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const totalMonths = years * 12 + months;
    return { years, months, totalMonths, days: diffDays };
  }, [child.dateOfBirth]);

  // Calculate BMI for latest record
  const latestGrowth = child.growthRecords[0];
  const bmi = latestGrowth 
    ? (latestGrowth.weightKg / Math.pow(latestGrowth.heightCm / 100, 2)).toFixed(1)
    : null;

  // Vaccination status
  const vaccinationStats = useMemo(() => {
    const total = child.vaccinations.length;
    const completed = child.vaccinations.filter(v => v.isGiven).length;
    const overdue = child.vaccinations.filter(v => !v.isGiven && new Date(v.dueDate) < new Date()).length;
    const upcoming = child.vaccinations.filter(v => {
      if (v.isGiven) return false;
      const due = new Date(v.dueDate);
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return due >= today && due <= nextMonth;
    }).length;
    return { total, completed, overdue, upcoming, percentage: Math.round((completed / total) * 100) };
  }, [child.vaccinations]);

  // Milestone status
  const milestoneStats = useMemo(() => {
    const total = child.milestones.length;
    const achieved = child.milestones.filter(m => m.isAchieved).length;
    const expected = child.milestones.filter(m => m.expectedAgeMonths <= ageData.totalMonths).length;
    const onTrack = child.milestones.filter(m => m.isAchieved && m.expectedAgeMonths <= ageData.totalMonths).length;
    return { total, achieved, expected, onTrack };
  }, [child.milestones, ageData.totalMonths]);

  // Handle add growth record
  const handleAddGrowth = () => {
    if (!growthForm.heightCm || !growthForm.weightKg) return;
    onAddGrowthRecord?.({
      date: new Date().toISOString().split('T')[0],
      heightCm: parseFloat(growthForm.heightCm),
      weightKg: parseFloat(growthForm.weightKg),
      headCircumferenceCm: growthForm.headCm ? parseFloat(growthForm.headCm) : undefined,
      notes: growthForm.notes || undefined,
    });
    setGrowthForm({ heightCm: '', weightKg: '', headCm: '', notes: '' });
    setShowAddGrowth(false);
  };

  return (
    <div className="space-y-6">
      {/* Child Header */}
      <div className="glass-strong rounded-2xl p-6 border border-white/60">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-3xl">
            {child.gender === 'Male' ? '👦' : '👧'}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-700">{child.nameBn || child.name}</h2>
            <p className="text-slate-500">
              {ageData.years > 0 && `${ageData.years} বছর `}
              {ageData.months > 0 && `${ageData.months} মাস`}
              {ageData.years === 0 && ageData.months === 0 && `${ageData.days} দিন`}
              {' • '}{child.gender === 'Male' ? 'ছেলে' : 'মেয়ে'}
              {child.bloodGroup && ` • ${child.bloodGroup}`}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {latestGrowth?.heightCm || '-'}<span className="text-sm">সেমি</span>
            </div>
            <div className="text-xs text-slate-500">উচ্চতা</div>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {latestGrowth?.weightKg || '-'}<span className="text-sm">কেজি</span>
            </div>
            <div className="text-xs text-slate-500">ওজন</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">{bmi || '-'}</div>
            <div className="text-xs text-slate-500">BMI</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-amber-600">{vaccinationStats.percentage}%</div>
            <div className="text-xs text-slate-500">টিকা সম্পন্ন</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'overview', label: 'সারসংক্ষেপ', icon: '📊' },
          { id: 'growth', label: 'বৃদ্ধি', icon: '📈' },
          { id: 'vaccines', label: 'টিকা', icon: '💉' },
          { id: 'milestones', label: 'মাইলস্টোন', icon: '🎯' },
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
          {/* Vaccination Alert */}
          {vaccinationStats.overdue > 0 && (
            <div className="glass-card rounded-xl p-4 border-l-4 border-red-500">
              <h3 className="font-bold text-red-600 flex items-center gap-2">
                ⚠️ বকেয়া টিকা
              </h3>
              <p className="text-slate-600 text-sm mt-1">
                {vaccinationStats.overdue}টি টিকা বাকি আছে। অনুগ্রহ করে শীঘ্রই দেওয়ান।
              </p>
              <button 
                onClick={() => setActiveTab('vaccines')}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                টিকার তালিকা দেখুন →
              </button>
            </div>
          )}

          {/* Upcoming Vaccines */}
          {vaccinationStats.upcoming > 0 && (
            <div className="glass-card rounded-xl p-4 border-l-4 border-amber-500">
              <h3 className="font-bold text-amber-600 flex items-center gap-2">
                📅 আসন্ন টিকা
              </h3>
              <p className="text-slate-600 text-sm mt-1">
                আগামী মাসে {vaccinationStats.upcoming}টি টিকা দিতে হবে।
              </p>
            </div>
          )}

          {/* Growth Summary */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              📈 বৃদ্ধির সারাংশ
            </h3>
            {child.growthRecords.length > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">সর্বশেষ পরিমাপ:</span>
                  <span className="font-medium">{new Date(latestGrowth.date).toLocaleDateString('bn-BD')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">জন্মের সময় ওজন:</span>
                  <span className="font-medium">{child.birthWeight || '-'} কেজি</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">বর্তমান ওজন:</span>
                  <span className="font-medium">{latestGrowth.weightKg} কেজি</span>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">কোনো পরিমাপ নেই</p>
            )}
          </div>

          {/* Milestone Summary */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              🎯 মাইলস্টোন অগ্রগতি
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">মোট মাইলস্টোন:</span>
                <span className="font-medium">{milestoneStats.total}টি</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">অর্জিত:</span>
                <span className="font-medium text-green-600">{milestoneStats.achieved}টি</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">প্রত্যাশিত (বয়স অনুযায়ী):</span>
                <span className="font-medium">{milestoneStats.expected}টি</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Growth Tab */}
      {activeTab === 'growth' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-700">📈 বৃদ্ধির রেকর্ড</h3>
            <button
              onClick={() => setShowAddGrowth(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              + নতুন পরিমাপ
            </button>
          </div>

          {/* Add Growth Modal */}
          {showAddGrowth && (
            <div className="glass-card rounded-xl p-4 border border-blue-200">
              <h4 className="font-medium mb-3">নতুন পরিমাপ যোগ করুন</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">উচ্চতা (সেমি)</label>
                  <input
                    type="number"
                    value={growthForm.heightCm}
                    onChange={(e) => setGrowthForm(p => ({ ...p, heightCm: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="৫০"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">ওজন (কেজি)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={growthForm.weightKg}
                    onChange={(e) => setGrowthForm(p => ({ ...p, weightKg: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="৩.৫"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">মাথার পরিধি (সেমি)</label>
                  <input
                    type="number"
                    value={growthForm.headCm}
                    onChange={(e) => setGrowthForm(p => ({ ...p, headCm: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="৩৫"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">নোট</label>
                  <input
                    type="text"
                    value={growthForm.notes}
                    onChange={(e) => setGrowthForm(p => ({ ...p, notes: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="ডাক্তারের মন্তব্য"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleAddGrowth}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  সংরক্ষণ
                </button>
                <button
                  onClick={() => setShowAddGrowth(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                >
                  বাতিল
                </button>
              </div>
            </div>
          )}

          {/* Growth Records List */}
          <div className="space-y-2">
            {child.growthRecords.length > 0 ? (
              child.growthRecords.map((record, idx) => (
                <div key={record.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{new Date(record.date).toLocaleDateString('bn-BD')}</div>
                    <div className="text-sm text-slate-500">
                      {record.heightCm} সেমি • {record.weightKg} কেজি
                      {record.headCircumferenceCm && ` • মাথা ${record.headCircumferenceCm} সেমি`}
                    </div>
                  </div>
                  {idx === 0 && (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">সর্বশেষ</span>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <div className="text-4xl mb-2">📊</div>
                <p>কোনো বৃদ্ধির রেকর্ড নেই</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vaccines Tab */}
      {activeTab === 'vaccines' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-700">💉 টিকার তালিকা</h3>
            <div className="text-sm">
              <span className="text-green-600 font-medium">{vaccinationStats.completed}</span>
              <span className="text-slate-400">/{vaccinationStats.total} সম্পন্ন</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
              style={{ width: `${vaccinationStats.percentage}%` }}
            />
          </div>

          {/* Overdue */}
          {child.vaccinations.filter(v => !v.isGiven && new Date(v.dueDate) < new Date()).length > 0 && (
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <h4 className="font-medium text-red-700 mb-2">⚠️ বকেয়া টিকা</h4>
              <div className="space-y-2">
                {child.vaccinations
                  .filter(v => !v.isGiven && new Date(v.dueDate) < new Date())
                  .map(vaccine => (
                    <div key={vaccine.id} className="flex items-center justify-between bg-white rounded-lg p-2">
                      <div>
                        <div className="font-medium">{vaccine.nameBn}</div>
                        <div className="text-xs text-red-500">
                          {new Date(vaccine.dueDate).toLocaleDateString('bn-BD')} পর্যন্ত ছিল
                        </div>
                      </div>
                      <button
                        onClick={() => onMarkVaccination?.(vaccine.id, new Date().toISOString().split('T')[0])}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                      >
                        সম্পন্ন
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* All Vaccines */}
          <div className="space-y-2">
            {child.vaccinations.map(vaccine => (
              <div 
                key={vaccine.id} 
                className={`glass-card rounded-xl p-4 flex items-center justify-between ${
                  vaccine.isGiven ? 'opacity-70' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    vaccine.isGiven ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {vaccine.isGiven ? '✓' : '💉'}
                  </div>
                  <div>
                    <div className="font-medium">{vaccine.nameBn}</div>
                    <div className="text-xs text-slate-500">
                      {vaccine.isGiven 
                        ? `দেওয়া হয়েছে: ${new Date(vaccine.givenDate!).toLocaleDateString('bn-BD')}`
                        : `নির্ধারিত: ${new Date(vaccine.dueDate).toLocaleDateString('bn-BD')}`
                      }
                    </div>
                  </div>
                </div>
                {!vaccine.isGiven && (
                  <button
                    onClick={() => onMarkVaccination?.(vaccine.id, new Date().toISOString().split('T')[0])}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    দেওয়া হয়েছে
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Milestones Tab */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          <h3 className="font-bold text-slate-700">🎯 বিকাশের মাইলস্টোন</h3>

          {['motor', 'social', 'language', 'cognitive'].map(category => {
            const categoryLabel = {
              motor: '🏃 শারীরিক দক্ষতা',
              social: '👋 সামাজিক দক্ষতা',
              language: '💬 ভাষা দক্ষতা',
              cognitive: '🧠 জ্ঞানীয় দক্ষতা',
            }[category];

            const categoryMilestones = child.milestones.filter(m => m.category === category);
            
            return (
              <div key={category} className="glass-card rounded-xl p-4">
                <h4 className="font-medium text-slate-700 mb-3">{categoryLabel}</h4>
                <div className="space-y-2">
                  {categoryMilestones.map(milestone => {
                    const isPast = milestone.expectedAgeMonths <= ageData.totalMonths;
                    return (
                      <div 
                        key={milestone.id}
                        className={`flex items-center justify-between p-2 rounded-lg ${
                          milestone.isAchieved ? 'bg-green-50' : isPast ? 'bg-amber-50' : 'bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                            milestone.isAchieved ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
                          }`}>
                            {milestone.isAchieved ? '✓' : milestone.expectedAgeMonths}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{milestone.nameBn}</div>
                            <div className="text-xs text-slate-400">
                              প্রত্যাশিত বয়স: {milestone.expectedAgeMonths} মাস
                            </div>
                          </div>
                        </div>
                        {!milestone.isAchieved && (
                          <button
                            onClick={() => onAchieveMilestone?.(milestone.id, new Date().toISOString().split('T')[0])}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            অর্জিত
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChildHealthTracker;

