import React, { useState, useCallback, useRef } from 'react';

// ============ TYPES ============
export interface DoctorProfileData {
  id: string;
  name: string;
  nameBn: string;
  email: string;
  phone: string;
  image: string;
  
  // Professional Info
  specialty: string;
  specialtyBn: string;
  subSpecialties?: string[];
  degrees: string;
  bmdcNo: string;
  experienceYears: number;
  
  // Bio
  bio?: string;
  bioBn?: string;
  
  // Education
  education: {
    degree: string;
    institution: string;
    year: number;
  }[];
  
  // Experience
  experience: {
    position: string;
    institution: string;
    startYear: number;
    endYear?: number;
    isCurrent?: boolean;
  }[];
  
  // Awards & Certifications
  awards?: string[];
  certifications?: string[];
  
  // Affiliations
  affiliations?: {
    name: string;
    role?: string;
  }[];
  
  // Languages
  languages?: string[];
  
  // Services
  services?: string[];
  
  // Social Links
  socialLinks?: {
    facebook?: string;
    linkedin?: string;
    website?: string;
  };
}

interface ProfileEditorProps {
  profile: DoctorProfileData;
  onSave: (profile: DoctorProfileData) => void;
  onCancel?: () => void;
}

// ============ SPECIALTY OPTIONS ============
const SPECIALTIES = [
  { value: 'cardiology', label: 'Cardiology', labelBn: 'হৃদরোগ বিশেষজ্ঞ' },
  { value: 'medicine', label: 'Medicine', labelBn: 'মেডিসিন বিশেষজ্ঞ' },
  { value: 'surgery', label: 'Surgery', labelBn: 'সার্জারি বিশেষজ্ঞ' },
  { value: 'pediatrics', label: 'Pediatrics', labelBn: 'শিশু বিশেষজ্ঞ' },
  { value: 'gynecology', label: 'Gynecology', labelBn: 'গাইনি বিশেষজ্ঞ' },
  { value: 'orthopedics', label: 'Orthopedics', labelBn: 'হাড় বিশেষজ্ঞ' },
  { value: 'neurology', label: 'Neurology', labelBn: 'স্নায়ু বিশেষজ্ঞ' },
  { value: 'dermatology', label: 'Dermatology', labelBn: 'চর্ম বিশেষজ্ঞ' },
  { value: 'psychiatry', label: 'Psychiatry', labelBn: 'মানসিক রোগ বিশেষজ্ঞ' },
  { value: 'ent', label: 'ENT', labelBn: 'নাক-কান-গলা বিশেষজ্ঞ' },
  { value: 'ophthalmology', label: 'Ophthalmology', labelBn: 'চক্ষু বিশেষজ্ঞ' },
  { value: 'gastroenterology', label: 'Gastroenterology', labelBn: 'পেট ও লিভার বিশেষজ্ঞ' },
  { value: 'nephrology', label: 'Nephrology', labelBn: 'কিডনি বিশেষজ্ঞ' },
  { value: 'urology', label: 'Urology', labelBn: 'ইউরোলজি বিশেষজ্ঞ' },
  { value: 'endocrinology', label: 'Endocrinology', labelBn: 'হরমোন বিশেষজ্ঞ' },
  { value: 'pulmonology', label: 'Pulmonology', labelBn: 'ফুসফুস বিশেষজ্ঞ' },
  { value: 'oncology', label: 'Oncology', labelBn: 'ক্যান্সার বিশেষজ্ঞ' },
  { value: 'dentistry', label: 'Dentistry', labelBn: 'দাঁতের ডাক্তার' },
  { value: 'general', label: 'General Physician', labelBn: 'জেনারেল ফিজিশিয়ান' },
];

const LANGUAGES = ['বাংলা', 'English', 'हिंदी', 'العربية'];

