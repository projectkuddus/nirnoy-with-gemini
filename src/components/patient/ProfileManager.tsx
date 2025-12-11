import React, { useState, useCallback, useRef } from 'react';

// ============ TYPES ============
export interface PatientProfileData {
  id: string;
  name: string;
  nameBn?: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup: string;
  
  // Physical
  heightCm?: number;
  weightKg?: number;
  
  // Address
  address?: string;
  area?: string;
  city?: string;
  postalCode?: string;
  
  // Emergency Contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  
  // Medical Info
  chronicConditions?: string[];
  allergies?: string[];
  currentMedications?: string[];
  pastSurgeries?: string[];
  
  // Family History
  familyHistory?: {
    condition: string;
    relation: string;
  }[];
  
  // Vaccination Records
  vaccinations?: {
    name: string;
    date: string;
    nextDue?: string;
  }[];
  
  // Profile
  image?: string;
  healthId?: string;
  
  // Preferences
  preferredLanguage?: 'bn' | 'en';
  notificationPreferences?: {
    sms: boolean;
    email: boolean;
    push: boolean;
  };
}

interface ProfileManagerProps {
  profile: PatientProfileData;
  onSave: (profile: PatientProfileData) => Promise<void>;
  onCancel?: () => void;
}

// ============ BLOOD GROUPS ============
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// ============ COMMON CONDITIONS ============
const COMMON_CONDITIONS = [
  'Diabetes', 'Hypertension', 'Asthma', 'Heart Disease', 'Thyroid',
  'Arthritis', 'Kidney Disease', 'Liver Disease', 'Cancer', 'COPD',
];

// ============ COMMON ALLERGIES ============
const COMMON_ALLERGIES = [
  'Penicillin', 'Sulfa Drugs', 'Aspirin', 'NSAIDs', 'Peanuts',
  'Shellfish', 'Eggs', 'Milk', 'Dust', 'Pollen',
];

// ============ COMMON VACCINES ============
const COMMON_VACCINES = [
  'COVID-19', 'Hepatitis B', 'Hepatitis A', 'Tetanus', 'Flu',
  'Typhoid', 'MMR', 'Polio', 'BCG', 'Pneumonia',
];

