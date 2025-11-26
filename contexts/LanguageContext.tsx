import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'bn';

interface Translations {
  [key: string]: {
    en: string;
    bn: string;
  };
}

// Comprehensive translations for the app
export const translations: Translations = {
  // Navbar
  'nav.brand': { en: 'Nirnoy Care', bn: 'নির্ণয় কেয়ার' },
  'nav.findDoctor': { en: 'Find a Doctor', bn: 'ডাক্তার খুঁজুন' },
  'nav.forDoctors': { en: 'For Doctors', bn: 'ডাক্তারদের জন্য' },
  'nav.myDashboard': { en: 'My Dashboard', bn: 'আমার ড্যাশবোর্ড' },
  'nav.bookAppointment': { en: 'Book Appointment', bn: 'অ্যাপয়েন্টমেন্ট বুক করুন' },
  'nav.myPractice': { en: 'My Practice', bn: 'আমার প্র্যাকটিস' },
  'nav.login': { en: 'Login / Signup', bn: 'লগইন / সাইন আপ' },
  'nav.logout': { en: 'Logout', bn: 'লগআউট' },

  // Landing Page - Hero
  'hero.badge': { en: 'Dhaka Live Queue Active', bn: 'ঢাকা লাইভ কিউ সক্রিয়' },
  'hero.title1': { en: 'Healthcare,', bn: 'স্বাস্থ্যসেবা,' },
  'hero.title2': { en: 'Synchronized.', bn: 'সমন্বিত।' },
  'hero.subtitle': { en: 'Experience the future of booking. Real-time doctor availability, live serial tracking, and AI-powered health records.', bn: 'বুকিংয়ের ভবিষ্যত অনুভব করুন। রিয়েল-টাইম ডাক্তার প্রাপ্যতা, লাইভ সিরিয়াল ট্র্যাকিং এবং AI-চালিত হেলথ রেকর্ড।' },
  'hero.searchPlaceholder': { en: 'Search doctors, specialties...', bn: 'ডাক্তার, বিশেষজ্ঞতা খুঁজুন...' },
  'hero.find': { en: 'Find', bn: 'খুঁজুন' },

  // Specialties
  'spec.cardiology': { en: 'Cardiology', bn: 'হৃদরোগ' },
  'spec.neurology': { en: 'Neurology', bn: 'স্নায়ুরোগ' },
  'spec.orthopedics': { en: 'Orthopedics', bn: 'অর্থোপেডিক্স' },
  'spec.medicine': { en: 'Medicine', bn: 'মেডিসিন' },
  'spec.dermatology': { en: 'Dermatology', bn: 'চর্মরোগ' },

  // Features Section
  'features.topSpecialists': { en: 'Top Specialists', bn: 'শীর্ষ বিশেষজ্ঞ' },
  'features.topSpecialistsDesc': { en: 'Instant access to 500+ BMDC verified experts from Square, Evercare, and PG Hospital.', bn: 'Square, Evercare এবং PG Hospital থেকে ৫০০+ BMDC যাচাইকৃত বিশেষজ্ঞদের তাৎক্ষণিক অ্যাক্সেস।' },
  'features.bookAppointment': { en: 'Book Appointment', bn: 'অ্যাপয়েন্টমেন্ট বুক করুন' },
  'features.healthIntelligence': { en: 'Health Intelligence', bn: 'হেলথ ইন্টেলিজেন্স' },
  'features.healthIntelligenceDesc': { en: 'Nirnoy AI analyzes your prescriptions and vitals to provide personalized health insights.', bn: 'নির্ণয় AI আপনার প্রেসক্রিপশন এবং ভাইটাল বিশ্লেষণ করে ব্যক্তিগত স্বাস্থ্য অন্তর্দৃষ্টি প্রদান করে।' },
  'features.liveQueue': { en: 'Live Queue', bn: 'লাইভ কিউ' },
  'features.liveQueueDesc': { en: 'Track your serial in real-time. No more waiting for hours at the chamber.', bn: 'রিয়েল-টাইমে আপনার সিরিয়াল ট্র্যাক করুন। চেম্বারে ঘণ্টার পর ঘণ্টা অপেক্ষা নয়।' },
  'features.currentSerial': { en: 'Current Serial', bn: 'বর্তমান সিরিয়াল' },
  'features.yourSerial': { en: 'Your Serial', bn: 'আপনার সিরিয়াল' },
  'features.seamlessExperience': { en: 'Seamless Experience', bn: 'নির্বিঘ্ন অভিজ্ঞতা' },
  'features.seamlessExperienceDesc': { en: 'From finding the right doctor to getting digital prescriptions, we\'ve automated the entire workflow.', bn: 'সঠিক ডাক্তার খুঁজে পাওয়া থেকে ডিজিটাল প্রেসক্রিপশন পাওয়া পর্যন্ত, আমরা সম্পূর্ণ কর্মপ্রবাহ স্বয়ংক্রিয় করেছি।' },
  'features.appointmentsBooked': { en: 'Appointments Booked', bn: 'অ্যাপয়েন্টমেন্ট বুক হয়েছে' },

  // CTA Section
  'cta.forProfessionals': { en: 'For Medical Professionals', bn: 'মেডিকেল পেশাদারদের জন্য' },
  'cta.title1': { en: 'Your Practice,', bn: 'আপনার প্র্যাকটিস,' },
  'cta.title2': { en: 'Supercharged.', bn: 'সুপারচার্জড।' },
  'cta.description': { en: 'Stop managing queues on paper. Get a digital cockpit with live serial tracking, patient history ledger, and powerful AI summaries tailored for your clinical needs.', bn: 'কাগজে কিউ ম্যানেজ করা বন্ধ করুন। লাইভ সিরিয়াল ট্র্যাকিং, রোগীর ইতিহাস লেজার এবং আপনার ক্লিনিকাল প্রয়োজনের জন্য শক্তিশালী AI সারাংশ সহ একটি ডিজিটাল ককপিট পান।' },
  'cta.joinAsDoctor': { en: 'Join as Doctor', bn: 'ডাক্তার হিসেবে যোগ দিন' },
  'cta.viewFeatures': { en: 'View Features', bn: 'ফিচার দেখুন' },

  // Voice Section
  'voice.title': { en: 'Talk to Us Live', bn: 'বাংলায় কথা বলুন' },
  'voice.subtitle': { en: 'Experience our AI voice agents in fluent Bangla. Ask questions, check services, or book appointments directly.', bn: 'আমাদের AI এসিস্ট্যান্টের সাথে বাংলায় কথা বলুন। ডাক্তার খুঁজুন, অ্যাপয়েন্টমেন্ট বুক করুন, প্রশ্ন করুন।' },
  'voice.liveBeta': { en: 'Live Beta', bn: 'লাইভ বেটা' },
  'voice.connect': { en: 'Connect', bn: 'কানেক্ট করুন' },
  'voice.talkInBangla': { en: 'Talk in Bangla', bn: 'বাংলায় কথা বলুন' },
  'voice.endCall': { en: 'End Call', bn: 'কল শেষ করুন' },
  'voice.yunus': { en: 'Yunus', bn: 'ইউনুস' },
  'voice.yunusRole': { en: 'Male • Booking & Support', bn: 'পুরুষ • বুকিং ও সাপোর্ট' },
  'voice.arisha': { en: 'Arisha', bn: 'আরিশা' },
  'voice.arishaRole': { en: 'Female • General Inquiry', bn: 'মহিলা • সাধারণ জিজ্ঞাসা' },
  'voice.secure': { en: 'Private & Secure • Powered by Gemini Live', bn: 'নিরাপদ ও গোপনীয় • Powered by Gemini Live' },

  // Footer
  'footer.about': { en: 'About', bn: 'সম্পর্কে' },
  'footer.doctors': { en: 'Doctors', bn: 'ডাক্তার' },
  'footer.privacy': { en: 'Privacy', bn: 'গোপনীয়তা' },
  'footer.contact': { en: 'Contact', bn: 'যোগাযোগ' },
  'footer.tagline': { en: 'Intelligent Healthcare', bn: 'বুদ্ধিমান স্বাস্থ্যসেবা' },
  'footer.copyright': { en: 'Nirnoy Health Tech Ltd. Proudly made in Bangladesh 🇧🇩', bn: 'নির্ণয় হেলথ টেক লিমিটেড। গর্বের সাথে বাংলাদেশে তৈরি 🇧🇩' },

  // Login
  'login.patientLogin': { en: 'Patient Login', bn: 'রোগী লগইন' },
  'login.doctorLogin': { en: 'Doctor Login', bn: 'ডাক্তার লগইন' },
  'login.welcomeBack': { en: 'Welcome Back', bn: 'স্বাগতম' },
  'login.doctorPortal': { en: "Doctor's Portal", bn: 'ডাক্তারের পোর্টাল' },
  'login.patientDesc': { en: 'Access your prescriptions, appointments, and history.', bn: 'আপনার প্রেসক্রিপশন, অ্যাপয়েন্টমেন্ট এবং ইতিহাস অ্যাক্সেস করুন।' },
  'login.doctorDesc': { en: 'Manage your practice, chambers, and patients.', bn: 'আপনার প্র্যাকটিস, চেম্বার এবং রোগীদের পরিচালনা করুন।' },
  'login.mobileNumber': { en: 'Mobile Number', bn: 'মোবাইল নম্বর' },
  'login.enterOtp': { en: 'Enter OTP', bn: 'OTP দিন' },
  'login.getOtp': { en: 'Get OTP', bn: 'OTP পান' },
  'login.verifyLogin': { en: 'Verify & Login', bn: 'যাচাই করুন ও লগইন করুন' },
  'login.changeNumber': { en: 'Change Number', bn: 'নম্বর পরিবর্তন করুন' },
  'login.demoHint': { en: 'Use any number. OTP is not checked.', bn: 'যেকোনো নম্বর ব্যবহার করুন। OTP চেক করা হয় না।' },

  // Common
  'common.loading': { en: 'Loading Nirnoy Care...', bn: 'নির্ণয় কেয়ার লোড হচ্ছে...' },
  'common.dhaka': { en: 'Dhaka', bn: 'ঢাকা' },
  'common.chittagong': { en: 'Chittagong', bn: 'চট্টগ্রাম' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('nirnoy_language');
    return (saved === 'bn' || saved === 'en') ? saved : 'en';
  });

  useEffect(() => {
    localStorage.setItem('nirnoy_language', language);
  }, [language]);

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Missing translation for key: ${key}`);
      return key;
    }
    return translation[language];
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'bn' : 'en');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

