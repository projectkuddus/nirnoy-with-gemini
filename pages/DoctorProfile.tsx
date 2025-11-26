import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MOCK_DOCTORS } from '../data/mockData';
import { BookingModal } from '../components/BookingModal';
import { Chamber } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

// ==================== TYPES ====================

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
  description?: string;
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
  hasWifi?: boolean;
  phone?: string;
  mapUrl?: string;
}

interface DoctorAchievement {
  id: number;
  title: string;
  type: string;
  organization?: string;
  year?: number;
  description?: string;
}

interface DoctorMembership {
  id: number;
  organization: string;
  membershipType?: string;
  position?: string;
  joinedYear?: number;
  isActive?: boolean;
}

interface DoctorService {
  id: number;
  name: string;
  nameBn?: string;
  description?: string;
  fee?: number;
  duration?: number;
  isAvailable?: boolean;
}

interface DoctorReview {
  id: number;
  rating: number;
  title?: string;
  comment?: string;
  patientName: string;
  patientInitials?: string;
  visitType?: string;
  ratingPunctuality?: number;
  ratingBehavior?: number;
  ratingExplanation?: number;
  ratingEffectiveness?: number;
  isVerified?: boolean;
  createdAt: string;
  reply?: string;
  replyAt?: string;
}

interface DoctorPublication {
  id: number;
  title: string;
  journal?: string;
  year?: number;
  url?: string;
}

interface DoctorTraining {
  id: number;
  title: string;
  institution: string;
  year?: number;
  duration?: string;
}

interface DoctorFAQ {
  id: number;
  question: string;
  answer: string;
}

interface DoctorSpecialization {
  id: number;
  name: string;
  isPrimary?: boolean;
  yearsOfPractice?: number;
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
  bmdcVerified?: boolean;
  nidVerified?: boolean;
  consultationFeeNew: number;
  consultationFeeFollowUp?: number;
  consultationFeeReport?: number;
  onlineConsultationFee?: number;
  avgConsultationTime?: number;
  isAvailableForOnline?: boolean;
  isAvailableForHomeVisit?: boolean;
  homeVisitFee?: number;
  acceptNewPatients?: boolean;
  totalPatients?: number;
  totalAppointments?: number;
  totalReviews?: number;
  averageRating?: number;
  responseTime?: string;
  qualifications: DoctorQualification[];
  specializations: DoctorSpecialization[];
  experiences: DoctorExperience[];
  chambers: DoctorChamber[];
  achievements: DoctorAchievement[];
  memberships: DoctorMembership[];
  services: DoctorService[];
  reviews: DoctorReview[];
  publications?: DoctorPublication[];
  trainings?: DoctorTraining[];
  faqs?: DoctorFAQ[];
}

// ==================== MOCK DATA GENERATOR ====================

