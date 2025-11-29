# Nirnoy Pricing & Subscription System Design

## 📊 Cost Analysis (Per User/Month)

### Infrastructure Costs (Estimated)

| Service | Cost/User/Month | Notes |
|---------|-----------------|-------|
| **Supabase** | ৳5-10 | Database, Auth, Storage |
| **Gemini AI** | ৳20-50 | ~100 AI queries/user/month |
| **Voice Agent** | ৳30-60 | ~10 voice sessions/user/month |
| **Hosting (Vercel)** | ৳2-5 | CDN, Serverless |
| **SMS OTP** | ৳5-10 | ~5 OTPs/user/month |
| **Total** | **৳62-135** | Per active user |

### Break-even Analysis
- Minimum charge per user: **৳150-200/month** to be sustainable
- With 30% margin: **৳200-300/month**

---

## 👤 Patient Subscription Plans

### 1. Free Tier (ফ্রি)
**Price: ৳0/month**

| Feature | Limit |
|---------|-------|
| Doctor Search | ✅ Unlimited |
| View Doctor Profiles | ✅ Unlimited |
| AI Voice Agent | ❌ 1 session only (trial) |
| Book Appointments | ❌ 2/month |
| Health Records | ❌ None |
| Family Members | ❌ None |
| AI Health Insights | ❌ None |

**Purpose**: Try before you buy, basic doctor discovery

---

### 2. Basic Plan (বেসিক)
**Price: ৳199/month** or **৳1,999/year** (Save ৳389!)

| Feature | Limit |
|---------|-------|
| Doctor Search | ✅ Unlimited |
| Book Appointments | ✅ Unlimited |
| AI Voice Agent | ✅ 10 sessions/month |
| Health Records | ✅ Personal only |
| Prescription History | ✅ Last 6 months |
| Family Members | ❌ None |
| AI Health Insights | ✅ Basic |
| Priority Support | ❌ No |

---

### 3. Premium Plan (প্রিমিয়াম) ⭐ RECOMMENDED
**Price: ৳399/month** or **৳3,999/year** (Save ৳789!)

| Feature | Limit |
|---------|-------|
| Everything in Basic | ✅ |
| AI Voice Agent | ✅ Unlimited |
| Health Records | ✅ Full history |
| AI Health Insights | ✅ Advanced + Trends |
| Priority Booking | ✅ Yes |
| Video Consultation | ✅ 2/month included |
| Priority Support | ✅ 24/7 |

---

### 4. Family Plan (পরিবার) 👨‍👩‍👧‍👦
**Price: ৳699/month** or **৳6,999/year** (Save ৳1,389!)

| Feature | Limit |
|---------|-------|
| Everything in Premium | ✅ |
| Family Members | ✅ Up to 6 members |
| Shared Health Dashboard | ✅ |
| Child Health Tracking | ✅ |
| Elder Care Alerts | ✅ |
| Family AI Insights | ✅ Cross-member analysis |
| Emergency Contacts | ✅ Auto-notify family |

---

## 🎮 Gamification & Rewards System

### Credit System (ক্রেডিট)
- 1 Credit = ৳10 value
- Can be used for: Extra AI sessions, Video consultations, Premium features

### Earning Credits

| Action | Credits Earned |
|--------|---------------|
| **Sign Up** | 50 credits (৳500 value!) |
| **Complete Profile** | 20 credits |
| **First Appointment** | 30 credits |
| **Refer a Friend** | 100 credits (when they subscribe) |
| **Add Family Member** | 50 credits each (max 5) |
| **Monthly Check-in** | 10 credits |
| **Health Goal Achieved** | 25 credits |
| **Leave a Review** | 15 credits |
| **Yearly Subscription** | 200 credits bonus |

### Family Bonus Structure

| Family Size | Monthly Bonus | Free Months/Year |
|-------------|---------------|------------------|
| 2 members | 20 credits | 0.5 month |
| 3 members | 50 credits | 1 month |
| 4 members | 100 credits | 2 months |
| 5 members | 150 credits | 3 months |
| 6 members | 200 credits | 4 months FREE! |

**Example**: Family of 6 on yearly plan:
- Base: ৳6,999/year
- Family Bonus: 4 months free = ৳2,333 value
- **Effective: ৳4,666/year for 6 people = ৳778/person/year!**

---

## 👨‍⚕️ Doctor Subscription Plans

### 1. Starter (স্টার্টার)
**Price: ৳999/month** or **৳9,999/year**

| Feature | Limit |
|---------|-------|
| Profile Listing | ✅ Basic |
| Appointments/month | 50 |
| Patient Management | ✅ Basic |
| Prescription Builder | ✅ |
| AI Clinical Assistant | ❌ 10 queries/month |
| Analytics | ❌ Basic only |
| Payment Collection | ❌ Cash only |
| Commission on Bookings | 15% |

---

### 2. Professional (প্রফেশনাল) ⭐ POPULAR
**Price: ৳2,499/month** or **৳24,999/year**

| Feature | Limit |
|---------|-------|
| Profile Listing | ✅ Featured |
| Appointments/month | Unlimited |
| Patient Management | ✅ Full CRM |
| Prescription Builder | ✅ + Templates |
| AI Clinical Assistant | ✅ 100 queries/month |
| Analytics | ✅ Advanced |
| R&D / Medical News | ✅ |
| Payment Collection | ✅ bKash/Nagad/Card |
| Commission on Bookings | 10% |
| Multi-Chamber Support | ✅ Up to 3 |

---

### 3. Enterprise (এন্টারপ্রাইজ)
**Price: ৳4,999/month** or **৳49,999/year**

