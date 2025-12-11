import React, { useState, useMemo, useCallback } from 'react';

// ============ TYPES ============
export interface ChronicCondition {
  id: string;
  name: string;
  diagnosedDate?: string;
  status: 'active' | 'managed' | 'resolved';
  medications?: string[];
  notes?: string;
}

export interface Allergy {
  id: string;
  name: string;
  type: 'drug' | 'food' | 'environmental' | 'other';
  severity: 'mild' | 'moderate' | 'severe';
  reaction?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate?: string;
  endDate?: string;
  prescribedBy?: string;
  isActive: boolean;
  reminder?: boolean;
}

export interface Surgery {
  id: string;
  name: string;
  date: string;
  hospital?: string;
  surgeon?: string;
  outcome?: string;
  notes?: string;
}

export interface FamilyHistory {
  id: string;
  condition: string;
  relation: string;
  ageOfOnset?: number;
  notes?: string;
}

export interface Vaccination {
  id: string;
  name: string;
  date: string;
  dose?: string;
  nextDueDate?: string;
  provider?: string;
}

export interface MedicalHistoryData {
  chronicConditions: ChronicCondition[];
  allergies: Allergy[];
  medications: Medication[];
  surgeries: Surgery[];
  familyHistory: FamilyHistory[];
  vaccinations: Vaccination[];
}

interface MedicalHistoryManagerProps {
  data: MedicalHistoryData;
  onUpdate: (data: MedicalHistoryData) => Promise<void>;
  readOnly?: boolean;
}

// ============ CONSTANTS ============
const COMMON_CONDITIONS = [
  'ডায়াবেটিস', 'উচ্চ রক্তচাপ', 'হাঁপানি', 'থাইরয়েড', 'হৃদরোগ',
  'আর্থ্রাইটিস', 'মাইগ্রেন', 'গ্যাস্ট্রাইটিস', 'কিডনি সমস্যা', 'লিভার সমস্যা'
];

const COMMON_ALLERGIES = [
  'পেনিসিলিন', 'অ্যাসপিরিন', 'সালফা ড্রাগ', 'চিংড়ি', 'বাদাম',
  'ডিম', 'দুধ', 'ধুলাবালি', 'পোষা প্রাণী', 'মৌসুমী ফুল'
];

const FAMILY_RELATIONS = [
  { value: 'father', label: 'বাবা' },
  { value: 'mother', label: 'মা' },
  { value: 'brother', label: 'ভাই' },
  { value: 'sister', label: 'বোন' },
  { value: 'grandfather', label: 'দাদা/নানা' },
  { value: 'grandmother', label: 'দাদি/নানি' },
  { value: 'uncle', label: 'চাচা/মামা' },
  { value: 'aunt', label: 'চাচি/মামি' },
];

const COMMON_VACCINATIONS = [
  'COVID-19', 'ফ্লু (সিজনাল)', 'হেপাটাইটিস B', 'টিটেনাস', 'নিউমোনিয়া',
  'টাইফয়েড', 'হেপাটাইটিস A', 'MMR', 'Tdap'
];