// ============ PROFILE MANAGER COMPONENT ============
export const ProfileManager: React.FC<ProfileManagerProps> = ({
  profile: initialProfile,
  onSave,
  onCancel,
}) => {
  // State
  const [profile, setProfile] = useState<PatientProfileData>(initialProfile);
  const [activeTab, setActiveTab] = useState<'basic' | 'address' | 'medical' | 'family' | 'vaccination'>('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update profile field
  const updateField = useCallback(<K extends keyof PatientProfileData>(
    field: K,
    value: PatientProfileData[K]
  ) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  }, []);

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('ছবির সাইজ ২MB এর বেশি হতে পারবে না');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        updateField('image', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [updateField]);

  // Toggle array item
  const toggleArrayItem = useCallback((
    field: 'chronicConditions' | 'allergies' | 'currentMedications' | 'pastSurgeries',
    item: string
  ) => {
    setProfile(prev => {
      const current = prev[field] || [];
      const updated = current.includes(item)
        ? current.filter(i => i !== item)
        : [...current, item];
      return { ...prev, [field]: updated };
    });
  }, []);

  // Add custom item
  const addCustomItem = useCallback((
    field: 'chronicConditions' | 'allergies' | 'currentMedications' | 'pastSurgeries',
    item: string
  ) => {
    if (item.trim()) {
      setProfile(prev => ({
        ...prev,
        [field]: [...(prev[field] || []), item.trim()],
      }));
    }
  }, []);

  // Remove item
  const removeArrayItem = useCallback((
    field: 'chronicConditions' | 'allergies' | 'currentMedications' | 'pastSurgeries',
    index: number
  ) => {
    setProfile(prev => ({
      ...prev,
      [field]: (prev[field] || []).filter((_, i) => i !== index),
    }));
  }, []);

  // Add family history
  const addFamilyHistory = useCallback(() => {
    setProfile(prev => ({
      ...prev,
      familyHistory: [...(prev.familyHistory || []), { condition: '', relation: '' }],
    }));
  }, []);

  // Update family history
  const updateFamilyHistory = useCallback((index: number, field: 'condition' | 'relation', value: string) => {
    setProfile(prev => ({
      ...prev,
      familyHistory: prev.familyHistory?.map((fh, i) => 
        i === index ? { ...fh, [field]: value } : fh
      ),
    }));
  }, []);

  // Remove family history
  const removeFamilyHistory = useCallback((index: number) => {
    setProfile(prev => ({
      ...prev,
      familyHistory: prev.familyHistory?.filter((_, i) => i !== index),
    }));
  }, []);

  // Add vaccination
  const addVaccination = useCallback(() => {
    setProfile(prev => ({
      ...prev,
      vaccinations: [...(prev.vaccinations || []), { name: '', date: '' }],
    }));
  }, []);

  // Update vaccination
  const updateVaccination = useCallback((index: number, field: 'name' | 'date' | 'nextDue', value: string) => {
    setProfile(prev => ({
      ...prev,
      vaccinations: prev.vaccinations?.map((v, i) => 
        i === index ? { ...v, [field]: value } : v
      ),
    }));
  }, []);

  // Remove vaccination
  const removeVaccination = useCallback((index: number) => {
    setProfile(prev => ({
      ...prev,
      vaccinations: prev.vaccinations?.filter((_, i) => i !== index),
    }));
  }, []);

  // Calculate BMI
  const bmi = profile.heightCm && profile.weightKg
    ? (profile.weightKg / Math.pow(profile.heightCm / 100, 2)).toFixed(1)
    : null;

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'কম ওজন', color: 'text-blue-600' };
    if (bmi < 25) return { label: 'স্বাভাবিক', color: 'text-green-600' };
    if (bmi < 30) return { label: 'অতিরিক্ত ওজন', color: 'text-amber-600' };
    return { label: 'স্থূলতা', color: 'text-red-600' };
  };

  // Calculate age
  const age = profile.dateOfBirth
    ? Math.floor((Date.now() - new Date(profile.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  // Generate Health ID
  const generateHealthId = useCallback(() => {
    const prefix = 'NRN';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    updateField('healthId', `${prefix}-${timestamp}-${random}`);
  }, [updateField]);

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Validation
      if (!profile.name?.trim()) throw new Error('নাম আবশ্যক');
      if (!profile.phone?.trim()) throw new Error('ফোন নম্বর আবশ্যক');
      if (!profile.dateOfBirth) throw new Error('জন্ম তারিখ আবশ্যক');
      if (!profile.gender) throw new Error('লিঙ্গ নির্বাচন করুন');
      
      await onSave(profile);
      setSuccess('প্রোফাইল সফলভাবে আপডেট হয়েছে!');
    } catch (err: any) {
      setError(err.message || 'প্রোফাইল সংরক্ষণে সমস্যা হয়েছে');
    } finally {
      setIsSaving(false);
    }
  }, [profile, onSave]);

  // Tabs
  const tabs = [
    { id: 'basic', label: 'মৌলিক তথ্য', icon: '👤' },
    { id: 'address', label: 'ঠিকানা', icon: '📍' },
    { id: 'medical', label: 'চিকিৎসা তথ্য', icon: '🩺' },
    { id: 'family', label: 'পারিবারিক ইতিহাস', icon: '👨‍👩‍👧‍👦' },
    { id: 'vaccination', label: 'টিকা', icon: '💉' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">প্রোফাইল ব্যবস্থাপনা</h2>
          <p className="text-slate-500">আপনার সম্পূর্ণ স্বাস্থ্য প্রোফাইল আপডেট করুন</p>
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 glass-subtle text-slate-600 rounded-lg hover:bg-slate-100 transition"
            >
              বাতিল
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
          >
            {isSaving ? '⏳ সংরক্ষণ হচ্ছে...' : '💾 সংরক্ষণ করুন'}
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center gap-2">
          <span>✅</span> {success}
        </div>
      )}

      {/* Health ID Card */}
      {profile.healthId && (
        <div className="glass-card p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500">আপনার স্বাস্থ্য আইডি</div>
              <div className="text-xl font-bold font-mono text-blue-600">{profile.healthId}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">QR কোড শীঘ্রই</div>
            </div>
          </div>
        </div>
      )}

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
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'basic' && (
        <div className="glass-card p-6 space-y-6">
          {/* Photo */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <img
                src={profile.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'U')}&background=3b82f6&color=fff&size=200`}
                alt={profile.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition shadow-lg text-sm"
              >
                📷
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-700">প্রোফাইল ছবি</h3>
              <p className="text-sm text-slate-500">JPG, PNG। সর্বোচ্চ 2MB।</p>
              {!profile.healthId && (
                <button
                  onClick={generateHealthId}
                  className="mt-2 px-3 py-1 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
                >
                  🆔 স্বাস্থ্য আইডি তৈরি করুন
                </button>
              )}
            </div>
          </div>

          {/* Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">নাম *</label>
              <input
                type="text"
                value={profile.name || ''}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="আপনার পূর্ণ নাম"
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">নাম (বাংলায়)</label>
              <input
                type="text"
                value={profile.nameBn || ''}
                onChange={(e) => updateField('nameBn', e.target.value)}
                placeholder="বাংলায় নাম"
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">ফোন *</label>
              <input
                type="tel"
                value={profile.phone || ''}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">ইমেইল</label>
              <input
                type="email"
                value={profile.email || ''}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="email@example.com"
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          {/* DOB, Gender, Blood */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">জন্ম তারিখ *</label>
              <input
                type="date"
                value={profile.dateOfBirth || ''}
                onChange={(e) => updateField('dateOfBirth', e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
              {age !== null && (
                <div className="text-xs text-slate-500 mt-1">বয়স: {age} বছর</div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">লিঙ্গ *</label>
              <select
                value={profile.gender || ''}
                onChange={(e) => updateField('gender', e.target.value as any)}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              >
                <option value="">নির্বাচন করুন</option>
                <option value="Male">পুরুষ</option>
                <option value="Female">মহিলা</option>
                <option value="Other">অন্যান্য</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">রক্তের গ্রুপ</label>
              <select
                value={profile.bloodGroup || ''}
                onChange={(e) => updateField('bloodGroup', e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              >
                <option value="">নির্বাচন করুন</option>
                {BLOOD_GROUPS.map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Height, Weight, BMI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">উচ্চতা (সেমি)</label>
              <input
                type="number"
                value={profile.heightCm || ''}
                onChange={(e) => updateField('heightCm', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="170"
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">ওজন (কেজি)</label>
              <input
                type="number"
                step="0.1"
                value={profile.weightKg || ''}
                onChange={(e) => updateField('weightKg', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="70"
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">BMI</label>
              <div className={`p-3 border border-slate-200 rounded-lg bg-slate-50 ${bmi ? getBMICategory(parseFloat(bmi)).color : ''} font-medium`}>
                {bmi ? `${bmi} (${getBMICategory(parseFloat(bmi)).label})` : '-'}
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="p-4 glass-subtle rounded-xl">
            <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
              🚨 জরুরি যোগাযোগ
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">নাম</label>
                <input
                  type="text"
                  value={profile.emergencyContactName || ''}
                  onChange={(e) => updateField('emergencyContactName', e.target.value)}
                  placeholder="যোগাযোগকারীর নাম"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">ফোন</label>
                <input
                  type="tel"
                  value={profile.emergencyContactPhone || ''}
                  onChange={(e) => updateField('emergencyContactPhone', e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">সম্পর্ক</label>
                <select
                  value={profile.emergencyContactRelation || ''}
                  onChange={(e) => updateField('emergencyContactRelation', e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                >
                  <option value="">নির্বাচন করুন</option>
                  <option value="Spouse">স্বামী/স্ত্রী</option>
                  <option value="Parent">মা/বাবা</option>
                  <option value="Child">সন্তান</option>
                  <option value="Sibling">ভাই/বোন</option>
                  <option value="Friend">বন্ধু</option>
                  <option value="Other">অন্যান্য</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'address' && (
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-semibold text-slate-700">📍 ঠিকানা</h3>
          
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">সম্পূর্ণ ঠিকানা</label>
            <textarea
              value={profile.address || ''}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="বাড়ি, রোড, এলাকা..."
              rows={3}
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">এলাকা</label>
              <input
                type="text"
                value={profile.area || ''}
                onChange={(e) => updateField('area', e.target.value)}
                placeholder="যেমন: ধানমন্ডি"
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">শহর</label>
              <input
                type="text"
                value={profile.city || ''}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="যেমন: ঢাকা"
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">পোস্টাল কোড</label>
              <input
                type="text"
                value={profile.postalCode || ''}
                onChange={(e) => updateField('postalCode', e.target.value)}
                placeholder="1205"
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'medical' && (
        <div className="glass-card p-6 space-y-6">
          {/* Chronic Conditions */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-3">🩺 দীর্ঘস্থায়ী রোগ</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {COMMON_CONDITIONS.map(condition => (
                <button
                  key={condition}
                  onClick={() => toggleArrayItem('chronicConditions', condition)}
                  className={`px-3 py-1.5 rounded-full text-sm transition ${
                    profile.chronicConditions?.includes(condition)
                      ? 'bg-red-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {condition}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.chronicConditions?.filter(c => !COMMON_CONDITIONS.includes(c)).map((condition, idx) => (
                <span key={idx} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm flex items-center gap-2">
                  {condition}
                  <button onClick={() => removeArrayItem('chronicConditions', profile.chronicConditions!.indexOf(condition))}>×</button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="অন্যান্য রোগ যোগ করুন (Enter চাপুন)"
              className="w-full p-2 border border-slate-200 rounded-lg text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addCustomItem('chronicConditions', (e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
          </div>

          {/* Allergies */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-3">⚠️ এলার্জি</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {COMMON_ALLERGIES.map(allergy => (
                <button
                  key={allergy}
                  onClick={() => toggleArrayItem('allergies', allergy)}
                  className={`px-3 py-1.5 rounded-full text-sm transition ${
                    profile.allergies?.includes(allergy)
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {allergy}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.allergies?.filter(a => !COMMON_ALLERGIES.includes(a)).map((allergy, idx) => (
                <span key={idx} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm flex items-center gap-2">
                  {allergy}
                  <button onClick={() => removeArrayItem('allergies', profile.allergies!.indexOf(allergy))}>×</button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="অন্যান্য এলার্জি যোগ করুন (Enter চাপুন)"
              className="w-full p-2 border border-slate-200 rounded-lg text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addCustomItem('allergies', (e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
          </div>

          {/* Current Medications */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-3">💊 বর্তমান ওষুধ</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.currentMedications?.map((med, idx) => (
                <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2">
                  {med}
                  <button onClick={() => removeArrayItem('currentMedications', idx)}>×</button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="ওষুধের নাম যোগ করুন (Enter চাপুন)"
              className="w-full p-2 border border-slate-200 rounded-lg text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addCustomItem('currentMedications', (e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
          </div>

          {/* Past Surgeries */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-3">🏥 পূর্ববর্তী সার্জারি/প্রসিডিউর</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.pastSurgeries?.map((surgery, idx) => (
                <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-2">
                  {surgery}
                  <button onClick={() => removeArrayItem('pastSurgeries', idx)}>×</button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="সার্জারি/প্রসিডিউর যোগ করুন (Enter চাপুন)"
              className="w-full p-2 border border-slate-200 rounded-lg text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addCustomItem('pastSurgeries', (e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
          </div>
        </div>
      )}

      {activeTab === 'family' && (
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">👨‍👩‍👧‍👦 পারিবারিক রোগের ইতিহাস</h3>
            <button
              onClick={addFamilyHistory}
              className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
            >
              + যোগ করুন
            </button>
          </div>
          
          <p className="text-sm text-slate-500">
            আপনার পরিবারে কোন বংশগত রোগ আছে কি? এটি আপনার স্বাস্থ্য মূল্যায়নে সাহায্য করবে।
          </p>

          <div className="space-y-3">
            {profile.familyHistory?.map((fh, idx) => (
              <div key={idx} className="flex gap-3 items-start p-3 glass-subtle rounded-xl">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">রোগ</label>
                  <input
                    type="text"
                    value={fh.condition}
                    onChange={(e) => updateFamilyHistory(idx, 'condition', e.target.value)}
                    placeholder="যেমন: Diabetes, Heart Disease"
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-xs text-slate-500 mb-1">সম্পর্ক</label>
                  <select
                    value={fh.relation}
                    onChange={(e) => updateFamilyHistory(idx, 'relation', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">নির্বাচন</option>
                    <option value="Father">বাবা</option>
                    <option value="Mother">মা</option>
                    <option value="Grandfather">দাদা/নানা</option>
                    <option value="Grandmother">দাদি/নানি</option>
                    <option value="Sibling">ভাই/বোন</option>
                  </select>
                </div>
                <button
                  onClick={() => removeFamilyHistory(idx)}
                  className="mt-6 p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  🗑️
                </button>
              </div>
            ))}

            {(!profile.familyHistory || profile.familyHistory.length === 0) && (
              <p className="text-center text-slate-400 py-8">কোনো পারিবারিক রোগের ইতিহাস যোগ করা হয়নি</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'vaccination' && (
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">💉 টিকা রেকর্ড</h3>
            <button
              onClick={addVaccination}
              className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
            >
              + যোগ করুন
            </button>
          </div>

          {/* Quick Add */}
          <div className="flex flex-wrap gap-2">
            {COMMON_VACCINES.map(vaccine => (
              <button
                key={vaccine}
                onClick={() => {
                  if (!profile.vaccinations?.find(v => v.name === vaccine)) {
                    setProfile(prev => ({
                      ...prev,
                      vaccinations: [...(prev.vaccinations || []), { name: vaccine, date: '' }],
                    }));
                  }
                }}
                disabled={profile.vaccinations?.some(v => v.name === vaccine)}
                className={`px-3 py-1.5 rounded-full text-sm transition ${
                  profile.vaccinations?.some(v => v.name === vaccine)
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {vaccine}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {profile.vaccinations?.map((vaccine, idx) => (
              <div key={idx} className="flex gap-3 items-start p-3 glass-subtle rounded-xl">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">টিকার নাম</label>
                  <input
                    type="text"
                    value={vaccine.name}
                    onChange={(e) => updateVaccination(idx, 'name', e.target.value)}
                    placeholder="টিকার নাম"
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div className="w-36">
                  <label className="block text-xs text-slate-500 mb-1">গ্রহণের তারিখ</label>
                  <input
                    type="date"
                    value={vaccine.date}
                    onChange={(e) => updateVaccination(idx, 'date', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div className="w-36">
                  <label className="block text-xs text-slate-500 mb-1">পরবর্তী ডোজ</label>
                  <input
                    type="date"
                    value={vaccine.nextDue || ''}
                    onChange={(e) => updateVaccination(idx, 'nextDue', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <button
                  onClick={() => removeVaccination(idx)}
                  className="mt-6 p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  🗑️
                </button>
              </div>
            ))}

            {(!profile.vaccinations || profile.vaccinations.length === 0) && (
              <p className="text-center text-slate-400 py-8">কোনো টিকা রেকর্ড যোগ করা হয়নি</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileManager;

