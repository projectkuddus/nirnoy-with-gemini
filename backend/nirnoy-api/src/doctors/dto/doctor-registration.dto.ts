// Doctor Registration DTO - Following Bangladesh Medical Standards

export class DoctorRegistrationDto {
  // === REQUIRED FOR REGISTRATION ===
  
  // Personal Info
  nameEn: string;           // Full name in English (as per BMDC)
  nameBn?: string;          // Full name in Bangla
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: string;      // ISO date string
  
  // Contact
  phone: string;            // Primary phone (used for OTP)
  email?: string;           // Professional email
  
  // BMDC Registration (Mandatory for Bangladesh)
  bmdcNumber: string;       // BMDC Registration Number
  bmdcCertificateUrl?: string; // Upload URL
  
  // NID Verification
  nidNumber: string;        // National ID Number
  nidFrontUrl?: string;     // NID front image URL
  nidBackUrl?: string;      // NID back image URL
  
  // Primary Qualification
  primaryDegree: string;    // "MBBS" | "BDS" etc.
  primaryInstitution: string;
  primaryYearOfCompletion: number;
  
  // Primary Specialty
  primarySpecialty: string;
  
  // Profile Photo
  profilePhotoUrl?: string;
}

export class DoctorQualificationDto {
  degree: string;
  field?: string;
  institution: string;
  institutionCity?: string;
  institutionCountry?: string;
  yearOfCompletion?: number;
  certificateUrl?: string;
}

export class DoctorExperienceDto {
  position: string;
  department?: string;
  institution: string;
  institutionType?: 'Government' | 'Private' | 'NGO' | 'International';
  city?: string;
  country?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
}

export class DoctorChamberDto {
  name: string;
  type: 'HOSPITAL' | 'CLINIC' | 'DIAGNOSTIC' | 'PERSONAL';
  address: string;
  area: string;
  city: string;
  district?: string;
  postalCode?: string;
  landmark?: string;
  googleMapsUrl?: string;
  phone?: string;
  daysOfWeek: string;  // "Sat,Mon,Wed"
  startTime: string;   // "10:00"
  endTime: string;     // "13:00"
  slotDuration?: number;
  maxPatients?: number;
  consultationFee?: number;
  followUpFee?: number;
  reportCheckFee?: number;
  isPrimary?: boolean;
  hasParking?: boolean;
  hasWheelchairAccess?: boolean;
  hasAC?: boolean;
}

export class DoctorProfileUpdateDto {
  // Basic Info
  nameEn?: string;
  nameBn?: string;
  title?: 'Dr.' | 'Prof.' | 'Assoc. Prof.' | 'Asst. Prof.';
  profilePhoto?: string;
  coverPhoto?: string;
  
  // Bio
  bioEn?: string;
  bioBn?: string;
  tagline?: string;
  
  // Consultation Fees
  consultationFeeNew?: number;
  consultationFeeFollowUp?: number;
  consultationFeeReport?: number;
  onlineConsultationFee?: number;
  avgConsultationTime?: number;
  
  // Availability
  isAvailableForOnline?: boolean;
  isAvailableForHomeVisit?: boolean;
  homeVisitFee?: number;
  homeVisitAreas?: string[];
  
  // Languages
  languages?: string[];
  
  // Contact
  professionalEmail?: string;
  professionalPhone?: string;
  websiteUrl?: string;
  
  // Social Media
  linkedinUrl?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  researchGateUrl?: string;
  
  // Preferences
  showPhonePublicly?: boolean;
  showEmailPublicly?: boolean;
  acceptNewPatients?: boolean;
}

export class DoctorAchievementDto {
  title: string;
  type: 'AWARD' | 'RECOGNITION' | 'FELLOWSHIP' | 'GRANT';
  organization: string;
  year?: number;
  description?: string;
  certificateUrl?: string;
}

export class DoctorPublicationDto {
  title: string;
  type: 'JOURNAL' | 'BOOK' | 'CHAPTER' | 'CONFERENCE' | 'THESIS';
  journal?: string;
  year?: number;
  authors?: string;
  doi?: string;
  url?: string;
  abstract?: string;
}

export class DoctorMembershipDto {
  organization: string;
  membershipType?: string;
  membershipId?: string;
  joinedYear?: number;
  expiryYear?: number;
  isActive?: boolean;
  certificateUrl?: string;
}

export class DoctorTrainingDto {
  title: string;
  type: 'TRAINING' | 'WORKSHOP' | 'CERTIFICATION' | 'CME';
  institution: string;
  country?: string;
  year?: number;
  duration?: string;
  certificateUrl?: string;
}

export class DoctorServiceDto {
  name: string;
  nameBn?: string;
  description?: string;
  fee?: number;
  duration?: number;
  isAvailable?: boolean;
}

export class DoctorFAQDto {
  question: string;
  questionBn?: string;
  answer: string;
  answerBn?: string;
  displayOrder?: number;
}

