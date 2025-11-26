import React, { useState, useEffect } from 'react';
import { Doctor, Chamber } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface BookingModalProps {
  doctor: Doctor;
  chamber: Chamber;
  onClose: () => void;
}

type VisitType = 'NEW' | 'FOLLOW_UP' | 'REPORT_CHECK';
type ConsultationType = 'CHAMBER' | 'ONLINE';
type Step = 'visit-type' | 'slot' | 'details' | 'confirm' | 'success';

export const BookingModal: React.FC<BookingModalProps> = ({ doctor, chamber, onClose }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // Steps
  const [step, setStep] = useState<Step>('visit-type');
  
  // Booking data
  const [visitType, setVisitType] = useState<VisitType>('NEW');
  const [consultationType, setConsultationType] = useState<ConsultationType>('CHAMBER');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [patientDetails, setPatientDetails] = useState({ 
    name: '', 
    phone: '', 
    symptoms: '' 
  });
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serialNumber, setSerialNumber] = useState<number | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string>('');

  // Calculate fee based on visit type
  const calculateFee = () => {
    const baseFee = chamber.fee;
    switch (visitType) {
      case 'FOLLOW_UP':
        return Math.round(baseFee * 0.5);
      case 'REPORT_CHECK':
        return Math.round(baseFee * 0.3);
      default:
        return baseFee;
    }
  };

  // Generate next 7 days
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dayName = d.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', { weekday: 'short' });
    const dateNum = d.getDate();
    const month = d.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', { month: 'short' });
    return {
      label: `${dayName}`,
      dateNum: dateNum.toString(),
      month: month,
      value: d.toISOString().split('T')[0],
      isToday: i === 0,
    };
  });

  // Generate time slots based on chamber times
  const generateSlots = () => {
    const slots: { time: string; available: boolean; serial: number }[] = [];
    const [startHour, startMin] = chamber.startTime.split(':').map(Number);
    const [endHour, endMin] = chamber.endTime.split(':').map(Number);
    const slotDuration = chamber.slotDuration || 15;
    
    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    let serial = 1;
    
    while (currentMinutes < endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const mins = currentMinutes % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      
      // Randomly mark some as unavailable for demo
      const available = Math.random() > 0.3;
      
      slots.push({
        time: timeStr,
        available,
        serial: available ? serial++ : 0,
      });
      
      currentMinutes += slotDuration;
    }
    
    return slots;
  };

  const slots = generateSlots();

  // Set serial number when slot is selected
  useEffect(() => {
    if (selectedTime) {
      const slot = slots.find(s => s.time === selectedTime);
      if (slot) {
        setSerialNumber(slot.serial);
        // Calculate estimated time
        const [hours, mins] = selectedTime.split(':').map(Number);
        const totalMins = hours * 60 + mins;
        const estimatedHours = Math.floor(totalMins / 60);
        const estimatedMins = totalMins % 60;
        const period = estimatedHours >= 12 ? 'PM' : 'AM';
        const displayHours = estimatedHours > 12 ? estimatedHours - 12 : estimatedHours;
        setEstimatedTime(`${displayHours}:${estimatedMins.toString().padStart(2, '0')} ${period}`);
      }
    }
  }, [selectedTime]);

  const handleConfirm = () => {
    setIsSubmitting(true);
    // Simulate API Call
    setTimeout(() => {
      setIsSubmitting(false);
      setStep('success');
    }, 1500);
  };

  // Visit type options
  const visitTypes = [
    {
      type: 'NEW' as VisitType,
      icon: 'fa-user-plus',
      title: isBn ? 'নতুন রোগী' : 'New Patient',
      subtitle: isBn ? 'প্রথমবার দেখাচ্ছেন' : 'First time consultation',
      fee: chamber.fee,
      color: 'teal',
    },
    {
      type: 'FOLLOW_UP' as VisitType,
      icon: 'fa-sync-alt',
      title: isBn ? 'ফলো-আপ' : 'Follow-up',
      subtitle: isBn ? 'আগের সমস্যার জন্য' : 'For ongoing treatment',
      fee: Math.round(chamber.fee * 0.5),
      color: 'blue',
      discount: '50%',
    },
    {
      type: 'REPORT_CHECK' as VisitType,
      icon: 'fa-file-medical',
      title: isBn ? 'রিপোর্ট দেখানো' : 'Report Check',
      subtitle: isBn ? 'টেস্ট রিপোর্ট নিয়ে আসছেন' : 'Showing test results',
      fee: Math.round(chamber.fee * 0.3),
      color: 'purple',
      discount: '70%',
    },
  ];

  // Translations
  const t = {
    bookAppointment: isBn ? 'অ্যাপয়েন্টমেন্ট বুক করুন' : 'Book Appointment',
    selectVisitType: isBn ? 'ভিজিটের ধরন নির্বাচন করুন' : 'Select Visit Type',
    selectDateTime: isBn ? 'তারিখ ও সময় নির্বাচন করুন' : 'Select Date & Time',
    patientInfo: isBn ? 'রোগীর তথ্য' : 'Patient Information',
    confirmBooking: isBn ? 'বুকিং নিশ্চিত করুন' : 'Confirm Booking',
    consultationType: isBn ? 'পরামর্শের ধরন' : 'Consultation Type',
    inPerson: isBn ? 'চেম্বারে' : 'In-Person',
    online: isBn ? 'অনলাইন' : 'Online',
    selectDate: isBn ? 'তারিখ নির্বাচন করুন' : 'Select Date',
    availableSlots: isBn ? 'সময় নির্বাচন করুন' : 'Available Slots',
    continue: isBn ? 'এগিয়ে যান' : 'Continue',
    back: isBn ? 'পিছনে' : 'Back',
    patientName: isBn ? 'রোগীর নাম' : 'Patient Name',
    phoneNumber: isBn ? 'ফোন নম্বর' : 'Phone Number',
    symptoms: isBn ? 'সমস্যা / লক্ষণ' : 'Chief Complaint / Symptoms',
    optional: isBn ? 'ঐচ্ছিক' : 'Optional',
    bookingSummary: isBn ? 'বুকিং সারাংশ' : 'Booking Summary',
    doctor: isBn ? 'ডাক্তার' : 'Doctor',
    chamber: isBn ? 'চেম্বার' : 'Chamber',
    dateTime: isBn ? 'তারিখ ও সময়' : 'Date & Time',
    serialNo: isBn ? 'সিরিয়াল নং' : 'Serial No',
    estimatedTime: isBn ? 'আনুমানিক সময়' : 'Est. Time',
    visitFee: isBn ? 'ভিজিট ফি' : 'Visit Fee',
    confirm: isBn ? 'নিশ্চিত করুন' : 'Confirm Booking',
    bookingConfirmed: isBn ? 'বুকিং সম্পন্ন!' : 'Booking Confirmed!',
    yourSerial: isBn ? 'আপনার সিরিয়াল' : 'Your Serial',
    smsNote: isBn ? 'SMS পাঠানো হয়েছে' : 'SMS confirmation sent',
    done: isBn ? 'সম্পন্ন' : 'Done',
    today: isBn ? 'আজ' : 'Today',
    booked: isBn ? 'বুকড' : 'Booked',
    discount: isBn ? 'ছাড়' : 'OFF',
  };

  // Progress indicator
  const steps: Step[] = ['visit-type', 'slot', 'details', 'confirm'];
  const currentStepIndex = steps.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-5 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold">{t.bookAppointment}</h2>
                <p className="text-teal-100 text-sm mt-1 flex items-center gap-2">
                  <img src={doctor.image} alt="" className="w-6 h-6 rounded-full border border-white/30" />
                  {doctor.name}
                </p>
                <p className="text-teal-200 text-xs flex items-center gap-1 mt-1">
                  <i className="fas fa-hospital-alt"></i>
                  {chamber.name}
                </p>
              </div>
              <button onClick={onClose} className="text-white/70 hover:text-white transition p-2 hover:bg-white/10 rounded-full">
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            {/* Progress Steps */}
            {step !== 'success' && (
              <div className="flex items-center gap-2 mt-4">
                {steps.map((s, i) => (
                  <React.Fragment key={s}>
                    <div className={`h-2 flex-1 rounded-full transition-all ${
                      i <= currentStepIndex ? 'bg-white' : 'bg-white/30'
                    }`}></div>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Step 1: Visit Type */}
          {step === 'visit-type' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-slate-800 text-lg">{t.selectVisitType}</h3>
              
              <div className="space-y-3">
                {visitTypes.map((vt) => (
                  <button
                    key={vt.type}
                    onClick={() => setVisitType(vt.type)}
                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4 group ${
                      visitType === vt.type 
                        ? `border-${vt.color}-500 bg-${vt.color}-50 shadow-lg` 
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl transition-all ${
                      visitType === vt.type 
                        ? `bg-${vt.color}-500 text-white` 
                        : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                    }`}>
                      <i className={`fas ${vt.icon}`}></i>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800">{vt.title}</h4>
                        {vt.discount && (
                          <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {vt.discount} {t.discount}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{vt.subtitle}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-800">৳{vt.fee}</p>
                      {vt.discount && (
                        <p className="text-xs text-slate-400 line-through">৳{chamber.fee}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setStep('slot')}
                className="w-full py-4 bg-teal-600 text-white font-bold rounded-2xl shadow-lg hover:bg-teal-700 transition flex items-center justify-center gap-2"
              >
                {t.continue} <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          )}

          {/* Step 2: Date & Time */}
          {step === 'slot' && (
            <div className="space-y-5 animate-fade-in">
              {/* Consultation Type */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">{t.consultationType}</label>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setConsultationType('CHAMBER')}
                    className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition ${
                      consultationType === 'CHAMBER' 
                        ? 'border-teal-500 bg-teal-50 text-teal-700' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <i className="fas fa-hospital-alt"></i> {t.inPerson}
                  </button>
                  <button 
                    onClick={() => setConsultationType('ONLINE')}
                    className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition ${
                      consultationType === 'ONLINE' 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <i className="fas fa-video"></i> {t.online}
                  </button>
                </div>
              </div>

              {/* Date Selection - Horizontal Scroll */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">{t.selectDate}</label>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                  {dates.map((date) => (
                    <button
                      key={date.value}
                      onClick={() => setSelectedDate(date.value)}
                      className={`flex-shrink-0 w-16 py-3 rounded-xl text-center transition-all ${
                        selectedDate === date.value 
                          ? 'bg-slate-900 text-white shadow-lg scale-105' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <p className="text-[10px] font-bold uppercase opacity-70">{date.label}</p>
                      <p className="text-xl font-bold">{date.dateNum}</p>
                      <p className="text-[10px] opacity-70">{date.month}</p>
                      {date.isToday && (
                        <span className="text-[8px] bg-green-500 text-white px-1.5 rounded-full">{t.today}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Slots Grid */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">
                  {t.availableSlots}
                  <span className="text-slate-400 font-normal ml-2">({chamber.startTime} - {chamber.endTime})</span>
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {slots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => slot.available && setSelectedTime(slot.time)}
                      disabled={!slot.available}
                      className={`py-2.5 rounded-xl text-sm font-mono transition-all relative ${
                        !slot.available 
                          ? 'bg-slate-100 text-slate-300 cursor-not-allowed line-through' 
                          : selectedTime === slot.time 
                            ? 'bg-teal-600 text-white shadow-lg scale-105' 
                            : 'bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-700'
                      }`}
                    >
                      {slot.time}
                      {slot.available && selectedTime === slot.time && (
                        <span className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 text-[9px] font-bold px-1.5 rounded-full shadow">
                          #{slot.serial}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setStep('visit-type')}
                  className="flex-1 py-3 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition"
                >
                  <i className="fas fa-arrow-left mr-2"></i> {t.back}
                </button>
                <button 
                  onClick={() => setStep('details')}
                  disabled={!selectedDate || !selectedTime}
                  className="flex-[2] py-3 bg-teal-600 text-white font-bold rounded-xl shadow-lg hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {t.continue} <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Patient Details */}
          {step === 'details' && (
            <div className="space-y-5 animate-fade-in">
              <h3 className="font-bold text-slate-800 text-lg">{t.patientInfo}</h3>

              {/* Quick Info Card */}
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-600">
                    <i className="fas fa-calendar-check"></i>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{new Date(selectedDate).toLocaleDateString(isBn ? 'bn-BD' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                    <p className="text-sm text-slate-500">{selectedTime} • {consultationType === 'ONLINE' ? t.online : t.inPerson}</p>
                  </div>
                </div>
                <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-bold text-sm">
                  #{serialNumber}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t.patientName} *</label>
                  <input 
                    type="text" 
                    value={patientDetails.name}
                    onChange={(e) => setPatientDetails({...patientDetails, name: e.target.value})}
                    className="w-full p-4 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-lg"
                    placeholder={isBn ? 'পুরো নাম লিখুন' : 'Enter full name'}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t.phoneNumber} *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">+880</span>
                    <input 
                      type="tel" 
                      value={patientDetails.phone}
                      onChange={(e) => setPatientDetails({...patientDetails, phone: e.target.value})}
                      className="w-full p-4 pl-16 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-lg font-mono"
                      placeholder="1XXXXXXXXX"
                      maxLength={10}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                    {t.symptoms} <span className="text-slate-400 font-normal">({t.optional})</span>
                  </label>
                  <textarea 
                    value={patientDetails.symptoms}
                    onChange={(e) => setPatientDetails({...patientDetails, symptoms: e.target.value})}
                    className="w-full p-4 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none h-24"
                    placeholder={isBn ? 'আপনার সমস্যা সংক্ষেপে লিখুন...' : 'Briefly describe your problem...'}
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setStep('slot')}
                  className="flex-1 py-3 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition"
                >
                  <i className="fas fa-arrow-left mr-2"></i> {t.back}
                </button>
                <button 
                  onClick={() => setStep('confirm')}
                  disabled={!patientDetails.name || !patientDetails.phone}
                  className="flex-[2] py-3 bg-teal-600 text-white font-bold rounded-xl shadow-lg hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {t.continue} <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 'confirm' && (
            <div className="space-y-5 animate-fade-in">
              <h3 className="font-bold text-slate-800 text-lg">{t.bookingSummary}</h3>

              <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                    <span className="text-slate-500">{t.doctor}</span>
                    <span className="font-bold text-slate-800">{doctor.name}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                    <span className="text-slate-500">{t.chamber}</span>
                    <span className="font-bold text-slate-800">{chamber.name}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                    <span className="text-slate-500">{t.dateTime}</span>
                    <span className="font-bold text-slate-800">
                      {new Date(selectedDate).toLocaleDateString(isBn ? 'bn-BD' : 'en-US', { month: 'short', day: 'numeric' })}, {selectedTime}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                    <span className="text-slate-500">{t.serialNo}</span>
                    <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-bold">#{serialNumber}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                    <span className="text-slate-500">{t.estimatedTime}</span>
                    <span className="font-bold text-green-600">{estimatedTime}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">{t.visitFee}</span>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-teal-600">৳{calculateFee()}</span>
                      {visitType !== 'NEW' && (
                        <span className="text-sm text-slate-400 line-through ml-2">৳{chamber.fee}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Visit Type Badge */}
                <div className={`p-3 text-center text-sm font-bold ${
                  visitType === 'NEW' ? 'bg-teal-100 text-teal-800' :
                  visitType === 'FOLLOW_UP' ? 'bg-blue-100 text-blue-800' :
                  'bg-purple-100 text-purple-800'
                }`}>
                  {visitTypes.find(v => v.type === visitType)?.title}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <i className="fas fa-info-circle text-amber-500 mt-0.5"></i>
                <p className="text-sm text-amber-800">
                  {isBn 
                    ? 'বুকিং নিশ্চিত করার পর আপনার ফোনে SMS পাঠানো হবে। অ্যাপয়েন্টমেন্টের ১৫ মিনিট আগে পৌঁছাবেন।'
                    : 'You will receive an SMS confirmation. Please arrive 15 minutes before your appointment.'
                  }
                </p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setStep('details')}
                  className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition"
                >
                  <i className="fas fa-arrow-left mr-2"></i> {t.back}
                </button>
                <button 
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className="flex-[2] py-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition disabled:opacity-70 flex justify-center items-center gap-2"
                >
                  {isSubmitting ? (
                    <><i className="fas fa-circle-notch fa-spin"></i> {isBn ? 'প্রক্রিয়াকরণ...' : 'Processing...'}</>
                  ) : (
                    <><i className="fas fa-check-circle"></i> {t.confirm}</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="text-center py-6 animate-fade-in">
              <div className="relative inline-block mb-6">
                <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 text-4xl">
                  <i className="fas fa-check animate-bounce"></i>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                  #{serialNumber}
                </div>
              </div>

              <h3 className="text-2xl font-bold text-slate-800 mb-2">{t.bookingConfirmed}</h3>
              
              <p className="text-slate-600 mb-6 max-w-sm mx-auto">
                {isBn 
                  ? `${doctor.name}-এর সাথে আপনার অ্যাপয়েন্টমেন্ট নিশ্চিত হয়েছে।`
                  : `Your appointment with ${doctor.name} is confirmed.`
                }
              </p>

              <div className="bg-slate-50 rounded-2xl p-5 mb-6 max-w-sm mx-auto border border-slate-200">
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div>
                    <p className="text-xs text-slate-400 uppercase">{t.serialNo}</p>
                    <p className="text-3xl font-bold text-teal-600">#{serialNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase">{t.estimatedTime}</p>
                    <p className="text-xl font-bold text-slate-800">{estimatedTime}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600">
                    <i className="fas fa-map-marker-alt text-teal-500 mr-2"></i>
                    {chamber.name}, {chamber.address}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-green-600 text-sm mb-6">
                <i className="fas fa-sms"></i>
                <span>{t.smsNote} +880{patientDetails.phone}</span>
              </div>

              <button 
                onClick={onClose}
                className="w-full max-w-sm py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition"
              >
                {t.done}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
