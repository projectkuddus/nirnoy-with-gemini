import React, { useState } from 'react';
import { Doctor, Chamber } from '../types';

interface BookingModalProps {
  doctor: Doctor;
  chamber: Chamber;
  onClose: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ doctor, chamber, onClose }) => {
  const [step, setStep] = useState<'slot' | 'details' | 'success'>('slot');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [consultationType, setConsultationType] = useState<'Chamber' | 'Online'>('Chamber');
  const [patientDetails, setPatientDetails] = useState({ name: '', phone: '', symptom: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate next 3 days
  const dates = Array.from({ length: 3 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      value: d.toISOString().split('T')[0]
    };
  });

  // Mock slots based on chamber start/end times (simplified)
  const generateSlots = () => {
    const slots = [];
    let start = parseInt(chamber.startTime.split(':')[0]);
    const end = parseInt(chamber.endTime.split(':')[0]);
    // If PM times are less than AM (e.g. 15:00 to 18:00), standard parsing works. 
    // Just creating some mock slots for visual purpose
    for (let i = 0; i < 6; i++) {
        slots.push(`${start}:00`);
        slots.push(`${start}:30`);
        start = (start + 1) % 24;
    }
    return slots;
  };

  const slots = generateSlots();

  const handleConfirm = () => {
    setIsSubmitting(true);
    // Simulate API Call
    setTimeout(() => {
      setIsSubmitting(false);
      setStep('success');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-teal-600 p-6 text-white flex justify-between items-start">
          <div>
             <h2 className="text-xl font-bold">Book Appointment</h2>
             <p className="text-teal-100 text-sm mt-1">Dr. {doctor.name}</p>
             <p className="text-teal-200 text-xs">{chamber.name}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
           {step === 'slot' && (
             <div className="space-y-6 animate-fade-in">
                {/* Type Selection */}
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Consultation Type</label>
                   <div className="flex gap-4">
                      <button 
                        onClick={() => setConsultationType('Chamber')}
                        className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition ${
                           consultationType === 'Chamber' ? 'border-primary bg-teal-50 text-primary' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                         <i className="fas fa-hospital-alt"></i> In-Person
                      </button>
                      <button 
                        onClick={() => setConsultationType('Online')}
                        className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition ${
                           consultationType === 'Online' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                         <i className="fas fa-video"></i> Online
                      </button>
                   </div>
                </div>

                {/* Date Selection */}
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Select Date</label>
                   <div className="grid grid-cols-3 gap-3">
                      {dates.map((date) => (
                         <button
                           key={date.value}
                           onClick={() => setSelectedDate(date.value)}
                           className={`py-2 px-1 rounded-lg text-sm font-medium border transition ${
                              selectedDate === date.value ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                           }`}
                         >
                            {date.label}
                         </button>
                      ))}
                   </div>
                </div>

                {/* Time Selection */}
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Available Slots</label>
                   <div className="grid grid-cols-4 gap-3">
                      {slots.map((slot) => (
                         <button
                           key={slot}
                           onClick={() => setSelectedTime(slot)}
                           className={`py-2 rounded-lg text-sm font-mono transition ${
                              selectedTime === slot ? 'bg-primary text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                           }`}
                         >
                            {slot}
                         </button>
                      ))}
                   </div>
                </div>
                
                <div className="pt-4">
                   <button 
                     onClick={() => setStep('details')}
                     disabled={!selectedDate || !selectedTime}
                     className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-secondary transition disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                      Continue
                   </button>
                </div>
             </div>
           )}

           {step === 'details' && (
              <div className="space-y-5 animate-fade-in">
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm mb-4">
                    <div className="flex justify-between mb-1">
                       <span className="text-slate-500">Time:</span>
                       <span className="font-bold text-slate-800">{selectedDate}, {selectedTime}</span>
                    </div>
                    <div className="flex justify-between">
                       <span className="text-slate-500">Type:</span>
                       <span className="font-bold text-slate-800">{consultationType}</span>
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Patient Name</label>
                    <input 
                       type="text" 
                       value={patientDetails.name}
                       onChange={(e) => setPatientDetails({...patientDetails, name: e.target.value})}
                       className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                       placeholder="Enter full name"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                    <input 
                       type="tel" 
                       value={patientDetails.phone}
                       onChange={(e) => setPatientDetails({...patientDetails, phone: e.target.value})}
                       className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                       placeholder="01XXXXXXXXX"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chief Complaint / Symptoms</label>
                    <textarea 
                       value={patientDetails.symptom}
                       onChange={(e) => setPatientDetails({...patientDetails, symptom: e.target.value})}
                       className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none h-20"
                       placeholder="Describe your problem briefly..."
                    ></textarea>
                 </div>

                 <div className="flex gap-3 pt-4">
                    <button 
                      onClick={() => setStep('slot')}
                      className="flex-1 py-3 bg-white border border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition"
                    >
                       Back
                    </button>
                    <button 
                      onClick={handleConfirm}
                      disabled={!patientDetails.name || !patientDetails.phone || isSubmitting}
                      className="flex-[2] py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-secondary transition disabled:opacity-70 flex justify-center items-center"
                    >
                       {isSubmitting ? <i className="fas fa-circle-notch fa-spin"></i> : 'Confirm Booking'}
                    </button>
                 </div>
              </div>
           )}

           {step === 'success' && (
              <div className="text-center py-8 animate-fade-in">
                 <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl animate-bounce">
                    <i className="fas fa-check"></i>
                 </div>
                 <h3 className="text-2xl font-bold text-slate-800 mb-2">Booking Confirmed!</h3>
                 <p className="text-slate-600 mb-6 max-w-xs mx-auto">
                    Your appointment with <span className="font-bold">Dr. {doctor.name}</span> is confirmed for <span className="font-bold">{selectedDate}</span> at <span className="font-bold">{selectedTime}</span>.
                 </p>
                 <div className="bg-slate-50 p-4 rounded-lg text-xs text-slate-500 mb-6">
                    An SMS with details has been sent to {patientDetails.phone}.
                 </div>
                 <button 
                   onClick={onClose}
                   className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition"
                 >
                    Done
                 </button>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};
