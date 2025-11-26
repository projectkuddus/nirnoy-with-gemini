import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOCK_DOCTORS } from '../data/mockData';
import { BookingModal } from '../components/BookingModal';
import { Chamber } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

// Types for comprehensive doctor profile
interface DoctorQualification {
  id: number;
  degree: string;
  field?: string;
  institution: string;
  institutionCity?: string;
  institutionCountry?: string;
  yearOfCompletion?: number;
  isVerified?: boolean;
}

interface DoctorExperience {
  id: number;
  position: string;
  department?: string;
  institution: string;
  institutionType?: string;
  city?: string;
  country?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
}

interface DoctorChamber {
  id: number;
  name: string;
  type: string;
  address: string;
  area: string;
  city: string;
  landmark?: string;
  daysOfWeek: string;
  startTime: string;
  endTime: string;
  slotDuration: number;
  consultationFee: number;
  followUpFee?: number;
  reportCheckFee?: number;
  isPrimary?: boolean;
  hasParking?: boolean;
  hasWheelchairAccess?: boolean;
  hasAC?: boolean;
}

interface DoctorAchievement {
  id: number;
  title: string;
  type: string;
  organization: string;
  year?: number;
}

interface DoctorMembership {
  id: number;
  organization: string;
  membershipType?: string;
  joinedYear?: number;
}

interface DoctorService {
  id: number;
  name: string;
  nameBn?: string;
  fee?: number;
  duration?: number;
}

interface DoctorReview {
  id: number;
  rating: number;
  comment?: string;
  patientName: string;
  createdAt: string;
}

interface DoctorFullProfile {
  id: number;
  slug: string;
  title: string;
  nameEn: string;
  nameBn?: string;
  gender: string;
  profilePhoto?: string;
  coverPhoto?: string;
  primarySpecialty: string;
  tagline?: string;
  bioEn?: string;
  bioBn?: string;
  experienceYears: number;
  languages: string[];
  bmdcNumber?: string;
  bmdcVerified: boolean;
  consultationFeeNew: number;
  consultationFeeFollowUp?: number;
  consultationFeeReport?: number;
  onlineConsultationFee?: number;
  isAvailableForOnline: boolean;
  acceptNewPatients: boolean;
  averageRating: number;
  totalReviews: number;
  totalPatients: number;
  websiteUrl?: string;
  linkedinUrl?: string;
  facebookUrl?: string;
  qualifications: DoctorQualification[];
  specializations: { name: string; isPrimary: boolean }[];
  experiences: DoctorExperience[];
  chambers: DoctorChamber[];
  achievements: DoctorAchievement[];
  memberships: DoctorMembership[];
  services: DoctorService[];
  reviews: DoctorReview[];
}

