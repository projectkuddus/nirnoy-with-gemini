import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

interface FAQItem {
  id: string;
  questionBn: string;
  questionEn: string;
  answerBn: string;
  answerEn: string;
  category: 'general' | 'patient' | 'doctor' | 'payment' | 'technical';
}

const FAQ_DATA: FAQItem[] = [
  // General
  {
    id: 'g1',
    category: 'general',
    questionBn: 'নির্ণয় কি?',
    questionEn: 'What is Nirnoy?',
    answerBn: 'নির্ণয় বাংলাদেশের প্রথম AI-চালিত স্বাস্থ্যসেবা প্ল্যাটফর্ম। এখানে আপনি বিশেষজ্ঞ ডাক্তারদের সাথে অনলাইনে পরামর্শ নিতে পারবেন, AI স্বাস্থ্য সহায়ক ব্যবহার করতে পারবেন, এবং আপনার স্বাস্থ্য রেকর্ড সংরক্ষণ করতে পারবেন।',
    answerEn: 'Nirnoy is Bangladesh\'s first AI-powered healthcare platform. Here you can consult with specialist doctors online, use AI health assistant, and store your health records securely.'
  },
  {
    id: 'g2',
    category: 'general',
    questionBn: 'নির্ণয় কি বিনামূল্যে?',
    questionEn: 'Is Nirnoy free?',
    answerBn: 'হ্যাঁ, নির্ণয়ের বেসিক ফিচার বিনামূল্যে। AI স্বাস্থ্য সহায়ক, ডাক্তার খুঁজুন, এবং প্রোফাইল ম্যানেজমেন্ট ফ্রি। প্রিমিয়াম ফিচার যেমন ওষুধ রিমাইন্ডার, ফুড স্ক্যানার, কাস্টম ডায়েট চার্ট ইত্যাদির জন্য সাবস্ক্রিপশন প্রয়োজন।',
    answerEn: 'Yes, basic features of Nirnoy are free. AI health assistant, doctor search, and profile management are free. Premium features like medication reminders, food scanner, custom diet charts require subscription.'
  },
  {
    id: 'g3',
    category: 'general',
    questionBn: 'আমার ডেটা কি নিরাপদ?',
    questionEn: 'Is my data safe?',
    answerBn: 'অবশ্যই! আমরা আপনার সব স্বাস্থ্য ডেটা এনক্রিপ্টেড ক্লাউড সার্ভারে সংরক্ষণ করি। শুধুমাত্র আপনি এবং আপনার অনুমোদিত ডাক্তার এই ডেটা দেখতে পারবেন। আমরা কোনো তৃতীয় পক্ষের সাথে আপনার ডেটা শেয়ার করি না।',
    answerEn: 'Absolutely! We store all your health data on encrypted cloud servers. Only you and your authorized doctors can access this data. We never share your data with third parties.'
  },
  
  // Patient
  {
    id: 'p1',
    category: 'patient',
    questionBn: 'কিভাবে রেজিস্ট্রেশন করব?',
    questionEn: 'How do I register?',
    answerBn: '"রেজিস্টার" বাটনে ক্লিক করুন, আপনার মোবাইল নম্বর দিন, OTP ভেরিফাই করুন, এবং আপনার নাম ও অন্যান্য তথ্য দিন। ব্যস, আপনার অ্যাকাউন্ট তৈরি!',
    answerEn: 'Click "Register" button, enter your mobile number, verify OTP, and provide your name and other details. That\'s it, your account is created!'
  },
  {
    id: 'p2',
    category: 'patient',
    questionBn: 'AI স্বাস্থ্য সহায়ক কিভাবে কাজ করে?',
    questionEn: 'How does AI health assistant work?',
    answerBn: 'AI সহায়ক আপনার লক্ষণ শুনে প্রাথমিক ধারণা দেয়। এটি ডাক্তারের বিকল্প নয়, শুধু প্রাথমিক গাইডেন্স। গুরুতর সমস্যায় অবশ্যই ডাক্তারের পরামর্শ নিন।',
    answerEn: 'AI assistant listens to your symptoms and provides initial guidance. It\'s not a replacement for doctors, just preliminary guidance. Always consult a doctor for serious issues.'
  },
  {
    id: 'p3',
    category: 'patient',
    questionBn: 'ডাক্তারের অ্যাপয়েন্টমেন্ট কিভাবে নেব?',
    questionEn: 'How do I book a doctor appointment?',
    answerBn: '"ডাক্তার খুঁজুন" থেকে আপনার পছন্দের ডাক্তার বাছাই করুন, তাঁর প্রোফাইলে যান, সুবিধাজনক সময় বেছে নিন, এবং "বুক করুন" বাটনে ক্লিক করুন।',
    answerEn: 'Go to "Find Doctor", select your preferred doctor, visit their profile, choose a convenient time slot, and click "Book Appointment".'
  },
  {
    id: 'p4',
    category: 'patient',
    questionBn: 'আমার প্রোফাইল তথ্য কিভাবে আপডেট করব?',
    questionEn: 'How do I update my profile?',
    answerBn: 'লগইন করার পর ড্যাশবোর্ডে যান, "হোম" ট্যাবে প্রোফাইল সেকশনে "সম্পাদনা" বাটনে ক্লিক করুন। আপনার তথ্য পরিবর্তন করে "সংরক্ষণ" করুন।',
    answerEn: 'After login, go to dashboard, click "Edit" in the profile section on "Home" tab. Make your changes and click "Save".'
  },
  
  // Doctor
  {
    id: 'd1',
    category: 'doctor',
    questionBn: 'ডাক্তার হিসেবে কিভাবে যোগ দেব?',
    questionEn: 'How do I join as a doctor?',
    answerBn: '"ডাক্তার রেজিস্ট্রেশন" পেজে যান, আপনার BMDC নম্বর, ডিগ্রি, স্পেশালিটি সহ সব তথ্য দিন। আমাদের টিম যাচাই করে ২৪-৪৮ ঘন্টার মধ্যে অনুমোদন দেবে।',
    answerEn: 'Go to "Doctor Registration" page, provide your BMDC number, degrees, specialty and all details. Our team will verify and approve within 24-48 hours.'
  },
  {
    id: 'd2',
    category: 'doctor',
    questionBn: 'ডাক্তার অ্যাকাউন্ট অনুমোদন পেতে কত সময় লাগে?',
    questionEn: 'How long does doctor account approval take?',
    answerBn: 'সাধারণত ২৪-৪৮ ঘন্টা। তবে সব ডকুমেন্ট সঠিক থাকলে আরও দ্রুত হতে পারে। অনুমোদন হলে SMS এবং ইমেইলে জানানো হবে।',
    answerEn: 'Usually 24-48 hours. Can be faster if all documents are correct. You\'ll be notified via SMS and email upon approval.'
  },
  {
    id: 'd3',
    category: 'doctor',
    questionBn: 'কনসালটেশন ফি কিভাবে সেট করব?',
    questionEn: 'How do I set consultation fees?',
    answerBn: 'ডাক্তার ড্যাশবোর্ডে "সেটিংস" ট্যাবে যান। সেখানে আপনি আপনার কনসালটেশন ফি, চেম্বার টাইমিং, এবং অন্যান্য প্রেফারেন্স সেট করতে পারবেন।',
    answerEn: 'Go to "Settings" tab in doctor dashboard. There you can set your consultation fee, chamber timing, and other preferences.'
  },
  
  // Payment
  {
    id: 'pay1',
    category: 'payment',
    questionBn: 'কোন পেমেন্ট মেথড সাপোর্ট করে?',
    questionEn: 'What payment methods are supported?',
    answerBn: 'বিকাশ, নগদ, রকেট, এবং সব প্রধান ব্যাংক কার্ড (Visa, Mastercard) সাপোর্ট করি। শীঘ্রই আরও অপশন যোগ হবে।',
    answerEn: 'We support bKash, Nagad, Rocket, and all major bank cards (Visa, Mastercard). More options coming soon.'
  },
  {
    id: 'pay2',
    category: 'payment',
    questionBn: 'সাবস্ক্রিপশন ক্যান্সেল করতে পারব?',
    questionEn: 'Can I cancel my subscription?',
    answerBn: 'হ্যাঁ, যেকোনো সময় ক্যান্সেল করতে পারবেন। প্রোফাইলে "সাবস্ক্রিপশন" সেকশনে যান এবং "ক্যান্সেল" করুন। বর্তমান বিলিং সাইকেল শেষ পর্যন্ত সার্ভিস পাবেন।',
    answerEn: 'Yes, you can cancel anytime. Go to "Subscription" section in profile and click "Cancel". You\'ll have access until the current billing cycle ends.'
  },
  {
    id: 'pay3',
    category: 'payment',
    questionBn: 'রিফান্ড পলিসি কি?',
    questionEn: 'What is the refund policy?',
    answerBn: 'ডাক্তার অ্যাপয়েন্টমেন্ট ক্যান্সেল করলে ২৪ ঘন্টা আগে জানালে ফুল রিফান্ড। সাবস্ক্রিপশনের ক্ষেত্রে ৭ দিনের মধ্যে অসন্তুষ্ট হলে রিফান্ড দেওয়া হয়।',
    answerEn: 'Full refund for doctor appointments if cancelled 24 hours before. For subscriptions, refund available within 7 days if unsatisfied.'
  },
  
  // Technical
  {
    id: 't1',
    category: 'technical',
    questionBn: 'অ্যাপ কি মোবাইলে কাজ করে?',
    questionEn: 'Does the app work on mobile?',
    answerBn: 'হ্যাঁ! নির্ণয় সব ডিভাইসে কাজ করে - মোবাইল, ট্যাবলেট, এবং কম্পিউটার। ব্রাউজারে nirnoy.ai ওপেন করুন।',
    answerEn: 'Yes! Nirnoy works on all devices - mobile, tablet, and computer. Just open nirnoy.ai in your browser.'
  },
  {
    id: 't2',
    category: 'technical',
    questionBn: 'পাসওয়ার্ড ভুলে গেছি, কি করব?',
    questionEn: 'I forgot my password, what do I do?',
    answerBn: 'আমরা পাসওয়ার্ড ব্যবহার করি না! আপনার মোবাইল নম্বর দিয়ে লগইন করুন, OTP পাবেন, সেটা দিয়ে লগইন করুন। সহজ এবং নিরাপদ!',
    answerEn: 'We don\'t use passwords! Login with your mobile number, receive OTP, and login with that. Simple and secure!'
  },
  {
    id: 't3',
    category: 'technical',
    questionBn: 'OTP আসছে না, কি করব?',
    questionEn: 'Not receiving OTP, what should I do?',
    answerBn: '১. নম্বর সঠিক কিনা চেক করুন। ২. ১-২ মিনিট অপেক্ষা করুন। ৩. "আবার পাঠান" ক্লিক করুন। ৪. সমস্যা থাকলে support@nirnoy.ai তে মেইল করুন।',
    answerEn: '1. Check if number is correct. 2. Wait 1-2 minutes. 3. Click "Resend". 4. If problem persists, email support@nirnoy.ai'
  },
  {
    id: 't4',
    category: 'technical',
    questionBn: 'সাপোর্টে কিভাবে যোগাযোগ করব?',
    questionEn: 'How do I contact support?',
    answerBn: 'ইমেইল: support@nirnoy.ai। রেজিস্টার্ড ইউজার হলে ড্যাশবোর্ডে "মতামত" ট্যাব থেকে সরাসরি মেসেজ করতে পারবেন।',
    answerEn: 'Email: support@nirnoy.ai. If you\'re a registered user, you can message directly from "Feedback" tab in your dashboard.'
  },
];