// ============ PROFILE EDITOR COMPONENT ============
export const ProfileEditor: React.FC<ProfileEditorProps> = ({
  profile: initialProfile,
  onSave,
  onCancel,
}) => {
  // State
  const [profile, setProfile] = useState<DoctorProfileData>(initialProfile);
  const [activeTab, setActiveTab] = useState<'basic' | 'professional' | 'education' | 'experience' | 'preview'>('basic');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update profile field
  const updateField = useCallback(<K extends keyof DoctorProfileData>(
    field: K,
    value: DoctorProfileData[K]
  ) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  }, []);

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        updateField('image', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [updateField]);

  // Add education
  const addEducation = useCallback(() => {
    setProfile(prev => ({
      ...prev,
      education: [...prev.education, { degree: '', institution: '', year: new Date().getFullYear() }],
    }));
  }, []);

  // Update education
  const updateEducation = useCallback((index: number, field: string, value: any) => {
    setProfile(prev => ({
      ...prev,
      education: prev.education.map((edu, i) => 
        i === index ? { ...edu, [field]: value } : edu
      ),
    }));
  }, []);

  // Remove education
  const removeEducation = useCallback((index: number) => {
    setProfile(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  }, []);

  // Add experience
  const addExperience = useCallback(() => {
    setProfile(prev => ({
      ...prev,
      experience: [...prev.experience, { position: '', institution: '', startYear: new Date().getFullYear(), isCurrent: false }],
    }));
  }, []);

  // Update experience
  const updateExperience = useCallback((index: number, field: string, value: any) => {
    setProfile(prev => ({
      ...prev,
      experience: prev.experience.map((exp, i) => 
        i === index ? { ...exp, [field]: value } : exp
      ),
    }));
  }, []);

  // Remove experience
  const removeExperience = useCallback((index: number) => {
    setProfile(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index),
    }));
  }, []);

  // Toggle service/award
  const toggleArrayItem = useCallback((field: 'services' | 'awards' | 'certifications' | 'languages', item: string) => {
    setProfile(prev => {
      const current = prev[field] || [];
      const updated = current.includes(item)
        ? current.filter(i => i !== item)
        : [...current, item];
      return { ...prev, [field]: updated };
    });
  }, []);

  // Add custom item to array
  const addCustomItem = useCallback((field: 'services' | 'awards' | 'certifications' | 'subSpecialties', item: string) => {
    if (item.trim()) {
      setProfile(prev => ({
        ...prev,
        [field]: [...(prev[field] || []), item.trim()],
      }));
    }
  }, []);

  // Remove item from array
  const removeArrayItem = useCallback((field: 'services' | 'awards' | 'certifications' | 'subSpecialties', index: number) => {
    setProfile(prev => ({
      ...prev,
      [field]: (prev[field] || []).filter((_, i) => i !== index),
    }));
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(profile);
    } finally {
      setIsSaving(false);
    }
  }, [profile, onSave]);

  // Tabs
  const tabs = [
    { id: 'basic', label: 'মৌলিক তথ্য', icon: '👤' },
    { id: 'professional', label: 'পেশাগত তথ্য', icon: '🩺' },
    { id: 'education', label: 'শিক্ষা ও অভিজ্ঞতা', icon: '🎓' },
    { id: 'experience', label: 'সেবা ও সার্টিফিকেশন', icon: '🏆' },
    { id: 'preview', label: 'প্রিভিউ', icon: '👁️' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">প্রোফাইল সম্পাদনা</h2>
          <p className="text-slate-500">আপনার প্রোফাইল তথ্য আপডেট করুন</p>
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
                src={profile.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=3b82f6&color=fff&size=200`}
                alt={profile.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition shadow-lg"
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
            <div>
              <h3 className="font-semibold text-slate-700">প্রোফাইল ছবি</h3>
              <p className="text-sm text-slate-500">JPG, PNG বা GIF। সর্বোচ্চ 2MB।</p>
            </div>
          </div>

          {/* Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">নাম (English)</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">নাম (বাংলায়)</label>
              <input
                type="text"
                value={profile.nameBn}
                onChange={(e) => updateField('nameBn', e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">ইমেইল</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">ফোন</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">সংক্ষিপ্ত পরিচয় (বাংলায়)</label>
            <textarea
              value={profile.bioBn || ''}
              onChange={(e) => updateField('bioBn', e.target.value)}
              placeholder="আপনার সম্পর্কে কিছু লিখুন..."
              rows={3}
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300 resize-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Bio (English)</label>
            <textarea
              value={profile.bio || ''}
              onChange={(e) => updateField('bio', e.target.value)}
              placeholder="Write something about yourself..."
              rows={3}
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300 resize-none"
            />
          </div>

          {/* Languages */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">ভাষা দক্ষতা</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map(lang => (
                <button
                  key={lang}
                  onClick={() => toggleArrayItem('languages', lang)}
                  className={`px-4 py-2 rounded-full text-sm transition ${
                    profile.languages?.includes(lang)
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Social Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">🌐 ওয়েবসাইট</label>
              <input
                type="url"
                value={profile.socialLinks?.website || ''}
                onChange={(e) => updateField('socialLinks', { ...profile.socialLinks, website: e.target.value })}
                placeholder="https://..."
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">📘 Facebook</label>
              <input
                type="url"
                value={profile.socialLinks?.facebook || ''}
                onChange={(e) => updateField('socialLinks', { ...profile.socialLinks, facebook: e.target.value })}
                placeholder="https://facebook.com/..."
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">💼 LinkedIn</label>
              <input
                type="url"
                value={profile.socialLinks?.linkedin || ''}
                onChange={(e) => updateField('socialLinks', { ...profile.socialLinks, linkedin: e.target.value })}
                placeholder="https://linkedin.com/in/..."
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'professional' && (
        <div className="glass-card p-6 space-y-6">
          {/* Specialty */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">বিশেষত্ব</label>
              <select
                value={profile.specialty}
                onChange={(e) => {
                  const specialty = SPECIALTIES.find(s => s.value === e.target.value);
                  updateField('specialty', specialty?.label || e.target.value);
                  updateField('specialtyBn', specialty?.labelBn || '');
                }}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              >
                <option value="">নির্বাচন করুন</option>
                {SPECIALTIES.map(s => (
                  <option key={s.value} value={s.value}>{s.labelBn} ({s.label})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">BMDC নম্বর</label>
              <input
                type="text"
                value={profile.bmdcNo}
                onChange={(e) => updateField('bmdcNo', e.target.value)}
                placeholder="A-12345"
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          {/* Sub-specialties */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">উপ-বিশেষত্ব (Sub-specialties)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.subSpecialties?.map((sub, idx) => (
                <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2">
                  {sub}
                  <button onClick={() => removeArrayItem('subSpecialties', idx)} className="hover:text-blue-900">×</button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="নতুন উপ-বিশেষত্ব যোগ করুন (Enter চাপুন)"
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addCustomItem('subSpecialties', (e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
          </div>

          {/* Degrees */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">ডিগ্রি (সংক্ষিপ্ত)</label>
            <input
              type="text"
              value={profile.degrees}
              onChange={(e) => updateField('degrees', e.target.value)}
              placeholder="MBBS, FCPS (Medicine), MD"
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* Experience Years */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">অভিজ্ঞতা (বছর)</label>
            <input
              type="number"
              value={profile.experienceYears}
              onChange={(e) => updateField('experienceYears', parseInt(e.target.value) || 0)}
              min="0"
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>
      )}

      {activeTab === 'education' && (
        <div className="glass-card p-6 space-y-6">
          {/* Education */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700">🎓 শিক্ষাগত যোগ্যতা</h3>
              <button
                onClick={addEducation}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
              >
                + যোগ করুন
              </button>
            </div>
            
            <div className="space-y-4">
              {profile.education.map((edu, idx) => (
                <div key={idx} className="p-4 glass-subtle rounded-xl">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">ডিগ্রি</label>
                      <input
                        type="text"
                        value={edu.degree}
                        onChange={(e) => updateEducation(idx, 'degree', e.target.value)}
                        placeholder="MBBS, FCPS..."
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">প্রতিষ্ঠান</label>
                      <input
                        type="text"
                        value={edu.institution}
                        onChange={(e) => updateEducation(idx, 'institution', e.target.value)}
                        placeholder="Dhaka Medical College..."
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-slate-500 mb-1">সাল</label>
                        <input
                          type="number"
                          value={edu.year}
                          onChange={(e) => updateEducation(idx, 'year', parseInt(e.target.value))}
                          className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                        />
                      </div>
                      <button
                        onClick={() => removeEducation(idx)}
                        className="self-end p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {profile.education.length === 0 && (
                <p className="text-center text-slate-400 py-8">কোনো শিক্ষাগত যোগ্যতা যোগ করা হয়নি</p>
              )}
            </div>
          </div>

          {/* Experience */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700">💼 কর্ম অভিজ্ঞতা</h3>
              <button
                onClick={addExperience}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
              >
                + যোগ করুন
              </button>
            </div>
            
            <div className="space-y-4">
              {profile.experience.map((exp, idx) => (
                <div key={idx} className="p-4 glass-subtle rounded-xl">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">পদবী</label>
                      <input
                        type="text"
                        value={exp.position}
                        onChange={(e) => updateExperience(idx, 'position', e.target.value)}
                        placeholder="Consultant, Professor..."
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">প্রতিষ্ঠান</label>
                      <input
                        type="text"
                        value={exp.institution}
                        onChange={(e) => updateExperience(idx, 'institution', e.target.value)}
                        placeholder="Square Hospital..."
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-slate-500 mb-1">শুরু</label>
                        <input
                          type="number"
                          value={exp.startYear}
                          onChange={(e) => updateExperience(idx, 'startYear', parseInt(e.target.value))}
                          className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-slate-500 mb-1">শেষ</label>
                        <input
                          type="number"
                          value={exp.endYear || ''}
                          onChange={(e) => updateExperience(idx, 'endYear', parseInt(e.target.value) || undefined)}
                          disabled={exp.isCurrent}
                          placeholder={exp.isCurrent ? 'চলমান' : ''}
                          className="w-full p-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-100"
                        />
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={exp.isCurrent || false}
                          onChange={(e) => updateExperience(idx, 'isCurrent', e.target.checked)}
                          className="rounded"
                        />
                        বর্তমান
                      </label>
                      <button
                        onClick={() => removeExperience(idx)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {profile.experience.length === 0 && (
                <p className="text-center text-slate-400 py-8">কোনো কর্ম অভিজ্ঞতা যোগ করা হয়নি</p>
              )}
            </div>
          </div>

          {/* Affiliations */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-4">🏛️ সংস্থা সংযুক্তি</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.affiliations?.map((aff, idx) => (
                <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-2">
                  {aff.name} {aff.role && `(${aff.role})`}
                  <button onClick={() => {
                    setProfile(prev => ({
                      ...prev,
                      affiliations: prev.affiliations?.filter((_, i) => i !== idx),
                    }));
                  }} className="hover:text-purple-900">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                id="affiliation-input"
                type="text"
                placeholder="সংস্থার নাম (Enter চাপুন)"
                className="flex-1 p-2 border border-slate-200 rounded-lg text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement;
                    if (input.value.trim()) {
                      setProfile(prev => ({
                        ...prev,
                        affiliations: [...(prev.affiliations || []), { name: input.value.trim() }],
                      }));
                      input.value = '';
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'experience' && (
        <div className="glass-card p-6 space-y-6">
          {/* Services */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-4">🩺 সেবা সমূহ</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.services?.map((service, idx) => (
                <span key={idx} className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm flex items-center gap-2">
                  {service}
                  <button onClick={() => removeArrayItem('services', idx)} className="hover:text-teal-900">×</button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="নতুন সেবা যোগ করুন (Enter চাপুন)"
              className="w-full p-3 border border-slate-200 rounded-lg"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addCustomItem('services', (e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
          </div>

          {/* Awards */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-4">🏆 পুরস্কার ও সম্মাননা</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.awards?.map((award, idx) => (
                <span key={idx} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm flex items-center gap-2">
                  {award}
                  <button onClick={() => removeArrayItem('awards', idx)} className="hover:text-amber-900">×</button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="নতুন পুরস্কার যোগ করুন (Enter চাপুন)"
              className="w-full p-3 border border-slate-200 rounded-lg"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addCustomItem('awards', (e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
          </div>

          {/* Certifications */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-4">📜 সার্টিফিকেশন</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.certifications?.map((cert, idx) => (
                <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm flex items-center gap-2">
                  {cert}
                  <button onClick={() => removeArrayItem('certifications', idx)} className="hover:text-indigo-900">×</button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="নতুন সার্টিফিকেশন যোগ করুন (Enter চাপুন)"
              className="w-full p-3 border border-slate-200 rounded-lg"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addCustomItem('certifications', (e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
          </div>
        </div>
      )}

      {activeTab === 'preview' && (
        <div className="glass-card p-6">
          <h3 className="font-semibold text-slate-700 mb-4">👁️ প্রোফাইল প্রিভিউ</h3>
          <p className="text-sm text-slate-500 mb-6">রোগীরা আপনার প্রোফাইল এইভাবে দেখবে</p>

          {/* Preview Card */}
          <div className="max-w-2xl mx-auto glass-subtle rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
              <div className="flex items-center gap-4">
                <img
                  src={profile.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=fff&color=3b82f6&size=200`}
                  alt={profile.name}
                  className="w-24 h-24 rounded-full border-4 border-white/30 object-cover"
                />
                <div>
                  <h2 className="text-2xl font-bold">{profile.nameBn || profile.name}</h2>
                  <p className="opacity-90">{profile.degrees}</p>
                  <p className="opacity-80">{profile.specialtyBn || profile.specialty}</p>
                  <p className="text-sm opacity-70 mt-1">BMDC: {profile.bmdcNo}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {profile.bioBn && (
                <div>
                  <h4 className="font-medium text-slate-700 mb-2">পরিচয়</h4>
                  <p className="text-slate-600">{profile.bioBn}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-slate-700 mb-2">অভিজ্ঞতা</h4>
                  <p className="text-2xl font-bold text-blue-600">{profile.experienceYears}+ বছর</p>
                </div>
                <div>
                  <h4 className="font-medium text-slate-700 mb-2">ভাষা</h4>
                  <p className="text-slate-600">{profile.languages?.join(', ') || '-'}</p>
                </div>
              </div>

              {profile.education.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-700 mb-2">শিক্ষাগত যোগ্যতা</h4>
                  <ul className="space-y-1">
                    {profile.education.map((edu, idx) => (
                      <li key={idx} className="text-sm text-slate-600">
                        • {edu.degree} - {edu.institution} ({edu.year})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {profile.services && profile.services.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-700 mb-2">সেবা সমূহ</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.services.map((service, idx) => (
                      <span key={idx} className="px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs">
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileEditor;

