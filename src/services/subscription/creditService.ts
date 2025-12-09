import { 
  UserCredits, 
  CreditTransaction, 
  CreditActionType,
  ReferralCode,
  Referral,
  UserBadge,
  UserStreak,
  BadgeType
} from './types';
import { CREDIT_ACTIONS, BADGES, getFamilyBonus } from './plans';

// ============ LOCAL STORAGE KEYS ============
const CREDITS_KEY = 'nirnoy_credits';
const TRANSACTIONS_KEY = 'nirnoy_credit_transactions';
const REFERRAL_CODE_KEY = 'nirnoy_referral_code';
const BADGES_KEY = 'nirnoy_badges';
const STREAK_KEY = 'nirnoy_streak';

// ============ CREDIT SERVICE ============
class CreditService {
  // Get user credits
  getUserCredits(userId: string): UserCredits {
    const stored = localStorage.getItem(`${CREDITS_KEY}_${userId}`);
    if (stored) {
      return JSON.parse(stored);
    }
    // Initialize new user
    const initial: UserCredits = {
      userId,
      balance: 0,
      lifetimeEarned: 0,
      lifetimeSpent: 0,
      lastUpdated: new Date().toISOString(),
    };
    this.saveUserCredits(initial);
    return initial;
  }

  // Save user credits
  private saveUserCredits(credits: UserCredits): void {
    localStorage.setItem(`${CREDITS_KEY}_${credits.userId}`, JSON.stringify(credits));
  }

  // Get transaction history
  getTransactions(userId: string, limit: number = 50): CreditTransaction[] {
    const stored = localStorage.getItem(`${TRANSACTIONS_KEY}_${userId}`);
    if (stored) {
      const transactions: CreditTransaction[] = JSON.parse(stored);
      return transactions.slice(-limit).reverse();
    }
    return [];
  }

  // Add transaction
  private addTransaction(transaction: CreditTransaction): void {
    const stored = localStorage.getItem(`${TRANSACTIONS_KEY}_${transaction.userId}`);
    const transactions: CreditTransaction[] = stored ? JSON.parse(stored) : [];
    transactions.push(transaction);
    // Keep last 100 transactions
    const trimmed = transactions.slice(-100);
    localStorage.setItem(`${TRANSACTIONS_KEY}_${transaction.userId}`, JSON.stringify(trimmed));
  }

  // Check if action can be performed (one-time or limit checks)
  canEarnCredits(userId: string, actionType: CreditActionType): { canEarn: boolean; reason?: string } {
    const action = CREDIT_ACTIONS.find(a => a.type === actionType);
    if (!action) {
      return { canEarn: false, reason: 'Invalid action type' };
    }

    const transactions = this.getTransactions(userId, 100);
    
    // Check one-time actions
    if (action.oneTime) {
      const alreadyEarned = transactions.some(t => t.type === actionType && t.amount > 0);
      if (alreadyEarned) {
        return { canEarn: false, reason: 'Already earned this reward' };
      }
    }

    // Check monthly limits
    if (action.maxPerMonth) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyCount = transactions.filter(t => 
        t.type === actionType && 
        t.amount > 0 &&
        new Date(t.createdAt) >= monthStart
      ).length;
      
      if (monthlyCount >= action.maxPerMonth) {
        return { canEarn: false, reason: `Monthly limit reached (${action.maxPerMonth})` };
      }
    }