// ============ MEDICAL HISTORY MANAGER COMPONENT ============
export const MedicalHistoryManager: React.FC<MedicalHistoryManagerProps> = ({
  data,
  onUpdate,
  readOnly = false,
}) => {
  // State
  const [activeTab, setActiveTab] = useState<'conditions' | 'allergies' | 'medications' | 'surgeries' | 'family' | 'vaccinations'>('conditions');
  const [isSaving, setIsSaving] = useState(false);
  const [localData, setLocalData] = useState<MedicalHistoryData>(data);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Update data locally and then save
  const updateData = useCallback(async (updates: Partial<MedicalHistoryData>) => {
    const newData = { ...localData, ...updates };
    setLocalData(newData);
    
    if (!readOnly) {
      setIsSaving(true);
      try {
        await onUpdate(newData);
      } catch (error) {
        console.error('Error saving:', error);
      } finally {
        setIsSaving(false);
      }
    }
  }, [localData, onUpdate, readOnly]);

  // Add condition
  const addCondition = useCallback((condition: Omit<ChronicCondition, 'id'>) => {
    const newCondition: ChronicCondition = {
      id: `cond-${Date.now()}`,
      ...condition,
    };
    updateData({ chronicConditions: [...localData.chronicConditions, newCondition] });
  }, [localData, updateData]);

  // Remove condition
  const removeCondition = useCallback((id: string) => {
    updateData({ chronicConditions: localData.chronicConditions.filter(c => c.id !== id) });
  }, [localData, updateData]);

  // Add allergy
  const addAllergy = useCallback((allergy: Omit<Allergy, 'id'>) => {
    const newAllergy: Allergy = {
      id: `allergy-${Date.now()}`,
      ...allergy,
    };
    updateData({ allergies: [...localData.allergies, newAllergy] });
  }, [localData, updateData]);

  // Remove allergy
  const removeAllergy = useCallback((id: string) => {
    updateData({ allergies: localData.allergies.filter(a => a.id !== id) });
  }, [localData, updateData]);

  // Add medication
  const addMedication = useCallback((medication: Omit<Medication, 'id'>) => {
    const newMedication: Medication = {
      id: `med-${Date.now()}`,
      ...medication,
    };
    updateData({ medications: [...localData.medications, newMedication] });
  }, [localData, updateData]);

  // Toggle medication active status
  const toggleMedicationActive = useCallback((id: string) => {
    updateData({
      medications: localData.medications.map(m =>
        m.id === id ? { ...m, isActive: !m.isActive } : m
      ),
    });
  }, [localData, updateData]);

  // Remove medication
  const removeMedication = useCallback((id: string) => {
    updateData({ medications: localData.medications.filter(m => m.id !== id) });
  }, [localData, updateData]);

  // Add surgery
  const addSurgery = useCallback((surgery: Omit<Surgery, 'id'>) => {
    const newSurgery: Surgery = {
      id: `surgery-${Date.now()}`,
      ...surgery,
    };
    updateData({ surgeries: [...localData.surgeries, newSurgery] });
  }, [localData, updateData]);

  // Add family history
  const addFamilyHistory = useCallback((history: Omit<FamilyHistory, 'id'>) => {
    const newHistory: FamilyHistory = {
      id: `fh-${Date.now()}`,
      ...history,
    };
    updateData({ familyHistory: [...localData.familyHistory, newHistory] });
  }, [localData, updateData]);

  // Add vaccination
  const addVaccination = useCallback((vaccination: Omit<Vaccination, 'id'>) => {
    const newVaccination: Vaccination = {
      id: `vax-${Date.now()}`,
      ...vaccination,
    };
    updateData({ vaccinations: [...localData.vaccinations, newVaccination] });
  }, [localData, updateData]);

  // Format date for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('bn-BD');
  };

  // Stats
  const stats = useMemo(() => ({
    activeConditions: localData.chronicConditions.filter(c => c.status === 'active').length,
    severeAllergies: localData.allergies.filter(a => a.severity === 'severe').length,
    activeMedications: localData.medications.filter(m => m.isActive).length,
    totalSurgeries: localData.surgeries.length,
    familyRisks: localData.familyHistory.length,
    upcomingVaccinations: localData.vaccinations.filter(v => v.nextDueDate && new Date(v.nextDueDate) > new Date()).length,
  }), [localData]);

  // Tabs config
  const tabs = [
    { id: 'conditions', label: 'রোগ', icon: '🩺', count: localData.chronicConditions.length },
    { id: 'allergies', label: 'এলার্জি', icon: '⚠️', count: localData.allergies.length },
    { id: 'medications', label: 'ওষুধ', icon: '💊', count: localData.medications.filter(m => m.isActive).length },
    { id: 'surgeries', label: 'সার্জারি', icon: '🏥', count: localData.surgeries.length },
    { id: 'family', label: 'পারিবারিক', icon: '👨‍👩‍👧‍👦', count: localData.familyHistory.length },
    { id: 'vaccinations', label: 'টিকা', icon: '💉', count: localData.vaccinations.length },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.activeConditions}</div>
          <div className="text-xs text-slate-500">সক্রিয় রোগ</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{stats.severeAllergies}</div>
          <div className="text-xs text-slate-500">গুরুতর এলার্জি</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.activeMedications}</div>
          <div className="text-xs text-slate-500">চলমান ওষুধ</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.totalSurgeries}</div>
          <div className="text-xs text-slate-500">সার্জারি</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold text-teal-600">{stats.familyRisks}</div>
          <div className="text-xs text-slate-500">পারিবারিক ঝুঁকি</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.upcomingVaccinations}</div>
          <div className="text-xs text-slate-500">আসন্ন টিকা</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card p-2 flex gap-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-blue-500 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-white/30' : 'bg-slate-200'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'conditions' && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-lg">🩺 দীর্ঘস্থায়ী রোগ</h3>
            {!readOnly && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
              >
                + যোগ করুন
              </button>
            )}
          </div>

          {/* Quick Add */}
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              {COMMON_CONDITIONS.filter(c => !localData.chronicConditions.find(cc => cc.name === c)).slice(0, 6).map(condition => (
                <button
                  key={condition}
                  onClick={() => addCondition({ name: condition, status: 'active' })}
                  className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm hover:bg-slate-200"
                >
                  + {condition}
                </button>
              ))}
            </div>
          )}

          {/* Conditions List */}
          <div className="space-y-3">
            {localData.chronicConditions.map(condition => (
              <div key={condition.id} className="p-4 glass-subtle rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800">{condition.name}</div>
                  <div className="text-sm text-slate-500 flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      condition.status === 'active' ? 'bg-red-100 text-red-700' :
                      condition.status === 'managed' ? 'bg-green-100 text-green-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {condition.status === 'active' ? 'সক্রিয়' : condition.status === 'managed' ? 'নিয়ন্ত্রিত' : 'সেরে গেছে'}
                    </span>
                    {condition.diagnosedDate && (
                      <span>নির্ণয়: {formatDate(condition.diagnosedDate)}</span>
                    )}
                  </div>
                </div>
                {!readOnly && (
                  <button
                    onClick={() => removeCondition(condition.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
            
            {localData.chronicConditions.length === 0 && (
              <p className="text-center text-slate-400 py-8">কোনো দীর্ঘস্থায়ী রোগ নেই</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'allergies' && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-lg">⚠️ এলার্জি</h3>
            {!readOnly && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
              >
                + যোগ করুন
              </button>
            )}
          </div>

          {/* Quick Add */}
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGIES.filter(a => !localData.allergies.find(al => al.name === a)).slice(0, 6).map(allergy => (
                <button
                  key={allergy}
                  onClick={() => addAllergy({ name: allergy, type: 'other', severity: 'moderate' })}
                  className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm hover:bg-slate-200"
                >
                  + {allergy}
                </button>
              ))}
            </div>
          )}

          {/* Allergies List */}
          <div className="space-y-3">
            {localData.allergies.map(allergy => (
              <div key={allergy.id} className="p-4 glass-subtle rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800">{allergy.name}</div>
                  <div className="text-sm text-slate-500 flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      allergy.severity === 'severe' ? 'bg-red-100 text-red-700' :
                      allergy.severity === 'moderate' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {allergy.severity === 'severe' ? 'গুরুতর' : allergy.severity === 'moderate' ? 'মাঝারি' : 'হালকা'}
                    </span>
                    <span>{allergy.type === 'drug' ? '💊 ওষুধ' : allergy.type === 'food' ? '🍽️ খাবার' : allergy.type === 'environmental' ? '🌳 পরিবেশ' : '🔹 অন্যান্য'}</span>
                  </div>
                  {allergy.reaction && <p className="text-sm text-red-500 mt-1">প্রতিক্রিয়া: {allergy.reaction}</p>}
                </div>
                {!readOnly && (
                  <button
                    onClick={() => removeAllergy(allergy.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
            
            {localData.allergies.length === 0 && (
              <p className="text-center text-slate-400 py-8">কোনো জানা এলার্জি নেই</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'medications' && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-lg">💊 ওষুধের তালিকা</h3>
            {!readOnly && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
              >
                + যোগ করুন
              </button>
            )}
          </div>

          {/* Active Medications */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-600">চলমান ওষুধ</h4>
            {localData.medications.filter(m => m.isActive).map(med => (
              <div key={med.id} className="p-4 glass-subtle rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-800">{med.name}</div>
                    <div className="text-sm text-slate-500">
                      {med.dosage} • {med.frequency}
                    </div>
                    {med.prescribedBy && (
                      <div className="text-xs text-slate-400 mt-1">প্রেসক্রাইবড: {med.prescribedBy}</div>
                    )}
                  </div>
                  {!readOnly && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleMedicationActive(med.id)}
                        className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-sm"
                      >
                        বন্ধ করুন
                      </button>
                      <button
                        onClick={() => removeMedication(med.id)}
                        className="p-2 text-red-400 hover:text-red-600"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {localData.medications.filter(m => m.isActive).length === 0 && (
              <p className="text-slate-400 text-sm">কোনো চলমান ওষুধ নেই</p>
            )}
          </div>

          {/* Past Medications */}
          {localData.medications.filter(m => !m.isActive).length > 0 && (
            <div className="space-y-3 border-t border-slate-200 pt-4">
              <h4 className="text-sm font-medium text-slate-600">পূর্ববর্তী ওষুধ</h4>
              {localData.medications.filter(m => !m.isActive).map(med => (
                <div key={med.id} className="p-3 glass-subtle rounded-xl opacity-60">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-slate-700">{med.name}</div>
                      <div className="text-sm text-slate-500">{med.dosage}</div>
                    </div>
                    {!readOnly && (
                      <button
                        onClick={() => toggleMedicationActive(med.id)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm"
                      >
                        পুনরায় শুরু
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'surgeries' && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-lg">🏥 সার্জারি ইতিহাস</h3>
            {!readOnly && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
              >
                + যোগ করুন
              </button>
            )}
          </div>

          <div className="space-y-3">
            {localData.surgeries.map(surgery => (
              <div key={surgery.id} className="p-4 glass-subtle rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-800">{surgery.name}</div>
                    <div className="text-sm text-slate-500 flex items-center gap-3">
                      <span>📅 {formatDate(surgery.date)}</span>
                      {surgery.hospital && <span>🏥 {surgery.hospital}</span>}
                    </div>
                    {surgery.notes && <p className="text-sm text-slate-600 mt-1">{surgery.notes}</p>}
                  </div>
                </div>
              </div>
            ))}
            
            {localData.surgeries.length === 0 && (
              <p className="text-center text-slate-400 py-8">কোনো সার্জারির ইতিহাস নেই</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'family' && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-lg">👨‍👩‍👧‍👦 পারিবারিক চিকিৎসা ইতিহাস</h3>
            {!readOnly && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
              >
                + যোগ করুন
              </button>
            )}
          </div>

          <div className="space-y-3">
            {localData.familyHistory.map(history => (
              <div key={history.id} className="p-4 glass-subtle rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800">{history.condition}</div>
                  <div className="text-sm text-slate-500">
                    সম্পর্ক: {FAMILY_RELATIONS.find(r => r.value === history.relation)?.label || history.relation}
                    {history.ageOfOnset && ` • শুরু: ${history.ageOfOnset} বছর বয়সে`}
                  </div>
                </div>
              </div>
            ))}
            
            {localData.familyHistory.length === 0 && (
              <p className="text-center text-slate-400 py-8">কোনো পারিবারিক চিকিৎসা ইতিহাস নেই</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'vaccinations' && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-lg">💉 টিকা রেকর্ড</h3>
            {!readOnly && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
              >
                + যোগ করুন
              </button>
            )}
          </div>

          {/* Quick Add */}
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              {COMMON_VACCINATIONS.filter(v => !localData.vaccinations.find(vx => vx.name === v)).slice(0, 5).map(vax => (
                <button
                  key={vax}
                  onClick={() => addVaccination({ name: vax, date: new Date().toISOString().split('T')[0] })}
                  className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm hover:bg-slate-200"
                >
                  + {vax}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {localData.vaccinations.map(vax => (
              <div key={vax.id} className="p-4 glass-subtle rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800">{vax.name}</div>
                  <div className="text-sm text-slate-500 flex items-center gap-3">
                    <span>📅 {formatDate(vax.date)}</span>
                    {vax.dose && <span>ডোজ: {vax.dose}</span>}
                    {vax.nextDueDate && (
                      <span className={new Date(vax.nextDueDate) < new Date() ? 'text-red-500' : 'text-green-600'}>
                        পরবর্তী: {formatDate(vax.nextDueDate)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {localData.vaccinations.length === 0 && (
              <p className="text-center text-slate-400 py-8">কোনো টিকা রেকর্ড নেই</p>
            )}
          </div>
        </div>
      )}

      {/* Saving indicator */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-lg">
          ⏳ সংরক্ষণ হচ্ছে...
        </div>
      )}
    </div>
  );
};

export default MedicalHistoryManager;

