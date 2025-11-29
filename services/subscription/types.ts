// ============ SUBSCRIPTION TYPES ============

export type PlanType = 'free' | 'basic' | 'premium' | 'family';
export type DoctorPlanType = 'starter' | 'professional' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';
export type PaymentMethod = 'bkash' | 'nagad' | 'card' | 'bank';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial';

// ============ PATIENT PLANS ============
export interface PatientPlan {
  id: PlanType;
  name: string;
  nameBn: string;
  priceMonthly: number;
  priceYearly: number;
  features: PlanFeature[];
  limits: PlanLimits;
  badge?: string;
  popular?: boolean;
}

export interface PlanFeature {
  key: string;
  label: string;
  labelBn: string;
  included: boolean;
  value?: string | number;
}

export interface PlanLimits {
  appointmentsPerMonth: number; // -1 = unlimited
  aiSessionsPerMonth: number;
  voiceAgentMinutes: number;
  familyMembers: number;
  healthRecordMonths: number; // How many months of history
  videoConsultations: number;
}

// ============ DOCTOR PLANS ============
export interface DoctorPlan {
  id: DoctorPlanType;
  name: string;
  nameBn: string;
  priceMonthly: number;
  priceYearly: number;
  features: PlanFeature[];
  limits: DoctorPlanLimits;
  commissionRate: number; // Percentage
  badge?: string;
  popular?: boolean;
}

export interface DoctorPlanLimits {
  appointmentsPerMonth: number;
  aiQueriesPerMonth: number;
  chambers: number;
  staffAccounts: number;
}

// ============ SUBSCRIPTION ============
export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  planType: 'patient' | 'doctor';
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  paymentMethod?: PaymentMethod;
  trialEndsAt?: string;
}

// ============ CREDITS & REWARDS ============
export type CreditActionType = 
  | 'signup_bonus'
  | 'profile_complete'
  | 'first_appointment'
  | 'referral_signup'
  | 'referral_subscribe'
  | 'add_family_member'
  | 'monthly_checkin'
  | 'health_goal'
  | 'leave_review'
  | 'yearly_subscription'
  | 'streak_bonus'
  | 'spend_booking'
  | 'spend_ai_session'
  | 'spend_video_call'
  | 'admin_adjustment'
  | 'expired';

export interface CreditAction {
  type: CreditActionType;
  credits: number;
  label: string;
  labelBn: string;
  description: string;
  descriptionBn: string;
  oneTime: boolean; // Can only earn once
  maxPerMonth?: number; // Limit per month
}

export interface UserCredits {
  userId: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  lastUpdated: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number; // Positive = earn, Negative = spend
  type: CreditActionType;
  reason: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// ============ REFERRAL ============
export interface ReferralCode {
  code: string;
  userId: string;
  usageCount: number;
  maxUsage: number; // -1 = unlimited
  creditsPerReferral: number;
  isActive: boolean;
  createdAt: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  code: string;
  status: 'pending' | 'signed_up' | 'subscribed';
  creditsAwarded: number;
  createdAt: string;
}

// ============ FAMILY GROUP ============
export interface FamilyGroup {
  id: string;
  ownerId: string;
  name: string;
  maxMembers: number;
  createdAt: string;
}

export interface FamilyMember {
  id: string;
  groupId: string;
  userId: string;
  name: string;
  relationship: 'spouse' | 'child' | 'parent' | 'sibling' | 'other';
  dateOfBirth?: string;
  addedAt: string;
}

// ============ ACHIEVEMENTS/BADGES ============
export type BadgeType = 
  | 'early_adopter'
  | 'health_champion'
  | 'family_guardian'
  | 'referral_star'
  | 'consistency_king'
  | 'ai_explorer'
  | 'feedback_hero';

export interface Badge {
  id: BadgeType;
  name: string;
  nameBn: string;
  description: string;
  descriptionBn: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  creditsReward: number;
}

export interface UserBadge {
  badgeId: BadgeType;
  userId: string;
  earnedAt: string;
  claimed: boolean;
}

// ============ STREAKS ============
export interface UserStreak {
  userId: string;
  currentStreak: number; // Days
  longestStreak: number;
  lastActivityDate: string;
  streakType: 'daily_login' | 'weekly_checkin' | 'monthly_appointment';
}
