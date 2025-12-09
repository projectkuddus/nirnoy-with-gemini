import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { creditService } from '../services/subscription/creditService';
import { CREDIT_ACTIONS, BADGES } from '../services/subscription/plans';
import { UserCredits, CreditTransaction, UserBadge, UserStreak } from '../services/subscription/types';

interface RewardsWidgetProps {
  userId: string;
  compact?: boolean;
}

export const RewardsWidget: React.FC<RewardsWidgetProps> = ({ userId, compact = false }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [referralCode, setReferralCode] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (userId) {
      // Load user data
      const userCredits = creditService.getUserCredits(userId);
      setCredits(userCredits);
      
      const userTransactions = creditService.getTransactions(userId, 10);
      setTransactions(userTransactions);
      
      const userBadges = creditService.getUserBadges(userId);
      setBadges(userBadges);
      
      const userStreak = creditService.getUserStreak(userId);
      setStreak(userStreak);
      
      // Generate referral code
      const code = creditService.generateReferralCode(userId);
      setReferralCode(code.code);
      
      // Update streak
      creditService.updateStreak(userId);
    }
  }, [userId]);

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const t = {
    credits: isBn ? 'ক্রেডিট' : 'Credits',
    yourCredits: isBn ? 'আপনার ক্রেডিট' : 'Your Credits',
    earnMore: isBn ? 'আরো উপার্জন করুন' : 'Earn More',
    streak: isBn ? 'স্ট্রিক' : 'Streak',
    days: isBn ? 'দিন' : 'days',
    referral: isBn ? 'রেফারেল কোড' : 'Referral Code',
    copy: isBn ? 'কপি' : 'Copy',
    copied: isBn ? 'কপি হয়েছে!' : 'Copied!',
    badges: isBn ? 'ব্যাজ' : 'Badges',
    recentActivity: isBn ? 'সাম্প্রতিক কার্যক্রম' : 'Recent Activity',
    viewAll: isBn ? 'সব দেখুন' : 'View All',
    earnCredits: isBn ? 'ক্রেডিট উপার্জন করুন' : 'Earn Credits',
    value: isBn ? 'মূল্য' : 'Value',
    upgradePlan: isBn ? 'প্ল্যান আপগ্রেড করুন' : 'Upgrade Plan',
  };

  if (!credits) return null;

  // Compact version for sidebar
  if (compact) {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="font-bold text-amber-800">{t.yourCredits}</span>
          </div>
          <div className="text-2xl font-black text-amber-600">{credits.balance}</div>
        </div>
        
        {/* Streak */}
        {streak && streak.currentStreak > 0 && (
          <div className="flex items-center gap-2 mb-3 text-sm">
            <span>🔥</span>
            <span className="text-amber-700">{streak.currentStreak} {t.days} {t.streak}</span>
          </div>
        )}
        
        {/* Quick Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowDetails(true)}
            className="flex-1 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition"
          >
            {t.earnMore}
          </button>
          <button
            onClick={() => navigate('/pricing')}
            className="flex-1 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition"
          >
            {t.upgradePlan}
          </button>
        </div>
      </div>
    );
  }

  // Full version
  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span>🎮</span> {t.yourCredits}
            </h3>
            <p className="text-amber-100 text-sm">{t.value}: ৳{credits.balance * 10}</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black">{credits.balance}</div>
            <div className="text-amber-100 text-sm">{t.credits}</div>
          </div>
        </div>
        
        {/* Streak */}
        {streak && streak.currentStreak > 0 && (
          <div className="mt-4 flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2 w-fit">
            <span className="text-xl">🔥</span>
            <span className="font-bold">{streak.currentStreak} {t.days}</span>
            <span className="text-amber-100">{t.streak}</span>
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Referral Code */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-purple-800 flex items-center gap-2">
                <span>🎁</span> {t.referral}
              </h4>
              <p className="text-sm text-purple-600 mt-1">
                {isBn ? 'বন্ধুদের শেয়ার করুন, ১০০ ক্রেডিট পান!' : 'Share with friends, earn 100 credits!'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="bg-white px-3 py-2 rounded-lg font-mono font-bold text-purple-700 border border-purple-200">
                {referralCode}
              </code>
              <button
                onClick={copyReferralCode}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  copied ? 'bg-green-500 text-white' : 'bg-purple-500 text-white hover:bg-purple-600'
                }`}
              >
                {copied ? t.copied : t.copy}
              </button>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div>
          <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <span>🏆</span> {t.badges}
          </h4>
          <div className="flex flex-wrap gap-3">
            {BADGES.map((badge) => {
              const earned = badges.some(b => b.badgeId === badge.id);
              return (
                <div
                  key={badge.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                    earned 
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200' 
                      : 'bg-slate-50 border-slate-200 opacity-50'
                  }`}
                >
                  <span className="text-2xl">{badge.icon}</span>
                  <div>
                    <div className="text-sm font-bold text-slate-700">{isBn ? badge.nameBn : badge.name}</div>
                    <div className="text-xs text-amber-600">+{badge.creditsReward}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Earn Credits */}
        <div>
          <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <span>💰</span> {t.earnCredits}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {CREDIT_ACTIONS.filter(a => a.credits > 0).slice(0, 6).map((action) => {
              const canEarn = creditService.canEarnCredits(userId, action.type).canEarn;
              return (
                <div
                  key={action.type}
                  className={`p-3 rounded-xl border ${
                    canEarn ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200 opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">{isBn ? action.labelBn : action.label}</span>
                    <span className={`font-bold ${canEarn ? 'text-green-600' : 'text-slate-400'}`}>
                      +{action.credits}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        {transactions.length > 0 && (
          <div>
            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span>📜</span> {t.recentActivity}
            </h4>
            <div className="space-y-2">
              {transactions.slice(0, 5).map((txn) => (
                <div key={txn.id} className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div>
                    <div className="text-sm text-slate-700">{txn.reason}</div>
                    <div className="text-xs text-slate-400">
                      {new Date(txn.createdAt).toLocaleDateString(isBn ? 'bn-BD' : 'en-US')}
                    </div>
                  </div>
                  <span className={`font-bold ${txn.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {txn.amount > 0 ? '+' : ''}{txn.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={() => navigate('/pricing')}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:shadow-lg transition"
        >
          {t.upgradePlan}
        </button>
      </div>
    </div>
  );
};

export default RewardsWidget;
