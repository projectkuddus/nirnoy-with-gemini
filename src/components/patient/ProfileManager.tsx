import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PatientProfile } from '../../contexts/AuthContext';

// ============ TYPES ============
interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

interface ProfileManagerProps {
  profile: PatientProfile;
  onSave: (updates: Partial<PatientProfile>) => Promise<void>;
  onClose?: () => void;
}

// ============ CONSTANTS ============
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const GENDER_OPTIONS = [
  { value: 'male', label: 'পুরুষ', labelEn: 'Male' },
  { value: 'female', label: 'মহিলা', labelEn: 'Female' },
  { value: 'other', label: 'অন্যান্য', labelEn: 'Other' },
];

const RELATIONSHIP_OPTIONS = [
  { value: 'spouse', label: 'স্বামী/স্ত্রী' },
  { value: 'parent', label: 'বাবা/মা' },
  { value: 'child', label: 'সন্তান' },
  { value: 'sibling', label: 'ভাই/বোন' },
  { value: 'friend', label: 'বন্ধু' },
  { value: 'other', label: 'অন্যান্য' },
];

const DISTRICTS = [
  'ঢাকা', 'চট্টগ্রাম', 'সিলেট', 'রাজশাহী', 'খুলনা', 'রংপুর', 'বরিশাল', 'ময়মনসিংহ',
  'গাজীপুর', 'নারায়ণগঞ্জ', 'কক্সবাজার', 'কুমিল্লা', 'যশোর', 'দিনাজপুর',
];

