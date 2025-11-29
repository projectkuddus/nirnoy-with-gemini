-- ============================================
-- NIRNOY SUBSCRIPTION & GAMIFICATION SCHEMA
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============ SUBSCRIPTION PLANS ============
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_key VARCHAR(50) UNIQUE NOT NULL, -- 'free', 'basic', 'premium', 'family', 'starter', 'professional', 'enterprise'
  name VARCHAR(100) NOT NULL,
  name_bn VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'patient' | 'doctor'
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]',
  limits JSONB NOT NULL DEFAULT '{}',
  commission_rate DECIMAL(5,2) DEFAULT 0, -- For doctor plans
  is_active BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,
  badge VARCHAR(10),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ USER SUBSCRIPTIONS ============
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired', 'trial'
  billing_cycle VARCHAR(10) NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly'
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  auto_renew BOOLEAN DEFAULT true,
  payment_method VARCHAR(20), -- 'bkash', 'nagad', 'card', 'bank'
  last_payment_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id) -- One active subscription per user
);

-- ============ PAYMENTS ============
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BDT',
  method VARCHAR(20) NOT NULL, -- 'bkash', 'nagad', 'card', 'bank'
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  transaction_id VARCHAR(100),
  gateway_response JSONB,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ============ USER CREDITS ============
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ CREDIT TRANSACTIONS ============
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Positive = earn, Negative = spend
  type VARCHAR(50) NOT NULL, -- 'signup_bonus', 'referral', etc.
  reason VARCHAR(200),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ REFERRAL CODES ============
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code VARCHAR(20) UNIQUE NOT NULL,
  usage_count INTEGER DEFAULT 0,
  max_usage INTEGER DEFAULT -1, -- -1 = unlimited
  credits_per_referral INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ REFERRALS ============
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'signed_up', 'subscribed'
  credits_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referred_id) -- Each user can only be referred once
);

-- ============ USER BADGES ============
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id VARCHAR(50) NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  claimed BOOLEAN DEFAULT false,
  UNIQUE(user_id, badge_id)
);

-- ============ USER STREAKS ============
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  streak_type VARCHAR(20) DEFAULT 'daily_login',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ FAMILY GROUPS ============
CREATE TABLE IF NOT EXISTS family_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  max_members INTEGER DEFAULT 6,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ FAMILY MEMBERS ============
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  relationship VARCHAR(50) NOT NULL, -- 'spouse', 'child', 'parent', 'sibling', 'other'
  date_of_birth DATE,
  phone VARCHAR(20),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(code);
CREATE INDEX IF NOT EXISTS idx_family_members_group ON family_members(group_id);

-- ============ ROW LEVEL SECURITY ============
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Plans are public read
CREATE POLICY "Plans are viewable by everyone" ON subscription_plans
  FOR SELECT USING (true);

-- Users can only see their own data
CREATE POLICY "Users can view own subscription" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own credits" ON user_credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transactions" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own referral code" ON referral_codes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Users can view own badges" ON user_badges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own streak" ON user_streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own family" ON family_groups
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can view family members" ON family_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM family_groups WHERE id = group_id AND owner_id = auth.uid())
  );

