import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import PageHeader from '../components/PageHeader';

// ============ TYPES ============
interface PricingPlan {
  id: string;
  name: string;
  nameBn: string;
  description: string;
  descriptionBn: string;
  price: number;
  priceBn: string;
  period: string;
  periodBn: string;
  features: { text: string; textBn: string; included: boolean }[];
  popular?: boolean;
  cta: string;
  ctaBn: string;
}

// ============ DATA ============
const PATIENT_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Basic',
    nameBn: 'বেসিক',
    description: 'For occasional healthcare needs',
    descriptionBn: 'মাঝে মাঝে স্বাস্থ্যসেবার জন্য',
    price: 0,
    priceBn: '০',
    period: 'Forever Free',
    periodBn: 'চিরকাল বিনামূল্যে',
    features: [
      { text: 'Book appointments', textBn: 'অ্যাপয়েন্টমেন্ট বুক করুন', included: true },
      { text: 'Live queue tracking', textBn: 'লাইভ কিউ ট্র্যাকিং', included: true },
      { text: 'Basic health records', textBn: 'বেসিক স্বাস্থ্য রেকর্ড', included: true },
      { text: 'SMS notifications', textBn: 'SMS নোটিফিকেশন', included: true },
      { text: 'AI Health Assistant', textBn: 'AI স্বাস্থ্য সহকারী', included: false },
      { text: 'Family profiles', textBn: 'পারিবারিক প্রোফাইল', included: false },
      { text: 'Priority booking', textBn: 'প্রায়োরিটি বুকিং', included: false },
    ],
    cta: 'Get Started Free',
    ctaBn: 'বিনামূল্যে শুরু করুন',
  },
  {
    id: 'premium',
    name: 'Premium',
    nameBn: 'প্রিমিয়াম',
    description: 'For individuals who want more',
    descriptionBn: 'যারা আরও চান তাদের জন্য',
    price: 99,
    priceBn: '৯৯',
    period: '/month',
    periodBn: '/মাস',
    popular: true,
    features: [
      { text: 'Everything in Basic', textBn: 'বেসিকের সবকিছু', included: true },
      { text: 'AI Health Assistant', textBn: 'AI স্বাস্থ্য সহকারী', included: true },
      { text: 'Unlimited AI chats', textBn: 'আনলিমিটেড AI চ্যাট', included: true },
      { text: 'Health insights & trends', textBn: 'স্বাস্থ্য ইনসাইট ও ট্রেন্ড', included: true },
      { text: 'Priority booking', textBn: 'প্রায়োরিটি বুকিং', included: true },
      { text: 'Family profiles (up to 3)', textBn: 'পারিবারিক প্রোফাইল (৩ জন)', included: true },
      { text: '10% discount on fees', textBn: 'ফি-তে ১০% ছাড়', included: true },
    ],
    cta: 'Start Premium',
    ctaBn: 'প্রিমিয়াম শুরু করুন',
  },
  {
    id: 'family',
    name: 'Family',
    nameBn: 'ফ্যামিলি',
    description: 'For the whole family',
    descriptionBn: 'পুরো পরিবারের জন্য',
    price: 249,
    priceBn: '২৪৯',
    period: '/month',
    periodBn: '/মাস',
    features: [
      { text: 'Everything in Premium', textBn: 'প্রিমিয়ামের সবকিছু', included: true },
      { text: 'Up to 6 family members', textBn: '৬ জন পরিবারের সদস্য', included: true },
      { text: 'Family health dashboard', textBn: 'পারিবারিক স্বাস্থ্য ড্যাশবোর্ড', included: true },
      { text: 'Shared health calendar', textBn: 'শেয়ারড স্বাস্থ্য ক্যালেন্ডার', included: true },
      { text: 'Emergency contacts', textBn: 'জরুরি যোগাযোগ', included: true },
      { text: '15% discount on fees', textBn: 'ফি-তে ১৫% ছাড়', included: true },
      { text: 'Priority support', textBn: 'প্রায়োরিটি সাপোর্ট', included: true },
    ],
    cta: 'Start Family Plan',
    ctaBn: 'ফ্যামিলি প্ল্যান শুরু করুন',
  },
];

