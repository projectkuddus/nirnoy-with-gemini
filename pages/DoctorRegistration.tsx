import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';

type Step = 'personal' | 'professional' | 'verification' | 'review';

// Qualification/Degree interface
interface Qualification {
  id: string;
  degree: string;
  field: string; // Specialization field for postgrad degrees
  institution: string;
  yearOfCompletion: string;
  isPrimary: boolean;
}

// Specialization interface
interface Specialization {
  id: string;
  name: string;
  isPrimary: boolean;
}

interface RegistrationData {
  // Personal
  nameEn: string;
  nameBn: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  
  // Professional - now arrays
  qualifications: Qualification[];
  specializations: Specialization[];
  experienceYears: string;
  
  // Verification
  bmdcNumber: string;
  nidNumber: string;
  profilePhotoUrl: string;
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// All Medical Specialties in Bangladesh
const SPECIALTIES = [
  // Internal Medicine & Subspecialties
  'Medicine', 'Cardiology', 'Gastroenterology', 'Nephrology', 'Pulmonology',
  'Endocrinology', 'Rheumatology', 'Neurology', 'Hematology', 'Infectious Disease',
  'Oncology', 'Geriatric Medicine', 'Critical Care Medicine', 'Hepatology',
  // Surgery & Subspecialties
  'General Surgery', 'Orthopedics', 'Neurosurgery', 'Cardiac Surgery',
  'Thoracic Surgery', 'Vascular Surgery', 'Plastic Surgery', 'Pediatric Surgery',
  'Urology', 'Colorectal Surgery', 'Hepatobiliary Surgery', 'Transplant Surgery',
  // Women's Health
  'Gynecology', 'Obstetrics', 'Gynecologic Oncology', 'Reproductive Medicine',
  'Maternal-Fetal Medicine',
  // Pediatrics
  'Pediatrics', 'Neonatology', 'Pediatric Cardiology', 'Pediatric Neurology',
  'Pediatric Oncology', 'Pediatric Pulmonology',
  // Eyes, Ears, Nose, Throat
  'Ophthalmology', 'ENT', 'Otology', 'Rhinology', 'Laryngology',
  // Skin
  'Dermatology', 'Venereology', 'Cosmetology',
  // Mental Health
  'Psychiatry', 'Child Psychiatry', 'Addiction Medicine', 'Clinical Psychology',
  // Dental
  'Dental Surgery', 'Orthodontics', 'Periodontics', 'Prosthodontics',
  'Endodontics', 'Oral & Maxillofacial Surgery', 'Pedodontics',
  // Radiology & Imaging
  'Radiology', 'Interventional Radiology', 'Nuclear Medicine',
  // Anesthesia & Pain
  'Anesthesiology', 'Pain Medicine', 'Palliative Care',
  // Physical Medicine
  'Physical Medicine', 'Rehabilitation', 'Sports Medicine',
  // Pathology & Lab
  'Pathology', 'Microbiology', 'Biochemistry', 'Transfusion Medicine',
  // Other Specialties
  'Emergency Medicine', 'Family Medicine', 'Occupational Medicine',
  'Forensic Medicine', 'Community Medicine', 'Public Health',
  'Tropical Medicine', 'Allergy & Immunology', 'Genetics',
];
const DEGREES = [
  'MBBS', 'BDS', 'FCPS', 'MD', 'MS', 'MRCP', 'FRCP', 'MRCS', 'FRCS',
  'PhD', 'DM', 'MCh', 'DNB', 'Diploma', 'Other'
];

// Bangladesh Medical Institutions (Government Medical Colleges, Private Medical Colleges, Postgraduate Institutes)
const BD_MEDICAL_INSTITUTIONS = [
  // Government Medical Colleges
  { name: 'Dhaka Medical College', city: 'Dhaka', type: 'Government' },
  { name: 'Sir Salimullah Medical College', city: 'Dhaka', type: 'Government' },
  { name: 'Shaheed Suhrawardy Medical College', city: 'Dhaka', type: 'Government' },
  { name: 'Mugda Medical College', city: 'Dhaka', type: 'Government' },
  { name: 'Chittagong Medical College', city: 'Chittagong', type: 'Government' },
  { name: 'Rajshahi Medical College', city: 'Rajshahi', type: 'Government' },
  { name: 'Mymensingh Medical College', city: 'Mymensingh', type: 'Government' },
  { name: 'Sylhet MAG Osmani Medical College', city: 'Sylhet', type: 'Government' },
  { name: 'Rangpur Medical College', city: 'Rangpur', type: 'Government' },
  { name: 'Khulna Medical College', city: 'Khulna', type: 'Government' },
  { name: 'Comilla Medical College', city: 'Comilla', type: 'Government' },
  { name: 'Sher-E-Bangla Medical College', city: 'Barisal', type: 'Government' },
  { name: 'Faridpur Medical College', city: 'Faridpur', type: 'Government' },
  { name: 'Dinajpur Medical College', city: 'Dinajpur', type: 'Government' },
  { name: 'Cox\'s Bazar Medical College', city: 'Cox\'s Bazar', type: 'Government' },
  { name: 'Pabna Medical College', city: 'Pabna', type: 'Government' },
  { name: 'Satkhira Medical College', city: 'Satkhira', type: 'Government' },
  { name: 'Jashore Medical College', city: 'Jashore', type: 'Government' },
  { name: 'Bogura Medical College', city: 'Bogura', type: 'Government' },
  { name: 'Patuakhali Medical College', city: 'Patuakhali', type: 'Government' },
  { name: 'Kushtia Medical College', city: 'Kushtia', type: 'Government' },
  { name: 'Brahmanbaria Medical College', city: 'Brahmanbaria', type: 'Government' },
  { name: 'Chandpur Medical College', city: 'Chandpur', type: 'Government' },
  { name: 'Kishoreganj Medical College', city: 'Kishoreganj', type: 'Government' },
  { name: 'Netrokona Medical College', city: 'Netrokona', type: 'Government' },
  { name: 'Habiganj Medical College', city: 'Habiganj', type: 'Government' },
  { name: 'Nilphamari Medical College', city: 'Nilphamari', type: 'Government' },
  { name: 'Kurigram Medical College', city: 'Kurigram', type: 'Government' },
  { name: 'Gaibandha Medical College', city: 'Gaibandha', type: 'Government' },
  { name: 'Naogaon Medical College', city: 'Naogaon', type: 'Government' },
  { name: 'Chapainawabganj Medical College', city: 'Chapainawabganj', type: 'Government' },
  { name: 'Joypurhat Medical College', city: 'Joypurhat', type: 'Government' },
  { name: 'Tangail Medical College', city: 'Tangail', type: 'Government' },
  { name: 'Narsingdi Medical College', city: 'Narsingdi', type: 'Government' },
  { name: 'Manikganj Medical College', city: 'Manikganj', type: 'Government' },
  { name: 'Gopalganj Medical College', city: 'Gopalganj', type: 'Government' },
  { name: 'Shariatpur Medical College', city: 'Shariatpur', type: 'Government' },
  { name: 'Madaripur Medical College', city: 'Madaripur', type: 'Government' },
  { name: 'Pirojpur Medical College', city: 'Pirojpur', type: 'Government' },
  { name: 'Bhola Medical College', city: 'Bhola', type: 'Government' },
  { name: 'Barguna Medical College', city: 'Barguna', type: 'Government' },
  { name: 'Jhalokathi Medical College', city: 'Jhalokathi', type: 'Government' },
  { name: 'Noakhali Medical College', city: 'Noakhali', type: 'Government' },
  { name: 'Lakshmipur Medical College', city: 'Lakshmipur', type: 'Government' },
  { name: 'Feni Medical College', city: 'Feni', type: 'Government' },
  { name: 'Sunamganj Medical College', city: 'Sunamganj', type: 'Government' },
  { name: 'Moulvibazar Medical College', city: 'Moulvibazar', type: 'Government' },
  { name: 'Rangamati Medical College', city: 'Rangamati', type: 'Government' },
  { name: 'Bandarban Medical College', city: 'Bandarban', type: 'Government' },
  { name: 'Khagrachhari Medical College', city: 'Khagrachhari', type: 'Government' },
  { name: 'Armed Forces Medical College (AFMC)', city: 'Dhaka', type: 'Government' },
  
  // Postgraduate Institutes
  { name: 'Bangabandhu Sheikh Mujib Medical University (BSMMU)', city: 'Dhaka', type: 'Postgraduate' },
  { name: 'National Institute of Cardiovascular Diseases (NICVD)', city: 'Dhaka', type: 'Postgraduate' },
  { name: 'National Institute of Neurosciences & Hospital', city: 'Dhaka', type: 'Postgraduate' },
  { name: 'National Institute of Kidney Diseases & Urology', city: 'Dhaka', type: 'Postgraduate' },
  { name: 'National Institute of Cancer Research & Hospital', city: 'Dhaka', type: 'Postgraduate' },
  { name: 'National Institute of Traumatology & Orthopaedic Rehabilitation (NITOR)', city: 'Dhaka', type: 'Postgraduate' },
  { name: 'National Institute of Mental Health (NIMH)', city: 'Dhaka', type: 'Postgraduate' },
  { name: 'National Institute of Diseases of the Chest and Hospital (NIDCH)', city: 'Dhaka', type: 'Postgraduate' },
  { name: 'National Institute of ENT', city: 'Dhaka', type: 'Postgraduate' },
  { name: 'National Institute of Ophthalmology', city: 'Dhaka', type: 'Postgraduate' },
  { name: 'Institute of Child and Mother Health (ICMH)', city: 'Dhaka', type: 'Postgraduate' },
  { name: 'Bangladesh College of Physicians and Surgeons (BCPS)', city: 'Dhaka', type: 'Postgraduate' },
  { name: 'Centre for Medical Education (CME)', city: 'Dhaka', type: 'Postgraduate' },
  { name: 'Chittagong Medical University', city: 'Chittagong', type: 'Postgraduate' },
  { name: 'Rajshahi Medical University', city: 'Rajshahi', type: 'Postgraduate' },
  { name: 'Sylhet Medical University', city: 'Sylhet', type: 'Postgraduate' },
  
  // Private Medical Colleges (Major ones)
  { name: 'Ibrahim Medical College', city: 'Dhaka', type: 'Private' },
  { name: 'Bangladesh Medical College', city: 'Dhaka', type: 'Private' },
  { name: 'Holy Family Red Crescent Medical College', city: 'Dhaka', type: 'Private' },
  { name: 'Anwer Khan Modern Medical College', city: 'Dhaka', type: 'Private' },
  { name: 'Delta Medical College', city: 'Dhaka', type: 'Private' },
  { name: 'Popular Medical College', city: 'Dhaka', type: 'Private' },
  { name: 'Medical College for Women and Hospital', city: 'Dhaka', type: 'Private' },
  { name: 'Uttara Adhunik Medical College', city: 'Dhaka', type: 'Private' },
  { name: 'Northern International Medical College', city: 'Dhaka', type: 'Private' },
  { name: 'East West Medical College', city: 'Dhaka', type: 'Private' },
  { name: 'Enam Medical College', city: 'Dhaka', type: 'Private' },
  { name: 'Green Life Medical College', city: 'Dhaka', type: 'Private' },
  { name: 'Shaheed Monsur Ali Medical College', city: 'Dhaka', type: 'Private' },
  { name: 'Central Medical College', city: 'Comilla', type: 'Private' },
  { name: 'BGC Trust Medical College', city: 'Chittagong', type: 'Private' },
  { name: 'Chattagram Maa-O-Shishu Hospital Medical College', city: 'Chittagong', type: 'Private' },
  { name: 'Southern Medical College', city: 'Chittagong', type: 'Private' },
  { name: 'Rangpur Community Medical College', city: 'Rangpur', type: 'Private' },
  { name: 'North Bengal Medical College', city: 'Sirajganj', type: 'Private' },
  { name: 'Islami Bank Medical College', city: 'Rajshahi', type: 'Private' },
  { name: 'Rajshahi Medical College Hospital', city: 'Rajshahi', type: 'Private' },
  { name: 'North East Medical College', city: 'Sylhet', type: 'Private' },
  { name: 'Jalalabad Ragib-Rabeya Medical College', city: 'Sylhet', type: 'Private' },
  { name: 'Sylhet Women\'s Medical College', city: 'Sylhet', type: 'Private' },
  { name: 'Khwaja Yunus Ali Medical College', city: 'Sirajganj', type: 'Private' },
  { name: 'Gazi Medical College', city: 'Khulna', type: 'Private' },
  { name: 'Ad-Din Women\'s Medical College', city: 'Dhaka', type: 'Private' },
  { name: 'Marks Medical College', city: 'Dhaka', type: 'Private' },
  { name: 'Tairunnessa Memorial Medical College', city: 'Gazipur', type: 'Private' },
  { name: 'Z.H. Sikder Women\'s Medical College', city: 'Dhaka', type: 'Private' },
  { name: 'Brahmanbaria Medical College', city: 'Brahmanbaria', type: 'Private' },
  { name: 'International Medical College', city: 'Gazipur', type: 'Private' },
  { name: 'Monno Medical College', city: 'Manikganj', type: 'Private' },
  { name: 'President Abdul Hamid Medical College', city: 'Kishoreganj', type: 'Private' },
  
  // Dental Colleges
  { name: 'Dhaka Dental College', city: 'Dhaka', type: 'Government' },
  { name: 'Sir Salimullah Medical College Dental Unit', city: 'Dhaka', type: 'Government' },
  { name: 'Chittagong Dental College', city: 'Chittagong', type: 'Government' },
  { name: 'Rajshahi Dental College', city: 'Rajshahi', type: 'Government' },
  { name: 'Mymensingh Dental College', city: 'Mymensingh', type: 'Government' },
  { name: 'Pioneer Dental College', city: 'Dhaka', type: 'Private' },
  { name: 'City Dental College', city: 'Dhaka', type: 'Private' },
  { name: 'Sapporo Dental College', city: 'Dhaka', type: 'Private' },
  { name: 'Update Dental College', city: 'Dhaka', type: 'Private' },
  { name: 'Mandy Dental College', city: 'Dhaka', type: 'Private' },
  
  // Other/Foreign option
  { name: 'Other (Foreign/Unlisted Institution)', city: '', type: 'Other' },
];

// Group institutions by type for better UX
const INSTITUTION_GROUPS = {
  'Government Medical Colleges': BD_MEDICAL_INSTITUTIONS.filter(i => i.type === 'Government' && !i.name.includes('Dental')),
  'Postgraduate Institutes': BD_MEDICAL_INSTITUTIONS.filter(i => i.type === 'Postgraduate'),
  'Private Medical Colleges': BD_MEDICAL_INSTITUTIONS.filter(i => i.type === 'Private' && !i.name.includes('Dental')),
  'Dental Colleges': BD_MEDICAL_INSTITUTIONS.filter(i => i.name.includes('Dental')),
  'Other': BD_MEDICAL_INSTITUTIONS.filter(i => i.type === 'Other'),
};

export const DoctorRegistration: React.FC = () => {
  const { registerDoctor, user } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [step, setStep] = useState<Step>('personal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // Initial qualification (MBBS/BDS is required)
  const initialQualification: Qualification = {
    id: generateId(),
    degree: '',
    field: '',
    institution: '',
    yearOfCompletion: '',
    isPrimary: true,
  };
  
  // Initial specialization
  const initialSpecialization: Specialization = {
    id: generateId(),
    name: '',
    isPrimary: true,
  };
  
  const [data, setData] = useState<RegistrationData>({
    nameEn: '',
    nameBn: '',
    gender: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    qualifications: [initialQualification],
    specializations: [initialSpecialization],
    experienceYears: '',
    bmdcNumber: '',
    nidNumber: '',
    profilePhotoUrl: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Institution search state - now per qualification
  const [institutionSearches, setInstitutionSearches] = useState<Record<string, string>>({});
  const [showInstitutionDropdown, setShowInstitutionDropdown] = useState<string | null>(null);
  const [otherInstitutions, setOtherInstitutions] = useState<Record<string, boolean>>({});
  
  // Filter institutions based on search for a specific qualification
  const getFilteredInstitutions = (qualId: string) => {
    const search = institutionSearches[qualId] || '';
    return BD_MEDICAL_INSTITUTIONS.filter(inst => 
      inst.name.toLowerCase().includes(search.toLowerCase()) ||
      inst.city.toLowerCase().includes(search.toLowerCase())
    );
  };
  
  // === QUALIFICATION HELPERS ===
  const addQualification = () => {
    const newQual: Qualification = {
      id: generateId(),
      degree: '',
      field: '',
      institution: '',
      yearOfCompletion: '',
      isPrimary: false,
    };
    setData(prev => ({
      ...prev,
      qualifications: [...prev.qualifications, newQual],
    }));
  };
  
  const updateQualification = (id: string, field: keyof Qualification, value: string | boolean) => {
    setData(prev => ({
      ...prev,
      qualifications: prev.qualifications.map(q => 
        q.id === id ? { ...q, [field]: value } : q
      ),
    }));
    // Clear error if exists
    if (errors[`qual_${id}_${field}`]) {
      setErrors(prev => ({ ...prev, [`qual_${id}_${field}`]: '' }));
    }
  };
  
  const removeQualification = (id: string) => {
    if (data.qualifications.length <= 1) return; // Keep at least one
    setData(prev => ({
      ...prev,
      qualifications: prev.qualifications.filter(q => q.id !== id),
    }));
  };
  
  // === SPECIALIZATION HELPERS ===
  const addSpecialization = () => {
    const newSpec: Specialization = {
      id: generateId(),
      name: '',
      isPrimary: false,
    };
    setData(prev => ({
      ...prev,
      specializations: [...prev.specializations, newSpec],
    }));
  };
  
  const updateSpecialization = (id: string, field: keyof Specialization, value: string | boolean) => {
    setData(prev => ({
      ...prev,
      specializations: prev.specializations.map(s => 
        s.id === id ? { ...s, [field]: value } : s
      ),
    }));
  };
  
  const removeSpecialization = (id: string) => {
    if (data.specializations.length <= 1) return;
    setData(prev => ({
      ...prev,
      specializations: prev.specializations.filter(s => s.id !== id),
    }));
  };

  // Translations
  const t = {
    title: isBn ? 'ডাক্তার রেজিস্ট্রেশন' : 'Doctor Registration',
    subtitle: isBn ? 'নির্ণয় কেয়ার-এ যোগ দিন' : 'Join Nirnoy Care',
    step1: isBn ? 'ব্যক্তিগত তথ্য' : 'Personal Info',
    step2: isBn ? 'পেশাগত তথ্য' : 'Professional Info',
    step3: isBn ? 'যাচাইকরণ' : 'Verification',
    step4: isBn ? 'পর্যালোচনা' : 'Review',
    nameEn: isBn ? 'পুরো নাম (ইংরেজিতে)' : 'Full Name (English)',
    nameBn: isBn ? 'পুরো নাম (বাংলায়)' : 'Full Name (Bangla)',
    gender: isBn ? 'লিঙ্গ' : 'Gender',
    male: isBn ? 'পুরুষ' : 'Male',
    female: isBn ? 'মহিলা' : 'Female',
    dateOfBirth: isBn ? 'জন্ম তারিখ' : 'Date of Birth',
    phone: isBn ? 'মোবাইল নম্বর' : 'Mobile Number',
    email: isBn ? 'ইমেইল' : 'Email',
    
    // Qualifications
    qualifications: isBn ? 'শিক্ষাগত যোগ্যতা' : 'Educational Qualifications',
    qualificationsDesc: isBn ? 'আপনার সকল ডিগ্রি যোগ করুন (MBBS/BDS আবশ্যক)' : 'Add all your degrees (MBBS/BDS required)',
    degree: isBn ? 'ডিগ্রি' : 'Degree',
    selectDegree: isBn ? 'ডিগ্রি নির্বাচন করুন' : 'Select Degree',
    field: isBn ? 'বিষয়/ক্ষেত্র' : 'Field/Subject',
    fieldPlaceholder: isBn ? 'যেমন: কার্ডিওলজি' : 'e.g., Cardiology',
    institution: isBn ? 'প্রতিষ্ঠান' : 'Institution',
    yearOfCompletion: isBn ? 'সমাপ্তির বছর' : 'Year of Completion',
    addDegree: isBn ? 'আরো ডিগ্রি যোগ করুন' : 'Add Another Degree',
    primaryDegree: isBn ? 'প্রাথমিক ডিগ্রি' : 'Primary',
    removeDegree: isBn ? 'সরান' : 'Remove',
    
    // Specializations
    specializations: isBn ? 'বিশেষত্ব/এক্সপার্টিজ' : 'Specializations / Expertise',
    specializationsDesc: isBn ? 'আপনার সকল বিশেষত্ব যোগ করুন' : 'Add all your areas of expertise',
    selectSpecialty: isBn ? 'বিশেষত্ব নির্বাচন করুন' : 'Select Specialty',
    addSpecialty: isBn ? 'আরো বিশেষত্ব যোগ করুন' : 'Add Another Specialty',
    primarySpecialty: isBn ? 'প্রধান' : 'Primary',
    removeSpecialty: isBn ? 'সরান' : 'Remove',
    
    experienceYears: isBn ? 'মোট অভিজ্ঞতা (বছর)' : 'Total Experience (Years)',
    bmdcNumber: isBn ? 'BMDC রেজিস্ট্রেশন নম্বর' : 'BMDC Registration Number',
    bmdcNote: isBn ? 'বাংলাদেশ মেডিকেল ও ডেন্টাল কাউন্সিল থেকে প্রাপ্ত' : 'From Bangladesh Medical & Dental Council',
    nidNumber: isBn ? 'জাতীয় পরিচয়পত্র নম্বর' : 'National ID Number',
    nidNote: isBn ? '১০ বা ১৭ সংখ্যার NID' : '10 or 17 digit NID',
    profilePhoto: isBn ? 'প্রোফাইল ছবি' : 'Profile Photo',
    uploadPhoto: isBn ? 'ছবি আপলোড করুন' : 'Upload Photo',
    next: isBn ? 'পরবর্তী' : 'Next',
    back: isBn ? 'পিছনে' : 'Back',
    submit: isBn ? 'জমা দিন' : 'Submit Application',
    submitting: isBn ? 'জমা হচ্ছে...' : 'Submitting...',
    required: isBn ? 'আবশ্যক' : 'Required',
    optional: isBn ? 'ঐচ্ছিক' : 'Optional',
    reviewTitle: isBn ? 'আপনার তথ্য পর্যালোচনা করুন' : 'Review Your Information',
    termsAgree: isBn ? 'আমি নির্ণয় কেয়ার-এর শর্তাবলী এবং গোপনীয়তা নীতিতে সম্মত' : 'I agree to Nirnoy Care\'s Terms of Service and Privacy Policy',
    verificationNote: isBn ? 'আপনার আবেদন আমাদের টিম দ্বারা যাচাই করা হবে। এটি ১-৩ কার্যদিবস সময় নিতে পারে।' : 'Your application will be verified by our team. This may take 1-3 business days.',
    successTitle: isBn ? 'আবেদন জমা হয়েছে!' : 'Application Submitted!',
    successMessage: isBn ? 'আপনার আবেদন সফলভাবে জমা হয়েছে। যাচাই সম্পন্ন হলে আপনাকে জানানো হবে।' : 'Your application has been submitted successfully. You will be notified once verification is complete.',
    goHome: isBn ? 'হোম পেজে যান' : 'Go to Home',
    whyJoin: isBn ? 'কেন নির্ণয় কেয়ারে যোগ দেবেন?' : 'Why Join Nirnoy Care?',
    benefit1: isBn ? 'হাজার হাজার রোগীর কাছে পৌঁছান' : 'Reach thousands of patients',
    benefit2: isBn ? 'ডিজিটাল কিউ ম্যানেজমেন্ট' : 'Digital queue management',
    benefit3: isBn ? 'AI-চালিত ক্লিনিকাল সহায়তা' : 'AI-powered clinical assistance',
    benefit4: isBn ? 'সম্পূর্ণ বিনামূল্যে শুরু করুন' : 'Start completely free',
  };

  const steps: Step[] = ['personal', 'professional', 'verification', 'review'];
  const currentStepIndex = steps.indexOf(step);

  const updateData = (field: keyof RegistrationData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Normalize phone number - handles various input formats
  const normalizePhone = (input: string): string => {
    // Remove all non-digits
    let digits = input.replace(/\D/g, '');
    
    // If starts with 880, remove it
    if (digits.startsWith('880')) {
      digits = digits.substring(3);
    }
    // If starts with 0, remove it
    if (digits.startsWith('0')) {
      digits = digits.substring(1);
    }
    
    return digits;
  };

  const isValidBDPhone = (phone: string): boolean => {
    const normalized = normalizePhone(phone);
    // BD mobile numbers: 10 digits starting with 1 (after removing +880 or 0)
    // Valid prefixes: 13, 14, 15, 16, 17, 18, 19
    return /^1[3-9]\d{8}$/.test(normalized);
  };

  const validateStep = (currentStep: Step): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 'personal') {
      if (!data.nameEn.trim()) newErrors.nameEn = 'Required';
      if (!data.gender) newErrors.gender = 'Required';
      if (!data.dateOfBirth) newErrors.dateOfBirth = 'Required';
      if (!isValidBDPhone(data.phone)) {
        newErrors.phone = isBn ? 'সঠিক মোবাইল নম্বর দিন (যেমন: 01712345678)' : 'Enter valid mobile (e.g., 01712345678)';
      }
    }

    if (currentStep === 'professional') {
      // Validate qualifications
      const primaryQual = data.qualifications.find(q => q.isPrimary);
      if (!primaryQual || !primaryQual.degree) {
        newErrors.qualifications = isBn ? 'অন্তত একটি ডিগ্রি আবশ্যক (MBBS/BDS)' : 'At least one degree required (MBBS/BDS)';
      }
      
      // Validate each qualification
      data.qualifications.forEach((qual, index) => {
        if (qual.degree && !qual.institution) {
          newErrors[`qual_${qual.id}_institution`] = isBn ? 'প্রতিষ্ঠান আবশ্যক' : 'Institution required';
        }
      });
      
      // Validate specializations
      const primarySpec = data.specializations.find(s => s.isPrimary);
      if (!primarySpec || !primarySpec.name) {
        newErrors.specializations = isBn ? 'অন্তত একটি বিশেষত্ব আবশ্যক' : 'At least one specialty required';
      }
    }

    if (currentStep === 'verification') {
      if (!data.bmdcNumber.trim()) newErrors.bmdcNumber = 'Required';
      if (!data.nidNumber.trim() || (data.nidNumber.length !== 10 && data.nidNumber.length !== 17)) {
        newErrors.nidNumber = 'Valid NID required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < steps.length) {
        setStep(steps[nextIndex]);
      }
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  };

  const handleSubmit = async () => {
    if (!agreedToTerms) return;
    
    setIsSubmitting(true);
    
    try {
      // Register doctor using AuthContext
      const result = await registerDoctor({
        phone: data.phone,
        email: data.email,
        name: data.nameEn,
        nameBn: data.nameBn,
        bmdcNumber: data.bmdcNumber,
        nidNumber: data.nidNumber,
        specializations: data.specializations.map(s => s.name),
        qualifications: data.qualifications.map(q => ({
          degree: q.degree,
          institution: q.institution,
          year: q.yearOfCompletion,
        })),
        experienceYears: parseInt(data.experienceYears) || 0,
        consultationFee: 500, // Default fee
        profileImage: data.profilePhotoUrl,
      });
      
      console.log('Doctor registration result:', result);
      
      if (result.success) {
        setStep('review'); // Show success state
      } else {
        alert(result.error || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Doctor registration error:', error);
      alert(error.message || 'An error occurred');
    }
    
    setIsSubmitting(false);
  };

  const [submitted, setSubmitted] = useState(false);
  
  // Calculate date limits for DOB (doctors must be at least 22 years old)
  const today = new Date();
  const maxDOB = new Date(today.getFullYear() - 22, today.getMonth(), today.getDate()).toISOString().split('T')[0];
  const minDOB = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate()).toISOString().split('T')[0];

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center p-4">
        <PageHeader />
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-slate-100 mt-24">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-check text-4xl text-green-600"></i>
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-4">{t.successTitle}</h2>
          <p className="text-slate-600 mb-6">{t.successMessage}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 rounded-xl font-bold hover:from-blue-600 hover:to-indigo-600 transition shadow-lg shadow-blue-500/25"
          >
            {t.goHome}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <PageHeader />
      <div className="container mx-auto px-6 py-8 max-w-7xl pt-24">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Sidebar - Benefits */}
          <div className="hidden lg:block">
            <div className="sticky top-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                <i className="fas fa-user-md text-3xl"></i>
              </div>
              <h2 className="text-2xl font-bold mb-2">{t.whyJoin}</h2>
              
              <div className="space-y-4 mt-8">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-users"></i>
                  </div>
                  <p className="text-blue-100">{t.benefit1}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-list-ol"></i>
                  </div>
                  <p className="text-blue-100">{t.benefit2}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-robot"></i>
                  </div>
                  <p className="text-blue-100">{t.benefit3}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-gift"></i>
                  </div>
                  <p className="text-blue-100">{t.benefit4}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white">
                <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white mb-4 flex items-center gap-2">
                  <i className="fas fa-arrow-left"></i> {t.back}
                </button>
                <h1 className="text-2xl font-bold">{t.title}</h1>
                <p className="text-slate-400">{t.subtitle}</p>
              </div>

              {/* Progress Steps */}
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  {steps.map((s, i) => (
                    <React.Fragment key={s}>
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          i < currentStepIndex ? 'bg-green-500 text-white' :
                          i === currentStepIndex ? 'bg-blue-600 text-white' :
                          'bg-slate-200 text-slate-500'
                        }`}>
                          {i < currentStepIndex ? <i className="fas fa-check"></i> : i + 1}
                        </div>
                        <span className={`hidden sm:block text-sm font-medium ${
                          i <= currentStepIndex ? 'text-slate-800' : 'text-slate-400'
                        }`}>
                          {s === 'personal' && t.step1}
                          {s === 'professional' && t.step2}
                          {s === 'verification' && t.step3}
                          {s === 'review' && t.step4}
                        </span>
                      </div>
                      {i < steps.length - 1 && (
                        <div className={`flex-1 h-1 mx-2 rounded ${
                          i < currentStepIndex ? 'bg-green-500' : 'bg-slate-200'
                        }`}></div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6 md:p-8">
                
                {/* Step 1: Personal Info */}
                {step === 'personal' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          {t.nameEn} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={data.nameEn}
                          onChange={(e) => updateData('nameEn', e.target.value)}
                          className={`w-full p-4 border-2 rounded-xl outline-none transition ${
                            errors.nameEn ? 'border-red-300 bg-red-50' : 'border-slate-200 focus:border-blue-500'
                          }`}
                          placeholder="Dr. John Doe"
                        />
                        {errors.nameEn && <p className="text-red-500 text-sm mt-1">{errors.nameEn}</p>}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          {t.nameBn} <span className="text-slate-400 font-normal">({t.optional})</span>
                        </label>
                        <input
                          type="text"
                          value={data.nameBn}
                          onChange={(e) => updateData('nameBn', e.target.value)}
                          className="w-full p-4 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 transition"
                          placeholder="ডা. জন ডো"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          {t.gender} <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-4">
                          {['Male', 'Female'].map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => updateData('gender', g)}
                              className={`flex-1 p-4 rounded-xl border-2 font-bold transition ${
                                data.gender === g
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <i className={`fas fa-${g === 'Male' ? 'mars' : 'venus'} mr-2`}></i>
                              {g === 'Male' ? t.male : t.female}
                            </button>
                          ))}
                        </div>
                        {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          {t.dateOfBirth} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                      max={maxDOB}
                      min={minDOB}
                      value={data.dateOfBirth}
                          onChange={(e) => updateData('dateOfBirth', e.target.value)}
                          className={`w-full p-4 border-2 rounded-xl outline-none transition ${
                            errors.dateOfBirth ? 'border-red-300 bg-red-50' : 'border-slate-200 focus:border-blue-500'
                          }`}
                        />
                        {errors.dateOfBirth && <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth}</p>}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          {t.phone} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            value={data.phone}
                            onChange={(e) => {
                              // Allow user to type naturally, we'll normalize later
                              const value = e.target.value.replace(/[^\d+\-\s]/g, '');
                              updateData('phone', value);
                            }}
                            className={`w-full p-4 border-2 rounded-xl outline-none transition ${
                              errors.phone ? 'border-red-300 bg-red-50' : 'border-slate-200 focus:border-blue-500'
                            }`}
                            placeholder="01712345678"
                          />
                          {data.phone && isValidBDPhone(data.phone) && (
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">
                              <i className="fas fa-check-circle"></i>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {isBn ? 'যেকোনো ফরম্যাটে দিন: 01712345678 বা +8801712345678' : 'Any format: 01712345678 or +8801712345678'}
                        </p>
                        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          {t.email} <span className="text-slate-400 font-normal">({t.optional})</span>
                        </label>
                        <input
                          type="email"
                          value={data.email}
                          onChange={(e) => updateData('email', e.target.value)}
                          className="w-full p-4 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 transition"
                          placeholder="doctor@example.com"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Professional Info */}
                {step === 'professional' && (
                  <div className="space-y-8 animate-fade-in">
                    
                    {/* === QUALIFICATIONS SECTION === */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <i className="fas fa-graduation-cap text-blue-600"></i>
                            {t.qualifications}
                          </h3>
                          <p className="text-sm text-slate-500">{t.qualificationsDesc}</p>
                        </div>
                      </div>
                      
                      {errors.qualifications && (
                        <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-lg border border-red-200">
                          <i className="fas fa-exclamation-circle mr-2"></i>{errors.qualifications}
                        </p>
                      )}
                      
                      <div className="space-y-4">
                        {data.qualifications.map((qual, index) => (
                          <div 
                            key={qual.id} 
                            className={`p-5 rounded-xl border-2 transition ${
                              qual.isPrimary 
                                ? 'border-blue-300 bg-blue-50/50' 
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-600">
                                  {isBn ? `ডিগ্রি ${index + 1}` : `Degree ${index + 1}`}
                                </span>
                                {qual.isPrimary && (
                                  <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                                    {t.primaryDegree}
                                  </span>
                                )}
                              </div>
                              {!qual.isPrimary && data.qualifications.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeQualification(qual.id)}
                                  className="text-red-400 hover:text-red-600 text-sm"
                                >
                                  <i className="fas fa-trash mr-1"></i>{t.removeDegree}
                                </button>
                              )}
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-4">
                              {/* Degree Select */}
                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                  {t.degree} {qual.isPrimary && <span className="text-red-500">*</span>}
                                </label>
                                <select
                                  value={qual.degree}
                                  onChange={(e) => updateQualification(qual.id, 'degree', e.target.value)}
                                  className="w-full p-3 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500 transition bg-white"
                                >
                                  <option value="">{t.selectDegree}</option>
                                  {DEGREES.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                  ))}
                                </select>
                              </div>
                              
                              {/* Field/Subject (for postgrad degrees) */}
                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                  {t.field} <span className="text-slate-400 font-normal">({t.optional})</span>
                                </label>
                                <input
                                  type="text"
                                  value={qual.field}
                                  onChange={(e) => updateQualification(qual.id, 'field', e.target.value)}
                                  className="w-full p-3 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500 transition"
                                  placeholder={t.fieldPlaceholder}
                                />
                              </div>
                              
                              {/* Institution - Searchable */}
                              <div className="relative">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                  {t.institution} {qual.degree && <span className="text-red-500">*</span>}
                                </label>
                                <input
                                  type="text"
                                  value={otherInstitutions[qual.id] ? qual.institution : (institutionSearches[qual.id] || qual.institution)}
                                  onChange={(e) => {
                                    if (otherInstitutions[qual.id]) {
                                      updateQualification(qual.id, 'institution', e.target.value);
                                    } else {
                                      setInstitutionSearches(prev => ({ ...prev, [qual.id]: e.target.value }));
                                      setShowInstitutionDropdown(qual.id);
                                      if (!e.target.value) {
                                        updateQualification(qual.id, 'institution', '');
                                      }
                                    }
                                  }}
                                  onFocus={() => !otherInstitutions[qual.id] && setShowInstitutionDropdown(qual.id)}
                                  className={`w-full p-3 pr-10 border-2 rounded-lg outline-none transition ${
                                    errors[`qual_${qual.id}_institution`] ? 'border-red-300 bg-red-50' : 'border-slate-200 focus:border-blue-500'
                                  }`}
                                  placeholder={isBn ? 'প্রতিষ্ঠান খুঁজুন...' : 'Search institution...'}
                                />
                                <span className="absolute right-3 top-8 text-slate-400">
                                  {otherInstitutions[qual.id] ? (
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        setOtherInstitutions(prev => ({ ...prev, [qual.id]: false }));
                                        updateQualification(qual.id, 'institution', '');
                                      }}
                                      className="text-blue-600 hover:text-blue-700"
                                    >
                                      <i className="fas fa-list"></i>
                                    </button>
                                  ) : (
                                    <i className="fas fa-search text-sm"></i>
                                  )}
                                </span>
                                
                                {/* Institution Dropdown */}
                                {showInstitutionDropdown === qual.id && !otherInstitutions[qual.id] && (
                                  <div className="absolute z-50 w-full mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                    {getFilteredInstitutions(qual.id).slice(0, 20).map((inst) => (
                                      <button
                                        key={inst.name}
                                        type="button"
                                        onClick={() => {
                                          if (inst.type === 'Other') {
                                            setOtherInstitutions(prev => ({ ...prev, [qual.id]: true }));
                                            updateQualification(qual.id, 'institution', '');
                                          } else {
                                            updateQualification(qual.id, 'institution', inst.name);
                                            setInstitutionSearches(prev => ({ ...prev, [qual.id]: inst.name }));
                                          }
                                          setShowInstitutionDropdown(null);
                                        }}
                                        className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center justify-between text-sm"
                                      >
                                        <div>
                                          <p className="font-medium text-slate-700">{inst.name}</p>
                                          {inst.city && <p className="text-xs text-slate-400">{inst.city}</p>}
                                        </div>
                                        {inst.type !== 'Other' && (
                                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                                            inst.type === 'Government' ? 'bg-green-100 text-green-700' :
                                            inst.type === 'Postgraduate' ? 'bg-purple-100 text-purple-700' :
                                            'bg-blue-100 text-blue-700'
                                          }`}>
                                            {inst.type}
                                          </span>
                                        )}
                                      </button>
                                    ))}
                                    {getFilteredInstitutions(qual.id).length === 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOtherInstitutions(prev => ({ ...prev, [qual.id]: true }));
                                          updateQualification(qual.id, 'institution', institutionSearches[qual.id] || '');
                                          setShowInstitutionDropdown(null);
                                        }}
                                        className="w-full p-3 text-center text-blue-600 hover:bg-blue-50"
                                      >
                                        <i className="fas fa-plus mr-1"></i>
                                        {isBn ? 'অন্য প্রতিষ্ঠান যোগ করুন' : 'Add other institution'}
                                      </button>
                                    )}
                                  </div>
                                )}
                                {errors[`qual_${qual.id}_institution`] && (
                                  <p className="text-red-500 text-xs mt-1">{errors[`qual_${qual.id}_institution`]}</p>
                                )}
                              </div>
                              
                              {/* Year of Completion */}
                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                  {t.yearOfCompletion}
                                </label>
                                <input
                                  type="number"
                                  value={qual.yearOfCompletion}
                                  onChange={(e) => updateQualification(qual.id, 'yearOfCompletion', e.target.value)}
                                  className="w-full p-3 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500 transition"
                                  placeholder="2010"
                                  min="1950"
                                  max={new Date().getFullYear()}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Add More Degrees Button */}
                        <button
                          type="button"
                          onClick={addQualification}
                          className="w-full p-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition flex items-center justify-center gap-2"
                        >
                          <i className="fas fa-plus-circle"></i>
                          {t.addDegree}
                        </button>
                      </div>
                    </div>
                    