| Feature | Limit |
|---------|-------|
| Everything in Professional | ✅ |
| AI Clinical Assistant | ✅ Unlimited |
| Video Consultation | ✅ Built-in |
| Staff Accounts | ✅ Up to 5 |
| Multi-Chamber Support | ✅ Unlimited |
| White-label Prescription | ✅ |
| API Access | ✅ |
| Commission on Bookings | 5% |
| Dedicated Support | ✅ |

---

## 💳 Payment Collection Options for Doctors

### Option A: Collect via Nirnoy
- Patient pays Nirnoy → Nirnoy pays Doctor (minus commission)
- **Pros**: Guaranteed payment, no-show protection, refund handling
- **Cons**: Commission fee, delayed payout (weekly)

### Option B: Collect Directly (Cash/Own bKash)
- Patient pays Doctor directly at chamber
- **Pros**: Immediate payment, no commission
- **Cons**: No-show risk, manual tracking

### Option C: Hybrid
- Online booking: Collect via Nirnoy
- Walk-in: Collect directly
- **Best of both worlds**

### Commission Structure

| Plan | Commission | Payout Frequency |
|------|------------|------------------|
| Starter | 15% | Weekly |
| Professional | 10% | Weekly |
| Enterprise | 5% | Daily |

---

## 🏥 Clinic/Hospital Plans (Future)

### Clinic Basic: ৳9,999/month
- Up to 5 doctors
- Shared reception dashboard
- Centralized booking

### Clinic Pro: ৳24,999/month
- Up to 20 doctors
- Full hospital management
- Inventory, billing, reports

---

## 📱 Payment Gateway Integration

### Supported Methods
1. **bKash** - Most popular in BD
2. **Nagad** - Growing fast
3. **Rocket** - DBBL users
4. **Card** - Visa/Mastercard via SSLCommerz
5. **Bank Transfer** - For yearly plans

### Implementation Priority
1. bKash (Phase 1)
2. Nagad (Phase 1)
3. Card (Phase 2)
4. Bank (Phase 3)

---

## 🎁 Launch Promotions

### For Patients
- **First 1000 users**: 3 months Premium FREE
- **Referral**: Both get 1 month Premium
- **Yearly subscribers**: 2 months FREE

### For Doctors
- **First 100 doctors**: 6 months Professional FREE
- **BMDC verified**: 1 month FREE
- **Yearly subscribers**: 3 months FREE

---

## 📈 Revenue Projections (Year 1)

### Conservative Estimate
| Metric | Count | Revenue/Month |
|--------|-------|---------------|
| Free Users | 10,000 | ৳0 |
| Basic Patients | 1,000 | ৳199,000 |
| Premium Patients | 500 | ৳199,500 |
| Family Plans | 200 | ৳139,800 |
| Starter Doctors | 50 | ৳49,950 |
| Pro Doctors | 30 | ৳74,970 |
| **Total** | | **৳663,220/month** |
| **Yearly** | | **৳79,58,640** |

### After Commission (10% avg)
- Booking volume: 5,000/month
- Avg fee: ৳800
- Commission: ৳400,000/month

### **Total Year 1: ~৳1.27 Crore**

---

## 🔧 Implementation Phases

### Phase 1 (Month 1-2)
- [ ] Basic subscription tiers (Patient: Free, Basic)
- [ ] bKash integration
- [ ] Credit system foundation
- [ ] Doctor Starter plan

### Phase 2 (Month 3-4)
- [ ] Premium & Family plans
- [ ] Nagad integration
- [ ] Full gamification
- [ ] Doctor Professional plan

### Phase 3 (Month 5-6)
- [ ] Card payments
- [ ] Video consultation
- [ ] Enterprise plan
- [ ] Clinic plans

---

## 📋 Database Schema (Subscription)

```sql
-- Subscription Plans
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY,
  name VARCHAR(50),
  name_bn VARCHAR(50),
  type VARCHAR(20), -- 'patient' | 'doctor' | 'clinic'
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  features JSONB,
  limits JSONB,
  is_active BOOLEAN DEFAULT true
);

-- User Subscriptions
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  plan_id UUID REFERENCES subscription_plans(id),
  status VARCHAR(20), -- 'active' | 'cancelled' | 'expired'
  billing_cycle VARCHAR(10), -- 'monthly' | 'yearly'
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  auto_renew BOOLEAN DEFAULT true,
  payment_method VARCHAR(20)
);

-- Credits/Rewards
CREATE TABLE user_credits (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  balance INTEGER DEFAULT 0,
  lifetime_earned INTEGER DEFAULT 0,
  lifetime_spent INTEGER DEFAULT 0
);

-- Credit Transactions
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  amount INTEGER,
  type VARCHAR(20), -- 'earn' | 'spend' | 'expire'
  reason VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Family Groups
CREATE TABLE family_groups (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES users(id),
  name VARCHAR(100),
  max_members INTEGER DEFAULT 6,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Family Members
CREATE TABLE family_members (
  id UUID PRIMARY KEY,
  group_id UUID REFERENCES family_groups(id),
  user_id UUID REFERENCES users(id),
  relationship VARCHAR(50),
  added_at TIMESTAMP DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'BDT',
  method VARCHAR(20), -- 'bkash' | 'nagad' | 'card'
  status VARCHAR(20), -- 'pending' | 'completed' | 'failed'
  transaction_id VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## ✅ Next Steps

1. **Validate pricing** with potential users (survey)
2. **Set up bKash merchant account**
3. **Implement subscription tables**
4. **Build pricing page UI**
5. **Create admin panel for plan management**

---

*Last Updated: November 29, 2025*
*Version: 1.0*