const DOCTOR_PLANS: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    nameBn: 'স্টার্টার',
    description: 'For new practitioners',
    descriptionBn: 'নতুন প্র্যাক্টিশনারদের জন্য',
    price: 0,
    priceBn: '০',
    period: 'Forever Free',
    periodBn: 'চিরকাল বিনামূল্যে',
    features: [
      { text: 'Up to 50 patients/month', textBn: '৫০ রোগী/মাস', included: true },
      { text: 'Basic queue management', textBn: 'বেসিক কিউ ম্যানেজমেন্ট', included: true },
      { text: 'Patient records', textBn: 'রোগীর রেকর্ড', included: true },
      { text: 'SMS notifications', textBn: 'SMS নোটিফিকেশন', included: true },
      { text: 'AI Clinical Copilot', textBn: 'AI ক্লিনিক্যাল কোপাইলট', included: false },
      { text: 'Analytics dashboard', textBn: 'এনালিটিক্স ড্যাশবোর্ড', included: false },
      { text: 'Multiple chambers', textBn: 'একাধিক চেম্বার', included: false },
    ],
    cta: 'Start Free',
    ctaBn: 'বিনামূল্যে শুরু করুন',
  },
  {
    id: 'professional',
    name: 'Professional',
    nameBn: 'প্রফেশনাল',
    description: 'For established practitioners',
    descriptionBn: 'প্রতিষ্ঠিত প্র্যাক্টিশনারদের জন্য',
    price: 999,
    priceBn: '৯৯৯',
    period: '/month',
    periodBn: '/মাস',
    popular: true,
    features: [
      { text: 'Unlimited patients', textBn: 'আনলিমিটেড রোগী', included: true },
      { text: 'AI Clinical Copilot', textBn: 'AI ক্লিনিক্যাল কোপাইলট', included: true },
      { text: 'Advanced analytics', textBn: 'অ্যাডভান্সড এনালিটিক্স', included: true },
      { text: 'Up to 3 chambers', textBn: '৩টি চেম্বার', included: true },
      { text: 'Custom prescription', textBn: 'কাস্টম প্রেসক্রিপশন', included: true },
      { text: 'Patient intake forms', textBn: 'রোগী ইনটেক ফর্ম', included: true },
      { text: 'Priority listing', textBn: 'প্রায়োরিটি লিস্টিং', included: true },
    ],
    cta: 'Go Professional',
    ctaBn: 'প্রফেশনাল হোন',
  },
  {
    id: 'clinic',
    name: 'Clinic',
    nameBn: 'ক্লিনিক',
    description: 'For clinics & hospitals',
    descriptionBn: 'ক্লিনিক ও হাসপাতালের জন্য',
    price: 4999,
    priceBn: '৪৯৯৯',
    period: '/month',
    periodBn: '/মাস',
    features: [
      { text: 'Everything in Professional', textBn: 'প্রফেশনালের সবকিছু', included: true },
      { text: 'Unlimited doctors', textBn: 'আনলিমিটেড ডাক্তার', included: true },
      { text: 'Clinic branding', textBn: 'ক্লিনিক ব্র্যান্ডিং', included: true },
      { text: 'Staff management', textBn: 'স্টাফ ম্যানেজমেন্ট', included: true },
      { text: 'Revenue reports', textBn: 'রেভিনিউ রিপোর্ট', included: true },
      { text: 'API access', textBn: 'API অ্যাক্সেস', included: true },
      { text: 'Dedicated support', textBn: 'ডেডিকেটেড সাপোর্ট', included: true },
    ],
    cta: 'Contact Sales',
    ctaBn: 'সেলস এ যোগাযোগ',
  },
];

