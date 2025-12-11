import React, { useState, useMemo, useCallback } from 'react';

// ============ TYPES ============
export interface DoctorSlot {
  id: string;
  date: string;
  time: string;
  available: boolean;
  fee: number;
  slotType: 'regular' | 'emergency' | 'follow-up';
}

export interface DoctorChamber {
  id: string;
  name: string;
  nameBn: string;
  address: string;
  area: string;
  city: string;
  fee: number;
  followUpFee: number;
  availableSlots: DoctorSlot[];
}

export interface FamilyMember {
  id: string;
  name: string;
  nameBn?: string;
  relation: string;
  age: number;
  gender: 'Male' | 'Female';
}

export interface BookingData {
  doctorId: string;
  chamberId: string;
  slotId: string;
  date: string;
  time: string;
  patientId?: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientPhone: string;
  visitType: 'new' | 'follow-up' | 'report' | 'emergency';
  symptoms?: string;
  isFamilyBooking: boolean;
  familyMemberId?: string;
  fee: number;
}

interface EnhancedBookingProps {
  doctorId: string;
  doctorName: string;
  doctorNameBn?: string;
  doctorSpecialty: string;
  doctorSpecialtyBn?: string;
  doctorImage?: string;
  doctorRating?: number;
  doctorExperience?: number;
  chambers: DoctorChamber[];
  familyMembers?: FamilyMember[];
  currentUserId?: string;
  currentUserName?: string;
  currentUserPhone?: string;
  onBook: (booking: BookingData) => Promise<void>;
  onClose: () => void;
}

// ============ VISIT TYPES ============
const VISIT_TYPES = [
  { value: 'new', label: 'নতুন রোগী', labelEn: 'New Patient', icon: '🆕', description: 'প্রথমবার দেখাচ্ছেন' },
  { value: 'follow-up', label: 'ফলো-আপ', labelEn: 'Follow-up', icon: '🔄', description: 'আগে দেখিয়েছেন' },
  { value: 'report', label: 'রিপোর্ট দেখানো', labelEn: 'Report Review', icon: '📋', description: 'টেস্ট রিপোর্ট নিয়ে' },
  { value: 'emergency', label: 'জরুরি', labelEn: 'Emergency', icon: '🚨', description: 'জরুরি অবস্থা' },
];