// ============ PROFILE MANAGER COMPONENT ============
export const ProfileManager: React.FC<ProfileManagerProps> = ({
  profile,
  onSave,
  onClose,
}) => {
  // State
  const [activeTab, setActiveTab] = useState<'personal' | 'health' | 'contact' | 'preferences'>('personal');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    // Personal
    name: profile.name || '',
    nameBn: profile.nameBn || '',
    email: profile.email || '',
    phone: profile.phone || '',
    dateOfBirth: profile.dateOfBirth || '',
    gender: profile.gender || '',
    bloodGroup: profile.bloodGroup || '',
    profileImage: profile.profileImage || '',
    
    // Health
    heightCm: profile.heightCm?.toString() || '',
    weightKg: profile.weightKg?.toString() || '',
    chronicConditions: profile.chronicConditions?.join(', ') || '',
    allergies: profile.allergies?.join(', ') || '',
    currentMedications: profile.currentMedications?.join(', ') || '',
    pastSurgeries: profile.pastSurgeries?.join(', ') || '',
    familyMedicalHistory: profile.familyMedicalHistory || '',
    
    // Contact
    address: profile.address || '',
    area: profile.area || '',
    city: profile.city || 'ঢাকা',
    emergencyContactName: profile.emergencyContactName || '',
    emergencyContactPhone: profile.emergencyContactPhone || '',
    emergencyContactRelation: profile.emergencyContactRelation || '',
    
    // Preferences
    preferredLanguage: profile.preferredLanguage || 'bn',
    notificationPreferences: profile.notificationPreferences || { sms: true, email: true, push: true },
  });

  // Calculate profile completeness
  const profileCompleteness = React.useMemo(() => {
    const fields = [
      formData.name,
      formData.email,
      formData.phone,
      formData.dateOfBirth,
      formData.gender,
      formData.bloodGroup,
      formData.heightCm,
      formData.weightKg,
      formData.address,
      formData.emergencyContactName,
      formData.emergencyContactPhone,
    ];
    const filledFields = fields.filter(f => f && f.trim()).length;
    return Math.round((filledFields / fields.length) * 100);
  }, [formData]);

  // Calculate Health ID
  const healthId = React.useMemo(() => {
    const prefix = 'NR';
    const year = new Date().getFullYear().toString().slice(-2);
    const idPart = profile.id?.slice(-6).toUpperCase() || '000000';
    return `${prefix}${year}${idPart}`;
  }, [profile.id]);

  // Update form field
  const updateField = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaveMessage(null);
  }, []);

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setSaveMessage({ type: 'error', text: 'ছবির সাইজ ২MB এর কম হতে হবে' });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        updateField('profileImage', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [updateField]);

  // Save profile
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const updates: Partial<PatientProfile> = {
        name: formData.name,
        nameBn: formData.nameBn,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender as 'male' | 'female' | 'other',
        bloodGroup: formData.bloodGroup,
        profileImage: formData.profileImage,
        heightCm: formData.heightCm ? parseInt(formData.heightCm) : undefined,
        weightKg: formData.weightKg ? parseFloat(formData.weightKg) : undefined,
        chronicConditions: formData.chronicConditions ? formData.chronicConditions.split(',').map(s => s.trim()).filter(Boolean) : [],
        allergies: formData.allergies ? formData.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        currentMedications: formData.currentMedications ? formData.currentMedications.split(',').map(s => s.trim()).filter(Boolean) : [],
        pastSurgeries: formData.pastSurgeries ? formData.pastSurgeries.split(',').map(s => s.trim()).filter(Boolean) : [],
        familyMedicalHistory: formData.familyMedicalHistory,
        address: formData.address,
        area: formData.area,
        city: formData.city,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone,
        emergencyContactRelation: formData.emergencyContactRelation,
        preferredLanguage: formData.preferredLanguage as 'bn' | 'en',
      };

      await onSave(updates);
      setSaveMessage({ type: 'success', text: 'প্রোফাইল সফলভাবে আপডেট হয়েছে! ✅' });
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveMessage({ type: 'error', text: 'প্রোফাইল আপডেট করতে সমস্যা হয়েছে' });
    } finally {
      setIsSaving(false);
    }
  }, [formData, onSave]);

  // Tabs config
  const tabs = [
    { id: 'personal', label: 'ব্যক্তিগত তথ্য', icon: '👤' },
    { id: 'health', label: 'স্বাস্থ্য তথ্য', icon: '❤️' },
    { id: 'contact', label: 'যোগাযোগ', icon: '📞' },
    { id: 'preferences', label: 'সেটিংস', icon: '⚙️' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-start gap-6">
          {/* Profile Image */}
          <div className="relative group">
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-xl">
              {formData.profileImage ? (
                <img
                  src={formData.profileImage}
                  alt={formData.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white text-4xl">
                  {formData.name?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition shadow-lg opacity-0 group-hover:opacity-100"
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

          {/* Basic Info */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-800">{formData.name || 'নাম যোগ করুন'}</h2>
            <p className="text-slate-500">{formData.email || 'ইমেইল যোগ করুন'}</p>
            <div className="flex items-center gap-4 mt-3">
              <div className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-medium">
                🆔 Health ID: {healthId}
              </div>
              {formData.bloodGroup && (
                <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                  🩸 {formData.bloodGroup}
                </div>
              )}
            </div>
          </div>

          {/* Completeness */}
          <div className="text-center">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-slate-100"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={220}
                  strokeDashoffset={220 - (220 * profileCompleteness) / 100}
                  strokeLinecap="round"
                  className={profileCompleteness >= 80 ? 'text-green-500' : profileCompleteness >= 50 ? 'text-amber-500' : 'text-red-500'}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-slate-700">{profileCompleteness}%</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">প্রোফাইল সম্পূর্ণ</p>
          </div>
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
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'personal' && (
        <div className="glass-card p-6 space-y-6">
          <h3 className="font-bold text-slate-800 text-lg">👤 ব্যক্তিগত তথ্য</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">নাম (English)</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Your name"
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">নাম (বাংলায়)</label>
              <input
                type="text"
                value={formData.nameBn}
                onChange={(e) => updateField('nameBn', e.target.value)}
                placeholder="আপনার নাম"
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">ইমেইল</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="email@example.com"
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">ফোন</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">জন্ম তারিখ</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => updateField('dateOfBirth', e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">লিঙ্গ</label>
              <select
                value={formData.gender}
                onChange={(e) => updateField('gender', e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              >
                <option value="">নির্বাচন করুন</option>
                {GENDER_OPTIONS.map(g => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">রক্তের গ্রুপ</label>
              <select
                value={formData.bloodGroup}
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
        </div>
      )}

      {activeTab === 'health' && (
        <div className="glass-card p-6 space-y-6">
          <h3 className="font-bold text-slate-800 text-lg">❤️ স্বাস্থ্য তথ্য</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">উচ্চতা (সে.মি.)</label>
              <input
                type="number"
                value={formData.heightCm}
                onChange={(e) => updateField('heightCm', e.target.value)}
                placeholder="165"
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">ওজন (কেজি)</label>
              <input
                type="number"
                step="0.1"
                value={formData.weightKg}
                onChange={(e) => updateField('weightKg', e.target.value)}
                placeholder="65"
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">দীর্ঘস্থায়ী রোগ (কমা দিয়ে আলাদা করুন)</label>
            <input
              type="text"
              value={formData.chronicConditions}
              onChange={(e) => updateField('chronicConditions', e.target.value)}
              placeholder="যেমন: ডায়াবেটিস, উচ্চ রক্তচাপ"
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">এলার্জি (কমা দিয়ে আলাদা করুন)</label>
            <input
              type="text"
              value={formData.allergies}
              onChange={(e) => updateField('allergies', e.target.value)}
              placeholder="যেমন: পেনিসিলিন, চিংড়ি"
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">বর্তমান ওষুধ (কমা দিয়ে আলাদা করুন)</label>
            <input
              type="text"
              value={formData.currentMedications}
              onChange={(e) => updateField('currentMedications', e.target.value)}
              placeholder="যেমন: Metformin 500mg, Amlodipine 5mg"
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">পূর্ববর্তী সার্জারি (কমা দিয়ে আলাদা করুন)</label>
            <input
              type="text"
              value={formData.pastSurgeries}
              onChange={(e) => updateField('pastSurgeries', e.target.value)}
              placeholder="যেমন: Appendectomy 2020"
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">পারিবারিক চিকিৎসা ইতিহাস</label>
            <textarea
              value={formData.familyMedicalHistory}
              onChange={(e) => updateField('familyMedicalHistory', e.target.value)}
              placeholder="পরিবারে কোনো বংশগত রোগ থাকলে লিখুন..."
              rows={3}
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300 resize-none"
            />
          </div>
        </div>
      )}

      {activeTab === 'contact' && (
        <div className="glass-card p-6 space-y-6">
          <h3 className="font-bold text-slate-800 text-lg">📞 যোগাযোগের তথ্য</h3>
          
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">ঠিকানা</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="বাড়ি নং, রোড, এলাকা"
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">এলাকা</label>
              <input
                type="text"
                value={formData.area}
                onChange={(e) => updateField('area', e.target.value)}
                placeholder="ধানমন্ডি, গুলশান..."
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">শহর</label>
              <select
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              >
                {DISTRICTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h4 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
              🚨 জরুরি যোগাযোগ
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">নাম</label>
                <input
                  type="text"
                  value={formData.emergencyContactName}
                  onChange={(e) => updateField('emergencyContactName', e.target.value)}
                  placeholder="জরুরি সময়ে যোগাযোগ করার জন্য"
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">ফোন</label>
                <input
                  type="tel"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => updateField('emergencyContactPhone', e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">সম্পর্ক</label>
                <select
                  value={formData.emergencyContactRelation}
                  onChange={(e) => updateField('emergencyContactRelation', e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">নির্বাচন করুন</option>
                  {RELATIONSHIP_OPTIONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'preferences' && (
        <div className="glass-card p-6 space-y-6">
          <h3 className="font-bold text-slate-800 text-lg">⚙️ সেটিংস</h3>
          
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">পছন্দের ভাষা</label>
            <div className="flex gap-4">
              <button
                onClick={() => updateField('preferredLanguage', 'bn')}
                className={`flex-1 py-3 rounded-xl font-medium transition ${
                  formData.preferredLanguage === 'bn'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                বাংলা
              </button>
              <button
                onClick={() => updateField('preferredLanguage', 'en')}
                className={`flex-1 py-3 rounded-xl font-medium transition ${
                  formData.preferredLanguage === 'en'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                English
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h4 className="font-semibold text-slate-700 mb-4">🔔 নোটিফিকেশন সেটিংস</h4>
            <div className="space-y-3">
              {[
                { key: 'sms', label: 'এসএমএস নোটিফিকেশন', icon: '📱' },
                { key: 'email', label: 'ইমেইল নোটিফিকেশন', icon: '📧' },
                { key: 'push', label: 'পুশ নোটিফিকেশন', icon: '🔔' },
              ].map(notif => (
                <label key={notif.key} className="flex items-center justify-between p-3 glass-subtle rounded-lg cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span>{notif.icon}</span>
                    <span className="text-slate-700">{notif.label}</span>
                  </div>
                  <div className={`w-12 h-6 rounded-full transition ${
                    (formData.notificationPreferences as any)?.[notif.key] ? 'bg-blue-500' : 'bg-slate-300'
                  } relative`}>
                    <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition ${
                      (formData.notificationPreferences as any)?.[notif.key] ? 'right-0.5' : 'left-0.5'
                    }`} />
                    <input
                      type="checkbox"
                      checked={(formData.notificationPreferences as any)?.[notif.key] || false}
                      onChange={(e) => updateField('notificationPreferences', {
                        ...formData.notificationPreferences,
                        [notif.key]: e.target.checked,
                      })}
                      className="sr-only"
                    />
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Save Message */}
      {saveMessage && (
        <div className={`p-4 rounded-xl ${
          saveMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {saveMessage.text}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        {onClose && (
          <button
            onClick={onClose}
            className="flex-1 py-3 glass-subtle text-slate-600 rounded-xl font-medium hover:bg-slate-100 transition"
          >
            বাতিল
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition disabled:opacity-50"
        >
          {isSaving ? '⏳ সংরক্ষণ হচ্ছে...' : '💾 সংরক্ষণ করুন'}
        </button>
      </div>
    </div>
  );
};

export default ProfileManager;
