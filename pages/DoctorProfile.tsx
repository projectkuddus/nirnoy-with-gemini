import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOCK_DOCTORS } from '../data/mockData';
import { BookingModal } from '../components/BookingModal';
import { Chamber } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

export const DoctorProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';
  
  const doctor = MOCK_DOCTORS.find(d => d.id === id);
  
  const [selectedChamber, setSelectedChamber] = useState<Chamber | null>(null);
  
  // Check if the viewer is a doctor
  const role = localStorage.getItem('nirnoy_role');
  const isDoctorView = role === 'DOCTOR';

  // Translations
  const t = {
    back: isBn ? 'পিছনে' : 'Back',
    returnToDashboard: isBn ? 'ড্যাশবোর্ডে ফিরুন' : 'Return to Dashboard',
    doctorNotFound: isBn ? 'ডাক্তার পাওয়া যায়নি' : 'Doctor Not Found',
    notFoundDesc: isBn ? 'আপনি যে প্রোফাইলটি খুঁজছেন তা বিদ্যমান নেই।' : 'The profile you are looking for does not exist.',
    goBack: isBn ? 'ফিরে যান' : 'Go Back',
    patients: isBn ? 'রোগী' : 'Patients',
    appointmentSchedule: isBn ? 'অ্যাপয়েন্টমেন্ট সময়সূচী' : 'Appointment Schedule',
    minPerPatient: isBn ? 'মিনিট / রোগী' : 'min / patient',
    bookAppointment: isBn ? 'অ্যাপয়েন্টমেন্ট বুক করুন' : 'Book Appointment',
    verifyStatus: isBn ? 'যাচাই স্ট্যাটাস' : 'Verify Status',
    bmdcVerified: isBn ? 'BMDC যাচাইকৃত' : 'BMDC Verified',
    regNo: isBn ? 'রেজি নং' : 'Reg No',
  };

  // Use local profile data if viewing self
  const savedProfile = localStorage.getItem('nirnoy_doctor_profile');
  const displayDoctor = (isDoctorView && savedProfile && JSON.parse(savedProfile).id === id) 
      ? JSON.parse(savedProfile) 
      : doctor;

  if (!displayDoctor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="text-center">
          <i className="fas fa-user-slash text-6xl text-slate-300 mb-4"></i>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{t.doctorNotFound}</h2>
          <p className="text-slate-500 mb-6">{t.notFoundDesc}</p>
          <button 
             onClick={() => navigate(-1)}
             className="bg-primary text-white px-6 py-2 rounded-lg font-bold shadow-sm hover:bg-secondary transition"
          >
             {t.goBack}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
       {/* Header / Cover */}
       <div className="h-48 bg-teal-600 relative">
          <div className="absolute top-4 left-4">
             <button 
                onClick={() => navigate(-1)} 
                className="text-white/80 hover:text-white flex items-center gap-2 font-bold bg-black/10 px-4 py-2 rounded-full backdrop-blur-sm transition hover:bg-black/20"
             >
                <i className="fas fa-arrow-left"></i> {t.back}
             </button>
          </div>
          {isDoctorView && (
             <div className="absolute top-4 right-4">
                <button 
                   onClick={() => navigate('/doctor-dashboard')} 
                   className="bg-white text-teal-700 px-4 py-2 rounded-full font-bold shadow-lg text-sm flex items-center gap-2 hover:bg-teal-50 transition"
                >
                   <i className="fas fa-tachometer-alt"></i> {t.returnToDashboard}
                </button>
             </div>
          )}
       </div>

       <div className="container mx-auto px-4 max-w-5xl -mt-20 relative z-10">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-slate-100">
             <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="w-full md:w-auto flex justify-center">
                   <img 
                     src={displayDoctor.image} 
                     alt={displayDoctor.name} 
                     className="w-40 h-40 rounded-2xl object-cover border-4 border-white shadow-lg bg-slate-100"
                   />
                </div>
                
                <div className="flex-1 w-full text-center md:text-left">
                   <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                      <div>
                         <h1 className="text-3xl font-bold text-slate-800 mb-1">{displayDoctor.name}</h1>
                         <p className="text-lg text-slate-600 font-medium mb-2">{displayDoctor.degrees}</p>
                         <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                            {displayDoctor.specialties.map((s: string) => (
                               <span key={s} className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-sm font-bold border border-teal-100">
                                  {s}
                               </span>
                            ))}
                         </div>
                      </div>
                      <div className="bg-yellow-50 text-yellow-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 border border-yellow-100 self-center md:self-start">
                         <span className="text-2xl">{displayDoctor.rating}</span>
                         <div className="flex flex-col items-start text-xs">
                            <div className="flex text-yellow-400 text-xs">
                               <i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star-half-alt"></i>
                            </div>
                            <span>{displayDoctor.patientCount}+ {t.patients}</span>
                         </div>
                      </div>
                   </div>

                   <div className="prose prose-slate max-w-none mt-4 text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p>{displayDoctor.bio}</p>
                   </div>
                </div>
             </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
             <div className="md:col-span-2 space-y-6">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                   <i className="fas fa-calendar-alt text-primary"></i> {t.appointmentSchedule}
                </h2>
                
                {displayDoctor.chambers.map((chamber: Chamber) => (
                   <div key={chamber.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-primary transition group">
                      <div className="flex justify-between items-start mb-4">
                         <div>
                            <h3 className="font-bold text-lg text-slate-800 group-hover:text-primary transition">{chamber.name}</h3>
                            <p className="text-slate-500 text-sm"><i className="fas fa-map-marker-alt mr-1"></i> {chamber.address}</p>
                         </div>
                         <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm font-bold">
                            ৳ {chamber.fee}
                         </span>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-slate-600 mb-6">
                         <div className="flex items-center gap-2">
                            <i className="far fa-clock text-slate-400"></i>
                            <span className="font-medium">{chamber.startTime} - {chamber.endTime}</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <i className="far fa-hourglass text-slate-400"></i>
                            <span>{chamber.slotDuration} {t.minPerPatient}</span>
                         </div>
                      </div>

                      <button 
                        onClick={() => setSelectedChamber(chamber)}
                        className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-secondary transition shadow-lg shadow-teal-500/20"
                      >
                         {t.bookAppointment}
                      </button>
                   </div>
                ))}
             </div>

             <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                   <h3 className="font-bold text-slate-800 mb-4">{t.verifyStatus}</h3>
                   <div className="flex items-center gap-3 text-green-600 bg-green-50 p-3 rounded-lg border border-green-100 mb-3">
                      <i className="fas fa-check-circle text-xl"></i>
                      <div>
                         <p className="font-bold text-sm">{t.bmdcVerified}</p>
                         <p className="text-xs opacity-80">{t.regNo}: A-12345</p>
                      </div>
                   </div>
                </div>

                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-xl text-white shadow-xl">
                   <i className="fas fa-quote-left text-slate-600 text-3xl mb-2 block"></i>
                   <p className="text-sm italic opacity-90 mb-4">
                      "Dr. {displayDoctor.name.split(' ').pop()} is incredibly thorough and patient. He explained my condition in a way I could understand."
                   </p>
                   <div className="flex items-center gap-2">
                      <div className="h-8 w-8 bg-slate-600 rounded-full flex items-center justify-center text-xs font-bold">S</div>
                      <span className="text-xs font-bold text-slate-400">Sultana R.</span>
                   </div>
                </div>
             </div>
          </div>
       </div>

       {/* Booking Modal */}
       {selectedChamber && (
         <BookingModal 
            doctor={displayDoctor} 
            chamber={selectedChamber} 
            onClose={() => setSelectedChamber(null)} 
         />
       )}
    </div>
  );
};