    return { canEarn: true };
  }

  // Earn credits
  earnCredits(
    userId: string, 
    actionType: CreditActionType, 
    metadata?: Record<string, any>
  ): { success: boolean; credits: number; message: string } {
    const { canEarn, reason } = this.canEarnCredits(userId, actionType);
    
    if (!canEarn) {
      return { success: false, credits: 0, message: reason || 'Cannot earn credits' };
    }

    const action = CREDIT_ACTIONS.find(a => a.type === actionType)!;
    const credits = this.getUserCredits(userId);

    // Update credits
    credits.balance += action.credits;
    credits.lifetimeEarned += action.credits;
    credits.lastUpdated = new Date().toISOString();
    this.saveUserCredits(credits);

    // Record transaction
    const transaction: CreditTransaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      amount: action.credits,
      type: actionType,
      reason: action.label,
      metadata,
      createdAt: new Date().toISOString(),
    };
    this.addTransaction(transaction);

    // Check for badge unlocks
    this.checkBadgeUnlocks(userId);

    return { 
      success: true, 
      credits: action.credits, 
      message: action.description 
    };
  }

  // Spend credits
  spendCredits(
    userId: string, 
    amount: number, 
    actionType: CreditActionType,
    reason: string,
    metadata?: Record<string, any>
  ): { success: boolean; message: string } {
    const credits = this.getUserCredits(userId);

    if (credits.balance < amount) {
      return { success: false, message: 'Insufficient credits' };
    }

    // Update credits
    credits.balance -= amount;
    credits.lifetimeSpent += amount;
    credits.lastUpdated = new Date().toISOString();
    this.saveUserCredits(credits);

    // Record transaction
    const transaction: CreditTransaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      amount: -amount,
      type: actionType,
      reason,
      metadata,
      createdAt: new Date().toISOString(),
    };
    this.addTransaction(transaction);

    return { success: true, message: 'Credits spent successfully' };
  }

  // ============ REFERRAL SYSTEM ============
  
  // Generate referral code
  generateReferralCode(userId: string): ReferralCode {
    const existingCode = this.getReferralCode(userId);
    if (existingCode) return existingCode;

    // Generate unique code
    const code = `NIRNOY${userId.slice(-4).toUpperCase()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    const referralCode: ReferralCode = {
      code,
      userId,
      usageCount: 0,
      maxUsage: -1, // Unlimited
      creditsPerReferral: 50,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(`${REFERRAL_CODE_KEY}_${userId}`, JSON.stringify(referralCode));
    return referralCode;
  }

  // Get referral code
  getReferralCode(userId: string): ReferralCode | null {
    const stored = localStorage.getItem(`${REFERRAL_CODE_KEY}_${userId}`);
    return stored ? JSON.parse(stored) : null;
  }

  // Use referral code (when new user signs up)
  useReferralCode(code: string, newUserId: string): { success: boolean; message: string } {
    // Find the referrer
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith(REFERRAL_CODE_KEY));
    
    for (const key of allKeys) {
      const referralCode: ReferralCode = JSON.parse(localStorage.getItem(key)!);
      if (referralCode.code === code && referralCode.isActive) {
        // Award credits to referrer
        this.earnCredits(referralCode.userId, 'referral_signup', { referredUserId: newUserId });
        
        // Update usage count
        referralCode.usageCount++;
        localStorage.setItem(key, JSON.stringify(referralCode));

        return { success: true, message: 'Referral code applied!' };
      }
    }

    return { success: false, message: 'Invalid or inactive referral code' };
  }

  // Award referrer when referred user subscribes
  awardReferralSubscription(referrerId: string, subscriberId: string): void {
    this.earnCredits(referrerId, 'referral_subscribe', { subscriberId });
  }

  // ============ BADGE SYSTEM ============

  // Get user badges
  getUserBadges(userId: string): UserBadge[] {
    const stored = localStorage.getItem(`${BADGES_KEY}_${userId}`);
    return stored ? JSON.parse(stored) : [];
  }

  // Award badge
  awardBadge(userId: string, badgeId: BadgeType): { success: boolean; badge?: typeof BADGES[0] } {
    const badges = this.getUserBadges(userId);
    
    // Check if already has badge
    if (badges.some(b => b.badgeId === badgeId)) {
      return { success: false };
    }

    const badge = BADGES.find(b => b.id === badgeId);
    if (!badge) return { success: false };

    // Add badge
    const userBadge: UserBadge = {
      badgeId,
      userId,
      earnedAt: new Date().toISOString(),
      claimed: false,
    };
    badges.push(userBadge);
    localStorage.setItem(`${BADGES_KEY}_${userId}`, JSON.stringify(badges));

    // Award credits for badge
    this.earnCredits(userId, 'signup_bonus', { reason: `Badge: ${badge.name}`, credits: badge.creditsReward });

    return { success: true, badge };
  }

  // Check and unlock badges based on activity
  checkBadgeUnlocks(userId: string): void {
    const transactions = this.getTransactions(userId, 100);
    const badges = this.getUserBadges(userId);

    // Health Champion: 10 appointments
    const appointmentCount = transactions.filter(t => 
      t.type === 'first_appointment' || t.reason.includes('appointment')
    ).length;
    if (appointmentCount >= 10 && !badges.some(b => b.badgeId === 'health_champion')) {
      this.awardBadge(userId, 'health_champion');
    }

    // Referral Star: 5 referrals
    const referralCount = transactions.filter(t => t.type === 'referral_signup').length;
    if (referralCount >= 5 && !badges.some(b => b.badgeId === 'referral_star')) {
      this.awardBadge(userId, 'referral_star');
    }

    // AI Explorer: 50 AI uses
    const aiCount = transactions.filter(t => 
      t.type === 'spend_ai_session' || t.reason.includes('AI')
    ).length;
    if (aiCount >= 50 && !badges.some(b => b.badgeId === 'ai_explorer')) {
      this.awardBadge(userId, 'ai_explorer');
    }

    // Family Guardian: 5 family members
    const familyCount = transactions.filter(t => t.type === 'add_family_member').length;
    if (familyCount >= 5 && !badges.some(b => b.badgeId === 'family_guardian')) {
      this.awardBadge(userId, 'family_guardian');
    }
  }

  // ============ STREAK SYSTEM ============

  // Get user streak
  getUserStreak(userId: string): UserStreak {
    const stored = localStorage.getItem(`${STREAK_KEY}_${userId}`);
    if (stored) {
      return JSON.parse(stored);
    }
    const initial: UserStreak = {
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: '',
      streakType: 'daily_login',
    };
    return initial;
  }

  // Update streak (call on user activity)
  updateStreak(userId: string): { streakUpdated: boolean; currentStreak: number; bonusAwarded: boolean } {
    const streak = this.getUserStreak(userId);
    const today = new Date().toISOString().split('T')[0];
    const lastDate = streak.lastActivityDate;

    let bonusAwarded = false;

    if (!lastDate) {
      // First activity
      streak.currentStreak = 1;
    } else if (lastDate === today) {
      // Already active today
      return { streakUpdated: false, currentStreak: streak.currentStreak, bonusAwarded: false };
    } else {
      const lastActivity = new Date(lastDate);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day
        streak.currentStreak++;
        
        // Award streak bonus at 30 days
        if (streak.currentStreak === 30) {
          this.earnCredits(userId, 'streak_bonus');
          bonusAwarded = true;
          
          // Award badge
          this.awardBadge(userId, 'consistency_king');
        }
      } else {
        // Streak broken
        streak.currentStreak = 1;
      }
    }

    // Update longest streak
    if (streak.currentStreak > streak.longestStreak) {
      streak.longestStreak = streak.currentStreak;
    }

    streak.lastActivityDate = today;
    localStorage.setItem(`${STREAK_KEY}_${userId}`, JSON.stringify(streak));

    return { streakUpdated: true, currentStreak: streak.currentStreak, bonusAwarded };
  }

  // ============ FAMILY BONUS ============

  // Calculate family bonus
  calculateFamilyBonus(memberCount: number): { monthlyCredits: number; freeMonths: number } {
    const bonus = getFamilyBonus(memberCount);
    return {
      monthlyCredits: bonus.monthlyCredits,
      freeMonths: bonus.freeMonths,
    };
  }

  // Award family member bonus
  awardFamilyMemberBonus(userId: string, memberName: string): void {
    this.earnCredits(userId, 'add_family_member', { memberName });
  }

  // ============ UTILITY ============

  // Get credit value in BDT
  getCreditValueBDT(credits: number): number {
    return credits * 10; // 1 credit = ৳10
  }

  // Format credits for display
  formatCredits(credits: number, isBn: boolean = false): string {
    if (isBn) {
      return `${credits} ক্রেডিট`;
    }
    return `${credits} Credits`;
  }

  // Get leaderboard (mock - would be from server)
  getLeaderboard(limit: number = 10): { userId: string; credits: number; rank: number }[] {
    // In real app, this would come from server
    return [];
  }
}

// Export singleton instance
export const creditService = new CreditService();
export default creditService;
