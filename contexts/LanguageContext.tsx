import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'bn';

interface Translations {
  [key: string]: { en: string; bn: string };
}

export const translations: Translations = {
  // Brand
  'brand.name': { en: 'Nirnoy', bn: 'নির্ণয়' },
  'brand.tagline': { en: 'Health Synchronized', bn: 'স্বাস্থ্য সমন্বিত' },
  
  // Navigation
  'nav.home': { en: 'Home', bn: 'হোম' },
  'nav.findDoctor': { en: 'Find Doctor', bn: 'ডাক্তার খুঁজুন' },
  'nav.myHealth': { en: 'My Health', bn: 'আমার স্বাস্থ্য' },
  'nav.family': { en: 'Family', bn: 'পরিবার' },
  'nav.appointments': { en: 'Appointments', bn: 'অ্যাপয়েন্টমেন্ট' },
  'nav.login': { en: 'Login', bn: 'লগইন' },
  'nav.logout': { en: 'Logout', bn: 'লগআউট' },
  'nav.getStarted': { en: 'Get Started', bn: 'শুরু করুন' },
  'nav.forDoctors': { en: 'For Doctors', bn: 'ডাক্তারদের জন্য' },
  'nav.myPractice': { en: 'My Practice', bn: 'আমার প্র্যাকটিস' },
  
  // Hero Section
  'hero.title1': { en: 'Healthcare,', bn: 'স্বাস্থ্যসেবা,' },
  'hero.title2': { en: 'Synchronized.', bn: 'সমন্বিত।' },
  'hero.subtitle': { en: 'AI-powered healthcare platform for Bangladesh. Find doctors, track health, connect family.', bn: 'বাংলাদেশের জন্য AI-চালিত স্বাস্থ্যসেবা প্ল্যাটফর্ম। ডাক্তার খুঁজুন, স্বাস্থ্য ট্র্যাক করুন, পরিবার সংযুক্ত করুন।' },
  'hero.searchPlaceholder': { en: 'Search doctors, specialties...', bn: 'ডাক্তার, বিশেষত্ব খুঁজুন...' },
  'hero.search': { en: 'Search', bn: 'খুঁজুন' },
  
  // Specialties
  'spec.cardiology': { en: 'Cardiology', bn: 'হৃদরোগ' },
  'spec.medicine': { en: 'Medicine', bn: 'মেডিসিন' },
  'spec.gynaecology': { en: 'Gynaecology', bn: 'স্ত্রীরোগ' },
  'spec.paediatrics': { en: 'Paediatrics', bn: 'শিশুরোগ' },
  'spec.orthopedics': { en: 'Orthopedics', bn: 'হাড় ও জোড়া' },
  'spec.dermatology': { en: 'Dermatology', bn: 'চর্মরোগ' },
  'spec.ent': { en: 'ENT', bn: 'নাক-কান-গলা' },
  'spec.eye': { en: 'Eye', bn: 'চক্ষু' },
  'spec.neurology': { en: 'Neurology', bn: 'স্নায়ুরোগ' },
  'spec.psychiatry': { en: 'Psychiatry', bn: 'মনোরোগ' },
  
  // Voice Agent
  'voice.title': { en: 'Talk to Nree', bn: 'Nree-এর সাথে কথা বলুন' },
  'voice.subtitle': { en: 'Our AI assistant speaks Bangla. Book appointments, ask health questions.', bn: 'আমাদের AI সহকারী বাংলায় কথা বলে। অ্যাপয়েন্টমেন্ট নিন, স্বাস্থ্য প্রশ্ন করুন।' },
  'voice.male': { en: 'Male Voice', bn: 'পুরুষ কণ্ঠ' },
  'voice.female': { en: 'Female Voice', bn: 'মহিলা কণ্ঠ' },
  'voice.connect': { en: 'Connect', bn: 'কানেক্ট' },
  'voice.endCall': { en: 'End Call', bn: 'শেষ করুন' },
  'voice.listening': { en: 'Listening...', bn: 'শুনছি...' },
  'voice.speaking': { en: 'Speaking...', bn: 'বলছি...' },
  
  // Features
  'feature.voiceBooking': { en: 'Voice Booking', bn: 'ভয়েস বুকিং' },
  'feature.liveQueue': { en: 'Live Queue', bn: 'লাইভ কিউ' },
  'feature.healthRecords': { en: 'Health Records', bn: 'স্বাস্থ্য রেকর্ড' },
  'feature.familyHealth': { en: 'Family Health', bn: 'পারিবারিক স্বাস্থ্য' },
  'feature.aiAssistant': { en: 'AI Assistant', bn: 'AI সহকারী' },
  'feature.smartAlerts': { en: 'Smart Alerts', bn: 'স্মার্ট এলার্ট' },
  
  // Doctor Dashboard
  'doctor.dashboard': { en: 'Doctor Dashboard', bn: 'ডাক্তার ড্যাশবোর্ড' },
  'doctor.warRoom': { en: 'War Room', bn: 'ওয়ার রুম' },
  'doctor.todayPatients': { en: "Today's Patients", bn: 'আজকের রোগী' },
  'doctor.queue': { en: 'Queue Management', bn: 'কিউ ম্যানেজমেন্ট' },
  'doctor.aiCopilot': { en: 'AI Copilot', bn: 'AI কপাইলট' },
  'doctor.prescriptions': { en: 'Prescriptions', bn: 'প্রেসক্রিপশন' },
  'doctor.analytics': { en: 'Analytics', bn: 'বিশ্লেষণ' },
  'doctor.settings': { en: 'Settings', bn: 'সেটিংস' },
  
  // Patient Dashboard
  'patient.dashboard': { en: 'My Health', bn: 'আমার স্বাস্থ্য' },
  'patient.healthBrain': { en: 'Health Brain', bn: 'হেলথ ব্রেইন' },
  'patient.talkToAI': { en: 'Talk to AI', bn: 'AI-এর সাথে কথা বলুন' },
  'patient.records': { en: 'Health Records', bn: 'স্বাস্থ্য রেকর্ড' },
  'patient.appointments': { en: 'Appointments', bn: 'অ্যাপয়েন্টমেন্ট' },
  'patient.prescriptions': { en: 'Prescriptions', bn: 'প্রেসক্রিপশন' },
  'patient.family': { en: 'Family Health', bn: 'পারিবারিক স্বাস্থ্য' },
  
  // Family
  'family.title': { en: 'Family Health', bn: 'পারিবারিক স্বাস্থ্য' },
  'family.subtitle': { en: 'Look after everyone you love', bn: 'যাদের ভালোবাসেন তাদের যত্ন নিন' },
  'family.addMember': { en: 'Add Family Member', bn: 'সদস্য যোগ করুন' },
  'family.viewAll': { en: 'View All Members', bn: 'সব সদস্য দেখুন' },
  'family.relation.self': { en: 'Self', bn: 'নিজে' },
  'family.relation.spouse': { en: 'Spouse', bn: 'স্বামী/স্ত্রী' },
  'family.relation.child': { en: 'Child', bn: 'সন্তান' },
  'family.relation.parent': { en: 'Parent', bn: 'বাবা/মা' },
  'family.relation.sibling': { en: 'Sibling', bn: 'ভাই/বোন' },
  'family.relation.grandparent': { en: 'Grandparent', bn: 'দাদা/দাদি/নানা/নানি' },
  
  // Common
  'common.loading': { en: 'Loading...', bn: 'লোড হচ্ছে...' },
  'common.save': { en: 'Save', bn: 'সংরক্ষণ' },
  'common.cancel': { en: 'Cancel', bn: 'বাতিল' },
  'common.confirm': { en: 'Confirm', bn: 'নিশ্চিত' },
  'common.delete': { en: 'Delete', bn: 'মুছুন' },
  'common.edit': { en: 'Edit', bn: 'সম্পাদনা' },
  'common.view': { en: 'View', bn: 'দেখুন' },
  'common.back': { en: 'Back', bn: 'পিছনে' },
  'common.next': { en: 'Next', bn: 'পরবর্তী' },
  'common.submit': { en: 'Submit', bn: 'জমা দিন' },
  'common.search': { en: 'Search', bn: 'খুঁজুন' },
  'common.filter': { en: 'Filter', bn: 'ফিল্টার' },
  'common.sort': { en: 'Sort', bn: 'সাজান' },
  'common.all': { en: 'All', bn: 'সব' },
  'common.noResults': { en: 'No results found', bn: 'কিছু পাওয়া যায়নি' },
  'common.success': { en: 'Success', bn: 'সফল' },
  'common.error': { en: 'Error', bn: 'ত্রুটি' },
  'common.today': { en: 'Today', bn: 'আজ' },
  'common.tomorrow': { en: 'Tomorrow', bn: 'আগামীকাল' },
  'common.yesterday': { en: 'Yesterday', bn: 'গতকাল' },
  'common.years': { en: 'years', bn: 'বছর' },
  'common.experience': { en: 'Experience', bn: 'অভিজ্ঞতা' },
  'common.rating': { en: 'Rating', bn: 'রেটিং' },
  'common.fee': { en: 'Fee', bn: 'ফি' },
  'common.book': { en: 'Book', bn: 'বুক করুন' },
  'common.bookNow': { en: 'Book Now', bn: 'এখনই বুক করুন' },
  
  // Footer
  'footer.about': { en: 'About', bn: 'সম্পর্কে' },
  'footer.privacy': { en: 'Privacy', bn: 'গোপনীয়তা' },
  'footer.terms': { en: 'Terms', bn: 'শর্তাবলী' },
  'footer.contact': { en: 'Contact', bn: 'যোগাযোগ' },
  'footer.copyright': { en: '© 2025 Nirnoy. All rights reserved.', bn: '© ২০২৫ নির্ণয়। সর্বস্বত্ব সংরক্ষিত।' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: React.Dispatch<React.SetStateAction<Language>>;
  t: (key: string) => string;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('nirnoy_language') as Language) || 'bn';
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