// ============ COMPONENT ============
export const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState<'patient' | 'doctor'>('patient');

  const plans = activeTab === 'patient' ? PATIENT_PLANS : DOCTOR_PLANS;

  // Translations
  const t = {
    title: isBn ? 'সহজ ও স্বচ্ছ মূল্য' : 'Simple, Transparent Pricing',
    subtitle: isBn ? 'আপনার প্রয়োজন অনুযায়ী প্ল্যান বেছে নিন' : 'Choose the plan that fits your needs',
    forPatients: isBn ? 'রোগীদের জন্য' : 'For Patients',
    forDoctors: isBn ? 'ডাক্তারদের জন্য' : 'For Doctors',
    popular: isBn ? 'জনপ্রিয়' : 'Popular',
    taka: '৳',
    perBooking: isBn ? 'প্রতি বুকিংয়ে' : 'per booking',
    compare: isBn ? 'সব ফিচার তুলনা করুন' : 'Compare all features',
    faq: isBn ? 'মূল্য সম্পর্কিত প্রশ্ন' : 'Pricing FAQ',
    enterprise: isBn ? 'এন্টারপ্রাইজ সলিউশন দরকার?' : 'Need an enterprise solution?',
    enterpriseDesc: isBn ? 'বড় হাসপাতাল ও স্বাস্থ্য নেটওয়ার্কের জন্য কাস্টম প্ল্যান' : 'Custom plans for large hospitals & healthcare networks',
    contactSales: isBn ? 'সেলস এ যোগাযোগ করুন' : 'Contact Sales',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader showNav={true} showGetStarted={true} />

      {/* Hero Section */}
      <section className="pt-28 pb-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRWMjhIMjR2MmgxMnptMC0xMHYySDI0di0yaDEyem0wLTR2MkgyNHYtMmgxMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50"></div>
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-black mb-4">{t.title}</h1>
          <p className="text-slate-400 text-lg mb-10">{t.subtitle}</p>

          {/* Tab Switcher */}
          <div className="inline-flex bg-slate-800 rounded-2xl p-1.5">
            <button
              onClick={() => setActiveTab('patient')}
              className={`px-8 py-3 rounded-xl text-sm font-bold transition ${
                activeTab === 'patient'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <i className="fas fa-user mr-2"></i>
              {t.forPatients}
            </button>
            <button
              onClick={() => setActiveTab('doctor')}
              className={`px-8 py-3 rounded-xl text-sm font-bold transition ${
                activeTab === 'doctor'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <i className="fas fa-user-md mr-2"></i>
              {t.forDoctors}
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 -mt-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, index) => (
              <div
                key={plan.id}
                className={`relative bg-white rounded-3xl border-2 overflow-hidden transition-all hover:shadow-2xl ${
                  plan.popular 
                    ? 'border-blue-500 shadow-xl shadow-blue-500/10 scale-105 z-10' 
                    : 'border-slate-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-center py-1.5 text-xs font-bold">
                    <i className="fas fa-star mr-1"></i>
                    {t.popular}
                  </div>
                )}

                <div className={`p-8 ${plan.popular ? 'pt-12' : ''}`}>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">
                    {isBn ? plan.nameBn : plan.name}
                  </h3>
                  <p className="text-sm text-slate-500 mb-6">
                    {isBn ? plan.descriptionBn : plan.description}
                  </p>

                  <div className="mb-6">
                    <span className="text-4xl font-black text-slate-900">
                      {t.taka}{isBn ? plan.priceBn : plan.price}
                    </span>
                    <span className="text-slate-500 ml-1">
                      {isBn ? plan.periodBn : plan.period}
                    </span>
                  </div>

                  <button
                    onClick={() => navigate(plan.id === 'clinic' ? '/contact' : '/patient-auth')}
                    className={`w-full py-3.5 rounded-xl font-bold transition ${
                      plan.popular
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isBn ? plan.ctaBn : plan.cta}
                  </button>
                </div>

                <div className="border-t border-slate-100 p-8">
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                          feature.included 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          <i className={`fas ${feature.included ? 'fa-check' : 'fa-times'}`}></i>
                        </span>
                        <span className={feature.included ? 'text-slate-700' : 'text-slate-400'}>
                          {isBn ? feature.textBn : feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transaction Fees */}
      <section className="py-12 bg-white border-y border-slate-100">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">
            {isBn ? 'লেনদেন ফি' : 'Transaction Fees'}
          </h2>
          <p className="text-slate-500 mb-8">
            {isBn 
              ? 'প্রতিটি সফল বুকিংয়ের উপর সামান্য প্ল্যাটফর্ম ফি প্রযোজ্য'
              : 'A small platform fee applies on each successful booking'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: isBn ? 'রোগীর ফি' : 'Patient Fee', value: '৳0', desc: isBn ? 'বুকিং বিনামূল্যে' : 'Free to book' },
              { label: isBn ? 'ডাক্তারের কমিশন' : 'Doctor Commission', value: '5%', desc: isBn ? 'প্রতি কনসালটেশনে' : 'Per consultation' },
              { label: isBn ? 'পেমেন্ট প্রসেসিং' : 'Payment Processing', value: '2%', desc: isBn ? 'অনলাইন পেমেন্টে' : 'On online payments' },
            ].map((item, i) => (
              <div key={i} className="bg-slate-50 rounded-2xl p-6">
                <p className="text-sm text-slate-500 mb-2">{item.label}</p>
                <p className="text-3xl font-black text-slate-900 mb-1">{item.value}</p>
                <p className="text-xs text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-10 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-building text-2xl"></i>
              </div>
              <h2 className="text-2xl font-bold mb-3">{t.enterprise}</h2>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">{t.enterpriseDesc}</p>
              <button
                onClick={() => navigate('/contact')}
                className="px-8 py-4 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-100 transition"
              >
                {t.contactSales}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white border-t border-slate-100">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">{t.faq}</h2>
          
          <div className="space-y-4">
            {[
              {
                q: isBn ? 'কি পেমেন্ট মেথড গ্রহণ করা হয়?' : 'What payment methods are accepted?',
                a: isBn 
                  ? 'বিকাশ, নগদ, রকেট, ভিসা, মাস্টারকার্ড এবং ব্যাংক ট্রান্সফার গ্রহণযোগ্য।'
                  : 'We accept bKash, Nagad, Rocket, Visa, Mastercard, and bank transfers.',
              },
              {
                q: isBn ? 'আমি কি যেকোনো সময় প্ল্যান পরিবর্তন করতে পারি?' : 'Can I change my plan anytime?',
                a: isBn
                  ? 'হ্যাঁ, আপনি যেকোনো সময় আপগ্রেড বা ডাউনগ্রেড করতে পারবেন। পরিবর্তন পরবর্তী বিলিং সাইকেল থেকে কার্যকর হবে।'
                  : 'Yes, you can upgrade or downgrade anytime. Changes take effect from the next billing cycle.',
              },
              {
                q: isBn ? 'ফ্রি ট্রায়াল আছে?' : 'Is there a free trial?',
                a: isBn
                  ? 'হ্যাঁ! প্রিমিয়াম ও প্রফেশনাল প্ল্যানে ১৪ দিনের ফ্রি ট্রায়াল আছে। কোনো ক্রেডিট কার্ড লাগবে না।'
                  : 'Yes! Premium and Professional plans come with a 14-day free trial. No credit card required.',
              },
              {
                q: isBn ? 'রিফান্ড পলিসি কি?' : 'What is the refund policy?',
                a: isBn
                  ? 'সাবস্ক্রিপশনের প্রথম ৭ দিনের মধ্যে সম্পূর্ণ রিফান্ড পাবেন। এরপর প্রো-রেটেড রিফান্ড প্রযোজ্য।'
                  : 'Full refund within the first 7 days of subscription. Pro-rated refunds apply after that.',
              },
            ].map((item, i) => (
              <details key={i} className="group bg-slate-50 rounded-xl">
                <summary className="px-6 py-4 cursor-pointer font-semibold text-slate-800 flex items-center justify-between">
                  {item.q}
                  <i className="fas fa-chevron-down text-slate-400 group-open:rotate-180 transition-transform"></i>
                </summary>
                <div className="px-6 pb-4 text-slate-600">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 text-center text-sm">
        <p>&copy; 2025 Nirnoy Health Tech Ltd. {isBn ? 'সর্বস্বত্ব সংরক্ষিত।' : 'All rights reserved.'}</p>
      </footer>
    </div>
  );
};

export default Pricing;

