import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Navbar } from '../components/Navbar';
import { PATIENT_PLANS, DOCTOR_PLANS, CREDIT_ACTIONS, BADGES, FAMILY_BONUSES, calculateYearlySavings } from '../services/subscription/plans';
import { PatientPlan, DoctorPlan } from '../services/subscription/types';

export const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [userType, setUserType] = useState<'patient' | 'doctor'>('patient');
  const [showRewardsModal, setShowRewardsModal] = useState(false);

  const t = {
    title: isBn ? 'সাশ্রয়ী মূল্যে সেরা স্বাস্থ্যসেবা' : 'Premium Healthcare at Affordable Prices',
    subtitle: isBn ? 'আপনার জন্য সঠিক প্ল্যান বেছে নিন' : 'Choose the right plan for you',
    patient: isBn ? 'রোগী' : 'Patient',
    doctor: isBn ? 'ডাক্তার' : 'Doctor',
    monthly: isBn ? 'মাসিক' : 'Monthly',
    yearly: isBn ? 'বার্ষিক' : 'Yearly',
    save: isBn ? 'সাশ্রয়' : 'Save',
    perMonth: isBn ? '/মাস' : '/month',
    perYear: isBn ? '/বছর' : '/year',
    popular: isBn ? 'জনপ্রিয়' : 'Popular',
    getStarted: isBn ? 'শুরু করুন' : 'Get Started',
    currentPlan: isBn ? 'বর্তমান প্ল্যান' : 'Current Plan',
    features: isBn ? 'সুবিধাসমূহ' : 'Features',
    freeForever: isBn ? 'চিরকালের জন্য ফ্রি' : 'Free Forever',
    rewards: isBn ? 'রিওয়ার্ড সিস্টেম' : 'Rewards System',
    earnCredits: isBn ? 'ক্রেডিট উপার্জন করুন' : 'Earn Credits',
    familyBonus: isBn ? 'পারিবারিক বোনাস' : 'Family Bonus',
    badges: isBn ? 'ব্যাজ ও অর্জন' : 'Badges & Achievements',
    faq: isBn ? 'সাধারণ প্রশ্ন' : 'FAQ',
  };

  const renderPatientPlans = () => (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      {PATIENT_PLANS.map((plan) => {
        const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
        const monthlyEquivalent = billingCycle === 'yearly' ? Math.round(plan.priceYearly / 12) : plan.priceMonthly;
        const savings = calculateYearlySavings(plan);

        return (
          <div
            key={plan.id}
            className={`relative overflow-hidden rounded-3xl transition-all hover:scale-[1.02] ${
              plan.popular 
                ? 'bg-gradient-to-br from-teal-500/20 to-emerald-500/10 border-2 border-teal-500/50 shadow-2xl shadow-teal-500/20' 
                : 'bg-white/10 backdrop-blur-xl border border-white/20 hover:border-white/40 hover:shadow-xl'
            }`}
          >
            {plan.popular && (
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-center py-1 text-sm font-bold">
                ⭐ {t.popular}
              </div>
            )}

            <div className={`p-6 ${plan.popular ? 'pt-10' : ''}`}>
              {/* Plan Header */}
              <div className="flex items-center gap-3 mb-4">
                {plan.badge && <span className="text-3xl">{plan.badge}</span>}
                <div>
                  <h3 className="text-xl font-bold text-white">{isBn ? plan.nameBn : plan.name}</h3>
                </div>
              </div>

              {/* Price */}
              <div className="mb-6">
                {plan.priceMonthly === 0 ? (
                  <div className="text-3xl font-black text-white">{t.freeForever}</div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-white">৳{monthlyEquivalent}</span>
                      <span className="text-slate-500">{t.perMonth}</span>
                    </div>
                    {billingCycle === 'yearly' && savings > 0 && (
                      <div className="text-sm text-green-600 font-medium mt-1">
                        {t.save} ৳{savings}/year
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className={`mt-0.5 ${feature.included ? 'text-green-500' : 'text-slate-300'}`}>
                      {feature.included ? '✓' : '✗'}
                    </span>
                    <span className={feature.included ? 'text-slate-300' : 'text-slate-500'}>
                      {isBn ? feature.labelBn : feature.label}
                      {feature.value && <span className="text-teal-600 font-medium ml-1">({feature.value})</span>}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => navigate('/patient-auth')}
                className={`w-full py-3 rounded-xl font-bold transition ${
                  plan.popular
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:shadow-lg'
                    : plan.priceMonthly === 0
                    ? 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                    : 'bg-slate-800 text-white hover:bg-slate-900'
                }`}
              >
                {t.getStarted}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderDoctorPlans = () => (
    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {DOCTOR_PLANS.map((plan) => {
        const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
        const monthlyEquivalent = billingCycle === 'yearly' ? Math.round(plan.priceYearly / 12) : plan.priceMonthly;
        const savings = calculateYearlySavings(plan);

        return (
          <div
            key={plan.id}
            className={`relative bg-white rounded-3xl border-2 overflow-hidden transition-all hover:shadow-xl ${
              plan.popular ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-slate-200'
            }`}
          >
            {plan.popular && (
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-center py-1 text-sm font-bold">
                ⭐ {t.popular}
              </div>
            )}

            <div className={`p-6 ${plan.popular ? 'pt-10' : ''}`}>
              {/* Plan Header */}
              <div className="flex items-center gap-3 mb-4">
                {plan.badge && <span className="text-3xl">{plan.badge}</span>}
                <div>
                  <h3 className="text-xl font-bold text-white">{isBn ? plan.nameBn : plan.name}</h3>
                </div>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">৳{monthlyEquivalent}</span>
                  <span className="text-slate-500">{t.perMonth}</span>
                </div>
                {billingCycle === 'yearly' && savings > 0 && (
                  <div className="text-sm text-green-600 font-medium mt-1">
                    {t.save} ৳{savings}/year
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className={`mt-0.5 ${feature.included ? 'text-green-500' : 'text-slate-300'}`}>
                      {feature.included ? '✓' : '✗'}
                    </span>
                    <span className={feature.included ? 'text-slate-300' : 'text-slate-500'}>
                      {isBn ? feature.labelBn : feature.label}
                      {feature.value && <span className="text-blue-600 font-medium ml-1">({feature.value})</span>}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => navigate('/doctor-registration')}
                className={`w-full py-3 rounded-xl font-bold transition ${
                  plan.popular
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:shadow-lg'
                    : 'bg-slate-800 text-white hover:bg-slate-900'
                }`}
              >
                {t.getStarted}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderRewardsSection = () => (
    <div className="mt-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-black text-white mb-3">🎮 {t.rewards}</h2>
        <p className="text-slate-600">{isBn ? 'ক্রেডিট উপার্জন করুন এবং বিনামূল্যে সেবা পান' : 'Earn credits and get free services'}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Earn Credits */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-6 border border-amber-200">
          <h3 className="text-xl font-bold text-amber-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">💰</span> {t.earnCredits}
          </h3>
          <p className="text-amber-700 text-sm mb-4">{isBn ? '১ ক্রেডিট = ৳১০' : '1 Credit = ৳10'}</p>
          <ul className="space-y-3">
            {CREDIT_ACTIONS.filter(a => a.credits > 0).slice(0, 8).map((action, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{isBn ? action.labelBn : action.label}</span>
                <span className="font-bold text-amber-600">+{action.credits}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Family Bonus */}
        <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-3xl p-6 border border-pink-200">
          <h3 className="text-xl font-bold text-pink-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">👨‍👩‍👧‍👦</span> {t.familyBonus}
          </h3>
          <p className="text-pink-700 text-sm mb-4">{isBn ? 'পরিবার যত বড়, সুবিধা তত বেশি!' : 'Bigger family, bigger benefits!'}</p>
          <ul className="space-y-3">
            {FAMILY_BONUSES.map((bonus, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{bonus.members} {isBn ? 'সদস্য' : 'members'}</span>
                <span className="font-bold text-pink-600">
                  {bonus.freeMonths} {isBn ? 'মাস ফ্রি!' : 'months FREE!'}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Badges */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-3xl p-6 border border-purple-200">
          <h3 className="text-xl font-bold text-purple-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">🏆</span> {t.badges}
          </h3>
          <p className="text-purple-700 text-sm mb-4">{isBn ? 'অর্জন আনলক করুন এবং ক্রেডিট পান' : 'Unlock achievements and earn credits'}</p>
          <div className="grid grid-cols-2 gap-3">
            {BADGES.slice(0, 6).map((badge, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-white/50 rounded-xl">
                <span className="text-2xl">{badge.icon}</span>
                <div>
                  <div className="text-xs font-bold text-slate-300">{isBn ? badge.nameBn : badge.name}</div>
                  <div className="text-xs text-purple-600">+{badge.creditsReward}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderFAQ = () => {
    const faqs = [
      {
        q: isBn ? 'ফ্রি প্ল্যানে কি কি পাব?' : 'What do I get in the Free plan?',
        a: isBn ? 'মাসে ২টি অ্যাপয়েন্টমেন্ট, ১টি AI ট্রায়াল, এবং সকল ডাক্তার সার্চ করতে পারবেন।' : 'You get 2 appointments per month, 1 AI trial, and unlimited doctor search.',
      },
      {
        q: isBn ? 'ক্রেডিট কিভাবে ব্যবহার করব?' : 'How do I use credits?',
        a: isBn ? 'ক্রেডিট দিয়ে অ্যাপয়েন্টমেন্ট বুক, AI সেশন, বা ভিডিও কল করতে পারবেন। ১ ক্রেডিট = ৳১০।' : 'Use credits for bookings, AI sessions, or video calls. 1 credit = ৳10.',
      },
      {
        q: isBn ? 'পরিবার প্ল্যানে কতজন যোগ করতে পারব?' : 'How many members in Family plan?',
        a: isBn ? 'সর্বোচ্চ ৬ জন। প্রতিজন যোগ করলে ৫০ ক্রেডিট পাবেন!' : 'Up to 6 members. Earn 50 credits for each member added!',
      },
      {
        q: isBn ? 'ডাক্তারদের কমিশন কত?' : 'What is the doctor commission?',
        a: isBn ? 'স্টার্টার: ১৫%, প্রফেশনাল: ১০%, এন্টারপ্রাইজ: ৫%। সরাসরি ক্যাশ নিলে কমিশন নেই।' : 'Starter: 15%, Professional: 10%, Enterprise: 5%. No commission for cash payments.',
      },
    ];

    return (
      <div className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-3xl font-black text-white mb-8 text-center">❓ {t.faq}</h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-800 mb-2">{faq.q}</h3>
              <p className="text-slate-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/30 via-transparent to-transparent"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      <Navbar />

      <main className="pt-24 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-white via-teal-200 to-white bg-clip-text text-transparent mb-4">{t.title}</h1>
            <p className="text-xl text-slate-400">{t.subtitle}</p>
          </div>

          {/* User Type Toggle */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-slate-100 rounded-2xl p-1.5">
              <button
                onClick={() => setUserType('patient')}
                className={`px-8 py-3 rounded-xl font-bold transition ${
                  userType === 'patient' ? 'bg-white text-teal-600 shadow-lg' : 'text-slate-600'
                }`}
              >
                👤 {t.patient}
              </button>
              <button
                onClick={() => setUserType('doctor')}
                className={`px-8 py-3 rounded-xl font-bold transition ${
                  userType === 'doctor' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-600'
                }`}
              >
                👨‍⚕️ {t.doctor}
              </button>
            </div>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex items-center gap-4 bg-white rounded-2xl p-2 shadow-lg border border-slate-200">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-xl font-medium transition ${
                  billingCycle === 'monthly' ? 'bg-slate-800 text-white' : 'text-slate-600'
                }`}
              >
                {t.monthly}
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 rounded-xl font-medium transition flex items-center gap-2 ${
                  billingCycle === 'yearly' ? 'bg-green-500 text-white' : 'text-slate-600'
                }`}
              >
                {t.yearly}
                <span className="text-xs bg-green-400 text-white px-2 py-0.5 rounded-full">
                  {t.save} 17%
                </span>
              </button>
            </div>
          </div>

          {/* Plans */}
          {userType === 'patient' ? renderPatientPlans() : renderDoctorPlans()}

          {/* Rewards Section */}
          {renderRewardsSection()}

          {/* FAQ */}
          {renderFAQ()}

          {/* CTA */}
          <div className="mt-20 text-center">
            <div className="inline-block bg-gradient-to-r from-teal-500 to-emerald-500 rounded-3xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-2">
                {isBn ? '🎉 প্রথম ১০০০ ব্যবহারকারী!' : '🎉 First 1000 Users!'}
              </h3>
              <p className="mb-4 opacity-90">
                {isBn ? '৩ মাস প্রিমিয়াম ফ্রি + ১০০ বোনাস ক্রেডিট' : '3 months Premium FREE + 100 bonus credits'}
              </p>
              <button
                onClick={() => navigate('/patient-auth')}
                className="px-8 py-3 bg-white text-teal-600 rounded-xl font-bold hover:shadow-lg transition"
              >
                {isBn ? 'এখনই শুরু করুন' : 'Start Now'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
