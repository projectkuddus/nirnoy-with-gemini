import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Doctor, Chamber } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase, isSupabaseConfigured } from '../services/supabaseAuth';
import { useAuth } from '../contexts/AuthContext';

interface BookingModalProps {
  doctor: Doctor;
  chamber: Chamber;
  onClose: () => void;
}

type VisitType = 'NEW' | 'FOLLOW_UP' | 'REPORT';
type BookingFor = 'self' | 'family';

interface SlotData {
  time: string;
  display: string;
  available: boolean;
  period: string;
  isPast: boolean;
  bookedCount: number;
  maxCapacity: number;
}

export const BookingModal: React.FC<BookingModalProps> = ({ doctor, chamber, onClose }) => {
  const { language } = useLanguage();
  const { user, role, isAuthenticated } = useAuth();
  const isBn = language === 'bn';
  const navigate = useNavigate();

  // Check if user is a registered patient
  const isPatient = isAuthenticated && user?.id && (role === 'patient' || role === 'PATIENT');

  // State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [visitType, setVisitType] = useState<VisitType>('NEW');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; serial: number; display: string } | null>(null);
  
  // Booking for self or family
  const [bookingFor, setBookingFor] = useState<BookingFor>('self');
  const [familyMemberName, setFamilyMemberName] = useState('');
  const [familyMemberPhone, setFamilyMemberPhone] = useState('');
  const [familyRelation, setFamilyRelation] = useState<string>('');
  
  // Patient info - auto-filled from profile for "self"
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  
  // Slot availability tracking
  const [slotBookings, setSlotBookings] = useState<Map<string, number>>(new Map());
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [assignedSerial, setAssignedSerial] = useState<number>(1);
  
  // Resolved doctor profile_id (the canonical ID we use for everything)
  const [resolvedDoctorId, setResolvedDoctorId] = useState<string | null>(null);
  
  // Max patients per slot (configurable per doctor, default 1)
  const maxPatientsPerSlot = 1;
  
  // Resolve the correct doctor_id (profile_id) on mount
  useEffect(() => {
    const resolveDoctorId = async () => {
      // Try to get profile_id from doctor object
      let doctorProfileId = (doctor as any).userId || (doctor as any).profileId;
      
      // If not found, look it up from doctors table
      if (!doctorProfileId && isSupabaseConfigured()) {
        console.log('[BookingModal] Looking up profile_id for doctor.id:', doctor.id);
        const { data: doctorRecord } = await supabase
          .from('doctors')
          .select('profile_id')
          .eq('id', doctor.id)
          .single();
        
        if (doctorRecord?.profile_id) {
          doctorProfileId = doctorRecord.profile_id;
          console.log('[BookingModal] Found profile_id:', doctorProfileId);
        } else {
          // Maybe the doctor.id IS the profile_id
          const { data: profileCheck } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('id', doctor.id)
            .single();
          
          if (profileCheck?.role === 'doctor') {
            doctorProfileId = doctor.id;
            console.log('[BookingModal] doctor.id IS the profile_id:', doctorProfileId);
          }
        }
      }
      
      if (!doctorProfileId) {
        doctorProfileId = doctor.id; // Fallback
      }
      
      console.log('[BookingModal] RESOLVED doctor_id (profile_id):', doctorProfileId);
      setResolvedDoctorId(doctorProfileId);
    };
    
    resolveDoctorId();
  }, [doctor]);
  
  // Auto-fill patient info from logged-in user for "self" bookings
  useEffect(() => {
    if (isPatient && user && bookingFor === 'self') {
      setPatientName(user.name || '');
      setPatientPhone(user.phone || '');
    }
  }, [isPatient, user, bookingFor]);
  
  // Clear family member fields when switching
  useEffect(() => {
    if (bookingFor === 'self' && user) {
      setPatientName(user.name || '');
      setPatientPhone(user.phone || '');
    } else if (bookingFor === 'family') {
      setPatientName(familyMemberName);
      setPatientPhone(familyMemberPhone);
    }
  }, [bookingFor, user, familyMemberName, familyMemberPhone]);
  
  // Fetch slot bookings for the selected date
  useEffect(() => {
    const fetchSlotBookings = async () => {
      if (!selectedDate || !resolvedDoctorId || !isSupabaseConfigured()) {
        setSlotBookings(new Map());
        return;
      }
      
      setLoadingSlots(true);
      
      try {
        console.log('[BookingModal] Fetching slots for doctor:', resolvedDoctorId, 'date:', selectedDate);
        
        // Get all appointments for this doctor on this date
        const { data, error } = await supabase
          .from('appointments')
          .select('scheduled_time, id')
          .eq('doctor_id', resolvedDoctorId)
          .eq('scheduled_date', selectedDate)
          .neq('status', 'cancelled');
        
        if (!error && data) {
          // Count bookings per time slot
          const bookingsMap = new Map<string, number>();
          data.forEach(apt => {
            const time = apt.scheduled_time?.substring(0, 5);
            if (time) {
              bookingsMap.set(time, (bookingsMap.get(time) || 0) + 1);
            }
          });
          
          console.log('[BookingModal] Slot bookings:', Object.fromEntries(bookingsMap));
          setSlotBookings(bookingsMap);
          setAssignedSerial(data.length + 1);
        }
      } catch (e) {
        console.error('[BookingModal] Error fetching slot bookings:', e);
      }
      
      setLoadingSlots(false);
    };
    
    fetchSlotBookings();
  }, [selectedDate, resolvedDoctorId]);
  
  // Clear slot when date changes
  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDate]);

  // Translations
  const t = {
    title: isBn ? 'অ্যাপয়েন্টমেন্ট বুক করুন' : 'Book Appointment',
    step1: isBn ? 'ভিজিটের ধরন' : 'Visit Type',
    step2: isBn ? 'তারিখ ও সময়' : 'Date & Time',
    step3: isBn ? 'রোগীর তথ্য' : 'Patient Info',
    newConsult: isBn ? 'নতুন রোগী' : 'New Patient',
    newDesc: isBn ? 'প্রথমবার এই ডাক্তারের কাছে যাচ্ছেন' : 'First time visiting this doctor',
    followUp: isBn ? 'ফলো-আপ' : 'Follow-up',
    followUpDesc: isBn ? 'আগে দেখিয়েছেন, পুনরায় চেকআপ' : 'Previously visited, follow-up checkup',
    report: isBn ? 'রিপোর্ট দেখানো' : 'Report Check',
    reportDesc: isBn ? 'শুধু টেস্ট রিপোর্ট দেখাতে' : 'Only showing test reports',
    selectDate: isBn ? 'তারিখ নির্বাচন করুন' : 'Select Date',
    selectTime: isBn ? 'সময় নির্বাচন করুন' : 'Select Time',
    morning: isBn ? 'সকাল' : 'Morning',
    afternoon: isBn ? 'দুপুর' : 'Afternoon',
    evening: isBn ? 'সন্ধ্যা' : 'Evening',
    serial: isBn ? 'সিরিয়াল' : 'Serial',
    patientName: isBn ? 'রোগীর নাম' : 'Patient Name',
    phone: isBn ? 'মোবাইল নম্বর' : 'Mobile Number',
    symptoms: isBn ? 'সমস্যা/লক্ষণ' : 'Problem/Symptoms',
    symptomsPlaceholder: isBn ? 'সংক্ষেপে আপনার সমস্যা লিখুন...' : 'Briefly describe your problem...',
    next: isBn ? 'পরবর্তী' : 'Next',
    back: isBn ? 'পিছনে' : 'Back',
    confirm: isBn ? 'কনফার্ম করুন' : 'Confirm Booking',
    confirming: isBn ? 'বুক হচ্ছে...' : 'Booking...',
    fee: isBn ? 'ফি' : 'Fee',
    discount: isBn ? 'ছাড়' : 'Discount',
    total: isBn ? 'মোট' : 'Total',
    today: isBn ? 'আজ' : 'Today',
    tomorrow: isBn ? 'আগামীকাল' : 'Tomorrow',
    booked: isBn ? 'বুকড' : 'Booked',
    available: isBn ? 'খালি আছে' : 'Available',
    successTitle: isBn ? 'বুকিং সফল!' : 'Booking Confirmed!',
    successMsg: isBn ? 'আপনার অ্যাপয়েন্টমেন্ট কনফার্ম হয়েছে' : 'Your appointment has been confirmed',
    serialNo: isBn ? 'সিরিয়াল নং' : 'Serial No',
    estTime: isBn ? 'আনুমানিক সময়' : 'Est. Time',
    smsSent: isBn ? 'SMS পাঠানো হয়েছে' : 'SMS sent to',
    done: isBn ? 'ঠিক আছে' : 'Done',
    chamber: isBn ? 'চেম্বার' : 'Chamber',
    bookingForSelf: isBn ? 'নিজের জন্য' : 'For Myself',
    bookingForFamily: isBn ? 'পরিবারের সদস্যের জন্য' : 'For Family Member',
    familyName: isBn ? 'পরিবারের সদস্যের নাম' : 'Family Member Name',
    familyRelation: isBn ? 'সম্পর্ক' : 'Relation',
    slotFull: isBn ? 'ফুল' : 'Full',
  };

  // Generate next 7 days
  const dates = useMemo(() => {
    const bengaliDays = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];
    const englishDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
        value: d.toISOString().split('T')[0],
        day: isBn ? bengaliDays[d.getDay()] : englishDays[d.getDay()],
        date: d.getDate(),
        isToday: i === 0,
        isTomorrow: i === 1,
      };
    });
  }, [isBn]);

  // Generate time slots with availability
  const slots = useMemo((): SlotData[] => {
    const result: SlotData[] = [];
    
    const today = new Date().toISOString().split('T')[0];
    const isToday = selectedDate === today;
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const isSlotPast = (hour: number, minute: number): boolean => {
      if (!isToday) return false;
      const slotMinutes = hour * 60 + minute;
      const currentMinutes = currentHour * 60 + currentMinute + 30;
      return slotMinutes < currentMinutes;
    };
    
    const generateSlot = (hour: number, minute: number, period: string): SlotData => {
      const isPast = isSlotPast(hour, minute);
      const timeKey = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const bookedCount = slotBookings.get(timeKey) || 0;
      const isAvailable = !isPast && bookedCount < maxPatientsPerSlot;
      
      const displayHour = hour > 12 ? hour - 12 : hour;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      
      return {
        time: timeKey,
        display: `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`,
        available: isAvailable,
        period,
        isPast,
        bookedCount,
        maxCapacity: maxPatientsPerSlot,
      };
    };
    
    // Morning: 9 AM - 12 PM
    for (let h = 9; h < 12; h++) {
      for (let m = 0; m < 60; m += 15) {
        result.push(generateSlot(h, m, 'morning'));
      }
    }
    
    // Afternoon: 3 PM - 6 PM
    for (let h = 15; h < 18; h++) {
      for (let m = 0; m < 60; m += 15) {
        result.push(generateSlot(h, m, 'afternoon'));
      }
    }
    
    // Evening: 6 PM - 9 PM
    for (let h = 18; h < 21; h++) {
      for (let m = 0; m < 60; m += 15) {
        result.push(generateSlot(h, m, 'evening'));
      }
    }
    
    return result;
  }, [selectedDate, slotBookings]);

  // Calculate fee
  const baseFee = chamber.fee;
  const fee = visitType === 'FOLLOW_UP' ? Math.round(baseFee * 0.5) : visitType === 'REPORT' ? Math.round(baseFee * 0.3) : baseFee;
  const discount = baseFee - fee;

  // Validate phone
  const isValidPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
  };

  // Get effective patient name/phone based on booking type
  const effectivePatientName = bookingFor === 'self' ? patientName : familyMemberName;
  const effectivePatientPhone = bookingFor === 'self' ? patientPhone : familyMemberPhone;

  // Handle booking - save to Supabase
  const handleBooking = async () => {
    if (!resolvedDoctorId) {
      console.error('[BookingModal] No resolved doctor_id!');
      alert('ডাক্তার তথ্য লোড হয়নি। পুনরায় চেষ্টা করুন।');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (isSupabaseConfigured()) {
        // Create appointment with the CORRECT doctor_id (profile_id)
        const appointmentData = {
          doctor_id: resolvedDoctorId, // THIS IS THE KEY - always use profile_id
          patient_id: user!.id,
          patient_name: effectivePatientName,
          patient_phone: effectivePatientPhone,
          scheduled_date: selectedDate,
          scheduled_time: selectedSlot?.time,
          serial_number: assignedSerial,
          appointment_type: visitType.toLowerCase(),
          symptoms: symptoms || null,
          fee_paid: fee,
          status: 'confirmed',
          chamber_name: chamber.name,
          chamber_address: chamber.address || 'Dhaka, Bangladesh',
          is_guest_booking: false,
          is_family_booking: bookingFor === 'family',
          family_relation: bookingFor === 'family' ? familyRelation : null,
          booked_by_id: user!.id,
          created_at: new Date().toISOString()
        };
        
        console.log('[BookingModal] ========================================');
        console.log('[BookingModal] SAVING APPOINTMENT:');
        console.log('[BookingModal] doctor_id (profile_id):', resolvedDoctorId);
        console.log('[BookingModal] patient_id:', user!.id);
        console.log('[BookingModal] date:', selectedDate);
        console.log('[BookingModal] time:', selectedSlot?.time);
        console.log('[BookingModal] Full data:', appointmentData);
        console.log('[BookingModal] ========================================');
        
        const { data, error } = await supabase
          .from('appointments')
          .insert(appointmentData)
          .select('id')
          .single();
        
        if (error) {
          console.error('[BookingModal] ERROR saving appointment:', error);
          alert('বুকিং সংরক্ষণ ব্যর্থ: ' + error.message);
          setIsSubmitting(false);
          return;
        }
        
        console.log('[BookingModal] ✅ Appointment saved successfully! ID:', data.id);
        setBookingId(data.id);
      }
      
      setBookingComplete(true);
    } catch (error) {
      console.error('[BookingModal] Booking exception:', error);
      alert('একটি ত্রুটি হয়েছে। পুনরায় চেষ্টা করুন।');
    }
    
    setIsSubmitting(false);
  };

  // Can proceed to next step?
  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return true;
      case 2:
        return !!(selectedDate && selectedSlot);
      case 3:
        if (bookingFor === 'self') {
          return !!(patientName.trim().length >= 2 && isValidPhone(patientPhone));
        } else {
          return !!(familyMemberName.trim().length >= 2 && isValidPhone(familyMemberPhone) && familyRelation);
        }
      default:
        return false;
    }
  };

  // Login Required Screen
  if (!isPatient) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-scale-in">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-8 text-center text-white">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-user-lock text-4xl"></i>
            </div>
            <h2 className="text-2xl font-bold mb-1">
              {isBn ? 'লগইন প্রয়োজন' : 'Login Required'}
            </h2>
            <p className="opacity-90">
              {isBn ? 'অ্যাপয়েন্টমেন্ট বুক করতে রেজিস্ট্রেশন করুন' : 'Register to book appointments'}
            </p>
          </div>
          
          <div className="p-6">
            <div className="bg-blue-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-blue-800 text-center">
                {isBn ? '✅ রেজিস্ট্রেশন বিনামূল্যে • ফোন নম্বর দিয়ে সহজে' : '✅ Registration is FREE • Quick signup'}
              </p>
            </div>

            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <img src={doctor.image} alt={doctor.name} className="w-12 h-12 rounded-lg object-cover" />
              <div>
                <p className="font-bold text-slate-800">{doctor.name}</p>
                <p className="text-sm text-slate-500">{chamber.name}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-sm text-slate-500">ফি</p>
                <p className="font-bold text-blue-600">৳{chamber.fee}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition">
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button onClick={() => { onClose(); navigate('/patient-auth'); }} className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 rounded-xl font-bold hover:shadow-lg transition">
                {isBn ? 'লগইন / রেজিস্টার' : 'Login / Register'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success Screen
  if (bookingComplete) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-scale-in">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-8 text-center text-white">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-check text-4xl"></i>
            </div>
            <h2 className="text-2xl font-bold mb-1">{t.successTitle}</h2>
            <p className="opacity-90">{t.successMsg}</p>
          </div>
          
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
              <img src={doctor.image} alt={doctor.name} className="w-12 h-12 rounded-lg object-cover" />
              <div>
                <p className="font-bold text-slate-800">{doctor.name}</p>
                <p className="text-sm text-slate-500">{chamber.name}</p>
              </div>
            </div>

            {bookingFor === 'family' && (
              <div className="bg-purple-50 rounded-xl p-3 mb-4 border border-purple-200">
                <p className="text-sm text-purple-800">
                  <i className="fas fa-users mr-2"></i>
                  পরিবারের সদস্য: <strong>{familyMemberName}</strong> ({familyRelation})
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-xs text-blue-600 uppercase font-bold mb-1">{t.serialNo}</p>
                <p className="text-3xl font-bold text-blue-700">{assignedSerial}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">{t.estTime}</p>
                <p className="text-xl font-bold text-slate-700">{selectedSlot?.display}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-slate-500">তারিখ</span>
                <span className="font-bold text-slate-700">{selectedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ভিজিটের ধরন</span>
                <span className="font-bold text-slate-700">
                  {visitType === 'NEW' ? t.newConsult : visitType === 'FOLLOW_UP' ? t.followUp : t.report}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t.total}</span>
                <span className="font-bold text-blue-600">৳{fee}</span>
              </div>
            </div>

            <div className="bg-green-50 rounded-xl p-3 flex items-center gap-3 mb-6">
              <i className="fas fa-sms text-green-600"></i>
              <p className="text-sm text-green-700">{t.smsSent} <span className="font-bold">{effectivePatientPhone}</span></p>
            </div>

            <button onClick={onClose} className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold hover:bg-slate-900 transition">
              {t.done}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-slide-up sm:animate-scale-in">
        
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white rounded-t-3xl sm:rounded-t-2xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">{t.title}</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition" title="Close">
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <img src={doctor.image} alt={doctor.name} className="w-10 h-10 rounded-lg object-cover border-2 border-white/30" />
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">{doctor.name}</p>
              <p className="text-xs opacity-80 truncate">{chamber.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-80">{t.fee}</p>
              <p className="font-bold">৳{fee}</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex-shrink-0 flex items-center justify-center gap-2 py-3 bg-slate-50 border-b border-slate-100">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
                step >= s ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {step > s ? <i className="fas fa-check text-xs"></i> : s}
              </div>
              {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-blue-500' : 'bg-slate-200'}`}></div>}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          
          {/* Step 1: Visit Type */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-500 uppercase">{t.step1}</p>
              
              {[
                { type: 'NEW' as VisitType, icon: 'fa-user-plus', title: t.newConsult, desc: t.newDesc, badge: null },
                { type: 'FOLLOW_UP' as VisitType, icon: 'fa-redo', title: t.followUp, desc: t.followUpDesc, badge: '50% ছাড়' },
                { type: 'REPORT' as VisitType, icon: 'fa-file-medical', title: t.report, desc: t.reportDesc, badge: '70% ছাড়' },
              ].map((item) => (
                <button 
                  key={item.type}
                  onClick={() => setVisitType(item.type)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition flex items-center gap-4 ${
                    visitType === item.type ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    visitType === item.type ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <i className={`fas ${item.icon} text-lg`}></i>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-800">{item.title}</p>
                      {item.badge && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">{item.badge}</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">{item.desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    visitType === item.type ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                  }`}>
                    {visitType === item.type && <i className="fas fa-check text-white text-xs"></i>}
                  </div>
                </button>
              ))}

              {visitType !== 'NEW' && (
                <div className="bg-green-50 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-sm text-green-700"><i className="fas fa-tag mr-2"></i>{t.discount}: ৳{discount}</span>
                  <span className="font-bold text-green-700">{t.total}: ৳{fee}</span>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase mb-3">{t.selectDate}</p>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                  {dates.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setSelectedDate(d.value)}
                      className={`flex-shrink-0 w-16 py-3 rounded-xl text-center transition ${
                        selectedDate === d.value ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <p className="text-xs font-medium opacity-80">{d.isToday ? t.today : d.isTomorrow ? t.tomorrow : d.day}</p>
                      <p className="text-xl font-bold">{d.date}</p>
                    </button>
                  ))}
                </div>
              </div>

              {selectedDate && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-slate-500 uppercase">{t.selectTime}</p>
                    {loadingSlots && <span className="text-xs text-blue-500"><i className="fas fa-spinner fa-spin mr-1"></i>Loading...</span>}
                  </div>
                  
                  <div className="flex items-center gap-4 mb-3 text-xs">
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded"></div><span className="text-slate-600">{t.available}</span></span>
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded"></div><span className="text-slate-600">{t.slotFull}</span></span>
                  </div>
                  
                  {['morning', 'afternoon', 'evening'].map(period => {
                    const periodSlots = slots.filter(s => s.period === period && !s.isPast);
                    if (periodSlots.length === 0) return null;
                    
                    return (
                      <div key={period} className="mb-4">
                        <p className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                          <i className={`fas ${period === 'morning' ? 'fa-sun text-amber-400' : period === 'afternoon' ? 'fa-cloud-sun text-orange-400' : 'fa-moon text-indigo-400'}`}></i>
                          {period === 'morning' ? t.morning : period === 'afternoon' ? t.afternoon : t.evening}
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {periodSlots.slice(0, 8).map((slot) => (
                            <button
                              key={slot.time}
                              onClick={() => slot.available && setSelectedSlot({ time: slot.time, serial: assignedSerial, display: slot.display })}
                              disabled={!slot.available}
                              className={`py-2 px-1 rounded-lg text-xs font-medium transition relative ${
                                selectedSlot?.time === slot.time
                                  ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                                  : slot.available
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                                    : 'bg-red-100 text-red-700 cursor-not-allowed border border-red-300'
                              }`}
                            >
                              {slot.display.replace(' AM', '').replace(' PM', '')}
                              {!slot.available && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center">✕</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {selectedDate && (
                    <div className="mt-4 bg-green-50 rounded-xl p-3 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">#{assignedSerial}</div>
                          <div>
                            <p className="text-sm font-bold text-green-800">{isBn ? 'আপনার সিরিয়াল' : 'Your Serial'}</p>
                            <p className="text-xs text-green-600">{assignedSerial - 1} {isBn ? 'জন আগে বুক করেছেন' : 'booked before you'}</p>
                          </div>
                        </div>
                        <i className="fas fa-check-circle text-green-500 text-xl"></i>
                      </div>
                    </div>
                  )}

                  {selectedSlot && (
                    <div className="mt-3 bg-blue-50 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white"><i className="fas fa-clock"></i></div>
                        <div>
                          <p className="text-sm font-bold text-blue-800">{isBn ? 'নির্বাচিত সময়' : 'Selected Time'}</p>
                          <p className="text-xs text-blue-600">{selectedSlot.display}</p>
                        </div>
                      </div>
                      <i className="fas fa-check-circle text-blue-500 text-xl"></i>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Patient Details */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-500 uppercase">{t.step3}</p>
              
              {/* Booking For Selection */}
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-sm font-medium text-slate-700 mb-2">{isBn ? 'কার জন্য বুকিং?' : 'Booking for?'}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setBookingFor('self')}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition ${bookingFor === 'self' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}
                  >
                    <i className="fas fa-user mr-2"></i>{t.bookingForSelf}
                  </button>
                  <button
                    onClick={() => setBookingFor('family')}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition ${bookingFor === 'family' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-600'}`}
                  >
                    <i className="fas fa-users mr-2"></i>{t.bookingForFamily}
                  </button>
                </div>
              </div>

              {/* Self Booking - Auto-filled */}
              {bookingFor === 'self' && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-sm font-medium text-blue-800 mb-3"><i className="fas fa-user-check mr-2"></i>{isBn ? 'আপনার প্রোফাইল থেকে তথ্য' : 'From your profile'}</p>
                  <div className="grid gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t.patientName}</label>
                      <div className="w-full p-3 bg-white border border-blue-200 rounded-xl text-slate-700 font-medium">{patientName || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t.phone}</label>
                      <div className="w-full p-3 bg-white border border-blue-200 rounded-xl text-slate-700 font-medium">+880{patientPhone}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Family Member Booking */}
              {bookingFor === 'family' && (
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <p className="text-sm font-medium text-purple-800 mb-3"><i className="fas fa-users mr-2"></i>{isBn ? 'পরিবারের সদস্যের তথ্য' : 'Family member details'}</p>
                  <div className="grid gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t.familyName} *</label>
                      <input type="text" value={familyMemberName} onChange={(e) => setFamilyMemberName(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 outline-none" placeholder={isBn ? 'নাম' : 'Name'} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t.phone} *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">+880</span>
                        <input type="tel" value={familyMemberPhone} onChange={(e) => setFamilyMemberPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} className="w-full p-3 pl-14 border-2 border-slate-200 rounded-xl focus:border-purple-500 outline-none" placeholder="01712345678" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t.familyRelation} *</label>
                      <select value={familyRelation} onChange={(e) => setFamilyRelation(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 outline-none">
                        <option value="">{isBn ? 'নির্বাচন করুন' : 'Select'}</option>
                        <option value="spouse">{isBn ? 'স্বামী/স্ত্রী' : 'Spouse'}</option>
                        <option value="child">{isBn ? 'সন্তান' : 'Child'}</option>
                        <option value="parent">{isBn ? 'মা/বাবা' : 'Parent'}</option>
                        <option value="sibling">{isBn ? 'ভাই/বোন' : 'Sibling'}</option>
                        <option value="other">{isBn ? 'অন্যান্য' : 'Other'}</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Symptoms */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-sm font-bold text-slate-700 mb-3"><i className="fas fa-clipboard-list text-blue-500 mr-2"></i>{isBn ? 'সমস্যার বিবরণ (ঐচ্ছিক)' : 'Symptoms (Optional)'}</p>
                <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 outline-none resize-none text-sm bg-white" rows={2} placeholder={t.symptomsPlaceholder} />
              </div>

              {/* Summary */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-500">ডাক্তার</span><span className="font-medium text-slate-700">{doctor.name}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">{t.chamber}</span><span className="font-medium text-slate-700">{chamber.name}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">রোগী</span><span className="font-medium text-slate-700">{effectivePatientName}{bookingFor === 'family' && <span className="text-purple-600 text-xs ml-1">({familyRelation})</span>}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">তারিখ</span><span className="font-medium text-slate-700">{selectedDate}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">সময়</span><span className="font-medium text-slate-700">{selectedSlot?.display}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">{t.serial}</span><span className="font-bold text-blue-600">#{assignedSerial}</span></div>
                <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between">
                  <span className="font-bold text-slate-700">{t.total}</span>
                  <span className="font-bold text-blue-600 text-lg">৳{fee}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-slate-100 bg-white flex gap-3 rounded-b-2xl">
          {step > 1 && (
            <button onClick={() => setStep((step - 1) as 1 | 2)} className="px-6 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition">
              <i className="fas fa-arrow-left mr-2"></i>{t.back}
            </button>
          )}
          <button
            onClick={() => { if (step < 3) setStep((step + 1) as 2 | 3); else handleBooking(); }}
            disabled={!canProceed() || isSubmitting}
            className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <><i className="fas fa-spinner fa-spin mr-2"></i>{t.confirming}</> : step === 3 ? <><i className="fas fa-check mr-2"></i>{t.confirm}</> : <>{t.next}<i className="fas fa-arrow-right ml-2"></i></>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