export const DoctorProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';
  
  const [doctor, setDoctor] = useState<DoctorFullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChamber, setSelectedChamber] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'experience' | 'chambers' | 'reviews'>('overview');
  
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
    reviews: isBn ? 'রিভিউ' : 'Reviews',
    experience: isBn ? 'অভিজ্ঞতা' : 'Experience',
    years: isBn ? 'বছর' : 'years',
    bmdcVerified: isBn ? 'BMDC যাচাইকৃত' : 'BMDC Verified',
    bmdcNumber: isBn ? 'BMDC নং' : 'BMDC No',
    overview: isBn ? 'সংক্ষিপ্ত বিবরণ' : 'Overview',
    chambers: isBn ? 'চেম্বার সমূহ' : 'Chambers',
    about: isBn ? 'সম্পর্কে' : 'About',
    qualifications: isBn ? 'শিক্ষাগত যোগ্যতা' : 'Qualifications',
    workExperience: isBn ? 'কর্ম অভিজ্ঞতা' : 'Work Experience',
    achievements: isBn ? 'পুরস্কার ও অর্জন' : 'Awards & Achievements',
    memberships: isBn ? 'সদস্যপদ' : 'Professional Memberships',
    services: isBn ? 'সেবাসমূহ' : 'Services Offered',
    consultationFee: isBn ? 'পরামর্শ ফি' : 'Consultation Fee',
    followUpFee: isBn ? 'ফলো-আপ ফি' : 'Follow-up Fee',
    reportCheckFee: isBn ? 'রিপোর্ট দেখানো ফি' : 'Report Check Fee',
    onlineFee: isBn ? 'অনলাইন ফি' : 'Online Consultation',
    bookAppointment: isBn ? 'অ্যাপয়েন্টমেন্ট বুক করুন' : 'Book Appointment',
    schedule: isBn ? 'সময়সূচী' : 'Schedule',
    facilities: isBn ? 'সুবিধাসমূহ' : 'Facilities',
    parking: isBn ? 'পার্কিং' : 'Parking',
    wheelchair: isBn ? 'হুইলচেয়ার' : 'Wheelchair Access',
    ac: isBn ? 'এসি' : 'Air Conditioned',
    present: isBn ? 'বর্তমান' : 'Present',
    acceptingPatients: isBn ? 'নতুন রোগী গ্রহণ করছেন' : 'Accepting New Patients',
    onlineAvailable: isBn ? 'অনলাইন পরামর্শ সক্রিয়' : 'Online Consultation Available',
    languages: isBn ? 'ভাষা' : 'Languages',
    patientReviews: isBn ? 'রোগীদের মতামত' : 'Patient Reviews',
    noReviews: isBn ? 'এখনো কোনো রিভিউ নেই' : 'No reviews yet',
    verifiedPatient: isBn ? 'যাচাইকৃত রোগী' : 'Verified Patient',
  };

  // Fetch doctor profile (mock for now, will connect to API)
  useEffect(() => {
    setLoading(true);
    
    // Simulate API call - in production, fetch from backend
    const mockDoctor = MOCK_DOCTORS.find(d => d.id === id);
    
    if (mockDoctor) {
      // Transform mock data to full profile format
      const fullProfile: DoctorFullProfile = {
        id: parseInt(mockDoctor.id),
        slug: mockDoctor.id,
        title: 'Dr.',
        nameEn: mockDoctor.name,
        nameBn: mockDoctor.name,
        gender: mockDoctor.gender || 'Male',
        profilePhoto: mockDoctor.image,
        primarySpecialty: mockDoctor.specialties[0],
        tagline: 'Committed to Your Health',
        bioEn: mockDoctor.bio,
        bioBn: mockDoctor.bio,
        experienceYears: mockDoctor.experience,
        languages: ['Bangla', 'English'],
        bmdcNumber: 'A-' + Math.floor(10000 + Math.random() * 90000),
        bmdcVerified: true,
        consultationFeeNew: mockDoctor.chambers[0]?.fee || 1000,
        consultationFeeFollowUp: Math.round((mockDoctor.chambers[0]?.fee || 1000) * 0.5),
        consultationFeeReport: Math.round((mockDoctor.chambers[0]?.fee || 1000) * 0.3),
        onlineConsultationFee: Math.round((mockDoctor.chambers[0]?.fee || 1000) * 0.8),
        isAvailableForOnline: true,
        acceptNewPatients: true,
        averageRating: mockDoctor.rating,
        totalReviews: Math.floor(50 + Math.random() * 200),
        totalPatients: mockDoctor.patientCount,
        qualifications: [
          { id: 1, degree: 'MBBS', institution: 'Dhaka Medical College', yearOfCompletion: 2000, isVerified: true },
          { id: 2, degree: 'FCPS', field: mockDoctor.specialties[0], institution: 'BCPS', yearOfCompletion: 2008, isVerified: true },
          { id: 3, degree: 'MD', field: mockDoctor.specialties[0], institution: 'BSMMU', yearOfCompletion: 2012, isVerified: true },
        ],
        specializations: mockDoctor.specialties.map((s, i) => ({ name: s, isPrimary: i === 0 })),
        experiences: [
          { id: 1, position: 'Senior Consultant', department: mockDoctor.specialties[0], institution: mockDoctor.chambers[0]?.name || 'Hospital', institutionType: 'Private', startDate: '2015-01-01', isCurrent: true, city: 'Dhaka' },
          { id: 2, position: 'Associate Consultant', department: mockDoctor.specialties[0], institution: 'Dhaka Medical College', institutionType: 'Government', startDate: '2010-01-01', endDate: '2014-12-31', city: 'Dhaka' },
        ],
        chambers: mockDoctor.chambers.map((c, i) => ({
          id: i + 1,
          name: c.name,
          type: 'HOSPITAL',
          address: c.address,
          area: c.area || 'Dhaka',
          city: 'Dhaka',
          daysOfWeek: 'Sat,Mon,Wed',
          startTime: c.startTime,
          endTime: c.endTime,
          slotDuration: c.slotDuration,
          consultationFee: c.fee,
          followUpFee: Math.round(c.fee * 0.5),
          reportCheckFee: Math.round(c.fee * 0.3),
          isPrimary: i === 0,
          hasParking: true,
          hasWheelchairAccess: i === 0,
          hasAC: true,
        })),
        achievements: [
          { id: 1, title: 'Best Doctor Award', type: 'AWARD', organization: 'Bangladesh Medical Association', year: 2022 },
          { id: 2, title: 'Excellence in Patient Care', type: 'RECOGNITION', organization: 'Hospital Authority', year: 2020 },
        ],
        memberships: [
          { id: 1, organization: 'Bangladesh Medical Association (BMA)', membershipType: 'Life Member', joinedYear: 2005 },
          { id: 2, organization: `${mockDoctor.specialties[0]} Society of Bangladesh`, membershipType: 'Member', joinedYear: 2010 },
        ],
        services: [
          { id: 1, name: 'General Consultation', fee: mockDoctor.chambers[0]?.fee, duration: 15 },
          { id: 2, name: 'Follow-up Visit', fee: Math.round((mockDoctor.chambers[0]?.fee || 1000) * 0.5), duration: 10 },
          { id: 3, name: 'Report Analysis', fee: Math.round((mockDoctor.chambers[0]?.fee || 1000) * 0.3), duration: 10 },
        ],
        reviews: [
          { id: 1, rating: 5, comment: 'Excellent doctor. Very thorough and patient.', patientName: 'R***', createdAt: '2024-01-15' },
          { id: 2, rating: 5, comment: 'Highly recommended. Explains everything clearly.', patientName: 'S***', createdAt: '2024-01-10' },
          { id: 3, rating: 4, comment: 'Good experience overall.', patientName: 'M***', createdAt: '2024-01-05' },
        ],
      };
      
      setDoctor(fullProfile);
    }
    
    setLoading(false);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <i className="fas fa-circle-notch fa-spin text-4xl text-teal-600 mb-4"></i>
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="text-center">
          <i className="fas fa-user-slash text-6xl text-slate-300 mb-4"></i>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{t.doctorNotFound}</h2>
          <p className="text-slate-500 mb-6">{t.notFoundDesc}</p>
          <button 
            onClick={() => navigate(-1)}
            className="bg-teal-600 text-white px-6 py-2 rounded-lg font-bold shadow-sm hover:bg-teal-700 transition"
          >
            {t.goBack}
          </button>
        </div>
      </div>
    );
  }

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(<i key={i} className="fas fa-star text-yellow-400"></i>);
      } else if (i - 0.5 <= rating) {
        stars.push(<i key={i} className="fas fa-star-half-alt text-yellow-400"></i>);
      } else {
        stars.push(<i key={i} className="far fa-star text-yellow-400"></i>);
      }
    }
    return stars;
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Hero Section with Cover */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-48 md:h-64 bg-gradient-to-r from-teal-600 via-teal-700 to-slate-800 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
          </div>
          
          {/* Back Button */}
          <div className="absolute top-4 left-4 z-10">
            <button 
              onClick={() => navigate(-1)} 
              className="text-white/80 hover:text-white flex items-center gap-2 font-bold bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm transition hover:bg-black/30"
            >
              <i className="fas fa-arrow-left"></i> {t.back}
            </button>
          </div>
          
          {isDoctorView && (
            <div className="absolute top-4 right-4 z-10">
              <button 
                onClick={() => navigate('/doctor-dashboard')} 
                className="bg-white text-teal-700 px-4 py-2 rounded-full font-bold shadow-lg text-sm flex items-center gap-2 hover:bg-teal-50 transition"
              >
                <i className="fas fa-tachometer-alt"></i> {t.returnToDashboard}
              </button>
            </div>
          )}
        </div>

        {/* Profile Card */}
        <div className="container mx-auto px-4 max-w-6xl -mt-24 relative z-10">
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-slate-100">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              {/* Profile Photo */}
              <div className="flex flex-col items-center lg:items-start">
                <div className="relative">
                  <img 
                    src={doctor.profilePhoto || 'https://via.placeholder.com/160'} 
                    alt={doctor.nameEn} 
                    className="w-36 h-36 md:w-44 md:h-44 rounded-2xl object-cover border-4 border-white shadow-xl bg-slate-100"
                  />
                  {doctor.bmdcVerified && (
                    <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-full shadow-lg">
                      <i className="fas fa-check text-sm"></i>
                    </div>
                  )}
                </div>
                
                {/* Quick Stats */}
                <div className="flex gap-4 mt-4 text-center">
                  <div className="bg-slate-50 px-4 py-2 rounded-xl">
                    <p className="text-2xl font-bold text-slate-800">{doctor.experienceYears}</p>
                    <p className="text-xs text-slate-500">{t.years}</p>
                  </div>
                  <div className="bg-slate-50 px-4 py-2 rounded-xl">
                    <p className="text-2xl font-bold text-slate-800">{doctor.totalPatients.toLocaleString()}+</p>
                    <p className="text-xs text-slate-500">{t.patients}</p>
                  </div>
                  <div className="bg-slate-50 px-4 py-2 rounded-xl">
                    <p className="text-2xl font-bold text-slate-800">{doctor.totalReviews}</p>
                    <p className="text-xs text-slate-500">{t.reviews}</p>
                  </div>
                </div>
              </div>
              
              {/* Profile Info */}
              <div className="flex-1 text-center lg:text-left">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                  <div>
                    {/* Name & Title */}
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-1">
                      {doctor.title} {isBn && doctor.nameBn ? doctor.nameBn : doctor.nameEn}
                    </h1>
                    
                    {/* Degrees */}
                    <p className="text-slate-600 font-medium mb-3">
                      {doctor.qualifications.map(q => q.degree).join(', ')}
                    </p>
                    
                    {/* Specialties */}
                    <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-4">
                      {doctor.specializations.map((s, i) => (
                        <span 
                          key={i} 
                          className={`px-3 py-1 rounded-full text-sm font-bold border ${
                            s.isPrimary 
                              ? 'bg-teal-50 text-teal-700 border-teal-200' 
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {s.name}
                        </span>
                      ))}
                    </div>
                    
                    {/* Tagline */}
                    {doctor.tagline && (
                      <p className="text-slate-500 italic mb-4">"{doctor.tagline}"</p>
                    )}
                    
                    {/* Badges */}
                    <div className="flex flex-wrap justify-center lg:justify-start gap-2">
                      {doctor.bmdcVerified && (
                        <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-sm font-bold border border-green-200">
                          <i className="fas fa-check-circle"></i> {t.bmdcVerified}
                        </span>
                      )}
                      {doctor.acceptNewPatients && (
                        <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-bold border border-blue-200">
                          <i className="fas fa-user-plus"></i> {t.acceptingPatients}
                        </span>
                      )}
                      {doctor.isAvailableForOnline && (
                        <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full text-sm font-bold border border-purple-200">
                          <i className="fas fa-video"></i> {t.onlineAvailable}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Rating Card */}
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 rounded-2xl border border-yellow-200 text-center min-w-[140px]">
                    <div className="text-3xl font-bold text-yellow-700 mb-1">{doctor.averageRating.toFixed(1)}</div>
                    <div className="flex justify-center gap-0.5 mb-1">
                      {renderStars(doctor.averageRating)}
                    </div>
                    <p className="text-xs text-yellow-600">{doctor.totalReviews} {t.reviews}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="container mx-auto px-4 max-w-6xl mt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-1 flex gap-1 overflow-x-auto">
          {(['overview', 'experience', 'chambers', 'reviews'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[100px] py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                activeTab === tab 
                  ? 'bg-teal-600 text-white shadow-lg' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab === 'overview' && <><i className="fas fa-user mr-2"></i>{t.overview}</>}
              {tab === 'experience' && <><i className="fas fa-briefcase mr-2"></i>{t.experience}</>}
              {tab === 'chambers' && <><i className="fas fa-hospital mr-2"></i>{t.chambers}</>}
              {tab === 'reviews' && <><i className="fas fa-star mr-2"></i>{t.reviews}</>}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-4 max-w-6xl mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                {/* About */}
                {doctor.bioEn && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <i className="fas fa-info-circle text-teal-600"></i> {t.about}
                    </h2>
                    <p className="text-slate-600 leading-relaxed">
                      {isBn && doctor.bioBn ? doctor.bioBn : doctor.bioEn}
                    </p>
                  </div>
                )}

                {/* Qualifications */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <i className="fas fa-graduation-cap text-teal-600"></i> {t.qualifications}
                  </h2>
                  <div className="space-y-4">
                    {doctor.qualifications.map((qual) => (
                      <div key={qual.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center text-teal-600 flex-shrink-0">
                          <i className="fas fa-award text-xl"></i>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-800">{qual.degree}</h3>
                            {qual.field && <span className="text-slate-500">({qual.field})</span>}
                            {qual.isVerified && (
                              <i className="fas fa-check-circle text-green-500 text-sm"></i>
                            )}
                          </div>
                          <p className="text-slate-600 text-sm">{qual.institution}</p>
                          {qual.yearOfCompletion && (
                            <p className="text-slate-400 text-sm">{qual.yearOfCompletion}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Achievements */}
                {doctor.achievements.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <i className="fas fa-trophy text-teal-600"></i> {t.achievements}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {doctor.achievements.map((achievement) => (
                        <div key={achievement.id} className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border border-yellow-100">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center text-yellow-600">
                              <i className="fas fa-medal"></i>
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-800">{achievement.title}</h3>
                              <p className="text-sm text-slate-600">{achievement.organization}</p>
                              {achievement.year && <p className="text-xs text-slate-400">{achievement.year}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Memberships */}
                {doctor.memberships.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <i className="fas fa-id-card text-teal-600"></i> {t.memberships}
                    </h2>
                    <div className="flex flex-wrap gap-3">
                      {doctor.memberships.map((membership) => (
                        <div key={membership.id} className="inline-flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                          <i className="fas fa-certificate text-teal-600"></i>
                          <span className="font-medium text-slate-700">{membership.organization}</span>
                          {membership.membershipType && (
                            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{membership.membershipType}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Experience Tab */}
            {activeTab === 'experience' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <i className="fas fa-briefcase text-teal-600"></i> {t.workExperience}
                </h2>
                <div className="relative pl-8 border-l-2 border-teal-200 space-y-8">
                  {doctor.experiences.map((exp, idx) => (
                    <div key={exp.id} className="relative">
                      <div className="absolute -left-[41px] top-0 h-4 w-4 rounded-full border-4 border-white bg-teal-500 shadow"></div>
                      <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-bold text-slate-800">{exp.position}</h3>
                          {exp.isCurrent && (
                            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{t.present}</span>
                          )}
                        </div>
                        <p className="text-teal-700 font-medium">{exp.institution}</p>
                        {exp.department && <p className="text-slate-500 text-sm">{exp.department}</p>}
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                          <span><i className="fas fa-calendar mr-1"></i> {new Date(exp.startDate).getFullYear()} - {exp.isCurrent ? t.present : exp.endDate ? new Date(exp.endDate).getFullYear() : ''}</span>
                          {exp.city && <span><i className="fas fa-map-marker-alt mr-1"></i> {exp.city}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chambers Tab */}
            {activeTab === 'chambers' && (
              <div className="space-y-4">
                {doctor.chambers.map((chamber) => (
                  <div key={chamber.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:border-teal-300 transition group">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-lg text-slate-800 group-hover:text-teal-600 transition">{chamber.name}</h3>
                          {chamber.isPrimary && (
                            <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full">Primary</span>
                          )}
                        </div>
                        <p className="text-slate-500 text-sm mb-3">
                          <i className="fas fa-map-marker-alt mr-2 text-teal-500"></i>
                          {chamber.address}, {chamber.area}, {chamber.city}
                        </p>
                        
                        {/* Schedule */}
                        <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-4">
                          <span className="flex items-center gap-1.5">
                            <i className="far fa-calendar-alt text-slate-400"></i>
                            {chamber.daysOfWeek.split(',').join(', ')}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <i className="far fa-clock text-slate-400"></i>
                            {chamber.startTime} - {chamber.endTime}
                          </span>
                        </div>
                        
                        {/* Facilities */}
                        <div className="flex flex-wrap gap-2">
                          {chamber.hasParking && (
                            <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                              <i className="fas fa-parking"></i> {t.parking}
                            </span>
                          )}
                          {chamber.hasWheelchairAccess && (
                            <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                              <i className="fas fa-wheelchair"></i> {t.wheelchair}
                            </span>
                          )}
                          {chamber.hasAC && (
                            <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                              <i className="fas fa-snowflake"></i> {t.ac}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Fees & Book Button */}
                      <div className="md:text-right space-y-3">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div className="text-2xl font-bold text-teal-600">৳{chamber.consultationFee}</div>
                          <p className="text-xs text-slate-400">{t.consultationFee}</p>
                          {chamber.followUpFee && (
                            <p className="text-sm text-slate-500 mt-1">{t.followUpFee}: ৳{chamber.followUpFee}</p>
                          )}
                        </div>
                        <button 
                          onClick={() => setSelectedChamber({
                            id: chamber.id.toString(),
                            name: chamber.name,
                            address: chamber.address,
                            area: chamber.area,
                            startTime: chamber.startTime,
                            endTime: chamber.endTime,
                            slotDuration: chamber.slotDuration,
                            fee: chamber.consultationFee,
                          })}
                          className="w-full bg-teal-600 text-white py-3 px-6 rounded-xl font-bold hover:bg-teal-700 transition shadow-lg shadow-teal-500/20"
                        >
                          <i className="fas fa-calendar-plus mr-2"></i>
                          {t.bookAppointment}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <i className="fas fa-comments text-teal-600"></i> {t.patientReviews}
                </h2>
                
                {doctor.reviews.length > 0 ? (
                  <div className="space-y-4">
                    {doctor.reviews.map((review) => (
                      <div key={review.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold">
                              {review.patientName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{review.patientName}</p>
                              <p className="text-xs text-slate-400">{new Date(review.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex gap-0.5">
                            {renderStars(review.rating)}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-slate-600 text-sm mt-2">{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <i className="fas fa-comment-slash text-4xl mb-3"></i>
                    <p>{t.noReviews}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Book Card */}
            <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl shadow-xl p-6 text-white sticky top-24">
              <h3 className="font-bold text-lg mb-4">{t.bookAppointment}</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center p-3 bg-white/10 rounded-xl">
                  <span className="text-teal-100">{t.consultationFee}</span>
                  <span className="font-bold text-xl">৳{doctor.consultationFeeNew}</span>
                </div>
                {doctor.consultationFeeFollowUp && (
                  <div className="flex justify-between items-center p-3 bg-white/10 rounded-xl">
                    <span className="text-teal-100">{t.followUpFee}</span>
                    <span className="font-bold">৳{doctor.consultationFeeFollowUp}</span>
                  </div>
                )}
                {doctor.consultationFeeReport && (
                  <div className="flex justify-between items-center p-3 bg-white/10 rounded-xl">
                    <span className="text-teal-100">{t.reportCheckFee}</span>
                    <span className="font-bold">৳{doctor.consultationFeeReport}</span>
                  </div>
                )}
                {doctor.isAvailableForOnline && doctor.onlineConsultationFee && (
                  <div className="flex justify-between items-center p-3 bg-purple-500/30 rounded-xl">
                    <span className="text-purple-100"><i className="fas fa-video mr-2"></i>{t.onlineFee}</span>
                    <span className="font-bold">৳{doctor.onlineConsultationFee}</span>
                  </div>
                )}
              </div>

              {doctor.chambers.length > 0 && (
                <button 
                  onClick={() => setSelectedChamber({
                    id: doctor.chambers[0].id.toString(),
                    name: doctor.chambers[0].name,
                    address: doctor.chambers[0].address,
                    area: doctor.chambers[0].area,
                    startTime: doctor.chambers[0].startTime,
                    endTime: doctor.chambers[0].endTime,
                    slotDuration: doctor.chambers[0].slotDuration,
                    fee: doctor.chambers[0].consultationFee,
                  })}
                  className="w-full bg-white text-teal-700 py-4 rounded-xl font-bold hover:bg-teal-50 transition shadow-lg"
                >
                  <i className="fas fa-calendar-check mr-2"></i>
                  {t.bookAppointment}
                </button>
              )}
            </div>

            {/* BMDC Info */}
            {doctor.bmdcVerified && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 text-green-600 mb-3">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <i className="fas fa-shield-alt text-xl"></i>
                  </div>
                  <div>
                    <p className="font-bold">{t.bmdcVerified}</p>
                    <p className="text-sm text-slate-500">{t.bmdcNumber}: {doctor.bmdcNumber}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Languages */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <i className="fas fa-language text-teal-600"></i> {t.languages}
              </h3>
              <div className="flex flex-wrap gap-2">
                {doctor.languages.map((lang, i) => (
                  <span key={i} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-medium">
                    {lang}
                  </span>
                ))}
              </div>
            </div>

            {/* Services */}
            {doctor.services.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <i className="fas fa-stethoscope text-teal-600"></i> {t.services}
                </h3>
                <div className="space-y-2">
                  {doctor.services.map((service) => (
                    <div key={service.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-700">{service.name}</span>
                      {service.fee && <span className="font-bold text-teal-600">৳{service.fee}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {selectedChamber && (
        <BookingModal 
          doctor={{
            id: doctor.id.toString(),
            name: doctor.nameEn,
            specialties: doctor.specializations.map(s => s.name),
            degrees: doctor.qualifications.map(q => q.degree).join(', '),
            chambers: [selectedChamber],
            image: doctor.profilePhoto || '',
            experience: doctor.experienceYears,
            rating: doctor.averageRating,
            patientCount: doctor.totalPatients,
            bio: doctor.bioEn || '',
          }} 
          chamber={selectedChamber} 
          onClose={() => setSelectedChamber(null)} 
        />
      )}
    </div>
  );
};