const CATEGORIES = [
  { id: 'all', labelBn: 'সব', labelEn: 'All' },
  { id: 'general', labelBn: 'সাধারণ', labelEn: 'General' },
  { id: 'patient', labelBn: 'রোগী', labelEn: 'Patient' },
  { id: 'doctor', labelBn: 'ডাক্তার', labelEn: 'Doctor' },
  { id: 'payment', labelBn: 'পেমেন্ট', labelEn: 'Payment' },
  { id: 'technical', labelBn: 'টেকনিক্যাল', labelEn: 'Technical' },
];

export const FAQ: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';
  
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFAQs = FAQ_DATA.filter(faq => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch = searchQuery === '' || 
      faq.questionBn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.questionEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answerBn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answerEn.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate('/')} className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">ন</span>
              </div>
              <span className="font-bold text-xl text-gray-800">নির্ণয়</span>
            </button>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/patient-auth')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm"
              >
                {isBn ? 'লগইন / রেজিস্টার' : 'Login / Register'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">
            {isBn ? '❓ সাধারণ প্রশ্নোত্তর' : '❓ Frequently Asked Questions'}
          </h1>
          <p className="text-blue-100 text-lg mb-8">
            {isBn ? 'আপনার প্রশ্নের উত্তর খুঁজুন' : 'Find answers to your questions'}
          </p>
          
          {/* Search */}
          <div className="max-w-xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isBn ? '🔍 প্রশ্ন খুঁজুন...' : '🔍 Search questions...'}
                className="w-full px-5 py-4 rounded-xl text-gray-800 text-lg focus:outline-none focus:ring-4 focus:ring-blue-300"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-4xl mx-auto px-4 -mt-6">
        <div className="bg-white rounded-xl shadow-lg p-2 flex flex-wrap gap-2 justify-center">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {isBn ? cat.labelBn : cat.labelEn}
            </button>
          ))}
        </div>
      </section>

      {/* FAQ List */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        {filteredFAQs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-medium text-gray-700">
              {isBn ? 'কোনো প্রশ্ন পাওয়া যায়নি' : 'No questions found'}
            </h3>
            <p className="text-gray-500 mt-2">
              {isBn ? 'অন্য কিছু খুঁজে দেখুন' : 'Try searching for something else'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFAQs.map((faq) => (
              <div
                key={faq.id}
                className="bg-white rounded-xl border shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-800 text-lg pr-4">
                    {isBn ? faq.questionBn : faq.questionEn}
                  </span>
                  <span className={`text-2xl text-blue-600 transition-transform ${
                    expandedId === faq.id ? 'rotate-45' : ''
                  }`}>
                    +
                  </span>
                </button>
                
                {expandedId === faq.id && (
                  <div className="px-6 pb-5 border-t bg-gray-50">
                    <p className="text-gray-600 pt-4 leading-relaxed">
                      {isBn ? faq.answerBn : faq.answerEn}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Still have questions? */}
      <section className="bg-gray-100 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {isBn ? 'আরও প্রশ্ন আছে?' : 'Still have questions?'}
          </h2>
          <p className="text-gray-600 mb-6">
            {isBn 
              ? 'রেজিস্টার করুন এবং সরাসরি আমাদের সাথে যোগাযোগ করুন'
              : 'Register and contact us directly'}
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button
              onClick={() => navigate('/patient-auth')}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              {isBn ? '🚀 রেজিস্টার করুন' : '🚀 Register Now'}
            </button>
            <a
              href="mailto:support@nirnoy.ai"
              className="px-8 py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-medium hover:bg-blue-50 transition-colors"
            >
              {isBn ? '📧 ইমেইল করুন' : '📧 Email Us'}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">ন</span>
            </div>
            <span className="font-bold text-lg">নির্ণয়</span>
          </div>
          <p className="text-slate-400 text-sm">
            © 2024 Nirnoy Health. {isBn ? 'সর্বস্বত্ব সংরক্ষিত।' : 'All rights reserved.'}
          </p>
          <div className="flex gap-6 justify-center mt-4 text-sm text-slate-400">
            <button onClick={() => navigate('/privacy')} className="hover:text-white">
              {isBn ? 'গোপনীয়তা নীতি' : 'Privacy Policy'}
            </button>
            <button onClick={() => navigate('/terms')} className="hover:text-white">
              {isBn ? 'শর্তাবলী' : 'Terms of Service'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FAQ;

