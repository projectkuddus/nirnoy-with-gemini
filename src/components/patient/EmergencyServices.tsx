import React, { useState, useEffect, useMemo } from 'react';

// ============ TYPES ============
export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
  isPrimary: boolean;
  avatar?: string;
}

export interface NearbyHospital {
  id: string;
  name: string;
  nameBn?: string;
  type: 'government' | 'private' | 'specialized';
  specialties?: string[];
  address: string;
  addressBn?: string;
  phone: string;
  emergencyPhone?: string;
  distance: number; // in km
  rating?: number;
  isOpen24Hours: boolean;
  hasAmbulance: boolean;
  location: {
    lat: number;
    lng: number;
  };
}

export interface MedicalIDCard {
  name: string;
  nameBn?: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  emergencyContacts: EmergencyContact[];
  currentMedications: string[];
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
  };
  qrCode?: string;
}

interface EmergencyServicesProps {
  medicalId: MedicalIDCard;
  emergencyContacts: EmergencyContact[];
  nearbyHospitals: NearbyHospital[];
  userLocation?: { lat: number; lng: number };
  onEmergencyCall?: (type: 'ambulance' | 'contact' | 'hospital', target: string) => void;
  onShareLocation?: (contacts: EmergencyContact[]) => void;
  onUpdateContacts?: (contacts: EmergencyContact[]) => void;
}

// ============ CONSTANTS ============
const EMERGENCY_NUMBERS = {
  nationalEmergency: '999',
  ambulance: '199',
  police: '100',
  fire: '101',
  childProtection: '1098',
  womenViolence: '10921',
};

const HOSPITAL_TYPE_LABELS: Record<string, { label: string; labelBn: string; color: string }> = {
  government: { label: 'Government', labelBn: 'সরকারি', color: 'bg-green-100 text-green-700' },
  private: { label: 'Private', labelBn: 'বেসরকারি', color: 'bg-blue-100 text-blue-700' },
  specialized: { label: 'Specialized', labelBn: 'বিশেষায়িত', color: 'bg-purple-100 text-purple-700' },
};