                    {/* === SPECIALIZATIONS SECTION === */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <i className="fas fa-stethoscope text-blue-600"></i>
                            {t.specializations}
                          </h3>
                          <p className="text-sm text-slate-500">{t.specializationsDesc}</p>
                        </div>
                      </div>
                      
                      {errors.specializations && (
                        <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-lg border border-red-200">
                          <i className="fas fa-exclamation-circle mr-2"></i>{errors.specializations}
                        </p>
                      )}
                      
                      <div className="space-y-3">
                        {data.specializations.map((spec, index) => (
                          <div 
                            key={spec.id} 
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition ${
                              spec.isPrimary 
                                ? 'border-blue-300 bg-blue-50/50' 
                                : 'border-slate-200 bg-white'
                            }`}
                          >
                            <select
                              value={spec.name}
                              onChange={(e) => updateSpecialization(spec.id, 'name', e.target.value)}
                              className="flex-1 p-3 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500 transition bg-white"
                            >
                              <option value="">{t.selectSpecialty}</option>
                              {SPECIALTIES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                            
                            {spec.isPrimary ? (
                              <span className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full whitespace-nowrap">
                                {t.primarySpecialty}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => removeSpecialization(spec.id)}
                                className="text-red-400 hover:text-red-600 p-2"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            )}
                          </div>
                        ))}
                        
                        {/* Add More Specialties Button */}
                        <button
                          type="button"
                          onClick={addSpecialization}
                          className="w-full p-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition flex items-center justify-center gap-2"
                        >
                          <i className="fas fa-plus-circle"></i>
                          {t.addSpecialty}
                        </button>
                      </div>
                    </div>
                    
                    {/* === EXPERIENCE === */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        {t.experienceYears} <span className="text-slate-400 font-normal">({t.optional})</span>
                      </label>
                      <input
                        type="number"
                        value={data.experienceYears}
                        onChange={(e) => updateData('experienceYears', e.target.value)}
                        className="w-full p-4 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 transition"
                        placeholder="10"
                        min="0"
                        max="60"
                      />
                    </div>
                    
                    {/* Click outside to close any dropdown */}
                    {showInstitutionDropdown && (
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowInstitutionDropdown(null)}
                      />
                    )}
                  </div>
                )}

                {/* Step 3: Verification */}
                {step === 'verification' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                      <i className="fas fa-info-circle text-amber-500 mt-0.5"></i>
                      <p className="text-sm text-amber-800">{t.verificationNote}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        {t.bmdcNumber} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={data.bmdcNumber}
                          onChange={(e) => updateData('bmdcNumber', e.target.value.toUpperCase())}
                          className={`w-full p-4 border-2 rounded-xl outline-none transition pr-12 ${
                            errors.bmdcNumber ? 'border-red-300 bg-red-50' : 
                            data.bmdcNumber.match(/^[A-Z]-\d{4,6}$/) ? 'border-green-500 bg-green-50' : 
                            'border-slate-200 focus:border-blue-500'
                          }`}
                          placeholder="A-12345"
                        />
                        {data.bmdcNumber.match(/^[A-Z]-\d{4,6}$/) && (
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">
                            <i className="fas fa-check-circle text-xl"></i>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mt-1">{t.bmdcNote}</p>
                      {data.bmdcNumber.match(/^[A-Z]-\d{4,6}$/) && (
                        <p className="text-green-600 text-sm mt-1 flex items-center gap-1">
                          <i className="fas fa-check"></i> {isBn ? 'সঠিক ফরম্যাট' : 'Valid format'}
                        </p>
                      )}
                      {errors.bmdcNumber && <p className="text-red-500 text-sm mt-1">{errors.bmdcNumber}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        {t.nidNumber} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={data.nidNumber}
                          onChange={(e) => updateData('nidNumber', e.target.value.replace(/\D/g, ''))}
                          className={`w-full p-4 border-2 rounded-xl outline-none transition pr-12 ${
                            errors.nidNumber ? 'border-red-300 bg-red-50' : 
                            (data.nidNumber.length === 10 || data.nidNumber.length === 17) ? 'border-green-500 bg-green-50' : 
                            'border-slate-200 focus:border-blue-500'
                          }`}
                          placeholder="1234567890 or 12345678901234567"
                          maxLength={17}
                        />
                        {(data.nidNumber.length === 10 || data.nidNumber.length === 17) && (
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">
                            <i className="fas fa-check-circle text-xl"></i>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mt-1">{t.nidNote}</p>
                      {(data.nidNumber.length === 10 || data.nidNumber.length === 17) && (
                        <p className="text-green-600 text-sm mt-1 flex items-center gap-1">
                          <i className="fas fa-check"></i> {isBn ? `সঠিক (${data.nidNumber.length} সংখ্যা)` : `Valid (${data.nidNumber.length} digits)`}
                        </p>
                      )}
                      {data.nidNumber.length > 0 && data.nidNumber.length !== 10 && data.nidNumber.length !== 17 && (
                        <p className="text-amber-600 text-sm mt-1 flex items-center gap-1">
                          <i className="fas fa-info-circle"></i> {isBn ? `${data.nidNumber.length}/10 বা 17 সংখ্যা` : `${data.nidNumber.length}/10 or 17 digits`}
                        </p>
                      )}
                      {errors.nidNumber && <p className="text-red-500 text-sm mt-1">{errors.nidNumber}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        {t.profilePhoto} <span className="text-slate-400 font-normal">({t.optional})</span>
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 2 * 1024 * 1024) {
                                alert(isBn ? 'ফাইল সাইজ ২MB এর বেশি হতে পারবে না' : 'File size must be less than 2MB');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                updateData('profilePhotoUrl', reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                          id="profile-photo-upload"
                        />
                        <label
                          htmlFor="profile-photo-upload"
                          className="block border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition cursor-pointer"
                        >
                          {data.profilePhotoUrl ? (
                            <div className="flex flex-col items-center">
                              <img src={data.profilePhotoUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-blue-500 mb-3" />
                              <p className="text-green-600 font-medium flex items-center gap-1">
                                <i className="fas fa-check-circle"></i>
                                {isBn ? 'ছবি আপলোড হয়েছে' : 'Photo uploaded'}
                              </p>
                              <p className="text-xs text-slate-400 mt-1">{isBn ? 'পরিবর্তন করতে ক্লিক করুন' : 'Click to change'}</p>
                            </div>
                          ) : (
                            <>
                              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <i className="fas fa-user-md text-3xl text-slate-400"></i>
                              </div>
                              <p className="text-slate-500">{t.uploadPhoto}</p>
                              <p className="text-xs text-slate-400 mt-1">JPG, PNG (Max 2MB)</p>
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Review */}
                {step === 'review' && (
                  <div className="space-y-6 animate-fade-in">
                    <h3 className="text-lg font-bold text-slate-800">{t.reviewTitle}</h3>

                    {/* Personal Info */}
                    <div className="bg-slate-50 rounded-2xl p-6">
                      <h4 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                        <i className="fas fa-user text-blue-600"></i> {t.step1}
                      </h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-400 uppercase">{t.nameEn}</p>
                          <p className="font-bold text-slate-800">{data.nameEn}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 uppercase">{t.phone}</p>
                          <p className="font-bold text-slate-800">+880{normalizePhone(data.phone)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 uppercase">{t.gender}</p>
                          <p className="font-bold text-slate-800">{data.gender}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 uppercase">{t.dateOfBirth}</p>
                          <p className="font-bold text-slate-800">{data.dateOfBirth}</p>
                        </div>
                      </div>
                    </div>

                    {/* Qualifications */}
                    <div className="bg-slate-50 rounded-2xl p-6">
                      <h4 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                        <i className="fas fa-graduation-cap text-blue-600"></i> {t.qualifications}
                      </h4>
                      <div className="space-y-3">
                        {data.qualifications.filter(q => q.degree).map((qual, index) => (
                          <div key={qual.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-slate-800">
                                {qual.degree}
                                {qual.field && <span className="text-slate-500 font-normal"> ({qual.field})</span>}
                              </p>
                              <p className="text-sm text-slate-500">
                                {qual.institution}
                                {qual.yearOfCompletion && ` • ${qual.yearOfCompletion}`}
                              </p>
                            </div>
                            {qual.isPrimary && (
                              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">Primary</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Specializations */}
                    <div className="bg-slate-50 rounded-2xl p-6">
                      <h4 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                        <i className="fas fa-stethoscope text-blue-600"></i> {t.specializations}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {data.specializations.filter(s => s.name).map((spec) => (
                          <span 
                            key={spec.id} 
                            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                              spec.isPrimary 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-white border border-slate-200 text-slate-700'
                            }`}
                          >
                            {spec.name}
                            {spec.isPrimary && <i className="fas fa-star ml-1 text-xs"></i>}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Verification */}
                    <div className="bg-slate-50 rounded-2xl p-6">
                      <h4 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                        <i className="fas fa-shield-alt text-blue-600"></i> {t.step3}
                      </h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-400 uppercase">{t.bmdcNumber}</p>
                          <p className="font-bold text-slate-800">{data.bmdcNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 uppercase">{t.nidNumber}</p>
                          <p className="font-bold text-slate-800">{data.nidNumber.replace(/(\d{4})/g, '$1 ').trim()}</p>
                        </div>
                      </div>
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="w-5 h-5 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-600">{t.termsAgree}</span>
                    </label>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-4 mt-8 pt-6 border-t border-slate-100">
                  {currentStepIndex > 0 && (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex-1 py-4 border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition"
                    >
                      <i className="fas fa-arrow-left mr-2"></i> {t.back}
                    </button>
                  )}
                  
                  {step === 'review' ? (
                    <button
                      type="button"
                      onClick={() => { handleSubmit(); setSubmitted(true); }}
                      disabled={!agreedToTerms || isSubmitting}
                      className="flex-[2] py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <><i className="fas fa-circle-notch fa-spin mr-2"></i> {t.submitting}</>
                      ) : (
                        <><i className="fas fa-paper-plane mr-2"></i> {t.submit}</>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex-[2] py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
                    >
                      {t.next} <i className="fas fa-arrow-right ml-2"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

