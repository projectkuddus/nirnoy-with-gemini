import React, { useState, useMemo } from 'react';
import { Doctor, Chamber } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface BookingModalProps {
  doctor: Doctor;
  chamber: Chamber;
  onClose: () => void;
}

type VisitType = 'NEW' | 'FOLLOW_UP' | 'REPORT';

export const BookingModal: React.FC<BookingModalProps> = ({ doctor, chamber, onClose }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [visitType, setVisitType] = useState<VisitType>('NEW');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; serial: number } | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);

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

  // Generate time slots
  const slots = useMemo(() => {
    const result: { time: string; display: string; serial: number; available: boolean; period: string }[] = [];
    let serial = 1;
    
    // Morning: 9 AM - 12 PM
    for (let h = 9; h < 12; h++) {
      for (let m = 0; m < 60; m += 15) {
        const available = Math.random() > 0.25;
        result.push({
          time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
          display: `${h > 12 ? h - 12 : h}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`,
          serial: available ? serial++ : 0,
          available,
          period: 'morning',
        });
      }
    }
    
    // Afternoon: 3 PM - 6 PM
    for (let h = 15; h < 18; h++) {
      for (let m = 0; m < 60; m += 15) {
        const available = Math.random() > 0.25;
        result.push({
          time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
          display: `${h > 12 ? h - 12 : h}:${m.toString().padStart(2, '0')} PM`,
          serial: available ? serial++ : 0,
          available,
          period: 'afternoon',
        });
      }
    }
    
    // Evening: 6 PM - 9 PM
    for (let h = 18; h < 21; h++) {
      for (let m = 0; m < 60; m += 15) {
        const available = Math.random() > 0.25;
        result.push({
          time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
          display: `${h > 12 ? h - 12 : h}:${m.toString().padStart(2, '0')} PM`,
          serial: available ? serial++ : 0,
          available,
          period: 'evening',
        });
      }
    }
    
    return result;
  }, []);

  // Calculate fee
  const baseFee = chamber.fee;
  const fee = visitType === 'FOLLOW_UP' ? Math.round(baseFee * 0.5) : visitType === 'REPORT' ? Math.round(baseFee * 0.3) : baseFee;
  const discount = baseFee - fee;

  // Validate phone
  const isValidPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return /^(01[3-9]\d{8}|1[3-9]\d{8})$/.test(digits);
  };

  // Handle booking
  const handleBooking = async () => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setBookingComplete(true);
  };

  // Can proceed to next step?
  const canProceed = () => {
    if (step === 1) return true;
    if (step === 2) return selectedDate && selectedSlot;
    if (step === 3) return patientName.trim() && isValidPhone(patientPhone);
    return false;
  };

  // Success Screen
  if (bookingComplete) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-scale-in">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-8 text-center text-white">
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
              <div className="bg-teal-50 rounded-xl p-4 text-center">
                <p className="text-xs text-teal-600 uppercase font-bold mb-1">{t.serialNo}</p>
                <p className="text-3xl font-bold text-teal-700">{selectedSlot?.serial || 1}</p>
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
                <span className="font-bold text-teal-600">৳{fee}</span>
              </div>
            </div>

            <div className="bg-emerald-50 rounded-xl p-3 flex items-center gap-3 mb-6">
              <i className="fas fa-sms text-emerald-600"></i>
              <p className="text-sm text-emerald-700">{t.smsSent} <span className="font-bold">{patientPhone}</span></p>
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
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-slide-up sm:animate-scale-in">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-500 p-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">{t.title}</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition">
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

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-3 bg-slate-50 border-b border-slate-100">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
                step >= s ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {step > s ? <i className="fas fa-check text-xs"></i> : s}
              </div>
              {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-teal-500' : 'bg-slate-200'}`}></div>}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          
          {/* Step 1: Visit Type */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-500 uppercase">{t.step1}</p>
              
              {[
                { type: 'NEW' as VisitType, icon: 'fa-user-plus', title: t.newConsult, desc: t.newDesc, color: 'teal' },
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
                    visitType === item.type ? 'border-teal-500 bg-teal-500' : 'border-slate-300'
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
                          ? 'bg-teal-500 text-white'
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
                  
                  {/* Morning */}
                  <div className="mb-4">
                    <p className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                      <i className="fas fa-sun text-amber-400"></i> {t.morning}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {slots.filter(s => s.period === 'morning').slice(0, 8).map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => slot.available && setSelectedSlot(slot)}
                          disabled={!slot.available}
                          className={`py-2 px-1 rounded-lg text-xs font-medium transition ${
                            selectedSlot?.time === slot.time
                              ? 'bg-teal-500 text-white'
                              : slot.available
                                ? 'bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-700'
                                : 'bg-slate-50 text-slate-300 cursor-not-allowed line-through'
                          }`}
                        >
                          {slot.display.replace(' AM', '').replace(' PM', '')}
                          {slot.available && <span className="text-[10px] opacity-60 block">#{slot.serial}</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Afternoon */}
                  <div className="mb-4">
                    <p className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                      <i className="fas fa-cloud-sun text-orange-400"></i> {t.afternoon}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {slots.filter(s => s.period === 'afternoon').slice(0, 8).map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => slot.available && setSelectedSlot(slot)}
                          disabled={!slot.available}
                          className={`py-2 px-1 rounded-lg text-xs font-medium transition ${
                            selectedSlot?.time === slot.time
                              ? 'bg-teal-500 text-white'
                              : slot.available
                                ? 'bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-700'
                                : 'bg-slate-50 text-slate-300 cursor-not-allowed line-through'
                          }`}
                        >
                          {slot.display.replace(' AM', '').replace(' PM', '')}
                          {slot.available && <span className="text-[10px] opacity-60 block">#{slot.serial}</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Evening */}
                  <div>
                    <p className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                      <i className="fas fa-moon text-indigo-400"></i> {t.evening}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {slots.filter(s => s.period === 'evening').slice(0, 8).map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => slot.available && setSelectedSlot(slot)}
                          disabled={!slot.available}
                          className={`py-2 px-1 rounded-lg text-xs font-medium transition ${
                            selectedSlot?.time === slot.time
                              ? 'bg-teal-500 text-white'
                              : slot.available
                                ? 'bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-700'
                                : 'bg-slate-50 text-slate-300 cursor-not-allowed line-through'
                          }`}
                        >
                          {slot.display.replace(' AM', '').replace(' PM', '')}
                          {slot.available && <span className="text-[10px] opacity-60 block">#{slot.serial}</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected Summary */}
                  {selectedSlot && (
                    <div className="mt-4 bg-teal-50 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center text-white font-bold">
                          #{selectedSlot.serial}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-teal-800">{t.serial} #{selectedSlot.serial}</p>
                          <p className="text-xs text-teal-600">{selectedSlot.display}</p>
                        </div>
                      </div>
                      <i className="fas fa-check-circle text-teal-500 text-xl"></i>
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
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.patientName} *</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-teal-500 outline-none transition"
                  placeholder={isBn ? 'রোগীর পুরো নাম' : 'Full name of patient'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.phone} *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">+880</span>
                  <input
                    type="tel"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    className={`w-full p-3 pl-14 border-2 rounded-xl outline-none transition ${
                      patientPhone && !isValidPhone(patientPhone) ? 'border-red-300' : 'border-slate-200 focus:border-teal-500'
                    }`}
                    placeholder="1712345678"
                  />
                  {patientPhone && isValidPhone(patientPhone) && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                      <i className="fas fa-check-circle"></i>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">{isBn ? 'SMS এ কনফার্মেশন পাঠানো হবে' : 'Confirmation will be sent via SMS'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.symptoms}</label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-teal-500 outline-none transition resize-none"
                  rows={3}
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
                  <span className="font-bold text-teal-600">#{selectedSlot?.serial}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between">
                  <span className="font-bold text-slate-700">{t.total}</span>
                  <span className="font-bold text-teal-600 text-lg">৳{fee}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white flex gap-3">
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
            className="flex-1 bg-gradient-to-r from-teal-600 to-teal-500 text-white py-3 rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
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