// ============ COMPONENT ============
export const EmergencyServices: React.FC<EmergencyServicesProps> = ({
  medicalId,
  emergencyContacts,
  nearbyHospitals,
  userLocation,
  onEmergencyCall,
  onShareLocation,
  onUpdateContacts,
}) => {
  const [activeTab, setActiveTab] = useState<'emergency' | 'hospitals' | 'medicalId' | 'contacts'>('emergency');
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [showMedicalIdModal, setShowMedicalIdModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sort hospitals by distance
  const sortedHospitals = useMemo(() => {
    const filtered = nearbyHospitals.filter(h => 
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.nameBn && h.nameBn.includes(searchQuery)) ||
      h.specialties?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    return filtered.sort((a, b) => a.distance - b.distance);
  }, [nearbyHospitals, searchQuery]);

  // Calculate age from DOB
  const age = useMemo(() => {
    const birth = new Date(medicalId.dateOfBirth);
    const now = new Date();
    return Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365));
  }, [medicalId.dateOfBirth]);

  // Handle emergency call
  const handleEmergencyCall = (type: 'ambulance' | 'contact' | 'hospital', target: string) => {
    onEmergencyCall?.(type, target);
    // Also trigger native call
    window.location.href = `tel:${target}`;
  };

  // Handle share location
  const handleShareLocation = async () => {
    setIsSharingLocation(true);
    try {
      onShareLocation?.(emergencyContacts.filter(c => c.isPrimary));
      // Simulate sending
      await new Promise(r => setTimeout(r, 2000));
    } finally {
      setIsSharingLocation(false);
    }
  };

  // Open in maps
  const openInMaps = (hospital: NearbyHospital) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${hospital.location.lat},${hospital.location.lng}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Emergency Hero Section */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          🆘 জরুরি সেবা
        </h1>
        <p className="text-red-100 mb-4">
          জরুরি পরিস্থিতিতে দ্রুত সাহায্য পেতে নিচের বাটনগুলো ব্যবহার করুন
        </p>

        {/* Quick Emergency Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => handleEmergencyCall('ambulance', EMERGENCY_NUMBERS.nationalEmergency)}
            className="bg-white text-red-600 rounded-xl p-4 font-bold hover:bg-red-50 transition-all transform hover:scale-105"
          >
            <div className="text-3xl mb-1">🚨</div>
            <div className="text-sm">জাতীয় জরুরি</div>
            <div className="text-xs text-slate-500">999</div>
          </button>
          <button
            onClick={() => handleEmergencyCall('ambulance', EMERGENCY_NUMBERS.ambulance)}
            className="bg-white text-red-600 rounded-xl p-4 font-bold hover:bg-red-50 transition-all transform hover:scale-105"
          >
            <div className="text-3xl mb-1">🚑</div>
            <div className="text-sm">অ্যাম্বুলেন্স</div>
            <div className="text-xs text-slate-500">199</div>
          </button>
          <button
            onClick={handleShareLocation}
            disabled={isSharingLocation}
            className="bg-white text-red-600 rounded-xl p-4 font-bold hover:bg-red-50 transition-all transform hover:scale-105 disabled:opacity-50"
          >
            <div className="text-3xl mb-1">{isSharingLocation ? '⏳' : '📍'}</div>
            <div className="text-sm">লোকেশন শেয়ার</div>
            <div className="text-xs text-slate-500">পরিবারের কাছে</div>
          </button>
          <button
            onClick={() => setShowMedicalIdModal(true)}
            className="bg-white text-red-600 rounded-xl p-4 font-bold hover:bg-red-50 transition-all transform hover:scale-105"
          >
            <div className="text-3xl mb-1">🪪</div>
            <div className="text-sm">মেডিকেল আইডি</div>
            <div className="text-xs text-slate-500">দেখুন</div>
          </button>
        </div>
      </div>

      {/* Medical ID Modal */}
      {showMedicalIdModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Medical ID Card Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white rounded-t-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                    🪪
                  </div>
                  <div>
                    <div className="font-bold text-lg">মেডিকেল আইডি</div>
                    <div className="text-blue-100 text-sm">Nirnoy Health</div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowMedicalIdModal(false)}
                  className="text-white/80 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="text-center">
                <h2 className="text-2xl font-bold">{medicalId.nameBn || medicalId.name}</h2>
                <p className="text-blue-100">{age} বছর • {medicalId.gender}</p>
              </div>
            </div>

            {/* Medical ID Content */}
            <div className="p-6 space-y-4">
              {/* Blood Group - Prominent */}
              <div className="text-center">
                <div className="inline-block bg-red-100 text-red-700 px-6 py-2 rounded-full text-2xl font-bold">
                  🩸 {medicalId.bloodGroup}
                </div>
              </div>

              {/* Critical Info */}
              {medicalId.allergies.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                    ⚠️ এলার্জি
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {medicalId.allergies.map((allergy, i) => (
                      <span key={i} className="bg-amber-200 text-amber-800 px-2 py-1 rounded text-sm">
                        {allergy}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Chronic Conditions */}
              {medicalId.chronicConditions.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <h4 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
                    🏥 দীর্ঘমেয়াদী রোগ
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {medicalId.chronicConditions.map((condition, i) => (
                      <span key={i} className="bg-purple-200 text-purple-800 px-2 py-1 rounded text-sm">
                        {condition}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Medications */}
              {medicalId.currentMedications.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                    💊 চলমান ওষুধ
                  </h4>
                  <ul className="space-y-1 text-sm text-blue-700">
                    {medicalId.currentMedications.map((med, i) => (
                      <li key={i}>• {med}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Emergency Contacts */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                  📞 জরুরি যোগাযোগ
                </h4>
                <div className="space-y-2">
                  {medicalId.emergencyContacts.slice(0, 2).map((contact, i) => (
                    <div key={contact.id || i} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-xs text-slate-500">{contact.relation}</div>
                      </div>
                      <a 
                        href={`tel:${contact.phone}`}
                        className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm"
                      >
                        📞 কল
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Insurance Info */}
              {medicalId.insuranceInfo && (
                <div className="text-sm text-slate-500 text-center">
                  <span>বীমা: {medicalId.insuranceInfo.provider}</span>
                  <span className="mx-2">•</span>
                  <span>{medicalId.insuranceInfo.policyNumber}</span>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => setShowMedicalIdModal(false)}
                className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'emergency', label: 'জরুরি নম্বর', icon: '🚨' },
          { id: 'hospitals', label: 'কাছের হাসপাতাল', icon: '🏥' },
          { id: 'contacts', label: 'জরুরি যোগাযোগ', icon: '👥' },
          { id: 'medicalId', label: 'মেডিকেল আইডি', icon: '🪪' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === tab.id 
                ? 'bg-red-600 text-white' 
                : 'glass-card text-slate-600 hover:bg-white/60'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Emergency Numbers Tab */}
      {activeTab === 'emergency' && (
        <div className="space-y-4">
          <h3 className="font-bold text-slate-700">📞 জরুরি হেল্পলাইন</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries({
              nationalEmergency: { icon: '🚨', label: 'জাতীয় জরুরি সেবা', number: '999' },
              ambulance: { icon: '🚑', label: 'অ্যাম্বুলেন্স', number: '199' },
              police: { icon: '👮', label: 'পুলিশ', number: '100' },
              fire: { icon: '🚒', label: 'ফায়ার সার্ভিস', number: '101' },
              childProtection: { icon: '👶', label: 'শিশু সুরক্ষা', number: '1098' },
              womenViolence: { icon: '👩', label: 'নারী নির্যাতন', number: '10921' },
            }).map(([key, info]) => (
              <button
                key={key}
                onClick={() => handleEmergencyCall('ambulance', info.number)}
                className="glass-card rounded-xl p-4 text-left hover:bg-white/60 border hover:border-red-300 transition-all"
              >
                <div className="text-2xl mb-2">{info.icon}</div>
                <div className="font-medium text-slate-700">{info.label}</div>
                <div className="text-lg font-bold text-red-600">{info.number}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Nearby Hospitals Tab */}
      {activeTab === 'hospitals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-700">🏥 কাছের হাসপাতাল</h3>
            {userLocation && (
              <span className="text-xs text-slate-400">📍 আপনার লোকেশন থেকে</span>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="হাসপাতাল খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 glass-card rounded-xl border-0 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Hospital List */}
          <div className="space-y-3">
            {sortedHospitals.length > 0 ? (
              sortedHospitals.map(hospital => (
                <div key={hospital.id} className="glass-card rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-slate-700">
                          {hospital.nameBn || hospital.name}
                        </h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          HOSPITAL_TYPE_LABELS[hospital.type]?.color || 'bg-slate-100'
                        }`}>
                          {HOSPITAL_TYPE_LABELS[hospital.type]?.labelBn || hospital.type}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {hospital.addressBn || hospital.address}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">
                        {hospital.distance.toFixed(1)} কি.মি.
                      </div>
                      {hospital.rating && (
                        <div className="text-xs text-amber-500">
                          {'⭐'.repeat(Math.round(hospital.rating))} {hospital.rating}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {hospital.isOpen24Hours && (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
                        24/7 খোলা
                      </span>
                    )}
                    {hospital.hasAmbulance && (
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">
                        🚑 অ্যাম্বুলেন্স
                      </span>
                    )}
                    {hospital.specialties?.slice(0, 2).map((s, i) => (
                      <span key={i} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEmergencyCall('hospital', hospital.emergencyPhone || hospital.phone)}
                      className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                    >
                      📞 কল করুন
                    </button>
                    <button
                      onClick={() => openInMaps(hospital)}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                      🗺️ দিকনির্দেশনা
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <div className="text-4xl mb-2">🏥</div>
                <p>কোনো হাসপাতাল পাওয়া যায়নি</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Emergency Contacts Tab */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-700">👥 জরুরি যোগাযোগ</h3>
            <button className="text-sm text-blue-600 hover:underline">
              + নতুন যোগ করুন
            </button>
          </div>

          <div className="space-y-3">
            {emergencyContacts.length > 0 ? (
              emergencyContacts.map(contact => (
                <div 
                  key={contact.id} 
                  className={`glass-card rounded-xl p-4 flex items-center justify-between ${
                    contact.isPrimary ? 'border-2 border-green-400' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl">
                      {contact.avatar || contact.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-slate-700 flex items-center gap-2">
                        {contact.name}
                        {contact.isPrimary && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            প্রধান
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500">{contact.relation}</div>
                      <div className="text-sm text-slate-400">{contact.phone}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`tel:${contact.phone}`}
                      className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700"
                    >
                      📞
                    </a>
                    <a
                      href={`sms:${contact.phone}`}
                      className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700"
                    >
                      💬
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <div className="text-4xl mb-2">👥</div>
                <p>কোনো জরুরি যোগাযোগ নেই</p>
                <button className="mt-2 text-blue-600 hover:underline">
                  + প্রথম যোগাযোগ যোগ করুন
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Medical ID Tab */}
      {activeTab === 'medicalId' && (
        <div className="space-y-4">
          <h3 className="font-bold text-slate-700">🪪 আমার মেডিকেল আইডি</h3>
          
          {/* Medical ID Preview Card */}
          <div className="glass-strong rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl">
                  👤
                </div>
                <div>
                  <h2 className="text-xl font-bold">{medicalId.nameBn || medicalId.name}</h2>
                  <p className="text-blue-100">{age} বছর • {medicalId.gender}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Blood Group */}
              <div className="flex items-center justify-center">
                <div className="bg-red-100 text-red-700 px-6 py-3 rounded-full text-xl font-bold">
                  🩸 {medicalId.bloodGroup}
                </div>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-amber-50 rounded-xl p-3">
                  <div className="text-xs text-amber-600 mb-1">⚠️ এলার্জি</div>
                  <div className="font-medium text-amber-800">
                    {medicalId.allergies.length > 0 
                      ? medicalId.allergies.join(', ')
                      : 'নেই'}
                  </div>
                </div>
                <div className="bg-purple-50 rounded-xl p-3">
                  <div className="text-xs text-purple-600 mb-1">🏥 দীর্ঘমেয়াদী রোগ</div>
                  <div className="font-medium text-purple-800">
                    {medicalId.chronicConditions.length > 0 
                      ? medicalId.chronicConditions.join(', ')
                      : 'নেই'}
                  </div>
                </div>
              </div>

              {/* Current Medications */}
              {medicalId.currentMedications.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-3">
                  <div className="text-xs text-blue-600 mb-1">💊 চলমান ওষুধ</div>
                  <div className="font-medium text-blue-800">
                    {medicalId.currentMedications.join(', ')}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowMedicalIdModal(true)}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
                >
                  📋 সম্পূর্ণ দেখুন
                </button>
                <button className="flex-1 py-2 glass-card text-slate-600 rounded-xl font-medium hover:bg-white/60">
                  ✏️ সম্পাদনা
                </button>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="font-medium text-slate-700 mb-2">💡 টিপস</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• জরুরি অবস্থায় এই তথ্য চিকিৎসকদের সাহায্য করবে</li>
              <li>• সবসময় তথ্য আপডেট রাখুন</li>
              <li>• ফোনের লক স্ক্রিনে মেডিকেল আইডি যোগ করুন</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyServices;

