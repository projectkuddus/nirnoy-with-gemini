import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import PageHeader from '../components/PageHeader';

// ============ TYPES ============
interface FAQItem {
  id: string;
  question: string;
  questionBn: string;
  answer: string;
  answerBn: string;
  category: string;
}

interface ContactOption {
  id: string;
  title: string;
  titleBn: string;
  description: string;
  descriptionBn: string;
  icon: string;
  action: string;
  actionLabel: string;
  actionLabelBn: string;
}

// ============ DATA ============
const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    category: 'booking',
    question: 'How do I book an appointment?',
    questionBn: 'কিভাবে অ্যাপয়েন্টমেন্ট বুক করব?',
    answer: 'You can book an appointment by searching for a doctor, selecting your preferred date and time slot, and completing the booking process. You will receive an SMS confirmation with your serial number.',
    answerBn: 'ডাক্তার খুঁজে, আপনার পছন্দের তারিখ ও সময় নির্বাচন করে বুকিং সম্পন্ন করুন। আপনি SMS এ সিরিয়াল নম্বর সহ কনফার্মেশন পাবেন।',
  },
  {
    id: '2',
    category: 'booking',
    question: 'Can I cancel or reschedule my appointment?',
    questionBn: 'অ্যাপয়েন্টমেন্ট বাতিল বা পরিবর্তন করতে পারব?',
    answer: 'Yes, you can cancel or reschedule your appointment from the "My Appointments" section up to 2 hours before your scheduled time. Cancellation fees may apply.',
    answerBn: 'হ্যাঁ, নির্ধারিত সময়ের ২ ঘণ্টা আগে পর্যন্ত "আমার অ্যাপয়েন্টমেন্ট" থেকে বাতিল বা পরিবর্তন করতে পারবেন। বাতিলের জন্য ফি প্রযোজ্য হতে পারে।',
  },
  {
    id: '3',
    category: 'payment',
    question: 'What payment methods are accepted?',
    questionBn: 'কোন পেমেন্ট পদ্ধতি গ্রহণযোগ্য?',
    answer: 'We accept bKash, Nagad, Rocket, credit/debit cards, and cash payment at the chamber. Online payment gives you priority booking.',
    answerBn: 'বিকাশ, নগদ, রকেট, ক্রেডিট/ডেবিট কার্ড এবং চেম্বারে নগদ গ্রহণ করা হয়। অনলাইন পেমেন্টে প্রায়োরিটি বুকিং পাবেন।',
  },
  {
    id: '4',
    category: 'payment',
    question: 'Is there a follow-up discount?',
    questionBn: 'ফলো-আপে কি ছাড় আছে?',
    answer: 'Yes! Follow-up visits within 15 days get 50% discount on consultation fees. Report check visits get 70% discount.',
    answerBn: 'হ্যাঁ! ১৫ দিনের মধ্যে ফলো-আপে ৫০% ছাড়। শুধু রিপোর্ট দেখাতে ৭০% ছাড়।',
  },
  {
    id: '5',
    category: 'queue',
    question: 'How does the live queue work?',
    questionBn: 'লাইভ কিউ কিভাবে কাজ করে?',
    answer: 'Our live queue shows your real-time position. You\'ll receive SMS updates when you\'re 3 patients away. The estimated time adjusts based on actual consultation durations.',
    answerBn: 'লাইভ কিউতে আপনার রিয়েল-টাইম পজিশন দেখায়। ৩ জন বাকি থাকলে SMS পাবেন। আনুমানিক সময় প্রকৃত কনসালটেশন সময়ের উপর ভিত্তি করে আপডেট হয়।',
  },
  {
    id: '6',
    category: 'queue',
    question: 'What if the doctor is delayed?',
    questionBn: 'ডাক্তার দেরি করলে কি হবে?',
    answer: 'You\'ll receive automatic SMS/app notifications about any delays. The live queue will show updated estimated times. You can also see doctor messages in the app.',
    answerBn: 'দেরি হলে স্বয়ংক্রিয় SMS/অ্যাপ নোটিফিকেশন পাবেন। লাইভ কিউতে আপডেটেড সময় দেখাবে। অ্যাপে ডাক্তারের মেসেজও দেখতে পারবেন।',
  },
  {
    id: '7',
    category: 'doctor',
    question: 'How do I register as a doctor?',
    questionBn: 'ডাক্তার হিসেবে কিভাবে রেজিস্টার করব?',
    answer: 'Click "For Doctors" on the homepage, fill in your details including BMDC registration number, upload verification documents, and our team will verify within 24-48 hours.',
    answerBn: '"ডাক্তারদের জন্য" ক্লিক করুন, BMDC নম্বর সহ তথ্য দিন, ডকুমেন্ট আপলোড করুন। ২৪-৪৮ ঘণ্টায় যাচাই হবে।',
  },
  {
    id: '8',
    category: 'doctor',
    question: 'How do I manage my schedule?',
    questionBn: 'আমার সিডিউল কিভাবে ম্যানেজ করব?',
    answer: 'From your Doctor Dashboard, go to Profile tab to set your chambers, timing, and slots. The Today\'s Schedule tab shows your daily appointments with queue management tools.',
    answerBn: 'ডাক্তার ড্যাশবোর্ডে Profile ট্যাবে চেম্বার, সময়, স্লট সেট করুন। Today\'s Schedule ট্যাবে দৈনিক অ্যাপয়েন্টমেন্ট ও কিউ ম্যানেজমেন্ট দেখুন।',
  },
  {
    id: '9',
    category: 'ai',
    question: 'How does the AI health assistant work?',
    questionBn: 'AI স্বাস্থ্য সহকারী কিভাবে কাজ করে?',
    answer: 'Our AI analyzes your health records, prescriptions, and consultation history to provide personalized insights. It can answer health questions, remind medications, and track your health trends.',
    answerBn: 'AI আপনার স্বাস্থ্য রেকর্ড, প্রেসক্রিপশন ও কনসালটেশন ইতিহাস বিশ্লেষণ করে। স্বাস্থ্য প্রশ্নের উত্তর, ওষুধের রিমাইন্ডার ও স্বাস্থ্য ট্রেন্ড ট্র্যাক করে।',
  },
  {
    id: '10',
    category: 'ai',
    question: 'Is my health data safe with AI?',
    questionBn: 'AI এর কাছে আমার স্বাস্থ্য ডেটা কি নিরাপদ?',
    answer: 'Absolutely. Your data is encrypted and processed securely. AI responses are generated in real-time and not stored. We never share your data with third parties or use it to train public models.',
    answerBn: 'অবশ্যই। আপনার ডেটা এনক্রিপ্টেড ও নিরাপদে প্রসেস হয়। AI রেসপন্স রিয়েল-টাইমে তৈরি হয়, সংরক্ষণ হয় না। থার্ড পার্টির সাথে শেয়ার বা পাবলিক মডেল ট্রেনিংয়ে ব্যবহার হয় না।',
  },
];