// ============ ENHANCED BOOKING COMPONENT ============
export const EnhancedBooking: React.FC<EnhancedBookingProps> = ({
  doctorId,
  doctorName,
  doctorNameBn,
  doctorSpecialty,
  doctorSpecialtyBn,
  doctorImage,
  doctorRating,
  doctorExperience,
  chambers,
  familyMembers = [],
  currentUserId,
  currentUserName,
  currentUserPhone,
  onBook,
  onClose,
}) => {
  // State
  const [step, setStep] = useState<'chamber' | 'date' | 'patient' | 'confirm'>('chamber');
  const [selectedChamberId, setSelectedChamberId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [visitType, setVisitType] = useState<'new' | 'follow-up' | 'report' | 'emergency'>('new');
  const [bookForSelf, setBookForSelf] = useState(true);
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState(currentUserName || '');
  const [patientAge, setPatientAge] = useState<number | ''>('');
  const [patientGender, setPatientGender] = useState<'Male' | 'Female'>('Male');
  const [patientPhone, setPatientPhone] = useState(currentUserPhone || '');
  const [symptoms, setSymptoms] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get selected chamber
  const selectedChamber = useMemo(() => 
    chambers.find(c => c.id === selectedChamberId),
    [chambers, selectedChamberId]
  );

  // Get available dates
  const availableDates = useMemo(() => {
    if (!selectedChamber) return [];
    
    const dates = new Set<string>();
    selectedChamber.availableSlots
      .filter(s => s.available)
      .forEach(s => dates.add(s.date));
    
    return Array.from(dates).sort();
  }, [selectedChamber]);

  // Get available slots for selected date
  const availableSlots = useMemo(() => {
    if (!selectedChamber || !selectedDate) return [];
    
    return selectedChamber.availableSlots
      .filter(s => s.date === selectedDate && s.available)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [selectedChamber, selectedDate]);

  // Get selected slot
  const selectedSlot = useMemo(() => 
    availableSlots.find(s => s.id === selectedSlotId),
    [availableSlots, selectedSlotId]
  );

  // Calculate fee
  const calculatedFee = useMemo(() => {
    if (!selectedChamber) return 0;
    if (visitType === 'follow-up') return selectedChamber.followUpFee;
    return selectedChamber.fee;
  }, [selectedChamber, visitType]);

  // Handle family member select
  const handleFamilyMemberSelect = useCallback((memberId: string | null) => {
    if (memberId) {
      const member = familyMembers.find(m => m.id === memberId);
      if (member) {
        setPatientName(member.nameBn || member.name);
        setPatientAge(member.age);
        setPatientGender(member.gender);
        setSelectedFamilyMemberId(memberId);
      }
    } else {
      setPatientName(currentUserName || '');
      setPatientAge('');
      setPatientGender('Male');
      setSelectedFamilyMemberId(null);
    }
  }, [familyMembers, currentUserName]);

  // Handle book
  const handleBook = useCallback(async () => {
    if (!selectedChamber || !selectedSlot) return;
    
    setIsBooking(true);
    setError(null);
    
    try {
      const booking: BookingData = {
        doctorId,
        chamberId: selectedChamber.id,
        slotId: selectedSlot.id,
        date: selectedDate!,
        time: selectedSlot.time,
        patientId: currentUserId,
        patientName,
        patientAge: typeof patientAge === 'number' ? patientAge : 0,
        patientGender,
        patientPhone,
        visitType,
        symptoms: symptoms || undefined,
        isFamilyBooking: !bookForSelf,
        familyMemberId: selectedFamilyMemberId || undefined,
        fee: calculatedFee,
      };
      
      await onBook(booking);
    } catch (err: any) {
      setError(err.message || 'বুকিং ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsBooking(false);
    }
  }, [
    selectedChamber, selectedSlot, selectedDate, doctorId, currentUserId,
    patientName, patientAge, patientGender, patientPhone, visitType,
    symptoms, bookForSelf, selectedFamilyMemberId, calculatedFee, onBook
  ]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (dateStr === today.toISOString().split('T')[0]) return 'আজ';
    if (dateStr === tomorrow.toISOString().split('T')[0]) return 'আগামীকাল';
    
    return date.toLocaleDateString('bn-BD', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Progress indicator
  const steps = [
    { id: 'chamber', label: 'চেম্বার', icon: '🏥' },
    { id: 'date', label: 'তারিখ ও সময়', icon: '📅' },
    { id: 'patient', label: 'রোগীর তথ্য', icon: '👤' },
    { id: 'confirm', label: 'নিশ্চিত করুন', icon: '✅' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="glass-strong rounded-2xl max-w-2xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img
                src={doctorImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(doctorName)}&background=3b82f6&color=fff&size=200`}
                alt={doctorName}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <h2 className="font-bold text-slate-800">{doctorNameBn || doctorName}</h2>
                <p className="text-sm text-slate-500">{doctorSpecialtyBn || doctorSpecialty}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">✕</button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {steps.map((s, idx) => (
              <React.Fragment key={s.id}>
                <div 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                    idx < currentStepIndex ? 'bg-green-100 text-green-700' :
                    idx === currentStepIndex ? 'bg-blue-500 text-white' :
                    'bg-slate-100 text-slate-400'
                  }`}
                >
                  <span>{idx < currentStepIndex ? '✓' : s.icon}</span>
                  <span className="text-sm font-medium hidden md:inline">{s.label}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${idx < currentStepIndex ? 'bg-green-400' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Step 1: Select Chamber */}
          {step === 'chamber' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">🏥 চেম্বার নির্বাচন করুন</h3>
              
              <div className="space-y-3">
                {chambers.map(chamber => (
                  <button
                    key={chamber.id}
                    onClick={() => {
                      setSelectedChamberId(chamber.id);
                      setStep('date');
                    }}
                    className={`w-full p-4 text-left rounded-xl border-2 transition ${
                      selectedChamberId === chamber.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-slate-800">{chamber.nameBn || chamber.name}</h4>
                        <p className="text-sm text-slate-500">{chamber.address}</p>
                        <p className="text-xs text-slate-400">{chamber.area}, {chamber.city}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">৳{chamber.fee}</div>
                        <div className="text-xs text-slate-500">ফলো-আপ: ৳{chamber.followUpFee}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-green-600">
                      ✓ {chamber.availableSlots.filter(s => s.available).length} স্লট খালি
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Select Date & Time */}
          {step === 'date' && selectedChamber && (
            <div className="space-y-6">
              {/* Visit Type */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-3">📋 ভিজিটের ধরন</h3>
                <div className="grid grid-cols-2 gap-3">
                  {VISIT_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setVisitType(type.value as any)}
                      className={`p-3 text-left rounded-xl border-2 transition ${
                        visitType === type.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{type.icon}</span>
                        <div>
                          <div className="font-medium text-slate-700">{type.label}</div>
                          <div className="text-xs text-slate-500">{type.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Selection */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-3">📅 তারিখ নির্বাচন</h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {availableDates.slice(0, 7).map(date => (
                    <button
                      key={date}
                      onClick={() => {
                        setSelectedDate(date);
                        setSelectedSlotId(null);
                      }}
                      className={`flex-shrink-0 px-4 py-3 rounded-xl border-2 transition min-w-[100px] ${
                        selectedDate === date
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="text-sm font-medium text-slate-700">{formatDate(date)}</div>
                      <div className="text-xs text-slate-500">
                        {availableSlots.length} স্লট
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Slots */}
              {selectedDate && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-3">⏰ সময় নির্বাচন</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {availableSlots.map(slot => (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`py-3 px-2 rounded-lg border-2 transition text-center ${
                          selectedSlotId === slot.id
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 hover:border-blue-300 text-slate-700'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                  
                  {availableSlots.length === 0 && (
                    <p className="text-center text-slate-500 py-4">এই তারিখে কোনো স্লট নেই</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Patient Information */}
          {step === 'patient' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800">👤 রোগীর তথ্য</h3>

              {/* Book for self or family */}
              {familyMembers.length > 0 && (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setBookForSelf(true);
                      handleFamilyMemberSelect(null);
                    }}
                    className={`flex-1 py-3 rounded-lg border-2 transition ${
                      bookForSelf
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    👤 নিজের জন্য
                  </button>
                  <button
                    onClick={() => setBookForSelf(false)}
                    className={`flex-1 py-3 rounded-lg border-2 transition ${
                      !bookForSelf
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    👨‍👩‍👧 পরিবারের জন্য
                  </button>
                </div>
              )}

              {/* Family Member Selection */}
              {!bookForSelf && familyMembers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">পরিবারের সদস্য নির্বাচন</label>
                  <div className="grid grid-cols-2 gap-2">
                    {familyMembers.map(member => (
                      <button
                        key={member.id}
                        onClick={() => handleFamilyMemberSelect(member.id)}
                        className={`p-3 text-left rounded-lg border-2 transition ${
                          selectedFamilyMemberId === member.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="font-medium text-slate-700">{member.nameBn || member.name}</div>
                        <div className="text-xs text-slate-500">{member.relation} • {member.age} বছর</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Patient Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">রোগীর নাম *</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg"
                    placeholder="পূর্ণ নাম"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">ফোন *</label>
                  <input
                    type="tel"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg"
                    placeholder="01XXXXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">বয়স *</label>
                  <input
                    type="number"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full p-3 border border-slate-200 rounded-lg"
                    placeholder="বছর"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">লিঙ্গ *</label>
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value as any)}
                    className="w-full p-3 border border-slate-200 rounded-lg"
                  >
                    <option value="Male">পুরুষ</option>
                    <option value="Female">মহিলা</option>
                  </select>
                </div>
              </div>

              {/* Symptoms */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">সমস্যার বিবরণ (ঐচ্ছিক)</label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  rows={3}
                  className="w-full p-3 border border-slate-200 rounded-lg resize-none"
                  placeholder="আপনার সমস্যাগুলো সংক্ষেপে লিখুন..."
                />
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 'confirm' && selectedChamber && selectedSlot && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800">✅ বুকিং নিশ্চিত করুন</h3>

              {/* Summary Card */}
              <div className="glass-subtle p-4 rounded-xl space-y-4">
                {/* Doctor */}
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                  <img
                    src={doctorImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(doctorName)}&background=3b82f6&color=fff`}
                    alt={doctorName}
                    className="w-14 h-14 rounded-full"
                  />
                  <div>
                    <h4 className="font-bold text-slate-800">{doctorNameBn || doctorName}</h4>
                    <p className="text-sm text-slate-500">{doctorSpecialtyBn || doctorSpecialty}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-slate-500">চেম্বার</div>
                    <div className="font-medium text-slate-700">{selectedChamber.nameBn || selectedChamber.name}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">তারিখ ও সময়</div>
                    <div className="font-medium text-slate-700">{formatDate(selectedDate!)} • {selectedSlot.time}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">রোগী</div>
                    <div className="font-medium text-slate-700">{patientName}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">ভিজিটের ধরন</div>
                    <div className="font-medium text-slate-700">
                      {VISIT_TYPES.find(v => v.value === visitType)?.label}
                    </div>
                  </div>
                </div>

                {/* Fee */}
                <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-slate-600">ফি</span>
                  <span className="text-2xl font-bold text-blue-600">৳{calculatedFee}</span>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                  ⚠️ {error}
                </div>
              )}

              {/* Terms */}
              <p className="text-xs text-slate-500 text-center">
                বুকিং করে আপনি আমাদের শর্তাবলী ও গোপনীয়তা নীতিতে সম্মত হচ্ছেন
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex gap-3">
          {step !== 'chamber' && (
            <button
              onClick={() => {
                const prevStep = steps[currentStepIndex - 1];
                if (prevStep) setStep(prevStep.id as any);
              }}
              className="px-6 py-2 glass-subtle text-slate-600 rounded-lg hover:bg-slate-100"
            >
              ← পিছনে
            </button>
          )}
          
          <div className="flex-1" />

          {step === 'chamber' && (
            <button
              onClick={onClose}
              className="px-6 py-2 glass-subtle text-slate-600 rounded-lg hover:bg-slate-100"
            >
              বাতিল
            </button>
          )}

          {step === 'date' && (
            <button
              onClick={() => setStep('patient')}
              disabled={!selectedSlotId}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              পরবর্তী →
            </button>
          )}

          {step === 'patient' && (
            <button
              onClick={() => setStep('confirm')}
              disabled={!patientName || !patientPhone || !patientAge}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              পরবর্তী →
            </button>
          )}

          {step === 'confirm' && (
            <button
              onClick={handleBook}
              disabled={isBooking}
              className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium"
            >
              {isBooking ? '⏳ বুকিং হচ্ছে...' : '✅ বুকিং নিশ্চিত করুন'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedBooking;