-- ============ INSERT DEFAULT PLANS ============
INSERT INTO subscription_plans (plan_key, name, name_bn, type, price_monthly, price_yearly, is_popular, sort_order, features, limits) VALUES
-- Patient Plans
('free', 'Free', 'ফ্রি', 'patient', 0, 0, false, 1, 
  '[{"key": "appointments", "value": "2/month"}, {"key": "ai_sessions", "value": "1 trial"}]',
  '{"appointmentsPerMonth": 2, "aiSessionsPerMonth": 1, "familyMembers": 0}'
),
('basic', 'Basic', 'বেসিক', 'patient', 199, 1999, false, 2,
  '[{"key": "appointments", "value": "Unlimited"}, {"key": "ai_sessions", "value": "10/month"}]',
  '{"appointmentsPerMonth": -1, "aiSessionsPerMonth": 10, "familyMembers": 0}'
),
('premium', 'Premium', 'প্রিমিয়াম', 'patient', 399, 3999, true, 3,
  '[{"key": "appointments", "value": "Unlimited"}, {"key": "ai_sessions", "value": "Unlimited"}, {"key": "video", "value": "2/month"}]',
  '{"appointmentsPerMonth": -1, "aiSessionsPerMonth": -1, "familyMembers": 0, "videoConsultations": 2}'
),
('family', 'Family', 'পরিবার', 'patient', 699, 6999, false, 4,
  '[{"key": "members", "value": "Up to 6"}, {"key": "shared_dashboard", "value": true}]',
  '{"appointmentsPerMonth": -1, "aiSessionsPerMonth": -1, "familyMembers": 6, "videoConsultations": 5}'
),
-- Doctor Plans
('starter', 'Starter', 'স্টার্টার', 'doctor', 999, 9999, false, 1,
  '[{"key": "appointments", "value": "50/month"}, {"key": "ai_queries", "value": "10/month"}]',
  '{"appointmentsPerMonth": 50, "aiQueriesPerMonth": 10, "chambers": 1}'
),
('professional', 'Professional', 'প্রফেশনাল', 'doctor', 2499, 24999, true, 2,
  '[{"key": "appointments", "value": "Unlimited"}, {"key": "ai_queries", "value": "100/month"}, {"key": "chambers", "value": "3"}]',
  '{"appointmentsPerMonth": -1, "aiQueriesPerMonth": 100, "chambers": 3}'
),
('enterprise', 'Enterprise', 'এন্টারপ্রাইজ', 'doctor', 4999, 49999, false, 3,
  '[{"key": "appointments", "value": "Unlimited"}, {"key": "ai_queries", "value": "Unlimited"}, {"key": "chambers", "value": "Unlimited"}]',
  '{"appointmentsPerMonth": -1, "aiQueriesPerMonth": -1, "chambers": -1}'
)
ON CONFLICT (plan_key) DO NOTHING;

-- ============ FUNCTIONS ============

-- Function to add credits
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_type VARCHAR(50),
  p_reason VARCHAR(200) DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  -- Insert or update user credits
  INSERT INTO user_credits (user_id, balance, lifetime_earned, last_updated)
  VALUES (p_user_id, GREATEST(0, p_amount), GREATEST(0, p_amount), NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    balance = user_credits.balance + p_amount,
    lifetime_earned = CASE WHEN p_amount > 0 THEN user_credits.lifetime_earned + p_amount ELSE user_credits.lifetime_earned END,
    lifetime_spent = CASE WHEN p_amount < 0 THEN user_credits.lifetime_spent + ABS(p_amount) ELSE user_credits.lifetime_spent END,
    last_updated = NOW()
  RETURNING balance INTO new_balance;

  -- Record transaction
  INSERT INTO credit_transactions (user_id, amount, type, reason)
  VALUES (p_user_id, p_amount, p_type, p_reason);

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql;

-- Function to update streak
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_streak INTEGER;
  last_date DATE;
BEGIN
  SELECT us.current_streak, us.last_activity_date INTO current_streak, last_date
  FROM user_streaks us WHERE us.user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date)
    VALUES (p_user_id, 1, 1, CURRENT_DATE);
    RETURN 1;
  END IF;

  IF last_date = CURRENT_DATE THEN
    RETURN current_streak;
  ELSIF last_date = CURRENT_DATE - 1 THEN
    current_streak := current_streak + 1;
  ELSE
    current_streak := 1;
  END IF;

  UPDATE user_streaks SET
    current_streak = current_streak,
    longest_streak = GREATEST(longest_streak, current_streak),
    last_activity_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN current_streak;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE subscription_plans IS 'Available subscription plans for patients and doctors';
COMMENT ON TABLE user_subscriptions IS 'Active user subscriptions';
COMMENT ON TABLE payments IS 'Payment transactions';
COMMENT ON TABLE user_credits IS 'User credit balances for gamification';
COMMENT ON TABLE credit_transactions IS 'Credit earning and spending history';