const CONTACT_OPTIONS: ContactOption[] = [
  {
    id: '1',
    title: 'Live Chat',
    titleBn: 'লাইভ চ্যাট',
    description: 'Chat with our support team instantly',
    descriptionBn: 'আমাদের সাপোর্ট টিমের সাথে তাৎক্ষণিক চ্যাট',
    icon: 'fa-comments',
    action: 'chat',
    actionLabel: 'Start Chat',
    actionLabelBn: 'চ্যাট শুরু করুন',
  },
  {
    id: '2',
    title: 'Phone Support',
    titleBn: 'ফোন সাপোর্ট',
    description: 'Call us: 09678-NIRNOY (647669)',
    descriptionBn: 'কল করুন: ০৯৬৭৮-নির্ণয় (৬৪৭৬৬৯)',
    icon: 'fa-phone-alt',
    action: 'tel:09678647669',
    actionLabel: 'Call Now',
    actionLabelBn: 'কল করুন',
  },
  {
    id: '3',
    title: 'Email',
    titleBn: 'ইমেইল',
    description: 'support@nirnoy.ai',
    descriptionBn: 'support@nirnoy.ai',
    icon: 'fa-envelope',
    action: 'mailto:support@nirnoy.ai',
    actionLabel: 'Send Email',
    actionLabelBn: 'ইমেইল পাঠান',
  },
  {
    id: '4',
    title: 'WhatsApp',
    titleBn: 'হোয়াটসঅ্যাপ',
    description: '+880 1712-NIRNOY',
    descriptionBn: '+৮৮০ ১৭১২-নির্ণয়',
    icon: 'fa-whatsapp',
    action: 'https://wa.me/8801712647669',
    actionLabel: 'Message Us',
    actionLabelBn: 'মেসেজ করুন',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All', labelBn: 'সব' },
  { id: 'booking', label: 'Booking', labelBn: 'বুকিং' },
  { id: 'payment', label: 'Payment', labelBn: 'পেমেন্ট' },
  { id: 'queue', label: 'Queue', labelBn: 'কিউ' },
  { id: 'doctor', label: 'For Doctors', labelBn: 'ডাক্তারদের জন্য' },
  { id: 'ai', label: 'AI Features', labelBn: 'AI ফিচার' },
];

// ============ COMPONENT ============
export const Help: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [showChatWidget, setShowChatWidget] = useState(false);

  // Filter FAQs
  const filteredFaqs = FAQ_DATA.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.questionBn.includes(searchQuery) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answerBn.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  // Translations
  const t = {
    title: isBn ? 'সাহায্য কেন্দ্র' : 'Help Center',
    subtitle: isBn ? 'আমরা আপনাকে সাহায্য করতে এখানে আছি' : 'We\'re here to help you',
    searchPlaceholder: isBn ? 'প্রশ্ন খুঁজুন...' : 'Search for answers...',
    faqTitle: isBn ? 'সচরাচর জিজ্ঞাসা' : 'Frequently Asked Questions',
    contactTitle: isBn ? 'যোগাযোগ করুন' : 'Contact Us',
    contactSubtitle: isBn ? 'আরও সাহায্য প্রয়োজন? আমাদের সাথে যোগাযোগ করুন' : 'Need more help? Reach out to us',
    noResults: isBn ? 'কোনো ফলাফল পাওয়া যায়নি' : 'No results found',
    quickLinks: isBn ? 'দ্রুত লিংক' : 'Quick Links',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader showNav={true} showGetStarted={true} />

      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-life-ring text-3xl"></i>
          </div>
          <h1 className="text-4xl font-black mb-4">{t.title}</h1>
          <p className="text-blue-100 text-lg mb-8">{t.subtitle}</p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-14 pr-6 py-4 rounded-2xl bg-white text-slate-800 text-lg shadow-xl outline-none focus:ring-4 focus:ring-white/30"
            />
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-8 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-wrap gap-3 justify-center">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition ${
                  selectedCategory === cat.id
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {isBn ? cat.labelBn : cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">{t.faqTitle}</h2>

          {filteredFaqs.length > 0 ? (
            <div className="space-y-3">
              {filteredFaqs.map(faq => (
                <div
                  key={faq.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition"
                  >
                    <span className="font-semibold text-slate-800 pr-4">
                      {isBn ? faq.questionBn : faq.question}
                    </span>
                    <i className={`fas fa-chevron-down text-slate-400 transition-transform ${
                      expandedFaq === faq.id ? 'rotate-180' : ''
                    }`}></i>
                  </button>
                  {expandedFaq === faq.id && (
                    <div className="px-6 pb-4 text-slate-600 leading-relaxed border-t border-slate-100 pt-4 bg-slate-50">
                      {isBn ? faq.answerBn : faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <i className="fas fa-search text-4xl text-slate-300 mb-4"></i>
              <p className="text-slate-500">{t.noResults}</p>
            </div>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{t.contactTitle}</h2>
            <p className="text-slate-500">{t.contactSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {CONTACT_OPTIONS.map(option => (
              <div
                key={option.id}
                className="bg-slate-50 rounded-2xl p-6 text-center hover:shadow-lg transition group"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <i className={`fab ${option.icon.startsWith('fa-whatsapp') ? option.icon : ''} fas ${!option.icon.startsWith('fa-whatsapp') ? option.icon : ''} text-white text-xl`}></i>
                </div>
                <h3 className="font-bold text-slate-800 mb-1">
                  {isBn ? option.titleBn : option.title}
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                  {isBn ? option.descriptionBn : option.description}
                </p>
                {option.action === 'chat' ? (
                  <button
                    onClick={() => setShowChatWidget(true)}
                    className="px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-lg hover:bg-blue-600 transition"
                  >
                    {isBn ? option.actionLabelBn : option.actionLabel}
                  </button>
                ) : (
                  <a
                    href={option.action}
                    target={option.action.startsWith('http') ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-lg hover:bg-blue-600 transition"
                  >
                    {isBn ? option.actionLabelBn : option.actionLabel}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Tutorials Section */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">
            {isBn ? 'ভিডিও টিউটোরিয়াল' : 'Video Tutorials'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'How to Book an Appointment', titleBn: 'কিভাবে অ্যাপয়েন্টমেন্ট বুক করবেন', duration: '2:30' },
              { title: 'Using the Live Queue', titleBn: 'লাইভ কিউ ব্যবহার', duration: '3:15' },
              { title: 'Doctor Dashboard Guide', titleBn: 'ডাক্তার ড্যাশবোর্ড গাইড', duration: '5:45' },
            ].map((video, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden group cursor-pointer hover:shadow-lg transition">
                <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center relative">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <i className="fas fa-play text-white text-2xl ml-1"></i>
                  </div>
                  <span className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
                    {video.duration}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-slate-800">
                    {isBn ? video.titleBn : video.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Chat Widget */}
      {showChatWidget && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <i className="fas fa-headset"></i>
              </div>
              <div>
                <h3 className="font-bold">{isBn ? 'লাইভ সাপোর্ট' : 'Live Support'}</h3>
                <p className="text-xs text-blue-100">{isBn ? 'সাধারণত ৫ মিনিটে উত্তর' : 'Usually replies in 5 min'}</p>
              </div>
            </div>
            <button onClick={() => setShowChatWidget(false)} className="text-white/80 hover:text-white">
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50">
            <div className="bg-white rounded-lg p-3 shadow-sm max-w-[80%]">
              <p className="text-sm text-slate-600">
                {isBn 
                  ? 'আসসালামু আলাইকুম! 👋 নির্ণয় সাপোর্টে স্বাগতম। কিভাবে সাহায্য করতে পারি?'
                  : 'Hello! 👋 Welcome to Nirnoy Support. How can I help you today?'}
              </p>
            </div>
          </div>
          <div className="p-4 border-t border-slate-100">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={isBn ? 'মেসেজ লিখুন...' : 'Type a message...'}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
              />
              <button className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition">
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 text-center text-sm">
        <p>&copy; 2025 Nirnoy Health Tech Ltd. {isBn ? 'সর্বস্বত্ব সংরক্ষিত।' : 'All rights reserved.'}</p>
      </footer>
    </div>
  );
};

export default Help;

