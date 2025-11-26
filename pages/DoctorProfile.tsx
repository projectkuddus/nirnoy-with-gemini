import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOCK_DOCTORS } from '../data/mockData';
import { BookingModal } from '../components/BookingModal';
import { Chamber } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import PageHeader from '../components/PageHeader';

export const DoctorProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';
  
  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedChamber, setSelectedChamber] = useState<Chamber | null>(null);
  const [activeSection, setActiveSection] = useState<'info' | 'chambers' | 'reviews'>('info');

  // Load doctor
  useEffect(() => {
    const found = MOCK_DOCTORS.find(d => d.id === id);
    if (found) {
      // Enhance with mock data
      setDoctor({
        ...found,
        experienceYears: found.experience || Math.floor(Math.random() * 20) + 5,
        totalPatients: Math.floor(Math.random() * 10000) + 1000,
        totalReviews: Math.floor(Math.random() * 300) + 50,
        avgRating: 4.2 + Math.random() * 0.7,
        bmdcNumber: `A-${10000 + Math.floor(Math.random() * 50000)}`,
        bio: `${found.name} is a highly experienced ${found.specialties?.[0] || 'medical'} specialist with expertise in diagnosis and treatment. Known for patient-centered care and evidence-based practice.`,
        qualifications: [
          { degree: 'MBBS', institution: 'Dhaka Medical College', year: 2000 + Math.floor(Math.random() * 10) },
          { degree: 'FCPS', field: found.specialties?.[0], institution: 'BCPS', year: 2005 + Math.floor(Math.random() * 10) },
        ],
        languages: ['Bangla', 'English'],
        reviews: Array.from({ length: 5 }, (_, i) => ({
          id: i,
          name: ['রহিম', 'করিম', 'সালমা', 'ফাতিমা', 'জামাল'][i],
          rating: 4 + Math.floor(Math.random() * 2),
          comment: ['অনেক ভালো ডাক্তার', 'সময় দিয়ে দেখেন', 'চিকিৎসায় সুফল পেয়েছি', 'রোগী বান্ধব', 'সবাইকে রেকমেন্ড করি'][i],
          date: '2024-11-' + (10 + i),
        })),
      });
    }
    setLoading(false);
  }, [id]);

  // Translations
  const t = {
    back: isBn ? 'পিছনে' : 'Back',
    verified: isBn ? 'BMDC যাচাইকৃত' : 'BMDC Verified',
    exp: isBn ? 'বছরের অভিজ্ঞতা' : 'Years Exp.',
    patients: isBn ? 'রোগী' : 'Patients',
    reviews: isBn ? 'রিভিউ' : 'Reviews',
    bookNow: isBn ? 'অ্যাপয়েন্টমেন্ট' : 'Book Now',
    fee: isBn ? 'ফি' : 'Fee',
    info: isBn ? 'তথ্য' : 'Info',
    chambers: isBn ? 'চেম্বার' : 'Chambers',
    about: isBn ? 'সম্পর্কে' : 'About',
    qualifications: isBn ? 'যোগ্যতা' : 'Qualifications',
    specialties: isBn ? 'বিশেষত্ব' : 'Specialties',
    languages: isBn ? 'ভাষা' : 'Languages',
    schedule: isBn ? 'সময়সূচী' : 'Schedule',
    facilities: isBn ? 'সুবিধা' : 'Facilities',
    parking: isBn ? 'পার্কিং' : 'Parking',
    ac: isBn ? 'এসি' : 'A/C',
    notFound: isBn ? 'ডাক্তার পাওয়া যায়নি' : 'Doctor Not Found',
    goBack: isBn ? 'ফিরে যান' : 'Go Back',
    newFee: isBn ? 'নতুন' : 'New',
    followUpFee: isBn ? 'ফলো-আপ' : 'Follow-up',
    viewProfile: isBn ? 'প্রোফাইল দেখুন' : 'View Profile',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-user-md text-3xl text-slate-300"></i>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">{t.notFound}</h1>
          <button onClick={() => navigate('/search')} className="text-blue-600 font-medium">
            <i className="fas fa-arrow-left mr-2"></i>{t.goBack}
          </button>
        </div>
      </div>
    );
  }

  const primaryChamber = doctor.chambers?.[0];

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader showNav={true} />
      
      {/* Doctor Info Header */}
      <div className="bg-white border-b border-slate-100 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-4 py-4">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition flex items-center justify-center">
              <i className="fas fa-arrow-left"></i>
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-black text-slate-800 truncate text-lg">{doctor.name}</p>
              <p className="text-xs text-slate-500 truncate">{doctor.specialties?.join(', ')}</p>
            </div>
            <button className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition flex items-center justify-center">
              <i className="fas fa-share-alt"></i>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 pt-4">
        
        {/* Profile Card - Compact */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-4">
          <div className="p-4">
            <div className="flex gap-4">
              {/* Photo */}
              <div className="relative flex-shrink-0">
                <img 
                  src={doctor.image} 
                  alt={doctor.name}
                  className="w-24 h-24 rounded-xl object-cover bg-slate-100"
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                  <i className="fas fa-check text-white text-xs"></i>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-black text-slate-800 mb-0.5">{doctor.name}</h1>
                <p className="text-sm text-blue-600 font-medium mb-1">{doctor.degrees}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {doctor.specialties?.slice(0, 2).map((s: string) => (
                    <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">{s}</span>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <i className="fas fa-check-circle text-green-500"></i>
                  <span className="text-green-600 font-medium">{t.verified}</span>
                  <span className="text-slate-400 ml-1">• {doctor.bmdcNumber}</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex justify-between mt-4 pt-4 border-t border-slate-100">
              <div className="text-center flex-1">
                <p className="text-xl font-bold text-slate-800">{doctor.experienceYears}+</p>
                <p className="text-xs text-slate-500">{t.exp}</p>
              </div>
              <div className="text-center flex-1 border-x border-slate-100">
                <p className="text-xl font-bold text-slate-800">{(doctor.totalPatients / 1000).toFixed(1)}k</p>
                <p className="text-xs text-slate-500">{t.patients}</p>
              </div>
              <div className="text-center flex-1">
                <div className="flex items-center justify-center gap-1">
                  <i className="fas fa-star text-amber-400 text-sm"></i>
                  <span className="text-xl font-bold text-slate-800">{doctor.avgRating?.toFixed(1)}</span>
                </div>
                <p className="text-xs text-slate-500">{doctor.totalReviews} {t.reviews}</p>
              </div>
            </div>
          </div>

          {/* Quick Book - Primary Chamber */}
          {primaryChamber && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-t border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium mb-0.5">{primaryChamber.name}</p>
                  <p className="text-sm text-slate-600">{primaryChamber.address}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{t.fee}</p>
                  <p className="text-xl font-bold text-blue-600">৳{primaryChamber.fee}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedChamber(primaryChamber);
                  setShowBooking(true);
                }}
                className="w-full mt-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 rounded-xl font-bold hover:from-blue-600 hover:to-indigo-600 transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                <i className="fas fa-calendar-check"></i>
                {t.bookNow}
              </button>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white rounded-xl p-1 mb-4 shadow-sm border border-slate-100">
          {(['info', 'chambers', 'reviews'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSection(tab)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${
                activeSection === tab
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'info' && <><i className="fas fa-user mr-1.5"></i>{t.info}</>}
              {tab === 'chambers' && <><i className="fas fa-hospital mr-1.5"></i>{t.chambers}</>}
              {tab === 'reviews' && <><i className="fas fa-star mr-1.5"></i>{t.reviews}</>}
            </button>
          ))}
        </div>

        {/* Content Sections */}
        <div className="space-y-4">
          
          {/* INFO SECTION */}
          {activeSection === 'info' && (
            <>
              {/* About */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <i className="fas fa-info-circle text-blue-500"></i>
                  {t.about}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">{doctor.bio}</p>
              </div>

              {/* Qualifications */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <i className="fas fa-graduation-cap text-blue-500"></i>
                  {t.qualifications}
                </h3>
                <div className="space-y-3">
                  {doctor.qualifications?.map((q: any, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">
                          {q.degree}
                          {q.field && <span className="text-slate-500 font-normal"> ({q.field})</span>}
                        </p>
                        <p className="text-sm text-slate-500">{q.institution} • {q.year}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Specialties & Languages */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-800 mb-2 text-sm">{t.specialties}</h3>
                  <div className="flex flex-wrap gap-1">
                    {doctor.specialties?.map((s: string) => (
                      <span key={s} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-800 mb-2 text-sm">{t.languages}</h3>
                  <div className="flex flex-wrap gap-1">
                    {doctor.languages?.map((l: string) => (
                      <span key={l} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-lg">{l}</span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* CHAMBERS SECTION */}
          {activeSection === 'chambers' && (
            <div className="space-y-3">
              {doctor.chambers?.map((chamber: any, i: number) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-800">{chamber.name}</h3>
                          {i === 0 && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                              {isBn ? 'প্রধান' : 'Primary'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">
                          <i className="fas fa-map-marker-alt mr-1.5 text-slate-400"></i>
                          {chamber.address}
                        </p>
                      </div>
                    </div>

                    {/* Schedule */}
                    <div className="flex items-center gap-4 text-sm mb-3">
                      <span className="text-slate-600">
                        <i className="far fa-clock mr-1.5 text-slate-400"></i>
                        {chamber.startTime || '10:00'} - {chamber.endTime || '14:00'}
                      </span>
                      <span className="text-slate-600">
                        <i className="far fa-calendar mr-1.5 text-slate-400"></i>
                        {isBn ? 'শনি, সোম, বুধ' : 'Sat, Mon, Wed'}
                      </span>
                    </div>

                    {/* Fees */}
                    <div className="flex gap-3 mb-3">
                      <div className="flex-1 bg-slate-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-slate-500">{t.newFee}</p>
                        <p className="font-bold text-slate-800">৳{chamber.fee}</p>
                      </div>
                      <div className="flex-1 bg-green-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-green-600">{t.followUpFee}</p>
                        <p className="font-bold text-green-700">৳{Math.round(chamber.fee * 0.5)}</p>
                      </div>
                    </div>

                    {/* Facilities */}
                    <div className="flex gap-2 mb-3">
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-lg">
                        <i className="fas fa-parking mr-1"></i>{t.parking}
                      </span>
                      <span className="px-2 py-1 bg-cyan-50 text-cyan-600 text-xs rounded-lg">
                        <i className="fas fa-snowflake mr-1"></i>{t.ac}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedChamber(chamber);
                        setShowBooking(true);
                      }}
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-2.5 rounded-xl font-bold hover:from-blue-600 hover:to-indigo-600 transition shadow-lg shadow-blue-500/25"
                    >
                      <i className="fas fa-calendar-plus mr-2"></i>
                      {t.bookNow}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* REVIEWS SECTION */}
          {activeSection === 'reviews' && (
            <>
              {/* Rating Summary */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-slate-800">{doctor.avgRating?.toFixed(1)}</p>
                    <div className="flex gap-0.5 justify-center my-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <i key={star} className={`fas fa-star text-sm ${star <= Math.round(doctor.avgRating) ? 'text-amber-400' : 'text-slate-200'}`}></i>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">{doctor.totalReviews} {t.reviews}</p>
                  </div>
                  <div className="flex-1 space-y-1">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const percent = star === 5 ? 70 : star === 4 ? 20 : star === 3 ? 7 : star === 2 ? 2 : 1;
                      return (
                        <div key={star} className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 w-3">{star}</span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${percent}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Reviews List */}
              <div className="space-y-3">
                {doctor.reviews?.map((review: any) => (
                  <div key={review.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                        {review.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-slate-800">{review.name}</p>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <i key={star} className={`fas fa-star text-xs ${star <= review.rating ? 'text-amber-400' : 'text-slate-200'}`}></i>
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600">{review.comment}</p>
                        <p className="text-xs text-slate-400 mt-1">{review.date}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Fixed Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 z-40">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-slate-500">{t.fee}</p>
            <p className="text-xl font-bold text-slate-800">৳{primaryChamber?.fee || 1500}</p>
          </div>
          <button
            onClick={() => {
              setSelectedChamber(primaryChamber);
              setShowBooking(true);
            }}
            className="flex-[2] bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3.5 rounded-xl font-bold hover:from-blue-600 hover:to-indigo-600 transition shadow-lg shadow-blue-500/25"
          >
            <i className="fas fa-calendar-check mr-2"></i>
            {t.bookNow}
          </button>
        </div>
      </div>

      {/* Booking Modal */}
      {showBooking && selectedChamber && (
        <BookingModal
          doctor={doctor}
          chamber={selectedChamber}
          onClose={() => {
            setShowBooking(false);
            setSelectedChamber(null);
          }}
        />
      )}
    </div>
  );
};

export default DoctorProfile;