const generateMockProfile = (mockDoctor: any): DoctorFullProfile => {
  const experienceYears = mockDoctor.experience || Math.floor(Math.random() * 25) + 5;
  const isSenior = experienceYears > 20;
  const isMidLevel = experienceYears > 10;
  
  return {
    id: parseInt(mockDoctor.id, 16) || Math.floor(Math.random() * 1000),
    slug: mockDoctor.id,
    title: isSenior ? 'Prof.' : isMidLevel ? 'Assoc. Prof.' : 'Dr.',
    nameEn: mockDoctor.name,
    nameBn: mockDoctor.name,
    gender: mockDoctor.gender || 'Male',
    profilePhoto: mockDoctor.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(mockDoctor.name)}&background=0D9488&color=fff&size=400&bold=true`,
    coverPhoto: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1200&h=400&fit=crop',
    primarySpecialty: mockDoctor.specialties?.[0] || 'Medicine',
    tagline: 'Committed to Excellence in Patient Care',
    bioEn: `${mockDoctor.name} is a distinguished ${mockDoctor.specialties?.[0] || 'Medical'} specialist with ${experienceYears} years of clinical experience. Known for a patient-centered approach and commitment to evidence-based medicine, they have helped thousands of patients achieve better health outcomes. Their expertise spans diagnostic precision, treatment planning, and preventive care.`,
    experienceYears,
    languages: ['Bangla', 'English', ...(Math.random() > 0.7 ? ['Hindi'] : [])],
    bmdcNumber: `A-${10000 + Math.floor(Math.random() * 50000)}`,
    bmdcVerified: true,
    nidVerified: true,
    consultationFeeNew: mockDoctor.chambers?.[0]?.fee || 1500,
    consultationFeeFollowUp: Math.round((mockDoctor.chambers?.[0]?.fee || 1500) * 0.5),
    consultationFeeReport: Math.round((mockDoctor.chambers?.[0]?.fee || 1500) * 0.3),
    onlineConsultationFee: Math.round((mockDoctor.chambers?.[0]?.fee || 1500) * 0.8),
    avgConsultationTime: 15,
    isAvailableForOnline: Math.random() > 0.3,
    isAvailableForHomeVisit: Math.random() > 0.8,
    homeVisitFee: 5000,
    acceptNewPatients: true,
    totalPatients: Math.floor(Math.random() * 15000) + 1000,
    totalAppointments: Math.floor(Math.random() * 30000) + 5000,
    totalReviews: Math.floor(Math.random() * 400) + 50,
    averageRating: 4.2 + Math.random() * 0.7,
    responseTime: '< 1 hour',
    qualifications: [
      { id: 1, degree: 'MBBS', institution: 'Dhaka Medical College', institutionCity: 'Dhaka', institutionCountry: 'Bangladesh', yearOfCompletion: 2024 - experienceYears - 1, isVerified: true },
      { id: 2, degree: 'FCPS', field: mockDoctor.specialties?.[0], institution: 'BCPS', institutionCity: 'Dhaka', institutionCountry: 'Bangladesh', yearOfCompletion: 2024 - experienceYears + 5, isVerified: true },
      ...(isSenior ? [{ id: 3, degree: 'FRCP', institution: 'Royal College of Physicians', institutionCity: 'London', institutionCountry: 'UK', yearOfCompletion: 2024 - experienceYears + 10, isVerified: true }] : []),
    ],
    specializations: [
      { id: 1, name: mockDoctor.specialties?.[0] || 'Medicine', isPrimary: true, yearsOfPractice: experienceYears },
      ...(mockDoctor.specialties?.slice(1).map((s: string, i: number) => ({ id: i + 2, name: s, isPrimary: false, yearsOfPractice: Math.floor(experienceYears * 0.7) })) || []),
    ],
    experiences: [
      { id: 1, position: isSenior ? 'Professor & Head' : isMidLevel ? 'Associate Professor' : 'Senior Consultant', department: mockDoctor.specialties?.[0], institution: 'Bangabandhu Sheikh Mujib Medical University', institutionType: 'Government', city: 'Dhaka', country: 'Bangladesh', startDate: '2018-01-01', isCurrent: true },
      { id: 2, position: 'Consultant', department: mockDoctor.specialties?.[0], institution: mockDoctor.chambers?.[0]?.name || 'Square Hospital', institutionType: 'Private', city: 'Dhaka', country: 'Bangladesh', startDate: '2012-01-01', endDate: '2017-12-31', isCurrent: false },
    ],
    chambers: mockDoctor.chambers?.map((c: any, i: number) => ({
      id: i + 1,
      name: c.name,
      type: 'HOSPITAL',
      address: c.address,
      area: c.area || 'Dhaka',
      city: 'Dhaka',
      daysOfWeek: 'Sat,Mon,Wed',
      startTime: '10:00',
      endTime: '14:00',
      slotDuration: 15,
      consultationFee: c.fee,
      followUpFee: Math.round(c.fee * 0.5),
      reportCheckFee: Math.round(c.fee * 0.3),
      isPrimary: i === 0,
      hasParking: true,
      hasWheelchairAccess: true,
      hasAC: true,
    })) || [],
    achievements: [
      { id: 1, title: 'Best Doctor Award', type: 'AWARD', organization: 'Bangladesh Medical Association', year: 2022 },
      ...(isSenior ? [{ id: 2, title: 'Lifetime Achievement Award', type: 'AWARD', organization: 'Ministry of Health', year: 2020 }] : []),
    ],
    memberships: [
      { id: 1, organization: 'Bangladesh Medical Association (BMA)', membershipType: 'Life Member', isActive: true },
      { id: 2, organization: 'Bangladesh Medical & Dental Council (BMDC)', membershipType: 'Registered', isActive: true },
      { id: 3, organization: 'Bangladesh College of Physicians and Surgeons', membershipType: 'Fellow', isActive: true },
    ],
    services: [
      { id: 1, name: 'General Consultation', fee: mockDoctor.chambers?.[0]?.fee || 1500, duration: 15, isAvailable: true },
      { id: 2, name: 'Follow-up Visit', fee: Math.round((mockDoctor.chambers?.[0]?.fee || 1500) * 0.5), duration: 10, isAvailable: true },
      { id: 3, name: 'Online Consultation', fee: Math.round((mockDoctor.chambers?.[0]?.fee || 1500) * 0.8), duration: 15, isAvailable: true },
      { id: 4, name: 'Report Analysis', fee: Math.round((mockDoctor.chambers?.[0]?.fee || 1500) * 0.3), duration: 10, isAvailable: true },
      { id: 5, name: 'Second Opinion', fee: Math.round((mockDoctor.chambers?.[0]?.fee || 1500) * 1.5), duration: 30, isAvailable: true },
    ],
    reviews: Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      rating: 4 + Math.floor(Math.random() * 2),
      title: ['Excellent Doctor!', 'Highly Recommended', 'Very Professional', 'Great Experience'][i % 4],
      comment: [
        'Very thorough examination and clear explanation of my condition. Highly recommend!',
        'The doctor took time to listen to all my concerns. Best experience ever.',
        'Professional, knowledgeable, and caring. Will definitely visit again.',
        'Quick diagnosis and effective treatment. Feeling much better now.',
        'Great bedside manner. Made me feel comfortable throughout.',
        'Explains everything in detail. Very patient with questions.',
        'Top-notch medical care. Worth every penny.',
        'The best specialist I have ever visited. Truly exceptional.',
      ][i],
      patientName: ['Rahim A.', 'Fatima B.', 'Karim H.', 'Salma K.', 'Jamal M.', 'Nusrat P.', 'Tariq S.', 'Ayesha R.'][i],
      patientInitials: ['RA', 'FB', 'KH', 'SK', 'JM', 'NP', 'TS', 'AR'][i],
      visitType: ['New Consultation', 'Follow-up', 'New Consultation', 'Report Check'][i % 4],
      ratingPunctuality: 4 + Math.floor(Math.random() * 2),
      ratingBehavior: 5,
      ratingExplanation: 4 + Math.floor(Math.random() * 2),
      ratingEffectiveness: 4 + Math.floor(Math.random() * 2),
      isVerified: Math.random() > 0.3,
      createdAt: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
    })),
    faqs: [
      { id: 1, question: 'What conditions do you treat?', answer: `I specialize in ${mockDoctor.specialties?.[0] || 'general medicine'} and treat a wide range of conditions including preventive care, chronic disease management, and acute conditions.` },
      { id: 2, question: 'Do you offer online consultations?', answer: 'Yes, I offer video consultations for follow-up visits and initial assessments where physical examination is not critical.' },
      { id: 3, question: 'What should I bring to my first appointment?', answer: 'Please bring all previous medical records, test reports, current medications list, and your health insurance card if applicable.' },
    ],
  };
};

// ==================== COMPONENTS ====================

// Star Rating Component
const StarRating: React.FC<{ rating: number; size?: 'sm' | 'md' | 'lg'; showNumber?: boolean }> = ({ 
  rating, 
  size = 'md',
  showNumber = false 
}) => {
  const sizeClasses = { sm: 'text-xs', md: 'text-sm', lg: 'text-lg' };
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  
  return (
    <div className="flex items-center gap-1">
      <div className={`flex ${sizeClasses[size]}`}>
        {[...Array(5)].map((_, i) => (
          <i 
            key={i} 
            className={`fas ${i < fullStars ? 'fa-star text-amber-400' : i === fullStars && hasHalf ? 'fa-star-half-alt text-amber-400' : 'fa-star text-slate-200'}`}
          />
        ))}
      </div>
      {showNumber && <span className="font-bold text-slate-800">{rating.toFixed(1)}</span>}
    </div>
  );
};

// Verified Badge
const VerifiedBadge: React.FC<{ text: string; icon?: string }> = ({ text, icon = 'fa-check-circle' }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
    <i className={`fas ${icon}`}></i>
    {text}
  </span>
);

// Stat Card
const StatCard: React.FC<{ icon: string; value: string | number; label: string; color?: string }> = ({ 
  icon, value, label, color = 'teal' 
}) => (
  <div className="text-center">
    <div className={`w-12 h-12 mx-auto mb-2 rounded-xl bg-${color}-50 flex items-center justify-center`}>
      <i className={`fas ${icon} text-${color}-600 text-lg`}></i>
    </div>
    <p className="text-2xl font-bold text-slate-800">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
  </div>
);

// Rating Bar
const RatingBar: React.FC<{ label: string; value: number; max?: number }> = ({ label, value, max = 5 }) => (
  <div className="flex items-center gap-3">
    <span className="text-sm text-slate-600 w-28">{label}</span>
    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
      <div 
        className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
        style={{ width: `${(value / max) * 100}%` }}
      />
    </div>
    <span className="text-sm font-bold text-slate-700 w-8">{value.toFixed(1)}</span>
  </div>
);

// ==================== MAIN COMPONENT ====================

export const DoctorProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';
  
  const [profile, setProfile] = useState<DoctorFullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'experience' | 'chambers' | 'reviews'>('overview');
  const [showBooking, setShowBooking] = useState(false);
  const [selectedChamber, setSelectedChamber] = useState<DoctorChamber | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load profile
  useEffect(() => {
    const mockDoctor = MOCK_DOCTORS.find(d => d.id === id);
    if (mockDoctor) {
      const fullProfile = generateMockProfile(mockDoctor);
      setProfile(fullProfile);
    }
    setLoading(false);
  }, [id]);

  // Calculate rating distribution
  const ratingDistribution = useMemo(() => {
    if (!profile?.reviews) return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    profile.reviews.forEach(r => {
      dist[Math.floor(r.rating)] = (dist[Math.floor(r.rating)] || 0) + 1;
    });
    return dist;
  }, [profile?.reviews]);

  // Translations
  const t = {
    back: isBn ? 'পিছনে' : 'Back',
    verified: isBn ? 'যাচাইকৃত' : 'Verified',
    bmdcVerified: isBn ? 'BMDC যাচাইকৃত' : 'BMDC Verified',
    acceptingPatients: isBn ? 'নতুন রোগী গ্রহণ করছেন' : 'Accepting New Patients',
    onlineAvailable: isBn ? 'অনলাইন পরামর্শ সক্রিয়' : 'Online Consultation',
    yearsExp: isBn ? 'বছরের অভিজ্ঞতা' : 'Years Experience',
    patients: isBn ? 'রোগী' : 'Patients',
    reviews: isBn ? 'রিভিউ' : 'Reviews',
    overview: isBn ? 'সংক্ষিপ্ত' : 'Overview',
    experience: isBn ? 'অভিজ্ঞতা' : 'Experience',
    chambers: isBn ? 'চেম্বার' : 'Chambers',
    reviewsTab: isBn ? 'রিভিউ' : 'Reviews',
    about: isBn ? 'সম্পর্কে' : 'About',
    qualifications: isBn ? 'শিক্ষাগত যোগ্যতা' : 'Qualifications',
    specializations: isBn ? 'বিশেষত্ব' : 'Specializations',
    memberships: isBn ? 'সদস্যপদ' : 'Professional Memberships',
    achievements: isBn ? 'পুরস্কার' : 'Awards & Achievements',
    services: isBn ? 'সেবাসমূহ' : 'Services',
    faq: isBn ? 'সাধারণ প্রশ্ন' : 'FAQ',
    bookNow: isBn ? 'অ্যাপয়েন্টমেন্ট বুক করুন' : 'Book Appointment',
    consultationFee: isBn ? 'পরামর্শ ফি' : 'Consultation Fee',
    followUpFee: isBn ? 'ফলো-আপ ফি' : 'Follow-up Fee',
    onlineFee: isBn ? 'অনলাইন ফি' : 'Online Fee',
    languages: isBn ? 'ভাষা' : 'Languages',
    avgTime: isBn ? 'গড় সময়' : 'Avg. Time',
    minutes: isBn ? 'মিনিট' : 'min',
    present: isBn ? 'বর্তমান' : 'Present',
    viewAll: isBn ? 'সব দেখুন' : 'View All',
    showLess: isBn ? 'কম দেখুন' : 'Show Less',
    verifiedVisit: isBn ? 'যাচাইকৃত ভিজিট' : 'Verified Visit',
    helpful: isBn ? 'সহায়ক' : 'Helpful',
    schedule: isBn ? 'সময়সূচী' : 'Schedule',
    facilities: isBn ? 'সুবিধা' : 'Facilities',
    parking: isBn ? 'পার্কিং' : 'Parking',
    wheelchair: isBn ? 'হুইলচেয়ার' : 'Wheelchair',
    ac: isBn ? 'এসি' : 'A/C',
    notFound: isBn ? 'ডাক্তার পাওয়া যায়নি' : 'Doctor Not Found',
    notFoundDesc: isBn ? 'এই প্রোফাইলটি বিদ্যমান নেই।' : 'This profile does not exist.',
    goBack: isBn ? 'ফিরে যান' : 'Go Back',
    responseTime: isBn ? 'রেসপন্স টাইম' : 'Response Time',
    patientSays: isBn ? 'রোগীরা যা বলেন' : 'What Patients Say',
    ratingBreakdown: isBn ? 'রেটিং বিশ্লেষণ' : 'Rating Breakdown',
    punctuality: isBn ? 'সময়ানুবর্তিতা' : 'Punctuality',
    behavior: isBn ? 'আচরণ' : 'Behavior',
    explanation: isBn ? 'ব্যাখ্যা' : 'Explanation',
    effectiveness: isBn ? 'কার্যকারিতা' : 'Effectiveness',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">{isBn ? 'লোড হচ্ছে...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-user-md text-4xl text-slate-300"></i>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">{t.notFound}</h1>
          <p className="text-slate-500 mb-6">{t.notFoundDesc}</p>
          <button
            onClick={() => navigate('/search')}
            className="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700 transition"
          >
            <i className="fas fa-arrow-left mr-2"></i>{t.goBack}
          </button>
        </div>
      </div>
    );
  }

  const primaryChamber = profile.chambers.find(c => c.isPrimary) || profile.chambers[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      
      {/* ==================== HERO SECTION ==================== */}
      <div className="relative">
        {/* Cover Photo */}
        <div className="h-48 md:h-64 lg:h-80 bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYtMmgtMnYtMmgydi0yaDJ2MmgydjJoLTJ2MmgydjRoLTJ2MmgtMnYtMnptMC0xMGgtMnYtMmgydjJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
          
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 md:top-6 md:left-6 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-xl font-medium hover:bg-white/30 transition flex items-center gap-2"
          >
            <i className="fas fa-arrow-left"></i>
            <span className="hidden md:inline">{t.back}</span>
          </button>

          {/* Share & Save Buttons */}
          <div className="absolute top-4 right-4 md:top-6 md:right-6 flex gap-2">
            <button className="w-10 h-10 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition">
              <i className="fas fa-share-alt"></i>
            </button>
            <button className="w-10 h-10 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition">
              <i className="far fa-heart"></i>
            </button>
          </div>
        </div>

        {/* Profile Card */}
        <div className="max-w-6xl mx-auto px-4 -mt-24 md:-mt-32 relative z-10">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-6">
                
                {/* Profile Photo */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <div className={`w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-slate-100 ${!imageLoaded ? 'animate-pulse' : ''}`}>
                      <img 
                        src={profile.profilePhoto} 
                        alt={profile.nameEn}
                        className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                        onLoad={() => setImageLoaded(true)}
                      />
                    </div>
                    {profile.bmdcVerified && (
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-white shadow">
                        <i className="fas fa-check text-white text-sm"></i>
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800">{profile.nameEn}</h1>
                    {profile.bmdcVerified && (
                      <span className="text-emerald-500" title={t.bmdcVerified}>
                        <i className="fas fa-badge-check text-xl"></i>
                      </span>
                    )}
                  </div>

                  <p className="text-lg text-teal-600 font-semibold mb-1">
                    {profile.qualifications.map(q => q.degree).join(', ')}
                  </p>
                  
                  <p className="text-slate-500 mb-4">
                    {profile.specializations.map(s => s.name).join(' • ')}
                  </p>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <VerifiedBadge text={t.bmdcVerified} />
                    {profile.acceptNewPatients && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
                        <i className="fas fa-user-plus"></i>
                        {t.acceptingPatients}
                      </span>
                    )}
                    {profile.isAvailableForOnline && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full border border-purple-200">
                        <i className="fas fa-video"></i>
                        {t.onlineAvailable}
                      </span>
                    )}
                  </div>

                  {/* Quick Stats */}
                  <div className="flex flex-wrap gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center">
                        <i className="fas fa-briefcase-medical text-teal-600"></i>
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{profile.experienceYears}+</p>
                        <p className="text-xs text-slate-500">{t.yearsExp}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <i className="fas fa-users text-blue-600"></i>
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{(profile.totalPatients || 0).toLocaleString()}</p>
                        <p className="text-xs text-slate-500">{t.patients}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                        <i className="fas fa-star text-amber-500"></i>
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{(profile.averageRating || 0).toFixed(1)}</p>
                        <p className="text-xs text-slate-500">({profile.totalReviews} {t.reviews})</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Booking Card - Desktop */}
                <div className="hidden lg:block w-72 flex-shrink-0">
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-5 border border-slate-200">
                    <div className="text-center mb-4">
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{t.consultationFee}</p>
                      <p className="text-3xl font-bold text-slate-800">৳{profile.consultationFeeNew}</p>
                    </div>
                    
                    <button
                      onClick={() => {
                        setSelectedChamber(primaryChamber as any);
                        setShowBooking(true);
                      }}
                      className="w-full bg-gradient-to-r from-teal-600 to-teal-500 text-white py-4 rounded-xl font-bold hover:shadow-lg hover:shadow-teal-500/30 transition-all transform hover:-translate-y-0.5 mb-3"
                    >
                      <i className="fas fa-calendar-check mr-2"></i>
                      {t.bookNow}
                    </button>

                    {profile.isAvailableForOnline && (
                      <button className="w-full bg-white text-teal-600 py-3 rounded-xl font-bold border-2 border-teal-200 hover:bg-teal-50 transition">
                        <i className="fas fa-video mr-2"></i>
                        {isBn ? 'অনলাইন পরামর্শ' : 'Video Consult'}
                      </button>
                    )}

                    <div className="mt-4 pt-4 border-t border-slate-200 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">{t.followUpFee}</span>
                        <span className="font-bold text-slate-700">৳{profile.consultationFeeFollowUp}</span>
                      </div>
                      {profile.onlineConsultationFee && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">{t.onlineFee}</span>
                          <span className="font-bold text-slate-700">৳{profile.onlineConsultationFee}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500">{t.avgTime}</span>
                        <span className="font-bold text-slate-700">{profile.avgConsultationTime} {t.minutes}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-t border-slate-100">
              <div className="flex overflow-x-auto scrollbar-hide">
                {(['overview', 'experience', 'chambers', 'reviews'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 min-w-[120px] px-6 py-4 text-sm font-bold transition-all relative ${
                      activeTab === tab 
                        ? 'text-teal-600' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab === 'overview' && <><i className="fas fa-user mr-2"></i>{t.overview}</>}
                    {tab === 'experience' && <><i className="fas fa-briefcase mr-2"></i>{t.experience}</>}
                    {tab === 'chambers' && <><i className="fas fa-hospital mr-2"></i>{t.chambers}</>}
                    {tab === 'reviews' && <><i className="fas fa-star mr-2"></i>{t.reviewsTab}</>}
                    
                    {activeTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-emerald-500"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== CONTENT SECTION ==================== */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            
            {/* ========== OVERVIEW TAB ========== */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                
                {/* About */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <i className="fas fa-user-md text-teal-600"></i>
                    {t.about}
                  </h2>
                  <p className="text-slate-600 leading-relaxed">{profile.bioEn}</p>
                  
                  {/* Languages */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-sm text-slate-500 mb-2">{t.languages}</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.languages.map((lang, i) => (
                        <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Qualifications */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <i className="fas fa-graduation-cap text-teal-600"></i>
                    {t.qualifications}
                  </h2>
                  <div className="space-y-4">
                    {profile.qualifications.map((qual, i) => (
                      <div key={qual.id} className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-800">
                              {qual.degree}
                              {qual.field && <span className="text-slate-500 font-normal"> ({qual.field})</span>}
                            </p>
                            {qual.isVerified && (
                              <i className="fas fa-check-circle text-emerald-500 text-sm"></i>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">
                            {qual.institution}
                            {qual.institutionCity && `, ${qual.institutionCity}`}
                            {qual.institutionCountry && qual.institutionCountry !== 'Bangladesh' && `, ${qual.institutionCountry}`}
                          </p>
                          {qual.yearOfCompletion && (
                            <p className="text-xs text-slate-400 mt-1">
                              <i className="far fa-calendar mr-1"></i>
                              {qual.yearOfCompletion}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Specializations */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <i className="fas fa-stethoscope text-teal-600"></i>
                    {t.specializations}
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {profile.specializations.map((spec) => (
                      <div 
                        key={spec.id} 
                        className={`px-4 py-2 rounded-xl border-2 ${
                          spec.isPrimary 
                            ? 'bg-teal-50 border-teal-200 text-teal-700' 
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <p className="font-semibold">{spec.name}</p>
                        {spec.yearsOfPractice && (
                          <p className="text-xs opacity-70">{spec.yearsOfPractice} {isBn ? 'বছর' : 'years'}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Services */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <i className="fas fa-hand-holding-medical text-teal-600"></i>
                    {t.services}
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {profile.services.filter(s => s.isAvailable).map((service) => (
                      <div key={service.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div>
                          <p className="font-semibold text-slate-800">{service.name}</p>
                          {service.duration && (
                            <p className="text-xs text-slate-500">{service.duration} {t.minutes}</p>
                          )}
                        </div>
                        {service.fee && (
                          <p className="font-bold text-teal-600">৳{service.fee}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Achievements & Memberships */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Achievements */}
                  {profile.achievements.length > 0 && (
                    <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <i className="fas fa-trophy text-amber-500"></i>
                        {t.achievements}
                      </h2>
                      <div className="space-y-3">
                        {profile.achievements.map((ach) => (
                          <div key={ach.id} className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <i className="fas fa-award text-amber-600 text-sm"></i>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{ach.title}</p>
                              <p className="text-sm text-slate-500">
                                {ach.organization}
                                {ach.year && ` • ${ach.year}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Memberships */}
                  <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <i className="fas fa-id-card text-blue-600"></i>
                      {t.memberships}
                    </h2>
                    <div className="space-y-3">
                      {profile.memberships.map((mem) => (
                        <div key={mem.id} className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <i className="fas fa-certificate text-blue-600 text-sm"></i>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{mem.organization}</p>
                            {mem.membershipType && (
                              <p className="text-sm text-slate-500">{mem.membershipType}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                {/* FAQ */}
                {profile.faqs && profile.faqs.length > 0 && (
                  <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <i className="fas fa-question-circle text-teal-600"></i>
                      {t.faq}
                    </h2>
                    <div className="space-y-4">
                      {profile.faqs.map((faq) => (
                        <div key={faq.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                          <p className="font-semibold text-slate-800 mb-2">
                            <i className="fas fa-q text-teal-600 mr-2"></i>
                            {faq.question}
                          </p>
                          <p className="text-slate-600 pl-6">{faq.answer}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* ========== EXPERIENCE TAB ========== */}
            {activeTab === 'experience' && (
              <div className="space-y-6">
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <i className="fas fa-briefcase text-teal-600"></i>
                    {isBn ? 'কর্ম অভিজ্ঞতা' : 'Work Experience'}
                  </h2>
                  
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-teal-500 to-emerald-500"></div>
                    
                    <div className="space-y-8">
                      {profile.experiences.map((exp, i) => (
                        <div key={exp.id} className="relative pl-14">
                          {/* Timeline dot */}
                          <div className={`absolute left-0 w-10 h-10 rounded-full flex items-center justify-center ${
                            exp.isCurrent 
                              ? 'bg-gradient-to-br from-teal-500 to-emerald-500 text-white' 
                              : 'bg-white border-2 border-slate-200 text-slate-400'
                          }`}>
                            <i className={`fas ${exp.isCurrent ? 'fa-check' : 'fa-briefcase'} text-sm`}></i>
                          </div>
                          
                          <div className={`p-5 rounded-xl ${exp.isCurrent ? 'bg-teal-50 border-2 border-teal-200' : 'bg-slate-50'}`}>
                            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                              <div>
                                <h3 className="font-bold text-slate-800">{exp.position}</h3>
                                {exp.department && (
                                  <p className="text-sm text-slate-500">{exp.department}</p>
                                )}
                              </div>
                              {exp.isCurrent && (
                                <span className="px-3 py-1 bg-teal-600 text-white text-xs font-bold rounded-full">
                                  {t.present}
                                </span>
                              )}
                            </div>
                            
                            <p className="text-slate-700 font-medium mb-1">
                              <i className="fas fa-hospital text-slate-400 mr-2"></i>
                              {exp.institution}
                            </p>
                            
                            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                              {exp.city && (
                                <span>
                                  <i className="fas fa-map-marker-alt mr-1"></i>
                                  {exp.city}, {exp.country || 'Bangladesh'}
                                </span>
                              )}
                              <span>
                                <i className="far fa-calendar mr-1"></i>
                                {new Date(exp.startDate).getFullYear()} - {exp.isCurrent ? t.present : new Date(exp.endDate!).getFullYear()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* ========== CHAMBERS TAB ========== */}
            {activeTab === 'chambers' && (
              <div className="space-y-6">
                {profile.chambers.map((chamber, i) => (
                  <section 
                    key={chamber.id} 
                    className={`bg-white rounded-2xl p-6 shadow-sm border-2 transition ${
                      chamber.isPrimary ? 'border-teal-200' : 'border-slate-100'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-slate-800">{chamber.name}</h3>
                          {chamber.isPrimary && (
                            <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-bold rounded-full">
                              {isBn ? 'প্রধান' : 'Primary'}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500">
                          <i className="fas fa-map-marker-alt mr-2 text-slate-400"></i>
                          {chamber.address}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedChamber(chamber as any);
                          setShowBooking(true);
                        }}
                        className="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700 transition"
                      >
                        <i className="fas fa-calendar-plus mr-2"></i>
                        {t.bookNow}
                      </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Schedule */}
                      <div>
                        <h4 className="text-sm font-bold text-slate-500 uppercase mb-3">
                          <i className="far fa-clock mr-2"></i>{t.schedule}
                        </h4>
                        <div className="space-y-2">
                          {chamber.daysOfWeek.split(',').map((day) => (
                            <div key={day} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <span className="font-medium text-slate-700">{day}</span>
                              <span className="text-slate-600">{chamber.startTime} - {chamber.endTime}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Fees & Facilities */}
                      <div>
                        <h4 className="text-sm font-bold text-slate-500 uppercase mb-3">
                          <i className="fas fa-tag mr-2"></i>{isBn ? 'ফি' : 'Fees'}
                        </h4>
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-slate-600">{isBn ? 'নতুন পরামর্শ' : 'New Consultation'}</span>
                            <span className="font-bold text-slate-800">৳{chamber.consultationFee}</span>
                          </div>
                          {chamber.followUpFee && (
                            <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                              <span className="text-slate-600">{isBn ? 'ফলো-আপ' : 'Follow-up'}</span>
                              <span className="font-bold text-slate-800">৳{chamber.followUpFee}</span>
                            </div>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-slate-500 uppercase mb-3">
                          <i className="fas fa-concierge-bell mr-2"></i>{t.facilities}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {chamber.hasParking && (
                            <span className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-full">
                              <i className="fas fa-parking mr-1"></i>{t.parking}
                            </span>
                          )}
                          {chamber.hasWheelchairAccess && (
                            <span className="px-3 py-1.5 bg-green-50 text-green-700 text-sm rounded-full">
                              <i className="fas fa-wheelchair mr-1"></i>{t.wheelchair}
                            </span>
                          )}
                          {chamber.hasAC && (
                            <span className="px-3 py-1.5 bg-cyan-50 text-cyan-700 text-sm rounded-full">
                              <i className="fas fa-snowflake mr-1"></i>{t.ac}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            )}

            {/* ========== REVIEWS TAB ========== */}
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                
                {/* Rating Summary */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Overall Rating */}
                    <div className="text-center md:border-r md:border-slate-100 md:pr-8">
                      <p className="text-6xl font-bold text-slate-800 mb-2">
                        {(profile.averageRating || 0).toFixed(1)}
                      </p>
                      <StarRating rating={profile.averageRating || 0} size="lg" />
                      <p className="text-sm text-slate-500 mt-2">
                        {profile.totalReviews} {t.reviews}
                      </p>
                    </div>

                    {/* Rating Breakdown */}
                    <div className="flex-1 space-y-3">
                      <h3 className="font-bold text-slate-800 mb-4">{t.ratingBreakdown}</h3>
                      {[5, 4, 3, 2, 1].map((star) => (
                        <div key={star} className="flex items-center gap-3">
                          <span className="text-sm text-slate-600 w-8">{star} <i className="fas fa-star text-amber-400 text-xs"></i></span>
                          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                              style={{ width: `${profile.totalReviews ? (ratingDistribution[star] / profile.totalReviews) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm text-slate-500 w-8">{ratingDistribution[star]}</span>
                        </div>
                      ))}
                    </div>

                    {/* Category Ratings */}
                    <div className="flex-1 space-y-3">
                      <h3 className="font-bold text-slate-800 mb-4">{isBn ? 'বিভাগ অনুযায়ী' : 'By Category'}</h3>
                      <RatingBar label={t.punctuality} value={4.6} />
                      <RatingBar label={t.behavior} value={4.9} />
                      <RatingBar label={t.explanation} value={4.7} />
                      <RatingBar label={t.effectiveness} value={4.5} />
                    </div>
                  </div>
                </section>

                {/* Reviews List */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800 mb-6">{t.patientSays}</h2>
                  
                  <div className="space-y-6">
                    {(showAllReviews ? profile.reviews : profile.reviews.slice(0, 4)).map((review) => (
                      <div key={review.id} className="border-b border-slate-100 pb-6 last:border-0 last:pb-0">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                            {review.patientInitials || review.patientName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <p className="font-bold text-slate-800">{review.patientName}</p>
                              {review.isVerified && (
                                <span className="text-xs text-emerald-600 flex items-center gap-1">
                                  <i className="fas fa-check-circle"></i>
                                  {t.verifiedVisit}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3 mb-3">
                              <StarRating rating={review.rating} size="sm" />
                              <span className="text-xs text-slate-400">
                                {new Date(review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                              {review.visitType && (
                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                  {review.visitType}
                                </span>
                              )}
                            </div>

                            {review.title && (
                              <p className="font-semibold text-slate-800 mb-1">{review.title}</p>
                            )}
                            {review.comment && (
                              <p className="text-slate-600">{review.comment}</p>
                            )}

                            <button className="mt-3 text-sm text-slate-400 hover:text-slate-600">
                              <i className="far fa-thumbs-up mr-1"></i>{t.helpful}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {profile.reviews.length > 4 && (
                    <button
                      onClick={() => setShowAllReviews(!showAllReviews)}
                      className="w-full mt-6 py-3 text-teal-600 font-bold hover:bg-teal-50 rounded-xl transition"
                    >
                      {showAllReviews ? t.showLess : `${t.viewAll} (${profile.reviews.length})`}
                    </button>
                  )}
                </section>
              </div>
            )}
          </div>

          {/* ==================== SIDEBAR - Mobile Booking ==================== */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-40 shadow-lg">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">{t.consultationFee}</p>
                <p className="text-2xl font-bold text-slate-800">৳{profile.consultationFeeNew}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedChamber(primaryChamber as any);
                  setShowBooking(true);
                }}
                className="flex-1 bg-gradient-to-r from-teal-600 to-teal-500 text-white py-4 rounded-xl font-bold"
              >
                <i className="fas fa-calendar-check mr-2"></i>
                {t.bookNow}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== BOOKING MODAL ==================== */}
      {showBooking && selectedChamber && (
        <BookingModal
          doctor={{
            id: profile.id.toString(),
            name: profile.nameEn,
            degrees: profile.qualifications.map(q => q.degree).join(', '),
            specialties: profile.specializations.map(s => s.name),
            chambers: profile.chambers.map(c => ({
              id: c.id.toString(),
              name: c.name,
              address: c.address,
              area: c.area,
              fee: c.consultationFee,
            })) as Chamber[],
            image: profile.profilePhoto || '',
            rating: profile.averageRating || 4.5,
            experience: profile.experienceYears,
            patientCount: profile.totalPatients || 0,
            nextAvailable: 'Today',
            gender: profile.gender,
          }}
          chamber={{
            id: selectedChamber.id.toString(),
            name: selectedChamber.name,
            address: selectedChamber.address,
            area: selectedChamber.area,
            fee: selectedChamber.consultationFee,
          }}
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
