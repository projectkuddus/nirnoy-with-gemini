import { PatientPlan, DoctorPlan, CreditAction, Badge } from './types';

// ============ PATIENT SUBSCRIPTION PLANS ============
export const PATIENT_PLANS: PatientPlan[] = [
  {
    id: 'free',
    name: 'Free',
    nameBn: 'ফ্রি',
    priceMonthly: 0,
    priceYearly: 0,
    limits: {
      appointmentsPerMonth: 2,
      aiSessionsPerMonth: 1,
      voiceAgentMinutes: 5,
      familyMembers: 0,
      healthRecordMonths: 0,
      videoConsultations: 0,
    },
    features: [
      { key: 'doctor_search', label: 'Doctor Search', labelBn: 'ডাক্তার খুঁজুন', included: true },
      { key: 'appointments', label: 'Appointments', labelBn: 'অ্যাপয়েন্টমেন্ট', included: true, value: '2/month' },
      { key: 'ai_voice', label: 'AI Voice Agent', labelBn: 'AI ভয়েস এজেন্ট', included: true, value: '1 trial' },
      { key: 'health_records', label: 'Health Records', labelBn: 'স্বাস্থ্য রেকর্ড', included: false },
      { key: 'family', label: 'Family Members', labelBn: 'পরিবারের সদস্য', included: false },
      { key: 'ai_insights', label: 'AI Health Insights', labelBn: 'AI স্বাস্থ্য বিশ্লেষণ', included: false },
      { key: 'priority', label: 'Priority Booking', labelBn: 'অগ্রাধিকার বুকিং', included: false },
    ],
  },
  {
    id: 'basic',
    name: 'Basic',
    nameBn: 'বেসিক',
    priceMonthly: 199,
    priceYearly: 1999,
    limits: {
      appointmentsPerMonth: -1,
      aiSessionsPerMonth: 10,
      voiceAgentMinutes: 30,
      familyMembers: 0,
      healthRecordMonths: 6,
      videoConsultations: 0,
    },
    features: [
      { key: 'doctor_search', label: 'Doctor Search', labelBn: 'ডাক্তার খুঁজুন', included: true },
      { key: 'appointments', label: 'Appointments', labelBn: 'অ্যাপয়েন্টমেন্ট', included: true, value: 'Unlimited' },
      { key: 'ai_voice', label: 'AI Voice Agent', labelBn: 'AI ভয়েস এজেন্ট', included: true, value: '10/month' },
      { key: 'health_records', label: 'Health Records', labelBn: 'স্বাস্থ্য রেকর্ড', included: true, value: '6 months' },
      { key: 'family', label: 'Family Members', labelBn: 'পরিবারের সদস্য', included: false },
      { key: 'ai_insights', label: 'AI Health Insights', labelBn: 'AI স্বাস্থ্য বিশ্লেষণ', included: true, value: 'Basic' },
      { key: 'priority', label: 'Priority Booking', labelBn: 'অগ্রাধিকার বুকিং', included: false },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    nameBn: 'প্রিমিয়াম',
    priceMonthly: 399,
    priceYearly: 3999,
    popular: true,
    badge: '⭐',
    limits: {
      appointmentsPerMonth: -1,
      aiSessionsPerMonth: -1,
      voiceAgentMinutes: -1,
      familyMembers: 0,
      healthRecordMonths: -1,
      videoConsultations: 2,
    },
    features: [
      { key: 'doctor_search', label: 'Doctor Search', labelBn: 'ডাক্তার খুঁজুন', included: true },
      { key: 'appointments', label: 'Appointments', labelBn: 'অ্যাপয়েন্টমেন্ট', included: true, value: 'Unlimited' },
      { key: 'ai_voice', label: 'AI Voice Agent', labelBn: 'AI ভয়েস এজেন্ট', included: true, value: 'Unlimited' },
      { key: 'health_records', label: 'Health Records', labelBn: 'স্বাস্থ্য রেকর্ড', included: true, value: 'Full History' },
      { key: 'family', label: 'Family Members', labelBn: 'পরিবারের সদস্য', included: false },
      { key: 'ai_insights', label: 'AI Health Insights', labelBn: 'AI স্বাস্থ্য বিশ্লেষণ', included: true, value: 'Advanced' },
      { key: 'priority', label: 'Priority Booking', labelBn: 'অগ্রাধিকার বুকিং', included: true },
      { key: 'video', label: 'Video Consultation', labelBn: 'ভিডিও কনসাল্টেশন', included: true, value: '2/month' },
      { key: 'support', label: '24/7 Support', labelBn: '২৪/৭ সাপোর্ট', included: true },
    ],
  },
  {
    id: 'family',
    name: 'Family',
    nameBn: 'পরিবার',
    priceMonthly: 699,
    priceYearly: 6999,
    badge: '👨‍👩‍👧‍👦',
    limits: {
      appointmentsPerMonth: -1,
      aiSessionsPerMonth: -1,
      voiceAgentMinutes: -1,
      familyMembers: 6,
      healthRecordMonths: -1,
      videoConsultations: 5,
    },
    features: [
      { key: 'everything_premium', label: 'Everything in Premium', labelBn: 'প্রিমিয়ামের সবকিছু', included: true },
      { key: 'family', label: 'Family Members', labelBn: 'পরিবারের সদস্য', included: true, value: 'Up to 6' },
      { key: 'shared_dashboard', label: 'Shared Health Dashboard', labelBn: 'শেয়ার্ড ড্যাশবোর্ড', included: true },
      { key: 'child_tracking', label: 'Child Health Tracking', labelBn: 'শিশু স্বাস্থ্য ট্র্যাকিং', included: true },
      { key: 'elder_alerts', label: 'Elder Care Alerts', labelBn: 'বয়স্ক যত্ন অ্যালার্ট', included: true },
      { key: 'family_ai', label: 'Family AI Insights', labelBn: 'পারিবারিক AI বিশ্লেষণ', included: true },
      { key: 'emergency', label: 'Emergency Family Notify', labelBn: 'জরুরি পরিবার নোটিফাই', included: true },
      { key: 'video', label: 'Video Consultation', labelBn: 'ভিডিও কনসাল্টেশন', included: true, value: '5/month' },
    ],
  },
];

// ============ DOCTOR SUBSCRIPTION PLANS ============
export const DOCTOR_PLANS: DoctorPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    nameBn: 'স্টার্টার',
    priceMonthly: 999,
    priceYearly: 9999,
    commissionRate: 15,
    limits: {
      appointmentsPerMonth: 50,
      aiQueriesPerMonth: 10,
      chambers: 1,
      staffAccounts: 0,
    },
    features: [
      { key: 'profile', label: 'Profile Listing', labelBn: 'প্রোফাইল লিস্টিং', included: true, value: 'Basic' },
      { key: 'appointments', label: 'Appointments', labelBn: 'অ্যাপয়েন্টমেন্ট', included: true, value: '50/month' },
      { key: 'patient_mgmt', label: 'Patient Management', labelBn: 'রোগী ম্যানেজমেন্ট', included: true, value: 'Basic' },
      { key: 'prescription', label: 'Prescription Builder', labelBn: 'প্রেসক্রিপশন বিল্ডার', included: true },
      { key: 'ai_assistant', label: 'AI Clinical Assistant', labelBn: 'AI ক্লিনিক্যাল সহকারী', included: true, value: '10/month' },
      { key: 'analytics', label: 'Analytics', labelBn: 'বিশ্লেষণ', included: true, value: 'Basic' },
      { key: 'payment', label: 'Online Payment', labelBn: 'অনলাইন পেমেন্ট', included: false },
      { key: 'commission', label: 'Commission Rate', labelBn: 'কমিশন রেট', included: true, value: '15%' },
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    nameBn: 'প্রফেশনাল',
    priceMonthly: 2499,
    priceYearly: 24999,
    commissionRate: 10,
    popular: true,
    badge: '⭐',
    limits: {
      appointmentsPerMonth: -1,
      aiQueriesPerMonth: 100,
      chambers: 3,
      staffAccounts: 1,
    },
    features: [
      { key: 'profile', label: 'Profile Listing', labelBn: 'প্রোফাইল লিস্টিং', included: true, value: 'Featured' },
      { key: 'appointments', label: 'Appointments', labelBn: 'অ্যাপয়েন্টমেন্ট', included: true, value: 'Unlimited' },
      { key: 'patient_mgmt', label: 'Patient CRM', labelBn: 'রোগী CRM', included: true, value: 'Full' },
      { key: 'prescription', label: 'Prescription + Templates', labelBn: 'প্রেসক্রিপশন + টেমপ্লেট', included: true },
      { key: 'ai_assistant', label: 'AI Clinical Assistant', labelBn: 'AI ক্লিনিক্যাল সহকারী', included: true, value: '100/month' },
      { key: 'analytics', label: 'Advanced Analytics', labelBn: 'উন্নত বিশ্লেষণ', included: true },
      { key: 'rnd', label: 'R&D / Medical News', labelBn: 'R&D / মেডিকেল নিউজ', included: true },
      { key: 'payment', label: 'Online Payment', labelBn: 'অনলাইন পেমেন্ট', included: true, value: 'bKash/Nagad/Card' },
      { key: 'chambers', label: 'Multi-Chamber', labelBn: 'মাল্টি-চেম্বার', included: true, value: 'Up to 3' },
      { key: 'commission', label: 'Commission Rate', labelBn: 'কমিশন রেট', included: true, value: '10%' },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    nameBn: 'এন্টারপ্রাইজ',
    priceMonthly: 4999,
    priceYearly: 49999,
    commissionRate: 5,
    badge: '🏆',
    limits: {
      appointmentsPerMonth: -1,
      aiQueriesPerMonth: -1,
      chambers: -1,
      staffAccounts: 5,
    },
    features: [
      { key: 'everything_pro', label: 'Everything in Professional', labelBn: 'প্রফেশনালের সবকিছু', included: true },
      { key: 'ai_assistant', label: 'AI Clinical Assistant', labelBn: 'AI ক্লিনিক্যাল সহকারী', included: true, value: 'Unlimited' },
      { key: 'video', label: 'Video Consultation', labelBn: 'ভিডিও কনসাল্টেশন', included: true },
      { key: 'staff', label: 'Staff Accounts', labelBn: 'স্টাফ অ্যাকাউন্ট', included: true, value: 'Up to 5' },
      { key: 'chambers', label: 'Chambers', labelBn: 'চেম্বার', included: true, value: 'Unlimited' },
      { key: 'whitelabel', label: 'White-label Prescription', labelBn: 'হোয়াইট-লেবেল প্রেসক্রিপশন', included: true },
      { key: 'api', label: 'API Access', labelBn: 'API অ্যাক্সেস', included: true },
      { key: 'commission', label: 'Commission Rate', labelBn: 'কমিশন রেট', included: true, value: '5%' },
      { key: 'support', label: 'Dedicated Support', labelBn: 'ডেডিকেটেড সাপোর্ট', included: true },
    ],
  },
];

// ============ CREDIT ACTIONS ============
export const CREDIT_ACTIONS: CreditAction[] = [
  // Earning Actions
  {
    type: 'signup_bonus',
    credits: 50,
    label: 'Welcome Bonus',
    labelBn: 'স্বাগতম বোনাস',
    description: 'Thanks for joining Nirnoy!',
    descriptionBn: 'নির্ণয়ে যোগ দেওয়ার জন্য ধন্যবাদ!',
    oneTime: true,
  },
  {
    type: 'profile_complete',
    credits: 20,
    label: 'Profile Complete',
    labelBn: 'প্রোফাইল সম্পূর্ণ',
    description: 'Completed your health profile',
    descriptionBn: 'স্বাস্থ্য প্রোফাইল সম্পূর্ণ করেছেন',
    oneTime: true,
  },
  {
    type: 'first_appointment',
    credits: 30,
    label: 'First Appointment',
    labelBn: 'প্রথম অ্যাপয়েন্টমেন্ট',
    description: 'Booked your first appointment',
    descriptionBn: 'প্রথম অ্যাপয়েন্টমেন্ট বুক করেছেন',
    oneTime: true,
  },
  {
    type: 'referral_signup',
    credits: 50,
    label: 'Referral Sign Up',
    labelBn: 'রেফারেল সাইন আপ',
    description: 'Friend signed up with your code',
    descriptionBn: 'বন্ধু আপনার কোড দিয়ে সাইন আপ করেছে',
    oneTime: false,
  },
  {
    type: 'referral_subscribe',
    credits: 100,
    label: 'Referral Subscribed',
    labelBn: 'রেফারেল সাবস্ক্রাইব',
    description: 'Friend subscribed to a paid plan',
    descriptionBn: 'বন্ধু পেইড প্ল্যান নিয়েছে',
    oneTime: false,
  },
  {
    type: 'add_family_member',
    credits: 50,
    label: 'Add Family Member',
    labelBn: 'পরিবারের সদস্য যোগ',
    description: 'Added a family member',
    descriptionBn: 'পরিবারের সদস্য যোগ করেছেন',
    oneTime: false,
    maxPerMonth: 5,
  },
  {
    type: 'monthly_checkin',
    credits: 10,
    label: 'Monthly Check-in',
    labelBn: 'মাসিক চেক-ইন',
    description: 'Updated your health status',
    descriptionBn: 'স্বাস্থ্য স্ট্যাটাস আপডেট করেছেন',
    oneTime: false,
    maxPerMonth: 1,
  },
  {
    type: 'health_goal',
    credits: 25,
    label: 'Health Goal Achieved',
    labelBn: 'স্বাস্থ্য লক্ষ্য অর্জন',
    description: 'Achieved a health goal',
    descriptionBn: 'স্বাস্থ্য লক্ষ্য অর্জন করেছেন',
    oneTime: false,
    maxPerMonth: 4,
  },
  {
    type: 'leave_review',
    credits: 15,
    label: 'Leave Review',
    labelBn: 'রিভিউ দিন',
    description: 'Left a doctor review',
    descriptionBn: 'ডাক্তারের রিভিউ দিয়েছেন',
    oneTime: false,
    maxPerMonth: 3,
  },
  {
    type: 'yearly_subscription',
    credits: 200,
    label: 'Yearly Subscription',
    labelBn: 'বার্ষিক সাবস্ক্রিপশন',
    description: 'Subscribed to yearly plan',
    descriptionBn: 'বার্ষিক প্ল্যান নিয়েছেন',
    oneTime: false,
  },
  {
    type: 'streak_bonus',
    credits: 50,
    label: '30-Day Streak',
    labelBn: '৩০ দিনের স্ট্রিক',
    description: 'Maintained 30-day activity streak',
    descriptionBn: '৩০ দিন একটানা অ্যাক্টিভ ছিলেন',
    oneTime: false,
    maxPerMonth: 1,
  },
  // Spending Actions
  {
    type: 'spend_booking',
    credits: -50,
    label: 'Book Appointment',
    labelBn: 'অ্যাপয়েন্টমেন্ট বুক',
    description: 'Used credits for booking',
    descriptionBn: 'বুকিংয়ে ক্রেডিট ব্যবহার',
    oneTime: false,
  },
  {
    type: 'spend_ai_session',
    credits: -10,
    label: 'AI Session',
    labelBn: 'AI সেশন',
    description: 'Used credits for AI session',
    descriptionBn: 'AI সেশনে ক্রেডিট ব্যবহার',
    oneTime: false,
  },
  {
    type: 'spend_video_call',
    credits: -100,
    label: 'Video Consultation',
    labelBn: 'ভিডিও কনসাল্টেশন',
    description: 'Used credits for video call',
    descriptionBn: 'ভিডিও কলে ক্রেডিট ব্যবহার',
    oneTime: false,
  },
];

// ============ BADGES ============
export const BADGES: Badge[] = [
  {
    id: 'early_adopter',
    name: 'Early Adopter',
    nameBn: 'আর্লি অ্যাডপ্টার',
    description: 'Joined in the first 1000 users',
    descriptionBn: 'প্রথম ১০০০ ব্যবহারকারীর মধ্যে',
    icon: '🚀',
    rarity: 'legendary',
    creditsReward: 100,
  },
  {
    id: 'health_champion',
    name: 'Health Champion',
    nameBn: 'স্বাস্থ্য চ্যাম্পিয়ন',
    description: 'Completed 10 appointments',
    descriptionBn: '১০টি অ্যাপয়েন্টমেন্ট সম্পন্ন',
    icon: '🏆',
    rarity: 'epic',
    creditsReward: 75,
  },
  {
    id: 'family_guardian',
    name: 'Family Guardian',
    nameBn: 'পরিবারের অভিভাবক',
    description: 'Added 5 family members',
    descriptionBn: '৫ জন পরিবারের সদস্য যোগ করেছেন',
    icon: '👨‍👩‍👧‍👦',
    rarity: 'epic',
    creditsReward: 100,
  },
  {
    id: 'referral_star',
    name: 'Referral Star',
    nameBn: 'রেফারেল স্টার',
    description: 'Referred 5 friends',
    descriptionBn: '৫ জন বন্ধুকে রেফার করেছেন',
    icon: '⭐',
    rarity: 'rare',
    creditsReward: 50,
  },
  {
    id: 'consistency_king',
    name: 'Consistency King',
    nameBn: 'ধারাবাহিকতার রাজা',
    description: 'Maintained 30-day streak',
    descriptionBn: '৩০ দিনের স্ট্রিক বজায় রেখেছেন',
    icon: '👑',
    rarity: 'rare',
    creditsReward: 50,
  },
  {
    id: 'ai_explorer',
    name: 'AI Explorer',
    nameBn: 'AI এক্সপ্লোরার',
    description: 'Used AI features 50 times',
    descriptionBn: 'AI ফিচার ৫০ বার ব্যবহার করেছেন',
    icon: '🤖',
    rarity: 'common',
    creditsReward: 25,
  },
  {
    id: 'feedback_hero',
    name: 'Feedback Hero',
    nameBn: 'ফিডব্যাক হিরো',
    description: 'Provided 10 helpful feedbacks',
    descriptionBn: '১০টি সহায়ক ফিডব্যাক দিয়েছেন',
    icon: '💬',
    rarity: 'common',
    creditsReward: 25,
  },
];

// ============ FAMILY BONUS STRUCTURE ============
export const FAMILY_BONUSES = [
  { members: 2, monthlyCredits: 20, freeMonths: 0.5 },
  { members: 3, monthlyCredits: 50, freeMonths: 1 },
  { members: 4, monthlyCredits: 100, freeMonths: 2 },
  { members: 5, monthlyCredits: 150, freeMonths: 3 },
  { members: 6, monthlyCredits: 200, freeMonths: 4 },
];

// ============ HELPER FUNCTIONS ============
export const getPatientPlan = (id: string): PatientPlan | undefined => 
  PATIENT_PLANS.find(p => p.id === id);

export const getDoctorPlan = (id: string): DoctorPlan | undefined => 
  DOCTOR_PLANS.find(p => p.id === id);

export const getCreditAction = (type: string): CreditAction | undefined => 
  CREDIT_ACTIONS.find(a => a.type === type);

export const getBadge = (id: string): Badge | undefined => 
  BADGES.find(b => b.id === id);

export const calculateYearlySavings = (plan: PatientPlan | DoctorPlan): number => {
  return (plan.priceMonthly * 12) - plan.priceYearly;
};

export const getFamilyBonus = (memberCount: number) => {
  return FAMILY_BONUSES.find(b => b.members === memberCount) || FAMILY_BONUSES[0];
};
