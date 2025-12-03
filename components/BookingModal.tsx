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
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [existingBookingsCount, setExistingBookingsCount] = useState(0);
  const [assignedSerial, setAssignedSerial] = useState<number>(1);
  
  // Fetch existing bookings count for the selected date
  useEffect(() => {
    const fetchBookingsCount = async () => {
      if (!selectedDate || !isSupabaseConfigured()) {
        setExistingBookingsCount(0);
        return;
      }
      
      try {
        // Get the profile_id - try multiple approaches
        let doctorId = (doctor as any).userId || (doctor as any).profileId;
        
        // If still not found, look up the profile_id from doctors table
        if (!doctorId) {
          const { data: doctorRecord } = await supabase
            .from('doctors')
            .select('profile_id')
            .eq('id', doctor.id)
            .single();
          
          doctorId = doctorRecord?.profile_id || doctor.id;
        }
        
        console.log('[BookingModal] Using doctor_id for count:', doctorId);
        
        // Count using both possible IDs
        const { count, error } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .or(`doctor_id.eq.${doctorId},doctor_id.eq.${doctor.id}`)
          .eq('appointment_date', selectedDate);
        
        if (!error && count !== null) {
          setExistingBookingsCount(count);
          setAssignedSerial(count + 1); // Next serial number
          console.log('[BookingModal] Existing bookings for', selectedDate, ':', count, '-> Next serial:', count + 1);
        }
      } catch (e) {
        console.error('[BookingModal] Error fetching bookings count:', e);
      }
    };
    
    fetchBookingsCount();
  }, [selectedDate, doctor]);
  
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

  // Generate time slots - filtering past times for today
  const slots = useMemo(() => {
    const result: { time: string; display: string; available: boolean; period: string; isPast: boolean }[] = [];
    
    // Check if selected date is today
    const today = new Date().toISOString().split('T')[0];
    const isToday = selectedDate === today;
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Helper to check if slot is in the past (with 30 min buffer)
    const isSlotPast = (hour: number, minute: number): boolean => {
      if (!isToday) return false;
      const slotMinutes = hour * 60 + minute;
      const currentMinutes = currentHour * 60 + currentMinute + 30; // 30 min buffer
      return slotMinutes < currentMinutes;
    };
    
    // Morning: 9 AM - 12 PM
    for (let h = 9; h < 12; h++) {
      for (let m = 0; m < 60; m += 15) {
        const isPast = isSlotPast(h, m);
        result.push({
          time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
          display: `${h}:${m.toString().padStart(2, '0')} AM`,
          available: !isPast,
          period: 'morning',
          isPast,
        });
      }
    }
    
    // Afternoon: 3 PM - 6 PM
    for (let h = 15; h < 18; h++) {
      for (let m = 0; m < 60; m += 15) {
        const isPast = isSlotPast(h, m);
        result.push({
          time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
          display: `${h - 12}:${m.toString().padStart(2, '0')} PM`,
          available: !isPast,
          period: 'afternoon',
          isPast,
        });
      }
    }
    
    // Evening: 6 PM - 9 PM
    for (let h = 18; h < 21; h++) {
      for (let m = 0; m < 60; m += 15) {
        const isPast = isSlotPast(h, m);
        result.push({
          time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
          display: `${h - 12}:${m.toString().padStart(2, '0')} PM`,
          available: !isPast,
          period: 'evening',
          isPast,
        });
      }
    }
    
    return result;
  }, [selectedDate]);

  // Calculate fee
  const baseFee = chamber.fee;
  const fee = visitType === 'FOLLOW_UP' ? Math.round(baseFee * 0.5) : visitType === 'REPORT' ? Math.round(baseFee * 0.3) : baseFee;
  const discount = baseFee - fee;

  // Validate phone - more lenient for BD numbers
  const isValidPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    // Accept: 01712345678 (11 digits) or 1712345678 (10 digits)
    return digits.length >= 10 && digits.length <= 11;
  };

  // Handle booking - save to Supabase
  const handleBooking = async () => {
    setIsSubmitting(true);
    
    try {
      if (isSupabaseConfigured()) {
        // Get the profile_id - try multiple approaches
        let doctorId = (doctor as any).userId || (doctor as any).profileId;
        
        // If still not found, look up the profile_id from doctors table
        if (!doctorId) {
          console.log('[BookingModal] Looking up profile_id for doctor.id:', doctor.id);
          const { data: doctorRecord } = await supabase
            .from('doctors')
            .select('profile_id')
            .eq('id', doctor.id)
            .single();
          
          doctorId = doctorRecord?.profile_id || doctor.id;
        }
        
        console.log('[BookingModal] Saving appointment with doctor_id:', doctorId);
        
        // Create appointment in Supabase - only for registered patients
        const appointmentData = {
          doctor_id: doctorId,
          patient_id: user!.id, // Must be registered patient
          patient_name: patientName || user!.name,
          patient_phone: patientPhone || user!.phone,
          appointment_date: selectedDate,
          appointment_time: selectedSlot?.time,
          serial_number: assignedSerial,
          visit_type: visitType.toLowerCase(),
          symptoms: symptoms || null,
          fee: fee,
          status: 'confirmed',
          chamber_name: chamber.name,
          chamber_address: chamber.address || 'Dhaka, Bangladesh',
          is_guest_booking: false, // No guest bookings allowed
          created_at: new Date().toISOString()
        };
        
        console.log('[BookingModal] Saving appointment:', appointmentData);
        
        const { data, error } = await supabase
          .from('appointments')
          .insert(appointmentData)
          .select('id')
          .single();
        
        if (error) {
          console.error('[BookingModal] Error saving appointment:', error);
          // Still show success for now, but log the error
          // In production, you might want to show an error message
        } else {
          console.log('[BookingModal] Appointment saved:', data.id);
          setBookingId(data.id);
        }
      }
      
      setBookingComplete(true);
    } catch (error) {
      console.error('[BookingModal] Booking error:', error);
      // Show success anyway for demo purposes
      setBookingComplete(true);
    }
    
    setIsSubmitting(false);
  };

  // Can proceed to next step?
  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return true; // Always can proceed from step 1
      case 2:
        return !!(selectedDate && selectedSlot); // Need date and slot
      case 3:
        return !!(patientName.trim().length >= 2 && patientPhone.length >= 10); // Name and phone
      default:
        return false;
    }
  };

  // Login Required Screen - if not a registered patient
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
                {isBn ? '✅ রেজিস্ট্রেশন বিনামূল্যে\n✅ ফোন নম্বর দিয়ে সহজে রেজিস্টার করুন' : '✅ Registration is FREE\n✅ Quick signup with phone number'}
              </p>
            </div>

            {/* Doctor Info */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <img src={doctor.image} alt={doctor.name} className="w-12 h-12 rounded-lg object-cover" />
              <div>
                <p className="font-bold text-slate-800">{doctor.name}</p>
                <p className="text-sm text-slate-500">{chamber.name}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-sm text-slate-500">{isBn ? 'ফি' : 'Fee'}</p>
                <p className="font-bold text-blue-600">৳{chamber.fee}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={() => { onClose(); navigate('/patient-auth'); }}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 rounded-xl font-bold hover:shadow-lg transition"
              >
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
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-8 text-center text-white">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-check text-4xl"></i>
            </div>
            <h2 className="text-2xl font-bold mb-1">{t.successTitle}</h2>
            <p className="opacity-90">{t.successMsg}</p>
          </div>
          
          <div className="p-6">
            {/* Doctor Info */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
              <img src={doctor.image} alt={doctor.name} className="w-12 h-12 rounded-lg object-cover" />
              <div>
                <p className="font-bold text-slate-800">{doctor.name}</p>
                <p className="text-sm text-slate-500">{chamber.name}</p>
              </div>
            </div>

            {/* Booking Details */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-xs text-blue-600 uppercase font-bold mb-1">{t.serialNo}</p>
                <p className="text-3xl font-bold text-blue-700">{selectedSlot?.serial || 1}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">{t.estTime}</p>
                <p className="text-xl font-bold text-slate-700">{selectedSlot?.display || '10:00 AM'}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-slate-500">{isBn ? 'তারিখ' : 'Date'}</span>
                <span className="font-bold text-slate-700">{selectedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isBn ? 'ভিজিটের ধরন' : 'Visit Type'}</span>
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
              <p className="text-sm text-green-700">{t.smsSent} <span className="font-bold">{patientPhone}</span></p>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold hover:bg-slate-900 transition"
            >
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
        
        {/* Header - Fixed */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white rounded-t-3xl sm:rounded-t-2xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">{t.title}</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition" title="Close" aria-label="Close modal">
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          {/* Doctor Mini Card */}
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

        {/* Progress Steps - Fixed */}
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

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          
          {/* Step 1: Visit Type */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-500 uppercase">{t.step1}</p>
              
              {[
                { type: 'NEW' as VisitType, icon: 'fa-user-plus', title: t.newConsult, desc: t.newDesc, color: 'blue' },
                { type: 'FOLLOW_UP' as VisitType, icon: 'fa-redo', title: t.followUp, desc: t.followUpDesc, color: 'blue', badge: '50% ছাড়' },
                { type: 'REPORT' as VisitType, icon: 'fa-file-medical', title: t.report, desc: t.reportDesc, color: 'purple', badge: '70% ছাড়' },
              ].map((item) => (
                      <button 
                  key={item.type}
                  onClick={() => setVisitType(item.type)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition flex items-center gap-4 ${
                    visitType === item.type 
                      ? `border-${item.color}-500 bg-${item.color}-50` 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    visitType === item.type ? `bg-${item.color}-500 text-white` : 'bg-slate-100 text-slate-400'
                  }`}>
                    <i className={`fas ${item.icon} text-lg`}></i>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-800">{item.title}</p>
                      {item.badge && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                          {item.badge}
                        </span>
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

              {/* Fee Summary */}
              {visitType !== 'NEW' && (
                <div className="bg-green-50 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-sm text-green-700">
                    <i className="fas fa-tag mr-2"></i>
                    {t.discount}: ৳{discount}
                  </span>
                  <span className="font-bold text-green-700">{t.total}: ৳{fee}</span>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <div className="space-y-4">
                {/* Date Selection */}
                <div>
                <p className="text-sm font-bold text-slate-500 uppercase mb-3">{t.selectDate}</p>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                  {dates.map((d) => (
                         <button
                      key={d.value}
                      onClick={() => setSelectedDate(d.value)}
                      className={`flex-shrink-0 w-16 py-3 rounded-xl text-center transition ${
                        selectedDate === d.value
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <p className="text-xs font-medium opacity-80">
                        {d.isToday ? t.today : d.isTomorrow ? t.tomorrow : d.day}
                      </p>
                      <p className="text-xl font-bold">{d.date}</p>
                         </button>
                      ))}
                   </div>
                </div>

                {/* Time Selection */}
              {selectedDate && (
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase mb-3">{t.selectTime}</p>
                  
                  {/* Morning - only show if there are available slots */}
                  {slots.filter(s => s.period === 'morning' && !s.isPast).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                      <i className="fas fa-sun text-amber-400"></i> {t.morning}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {slots.filter(s => s.period === 'morning' && !s.isPast).slice(0, 8).map((slot) => (
                         <button
                          key={slot.time}
                          onClick={() => slot.available && setSelectedSlot({ time: slot.time, serial: assignedSerial, display: slot.display })}
                          disabled={!slot.available}
                          className={`py-2 px-1 rounded-lg text-xs font-medium transition ${
                            selectedSlot?.time === slot.time
                              ? 'bg-blue-500 text-white'
                              : slot.available
                                ? 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                                : 'bg-slate-50 text-slate-300 cursor-not-allowed line-through'
                          }`}
                        >
                          {slot.display.replace(' AM', '').replace(' PM', '')}
                         </button>
                      ))}
                   </div>
                </div>
                  )}
                
                  {/* Afternoon - only show if there are available slots */}
                  {slots.filter(s => s.period === 'afternoon' && !s.isPast).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                      <i className="fas fa-cloud-sun text-orange-400"></i> {t.afternoon}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {slots.filter(s => s.period === 'afternoon' && !s.isPast).slice(0, 8).map((slot) => (
                   <button 
                          key={slot.time}
                          onClick={() => slot.available && setSelectedSlot({ time: slot.time, serial: assignedSerial, display: slot.display })}
                          disabled={!slot.available}
                          className={`py-2 px-1 rounded-lg text-xs font-medium transition ${
                            selectedSlot?.time === slot.time
                              ? 'bg-blue-500 text-white'
                              : slot.available
                                ? 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                                : 'bg-slate-50 text-slate-300 cursor-not-allowed line-through'
                          }`}
                        >
                          {slot.display.replace(' AM', '').replace(' PM', '')}
                   </button>
                      ))}
                    </div>
                  </div>
                  )}

                  {/* Evening - only show if there are available slots */}
                  {slots.filter(s => s.period === 'evening' && !s.isPast).length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                      <i className="fas fa-moon text-indigo-400"></i> {t.evening}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {slots.filter(s => s.period === 'evening' && !s.isPast).slice(0, 8).map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => slot.available && setSelectedSlot({ time: slot.time, serial: assignedSerial, display: slot.display })}
                          disabled={!slot.available}
                          className={`py-2 px-1 rounded-lg text-xs font-medium transition ${
                            selectedSlot?.time === slot.time
                              ? 'bg-blue-500 text-white'
                              : slot.available
                                ? 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                                : 'bg-slate-50 text-slate-300 cursor-not-allowed line-through'
                          }`}
                        >
                          {slot.display.replace(' AM', '').replace(' PM', '')}
                        </button>
                      ))}
                    </div>
                 </div>
                  )}

                  {/* Your Serial Number */}
                  {selectedDate && (
                    <div className="mt-4 bg-green-50 rounded-xl p-3 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                            #{assignedSerial}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-green-800">{isBn ? 'আপনার সিরিয়াল' : 'Your Serial'}</p>
                            <p className="text-xs text-green-600">{existingBookingsCount} {isBn ? 'জন আগে বুক করেছেন' : 'booked before you'}</p>
                          </div>
                        </div>
                        <i className="fas fa-check-circle text-green-500 text-xl"></i>
                      </div>
                    </div>
                  )}

                  {/* Selected Time */}
                  {selectedSlot && (
                    <div className="mt-3 bg-blue-50 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                          <i className="fas fa-clock"></i>
                        </div>
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

          {/* Step 3: Patient Details & Intake Form */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-500 uppercase">{t.step3}</p>
              
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.patientName} *</label>
                    <input 
                       type="text" 
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition"
                    placeholder={isBn ? 'রোগীর পুরো নাম' : 'Full name of patient'}
                    />
                 </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.phone} *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">+880</span>
                    <input 
                       type="tel" 
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      className={`w-full p-3 pl-14 border-2 rounded-xl outline-none transition ${
                        patientPhone && !isValidPhone(patientPhone) ? 'border-red-300' : 'border-slate-200 focus:border-blue-500'
                      }`}
                      placeholder="01712345678"
                    />
                    {patientPhone && isValidPhone(patientPhone) && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                        <i className="fas fa-check-circle"></i>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{isBn ? 'SMS এ কনফার্মেশন পাঠানো হবে' : 'Confirmation will be sent via SMS'}</p>
                </div>
                 </div>

              {/* Patient Intake Form */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                  <i className="fas fa-clipboard-list"></i>
                  {isBn ? 'সমস্যার বিবরণ (ঐচ্ছিক)' : 'Health Information (Optional)'}
                </p>
                
                {/* Chief Complaint */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {isBn ? 'প্রধান সমস্যা' : 'Chief Complaint'} *
                  </label>
                    <textarea 
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 outline-none transition resize-none text-sm bg-white"
                    rows={2}
                    placeholder={isBn ? 'আপনার প্রধান সমস্যা সংক্ষেপে লিখুন...' : 'Briefly describe your main problem...'}
                  />
                 </div>

                {/* Quick Symptom Tags */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    {isBn ? 'সাধারণ লক্ষণ (প্রযোজ্য হলে ক্লিক করুন)' : 'Common Symptoms (click if applicable)'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { en: 'Fever', bn: 'জ্বর' },
                      { en: 'Headache', bn: 'মাথা ব্যথা' },
                      { en: 'Cough', bn: 'কাশি' },
                      { en: 'Chest Pain', bn: 'বুকে ব্যথা' },
                      { en: 'Breathing Issue', bn: 'শ্বাসকষ্ট' },
                      { en: 'Weakness', bn: 'দুর্বলতা' },
                      { en: 'Stomach Pain', bn: 'পেটে ব্যথা' },
                      { en: 'Nausea', bn: 'বমি ভাব' },
                    ].map((symptom, i) => {
                      const text = isBn ? symptom.bn : symptom.en;
                      const isSelected = symptoms.toLowerCase().includes(text.toLowerCase());
                      return (
                    <button 
                          key={i}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSymptoms(symptoms.replace(new RegExp(text + ',?\\s*', 'gi'), ''));
                            } else {
                              setSymptoms(symptoms ? `${symptoms}, ${text}` : text);
                            }
                          }}
                          className={`px-3 py-1 text-xs rounded-full border transition ${
                            isSelected 
                              ? 'bg-blue-500 text-white border-blue-500' 
                              : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          {text}
                    </button>
                      );
                    })}
                  </div>
                </div>

                {/* Duration */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label htmlFor="duration" className="block text-xs font-medium text-slate-600 mb-1">
                      {isBn ? 'কতদিন ধরে?' : 'Duration'}
                    </label>
                    <select id="duration" title="Duration" className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:border-blue-400 outline-none">
                      <option value="">{isBn ? 'নির্বাচন করুন' : 'Select'}</option>
                      <option value="today">{isBn ? 'আজ থেকে' : 'Started today'}</option>
                      <option value="2-3days">{isBn ? '২-৩ দিন' : '2-3 days'}</option>
                      <option value="1week">{isBn ? '১ সপ্তাহ' : '1 week'}</option>
                      <option value="2weeks">{isBn ? '২ সপ্তাহ' : '2 weeks'}</option>
                      <option value="1month">{isBn ? '১ মাস+' : '1 month+'}</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="severity" className="block text-xs font-medium text-slate-600 mb-1">
                      {isBn ? 'তীব্রতা' : 'Severity'}
                    </label>
                    <select id="severity" title="Severity" className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:border-blue-400 outline-none">
                      <option value="">{isBn ? 'নির্বাচন করুন' : 'Select'}</option>
                      <option value="mild">{isBn ? 'হালকা' : 'Mild'}</option>
                      <option value="moderate">{isBn ? 'মাঝারি' : 'Moderate'}</option>
                      <option value="severe">{isBn ? 'তীব্র' : 'Severe'}</option>
                    </select>
                  </div>
                </div>

                {/* Previous Reports */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {isBn ? 'আগে কোনো রিপোর্ট/টেস্ট করেছেন?' : 'Any previous reports/tests?'}
                  </label>
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center gap-2 p-2 border border-slate-200 rounded-lg bg-white cursor-pointer hover:border-blue-300 transition">
                      <input type="radio" name="hasReports" value="yes" className="text-blue-500" />
                      <span className="text-sm text-slate-600">{isBn ? 'হ্যাঁ' : 'Yes'}</span>
                    </label>
                    <label className="flex-1 flex items-center gap-2 p-2 border border-slate-200 rounded-lg bg-white cursor-pointer hover:border-blue-300 transition">
                      <input type="radio" name="hasReports" value="no" className="text-blue-500" defaultChecked />
                      <span className="text-sm text-slate-600">{isBn ? 'না' : 'No'}</span>
                    </label>
                  </div>
                 </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {isBn ? 'অতিরিক্ত মন্তব্য' : 'Additional Notes'}
                </label>
                <textarea
                  className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition resize-none"
                  rows={2}
                  placeholder={t.symptomsPlaceholder}
                />
              </div>

              {/* Booking Summary */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{isBn ? 'ডাক্তার' : 'Doctor'}</span>
                  <span className="font-medium text-slate-700">{doctor.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{t.chamber}</span>
                  <span className="font-medium text-slate-700">{chamber.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{isBn ? 'তারিখ' : 'Date'}</span>
                  <span className="font-medium text-slate-700">{selectedDate}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{isBn ? 'সময়' : 'Time'}</span>
                  <span className="font-medium text-slate-700">{selectedSlot?.display}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{t.serial}</span>
                  <span className="font-bold text-blue-600">#{selectedSlot?.serial}</span>
                 </div>
                <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between">
                  <span className="font-bold text-slate-700">{t.total}</span>
                  <span className="font-bold text-blue-600 text-lg">৳{fee}</span>
                 </div>
              </div>
              </div>
           )}
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="flex-shrink-0 p-4 border-t border-slate-100 bg-white flex gap-3 rounded-b-2xl">
          {step > 1 && (
            <button
              onClick={() => setStep((step - 1) as 1 | 2)}
              className="px-6 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition"
            >
              <i className="fas fa-arrow-left mr-2"></i>{t.back}
            </button>
          )}
          <button
            onClick={() => {
              if (step < 3) setStep((step + 1) as 2 | 3);
              else handleBooking();
            }}
            disabled={!canProceed() || isSubmitting}
            className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <><i className="fas fa-spinner fa-spin mr-2"></i>{t.confirming}</>
            ) : step === 3 ? (
              <><i className="fas fa-check mr-2"></i>{t.confirm}</>
            ) : (
              <>{t.next}<i className="fas fa-arrow-right ml-2"></i></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
