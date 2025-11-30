import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { getFeedbacks, updateFeedbackStatus } from '../components/FeedbackWidget';
import { useAuth, DoctorProfile, PatientProfile } from '../contexts/AuthContext';

// ============ TYPES ============
type AdminTab = 'overview' | 'doctor-requests' | 'doctors' | 'patients' | 'subscribers' | 'feedback' | 'analytics' | 'finance' | 'settings';

interface AdminSettings {
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  notificationsEnabled: boolean;
  autoApproveVerifiedDoctors: boolean;
  maintenanceMode: boolean;
}

interface ExpenseConfig {
  supabase: number;       // Monthly cost in BDT
  vercel: number;         // Monthly cost in BDT
  twilio: number;         // Per SMS cost in BDT
  geminiApi: number;      // Per 1000 tokens in BDT
  hosting: number;        // Monthly cost in BDT
  domain: number;         // Monthly cost in BDT
  other: number;          // Other monthly costs in BDT
}

interface FinanceData {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  incomeBreakdown: {
    subscriptions: number;
    consultations: number;
    other: number;
  };
  expenseBreakdown: {
    supabase: number;
    vercel: number;
    twilio: number;
    geminiApi: number;
    hosting: number;
    domain: number;
    other: number;
  };
  perUserCost: number;
  perUserRevenue: number;
  aiUsage: {
    totalTokens: number;
    totalConversations: number;
    cost: number;
  };
  smsUsage: {
    totalSent: number;
    cost: number;
  };
}

// ============ STORAGE KEYS ============
const ADMIN_STORAGE = {
  AUTH: 'nirnoy_admin_auth',
  SETTINGS: 'nirnoy_admin_settings',
  EXPENSES: 'nirnoy_admin_expenses',
  FINANCE: 'nirnoy_admin_finance',
  USAGE_LOG: 'nirnoy_usage_log',
  TRANSACTIONS: 'nirnoy_transactions',
};

// Usage tracking keys (used across the app)
const USAGE_KEYS = {
  AI_CONVERSATIONS: 'nirnoy_ai_conversations',
  AI_TOKENS: 'nirnoy_ai_tokens_used',
  SMS_SENT: 'nirnoy_sms_sent_count',
  APPOINTMENTS: 'nirnoy_appointments',
  PAGE_VIEWS: 'nirnoy_page_views',
};

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  userId?: string;
  userName?: string;
  timestamp: string;
  auto: boolean; // true if auto-tracked, false if manually added
}

interface UsageStats {
  aiConversations: number;
  aiTokensUsed: number;
  smsSent: number;
  totalAppointments: number;
  pageViews: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisMonth: number;
}

// Get all transactions
const getTransactions = (): Transaction[] => {
  try { return JSON.parse(localStorage.getItem(ADMIN_STORAGE.TRANSACTIONS) || '[]'); } catch { return []; }
};

const saveTransaction = (tx: Transaction) => {
  const transactions = getTransactions();
  transactions.push(tx);
  localStorage.setItem(ADMIN_STORAGE.TRANSACTIONS, JSON.stringify(transactions));
};

// Auto-collect usage stats from across the app
const collectUsageStats = (): UsageStats => {
  const patients = getStoredPatients();
  const doctors = getStoredDoctors();
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const thisMonth = now.toISOString().slice(0, 7);
  
  // Count AI conversations from patient profiles
  let totalAiConversations = 0;
  let totalAiTokens = 0;
  patients.forEach(p => {
    if (p.consultationHistory) totalAiConversations += p.consultationHistory.length;
    if (p.aiInsights) totalAiConversations += p.aiInsights.length;
  });
  
  // Get stored usage counts
  totalAiConversations += parseInt(localStorage.getItem(USAGE_KEYS.AI_CONVERSATIONS) || '0');
  totalAiTokens = parseInt(localStorage.getItem(USAGE_KEYS.AI_TOKENS) || '0');
  const smsSent = parseInt(localStorage.getItem(USAGE_KEYS.SMS_SENT) || '0');
  const pageViews = parseInt(localStorage.getItem(USAGE_KEYS.PAGE_VIEWS) || '0');
  
  // Count appointments
  let totalAppointments = 0;
  patients.forEach(p => {
    if (p.consultationHistory) totalAppointments += p.consultationHistory.length;
  });
  
  // Count new users
  const newUsersToday = patients.filter(p => p.createdAt?.startsWith(today)).length +
                        doctors.filter(d => d.createdAt?.startsWith(today)).length;
  const newUsersThisMonth = patients.filter(p => p.createdAt?.startsWith(thisMonth)).length +
                            doctors.filter(d => d.createdAt?.startsWith(thisMonth)).length;
  
  return {
    aiConversations: totalAiConversations,
    aiTokensUsed: totalAiTokens || totalAiConversations * 500, // Estimate 500 tokens per conversation
    smsSent,
    totalAppointments,
    pageViews,
    activeUsers: patients.length + doctors.length,
    newUsersToday,
    newUsersThisMonth,
  };
};

// Calculate auto-finance data from all sources
const calculateAutoFinance = (
  patients: PatientProfile[],
  doctors: DoctorProfile[],
  expenseConfig: ExpenseConfig,
  usageStats: UsageStats,
  transactions: Transaction[]
): FinanceData => {
  // Calculate subscription income from patients
  let subscriptionIncome = 0;
  let consultationIncome = 0;
  
  patients.forEach(p => {
    if (p.subscription?.tier === 'premium') subscriptionIncome += 999;
    else if (p.subscription?.tier === 'basic') subscriptionIncome += 299;
    // Free tier = 0
  });
  
  // Add manual income transactions
  const manualIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const incomeBreakdown = {
    subscriptions: subscriptionIncome,
    consultations: consultationIncome,
    other: manualIncome,
  };
  
  // Calculate expenses
  const monthlyFixed = expenseConfig.supabase + expenseConfig.vercel + 
                       expenseConfig.hosting + expenseConfig.domain + expenseConfig.other;
  const smsExpense = usageStats.smsSent * expenseConfig.twilio;
  const aiExpense = (usageStats.aiTokensUsed / 1000) * expenseConfig.geminiApi;
  
  // Add manual expense transactions
  const manualExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const expenseBreakdown = {
    supabase: expenseConfig.supabase,
    vercel: expenseConfig.vercel,
    twilio: smsExpense,
    geminiApi: aiExpense,
    hosting: expenseConfig.hosting,
    domain: expenseConfig.domain,
    other: expenseConfig.other + manualExpenses,
  };
  
  const totalIncome = subscriptionIncome + consultationIncome + manualIncome;
  const totalExpenses = monthlyFixed + smsExpense + aiExpense + manualExpenses;
  const totalUsers = patients.length + doctors.length;
  
  return {
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    incomeBreakdown,
    expenseBreakdown,
    perUserCost: totalUsers > 0 ? totalExpenses / totalUsers : 0,
    perUserRevenue: totalUsers > 0 ? totalIncome / totalUsers : 0,
    aiUsage: {
      totalConversations: usageStats.aiConversations,
      totalTokens: usageStats.aiTokensUsed,
      cost: aiExpense,
    },
    smsUsage: {
      totalSent: usageStats.smsSent,
      cost: smsExpense,
    },
  };
};

// Default expense configuration (in BDT)
const DEFAULT_EXPENSES: ExpenseConfig = {
  supabase: 0,        // Free tier
  vercel: 0,          // Free tier
  twilio: 1.5,        // Per SMS
  geminiApi: 0.5,     // Per 1000 tokens
  hosting: 0,         // Included in Vercel
  domain: 100,        // Monthly domain cost
  other: 0,           // Other costs
};

const getExpenseConfig = (): ExpenseConfig => {
  try {
    const stored = localStorage.getItem(ADMIN_STORAGE.EXPENSES);
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_EXPENSES;
};

const saveExpenseConfig = (config: ExpenseConfig) => {
  localStorage.setItem(ADMIN_STORAGE.EXPENSES, JSON.stringify(config));
};

const getFinanceData = (): FinanceData => {
  try {
    const stored = localStorage.getItem(ADMIN_STORAGE.FINANCE);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    incomeBreakdown: { subscriptions: 0, consultations: 0, other: 0 },
    expenseBreakdown: { supabase: 0, vercel: 0, twilio: 0, geminiApi: 0, hosting: 0, domain: 0, other: 0 },
    perUserCost: 0,
    perUserRevenue: 0,
    aiUsage: { totalTokens: 0, totalConversations: 0, cost: 0 },
    smsUsage: { totalSent: 0, cost: 0 },
  };
};

const saveFinanceData = (data: FinanceData) => {
  localStorage.setItem(ADMIN_STORAGE.FINANCE, JSON.stringify(data));
};

// ============ HELPER FUNCTIONS ============
const getStoredPatients = (): PatientProfile[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.PATIENTS) || '[]'); } catch { return []; }
};

const getStoredDoctors = (): DoctorProfile[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.DOCTORS) || '[]'); } catch { return []; }
};

const getAdminSettings = (): AdminSettings => {
  try {
    const stored = localStorage.getItem(ADMIN_STORAGE.SETTINGS);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    adminName: 'Admin',
    adminEmail: 'admin@nirnoy.ai',
    adminPassword: 'nirnoy2024',
    notificationsEnabled: true,
    autoApproveVerifiedDoctors: false,
    maintenanceMode: false,
  };
};

const saveAdminSettings = (settings: AdminSettings) => {
  localStorage.setItem(ADMIN_STORAGE.SETTINGS, JSON.stringify(settings));
};

// ============ COMPONENT ============
export const AdminDashboard: React.FC = () => {
  const { getAllPendingDoctors, approveDoctor, rejectDoctor } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // State
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Data state
  const [pendingDoctors, setPendingDoctors] = useState<DoctorProfile[]>([]);
  const [allDoctors, setAllDoctors] = useState<DoctorProfile[]>([]);
  const [allPatients, setAllPatients] = useState<PatientProfile[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [adminSettings, setAdminSettings] = useState<AdminSettings>(getAdminSettings());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  
  // Finance state
  const [expenseConfig, setExpenseConfig] = useState<ExpenseConfig>(getExpenseConfig());
  const [financeData, setFinanceData] = useState<FinanceData>(getFinanceData());
  const [editingExpenses, setEditingExpenses] = useState(false);
  const [incomeEntry, setIncomeEntry] = useState({ type: 'subscriptions', amount: 0, description: '' });
  const [expenseEntry, setExpenseEntry] = useState({ type: 'other', amount: 0, description: '' });
  const [usageStats, setUsageStats] = useState<UsageStats>(collectUsageStats());
  const [transactions, setTransactions] = useState<Transaction[]>(getTransactions());
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  // Settings edit state
  const [editingSettings, setEditingSettings] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Danger zone protection state
  const [showDangerConfirm, setShowDangerConfirm] = useState(false);
  const [dangerOtp1, setDangerOtp1] = useState('');
  const [dangerOtp2, setDangerOtp2] = useState('');
  const [generatedDangerOtp, setGeneratedDangerOtp] = useState('');

  // Check admin auth
  useEffect(() => {
    const auth = localStorage.getItem(ADMIN_STORAGE.AUTH);
    if (auth === 'authenticated') {
      setIsAuthenticated(true);
    }
  }, []);

  // Load data
  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated, activeTab]);

  const loadAllData = async () => {
    // Load pending doctors
    const pending = await getAllPendingDoctors();
    setPendingDoctors(pending);
    
    // Load all doctors from storage
    const doctors = getStoredDoctors();
    setAllDoctors(doctors);
    
    // Load all patients from storage
    const patients = getStoredPatients();
    setAllPatients(patients);
    
    // Load feedbacks
    const fbs = getFeedbacks();
    setFeedbacks(fbs);
    
    // Load settings
    setAdminSettings(getAdminSettings());
    
    // Auto-calculate finance data
    const stats = collectUsageStats();
    setUsageStats(stats);
    
    const txs = getTransactions();
    setTransactions(txs);
    
    const config = getExpenseConfig();
    setExpenseConfig(config);
    
    const autoFinance = calculateAutoFinance(patients, doctors, config, stats, txs);
    setFinanceData(autoFinance);
    setLastRefresh(new Date());
  };

  const handleAdminLogin = () => {
    console.log("[Admin] Login attempt with password:", adminPassword);
    const settings = getAdminSettings();
    console.log("[Admin] Stored settings:", settings);
    if (adminPassword === settings.adminPassword) {
      localStorage.setItem(ADMIN_STORAGE.AUTH, 'authenticated');
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError(isBn ? 'ভুল পাসওয়ার্ড' : 'Incorrect password');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_STORAGE.AUTH);
    setIsAuthenticated(false);
    navigate('/');
  };

  const handleApproveDoctor = async (doctorId: string) => {
    const result = await approveDoctor(doctorId);
    if (result.success) {
      setPendingDoctors(prev => prev.filter(d => d.id !== doctorId));
      loadAllData();
      alert(isBn ? '✅ ডাক্তার অনুমোদিত হয়েছে!' : '✅ Doctor approved!');
    }
  };

  const handleRejectDoctor = async (doctorId: string) => {
    const reason = prompt(isBn ? 'প্রত্যাখ্যানের কারণ লিখুন:' : 'Enter rejection reason:');
    if (reason) {
      const result = await rejectDoctor(doctorId, reason);
      if (result.success) {
        setPendingDoctors(prev => prev.filter(d => d.id !== doctorId));
        loadAllData();
        alert(isBn ? '❌ ডাক্তার প্রত্যাখ্যাত হয়েছে' : '❌ Doctor rejected');
      }
    }
  };

  const handleUpdateFeedbackStatus = (feedbackId: string, status: string) => {
    updateFeedbackStatus(feedbackId, status);
    setFeedbacks(getFeedbacks());
  };

  const handleSaveSettings = () => {
    if (newPassword && newPassword !== confirmPassword) {
      alert(isBn ? 'পাসওয়ার্ড মিলছে না!' : 'Passwords do not match!');
      return;
    }
    
    const updatedSettings = {
      ...adminSettings,
      ...(newPassword ? { adminPassword: newPassword } : {}),
    };
    
    saveAdminSettings(updatedSettings);
    setAdminSettings(updatedSettings);
    setEditingSettings(false);
    setNewPassword('');
    setConfirmPassword('');
    alert(isBn ? '✅ সেটিংস সংরক্ষিত!' : '✅ Settings saved!');
  };

  // Calculate stats from real data
  const stats = {
    totalPatients: allPatients.length,
    totalDoctors: allDoctors.filter(d => d.status === 'approved').length,
    pendingDoctors: pendingDoctors.length,
    totalFeedbacks: feedbacks.length,
    pendingFeedbacks: feedbacks.filter(f => f.status === 'pending').length,
    premiumUsers: allPatients.filter(p => p.subscription?.tier === 'premium').length,
    basicUsers: allPatients.filter(p => p.subscription?.tier === 'basic').length,
    freeUsers: allPatients.filter(p => !p.subscription?.tier || p.subscription?.tier === 'free').length,
  };

  // Filter patients by subscription tier
  const filteredPatients = allPatients.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.phone?.includes(searchQuery);
    const matchesTier = filterTier === 'all' || 
                        (filterTier === 'free' && (!p.subscription?.tier || p.subscription?.tier === 'free')) ||
                        p.subscription?.tier === filterTier;
    return matchesSearch && matchesTier;
  });

  // Filter doctors
  const filteredDoctors = allDoctors.filter(d => 
    d.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.phone?.includes(searchQuery) ||
    d.bmdcNumber?.includes(searchQuery)
  );

  // ============ LOGIN SCREEN ============
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 w-full max-w-md border border-white/20 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <i className="fas fa-shield-alt text-white text-3xl"></i>
            </div>
            <h1 className="text-2xl font-black text-white">{isBn ? 'অ্যাডমিন প্যানেল' : 'Admin Panel'}</h1>
            <p className="text-slate-400 mt-2">{isBn ? 'নির্ণয় ম্যানেজমেন্ট সিস্টেম' : 'Nirnoy Management System'}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {isBn ? 'অ্যাডমিন পাসওয়ার্ড' : 'Admin Password'}
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                placeholder="••••••••"
              />
              {loginError && <p className="text-red-400 text-sm mt-2">{loginError}</p>}
            </div>

            <button
              onClick={handleAdminLogin}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition shadow-lg"
            >
              {isBn ? 'লগইন করুন' : 'Login'}
            </button>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full mt-4 py-3 text-slate-400 hover:text-white transition"
          >
            ← {isBn ? 'হোমে ফিরুন' : 'Back to Home'}
          </button>
        </div>
      </div>
    );
  }

  // ============ MAIN DASHBOARD ============
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-black">ন</span>
              </div>
              <div>
                <h1 className="text-xl font-black text-white">{isBn ? 'অ্যাডমিন প্যানেল' : 'Admin Panel'}</h1>
                <p className="text-xs text-slate-400">{adminSettings.adminName}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Pending Notifications */}
              {pendingDoctors.length > 0 && (
                <button
                  onClick={() => setActiveTab('doctor-requests')}
                  className="relative px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg flex items-center gap-2 hover:bg-amber-500/30 transition"
                >
                  <i className="fas fa-user-md"></i>
                  <span>{pendingDoctors.length} {isBn ? 'অপেক্ষমাণ' : 'Pending'}</span>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse"></span>
                </button>
              )}
              
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-slate-400 hover:text-white transition flex items-center gap-2"
              >
                <i className="fas fa-sign-out-alt"></i>
                {isBn ? 'লগআউট' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <nav className="space-y-2">
              {[
                { id: 'overview', icon: 'fa-chart-pie', label: isBn ? 'ওভারভিউ' : 'Overview' },
                { id: 'doctor-requests', icon: 'fa-user-clock', label: isBn ? 'ডাক্তার অনুরোধ' : 'Doctor Requests', badge: pendingDoctors.length },
                { id: 'doctors', icon: 'fa-user-md', label: isBn ? 'ডাক্তারগণ' : 'Doctors', badge: allDoctors.filter(d => d.status === 'approved').length },
                { id: 'patients', icon: 'fa-users', label: isBn ? 'রোগীগণ' : 'Patients', badge: allPatients.length },
                { id: 'subscribers', icon: 'fa-crown', label: isBn ? 'সাবস্ক্রাইবার' : 'Subscribers' },
                { id: 'feedback', icon: 'fa-comments', label: isBn ? 'ফিডব্যাক' : 'Feedback', badge: stats.pendingFeedbacks },
                { id: 'analytics', icon: 'fa-chart-line', label: isBn ? 'অ্যানালিটিক্স' : 'Analytics' },
                { id: 'finance', icon: 'fa-coins', label: isBn ? 'অর্থ ও হিসাব' : 'Finance & Accounts' },
                { id: 'settings', icon: 'fa-cog', label: isBn ? 'সেটিংস' : 'Settings' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as AdminTab)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${
                    activeTab === item.id
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <i className={`fas ${item.icon} w-5`}></i>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      item.id === 'doctor-requests' ? 'bg-amber-500 text-amber-900' : 'bg-slate-600 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">{isBn ? 'ড্যাশবোর্ড ওভারভিউ' : 'Dashboard Overview'}</h2>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: isBn ? 'মোট রোগী' : 'Total Patients', value: stats.totalPatients, icon: 'fa-users', color: 'blue' },
                    { label: isBn ? 'অনুমোদিত ডাক্তার' : 'Approved Doctors', value: stats.totalDoctors, icon: 'fa-user-md', color: 'green' },
                    { label: isBn ? 'অপেক্ষমাণ ডাক্তার' : 'Pending Doctors', value: stats.pendingDoctors, icon: 'fa-user-clock', color: 'amber' },
                    { label: isBn ? 'মোট ফিডব্যাক' : 'Total Feedback', value: stats.totalFeedbacks, icon: 'fa-comments', color: 'purple' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                      <div className={`w-12 h-12 rounded-xl bg-${stat.color}-500/20 flex items-center justify-center mb-4`}>
                        <i className={`fas ${stat.icon} text-${stat.color}-400 text-xl`}></i>
                      </div>
                      <p className="text-3xl font-black text-white">{stat.value}</p>
                      <p className="text-slate-400 text-sm mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Subscription Distribution */}
                <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                  <h3 className="text-lg font-bold text-white mb-4">{isBn ? 'সাবস্ক্রিপশন বিতরণ' : 'Subscription Distribution'}</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                      <p className="text-3xl font-black text-slate-300">{stats.freeUsers}</p>
                      <p className="text-slate-400 text-sm">Free</p>
                    </div>
                    <div className="bg-blue-500/20 rounded-xl p-4 text-center border border-blue-500/30">
                      <p className="text-3xl font-black text-blue-400">{stats.basicUsers}</p>
                      <p className="text-blue-300 text-sm">Basic</p>
                    </div>
                    <div className="bg-purple-500/20 rounded-xl p-4 text-center border border-purple-500/30">
                      <p className="text-3xl font-black text-purple-400">{stats.premiumUsers}</p>
                      <p className="text-purple-300 text-sm">Premium</p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                  <h3 className="text-lg font-bold text-white mb-4">{isBn ? 'দ্রুত অ্যাকশন' : 'Quick Actions'}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                      onClick={() => setActiveTab('doctor-requests')}
                      className="p-4 bg-amber-500/20 rounded-xl text-amber-400 hover:bg-amber-500/30 transition text-center"
                    >
                      <i className="fas fa-user-check text-2xl mb-2"></i>
                      <p className="text-sm font-medium">{isBn ? 'ডাক্তার অনুমোদন' : 'Approve Doctors'}</p>
                    </button>
                    <button
                      onClick={() => setActiveTab('feedback')}
                      className="p-4 bg-purple-500/20 rounded-xl text-purple-400 hover:bg-purple-500/30 transition text-center"
                    >
                      <i className="fas fa-comment-dots text-2xl mb-2"></i>
                      <p className="text-sm font-medium">{isBn ? 'ফিডব্যাক দেখুন' : 'View Feedback'}</p>
                    </button>
                    <button
                      onClick={() => setActiveTab('patients')}
                      className="p-4 bg-blue-500/20 rounded-xl text-blue-400 hover:bg-blue-500/30 transition text-center"
                    >
                      <i className="fas fa-users text-2xl mb-2"></i>
                      <p className="text-sm font-medium">{isBn ? 'ইউজার দেখুন' : 'View Users'}</p>
                    </button>
                    <button
                      onClick={() => setActiveTab('settings')}
                      className="p-4 bg-slate-500/20 rounded-xl text-slate-400 hover:bg-slate-500/30 transition text-center"
                    >
                      <i className="fas fa-cog text-2xl mb-2"></i>
                      <p className="text-sm font-medium">{isBn ? 'সেটিংস' : 'Settings'}</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Doctor Requests Tab */}
            {activeTab === 'doctor-requests' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">{isBn ? 'অপেক্ষমাণ ডাক্তার অনুরোধ' : 'Pending Doctor Requests'}</h2>
                  <span className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg">
                    {pendingDoctors.length} {isBn ? 'অপেক্ষমাণ' : 'Pending'}
                  </span>
                </div>

                {pendingDoctors.length === 0 ? (
                  <div className="bg-white/5 backdrop-blur rounded-2xl p-12 border border-white/10 text-center">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-check text-green-400 text-3xl"></i>
                    </div>
                    <p className="text-xl font-bold text-white mb-2">{isBn ? 'কোনো অপেক্ষমাণ অনুরোধ নেই' : 'No Pending Requests'}</p>
                    <p className="text-slate-400">{isBn ? 'সব ডাক্তার অনুরোধ প্রক্রিয়া করা হয়েছে' : 'All doctor requests have been processed'}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingDoctors.map((doctor) => (
                      <div key={doctor.id} className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                        <div className="flex items-start gap-6">
                          {/* Doctor Photo */}
                          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center overflow-hidden">
                            {doctor.profileImage ? (
                              <img src={doctor.profileImage} alt={doctor.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white text-2xl font-bold">{doctor.name?.charAt(0)}</span>
                            )}
                          </div>

                          {/* Doctor Info */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-xl font-bold text-white">{doctor.name}</h3>
                                <p className="text-slate-400">{doctor.phone}</p>
                              </div>
                              <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm font-medium">
                                {isBn ? 'অপেক্ষমাণ' : 'Pending'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                              <div>
                                <p className="text-xs text-slate-500 uppercase">{isBn ? 'BMDC নম্বর' : 'BMDC Number'}</p>
                                <p className="text-white font-medium">{doctor.bmdcNumber || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 uppercase">{isBn ? 'বিশেষত্ব' : 'Specialty'}</p>
                                <p className="text-white font-medium">
                                  {Array.isArray(doctor.specializations) && doctor.specializations.length > 0
                                    ? (typeof doctor.specializations[0] === 'string' 
                                        ? doctor.specializations[0] 
                                        : doctor.specializations[0]?.name || 'N/A')
                                    : 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 uppercase">{isBn ? 'অভিজ্ঞতা' : 'Experience'}</p>
                                <p className="text-white font-medium">{doctor.experienceYears || 0} {isBn ? 'বছর' : 'years'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 uppercase">{isBn ? 'আবেদনের তারিখ' : 'Applied On'}</p>
                                <p className="text-white font-medium">{new Date(doctor.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>

                            {/* Qualifications */}
                            {Array.isArray(doctor.qualifications) && doctor.qualifications.length > 0 && (
                              <div className="mt-4">
                                <p className="text-xs text-slate-500 uppercase mb-2">{isBn ? 'যোগ্যতা' : 'Qualifications'}</p>
                                <div className="flex flex-wrap gap-2">
                                  {doctor.qualifications.map((q, i) => (
                                    <span key={i} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">
                                      {typeof q === 'string' ? q : q.degree}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 mt-6 pt-6 border-t border-white/10">
                          <button
                            onClick={() => handleApproveDoctor(doctor.id)}
                            className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition flex items-center justify-center gap-2"
                          >
                            <i className="fas fa-check"></i>
                            {isBn ? 'অনুমোদন করুন' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleRejectDoctor(doctor.id)}
                            className="flex-1 py-3 bg-red-500/20 text-red-400 font-bold rounded-xl hover:bg-red-500/30 transition flex items-center justify-center gap-2"
                          >
                            <i className="fas fa-times"></i>
                            {isBn ? 'প্রত্যাখ্যান করুন' : 'Reject'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Doctors Tab */}
            {activeTab === 'doctors' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">{isBn ? 'সকল ডাক্তার' : 'All Doctors'}</h2>
                  <input
                    type="text"
                    placeholder={isBn ? 'নাম, ফোন বা BMDC দিয়ে খুঁজুন...' : 'Search by name, phone or BMDC...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 w-64"
                  />
                </div>

                {filteredDoctors.length === 0 ? (
                  <div className="bg-white/5 backdrop-blur rounded-2xl p-12 border border-white/10 text-center">
                    <i className="fas fa-user-md text-4xl text-slate-500 mb-4"></i>
                    <p className="text-xl font-bold text-white mb-2">{isBn ? 'কোনো ডাক্তার নেই' : 'No Doctors Found'}</p>
                    <p className="text-slate-400">{isBn ? 'এখনো কোনো ডাক্তার রেজিস্টার করেননি' : 'No doctors have registered yet'}</p>
                  </div>
                ) : (
                  <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">{isBn ? 'ডাক্তার' : 'Doctor'}</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">{isBn ? 'যোগাযোগ' : 'Contact'}</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">BMDC</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">{isBn ? 'বিশেষত্ব' : 'Specialty'}</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {filteredDoctors.map((doctor) => (
                          <tr key={doctor.id} className="hover:bg-white/5">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                  <span className="text-blue-400 font-bold">{doctor.name?.charAt(0)}</span>
                                </div>
                                <div>
                                  <p className="text-white font-medium">{doctor.name}</p>
                                  <p className="text-xs text-slate-500">ID: {doctor.id.slice(0, 8)}...</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-300">{doctor.phone}</td>
                            <td className="px-6 py-4 text-slate-300 font-mono">{doctor.bmdcNumber || 'N/A'}</td>
                            <td className="px-6 py-4 text-slate-300">
                              {Array.isArray(doctor.specializations) && doctor.specializations.length > 0
                                ? (typeof doctor.specializations[0] === 'string' 
                                    ? doctor.specializations[0] 
                                    : doctor.specializations[0]?.name || 'N/A')
                                : 'N/A'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                doctor.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                doctor.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {doctor.status === 'approved' ? (isBn ? 'অনুমোদিত' : 'Approved') :
                                 doctor.status === 'pending' ? (isBn ? 'অপেক্ষমাণ' : 'Pending') :
                                 (isBn ? 'প্রত্যাখ্যাত' : 'Rejected')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Patients Tab */}
            {activeTab === 'patients' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">{isBn ? 'সকল রোগী' : 'All Patients'}</h2>
                  <input
                    type="text"
                    placeholder={isBn ? 'নাম বা ফোন দিয়ে খুঁজুন...' : 'Search by name or phone...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 w-64"
                  />
                </div>

                {allPatients.length === 0 ? (
                  <div className="bg-white/5 backdrop-blur rounded-2xl p-12 border border-white/10 text-center">
                    <i className="fas fa-users text-4xl text-slate-500 mb-4"></i>
                    <p className="text-xl font-bold text-white mb-2">{isBn ? 'কোনো রোগী নেই' : 'No Patients Found'}</p>
                    <p className="text-slate-400">{isBn ? 'এখনো কোনো রোগী রেজিস্টার করেননি' : 'No patients have registered yet'}</p>
                  </div>
                ) : (
                  <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">{isBn ? 'রোগী' : 'Patient'}</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">{isBn ? 'ফোন' : 'Phone'}</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">{isBn ? 'লিঙ্গ' : 'Gender'}</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">{isBn ? 'সাবস্ক্রিপশন' : 'Subscription'}</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">{isBn ? 'যোগদান' : 'Joined'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {filteredPatients.map((patient) => (
                          <tr key={patient.id} className="hover:bg-white/5">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  patient.gender === 'female' ? 'bg-pink-500/20' : 'bg-blue-500/20'
                                }`}>
                                  <span className={patient.gender === 'female' ? 'text-pink-400' : 'text-blue-400'}>
                                    {patient.name?.charAt(0) || '?'}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-white font-medium">{patient.name || 'Unknown'}</p>
                                  <p className="text-xs text-slate-500">ID: {patient.id.slice(0, 8)}...</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-300">{patient.phone}</td>
                            <td className="px-6 py-4 text-slate-300 capitalize">{patient.gender || 'N/A'}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                patient.subscription?.tier === 'premium' ? 'bg-purple-500/20 text-purple-400' :
                                patient.subscription?.tier === 'basic' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-slate-500/20 text-slate-400'
                              }`}>
                                {patient.subscription?.tier || 'Free'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-300">{new Date(patient.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Subscribers Tab */}
            {activeTab === 'subscribers' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">{isBn ? 'সাবস্ক্রাইবার' : 'Subscribers'}</h2>
                  <div className="flex gap-2">
                    {['all', 'premium', 'basic', 'free'].map((tier) => (
                      <button
                        key={tier}
                        onClick={() => setFilterTier(tier)}
                        className={`px-4 py-2 rounded-lg font-medium transition ${
                          filterTier === tier
                            ? tier === 'premium' ? 'bg-purple-500 text-white' :
                              tier === 'basic' ? 'bg-blue-500 text-white' :
                              tier === 'free' ? 'bg-slate-500 text-white' :
                              'bg-white/20 text-white'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tier Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-purple-500/20 rounded-2xl p-6 border border-purple-500/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-300 text-sm">Premium</p>
                        <p className="text-4xl font-black text-purple-400">{stats.premiumUsers}</p>
                      </div>
                      <i className="fas fa-crown text-3xl text-purple-400"></i>
                    </div>
                  </div>
                  <div className="bg-blue-500/20 rounded-2xl p-6 border border-blue-500/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-300 text-sm">Basic</p>
                        <p className="text-4xl font-black text-blue-400">{stats.basicUsers}</p>
                      </div>
                      <i className="fas fa-star text-3xl text-blue-400"></i>
                    </div>
                  </div>
                  <div className="bg-slate-500/20 rounded-2xl p-6 border border-slate-500/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-300 text-sm">Free</p>
                        <p className="text-4xl font-black text-slate-400">{stats.freeUsers}</p>
                      </div>
                      <i className="fas fa-user text-3xl text-slate-400"></i>
                    </div>
                  </div>
                </div>

                {/* Filtered Users List */}
                <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">{isBn ? 'ইউজার' : 'User'}</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">{isBn ? 'প্ল্যান' : 'Plan'}</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">{isBn ? 'ক্রেডিট' : 'Credits'}</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">{isBn ? 'যোগদান' : 'Joined'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {filteredPatients.map((patient) => (
                        <tr key={patient.id} className="hover:bg-white/5">
                          <td className="px-6 py-4">
                            <p className="text-white font-medium">{patient.name || 'Unknown'}</p>
                            <p className="text-xs text-slate-500">{patient.phone}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              patient.subscription?.tier === 'premium' ? 'bg-purple-500/20 text-purple-400' :
                              patient.subscription?.tier === 'basic' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-slate-500/20 text-slate-400'
                            }`}>
                              {patient.subscription?.tier || 'Free'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-300">{patient.credits || 0}</td>
                          <td className="px-6 py-4 text-slate-300">{new Date(patient.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredPatients.length === 0 && (
                    <div className="p-8 text-center text-slate-400">
                      {isBn ? 'এই ক্যাটাগরিতে কোনো ইউজার নেই' : 'No users in this category'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Feedback Tab */}
            {activeTab === 'feedback' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">{isBn ? 'ইউজার ফিডব্যাক' : 'User Feedback'}</h2>
                  <span className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg">
                    {feedbacks.length} {isBn ? 'মোট' : 'Total'}
                  </span>
                </div>

                {feedbacks.length === 0 ? (
                  <div className="bg-white/5 backdrop-blur rounded-2xl p-12 border border-white/10 text-center">
                    <i className="fas fa-comments text-4xl text-slate-500 mb-4"></i>
                    <p className="text-xl font-bold text-white mb-2">{isBn ? 'কোনো ফিডব্যাক নেই' : 'No Feedback Yet'}</p>
                    <p className="text-slate-400">{isBn ? 'ইউজাররা এখনো কোনো ফিডব্যাক দেননি' : 'Users have not submitted any feedback yet'}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {feedbacks.map((fb) => (
                      <div key={fb.id} className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              fb.type === 'bug' ? 'bg-red-500/20' :
                              fb.type === 'feature' ? 'bg-blue-500/20' :
                              fb.type === 'praise' ? 'bg-green-500/20' :
                              'bg-slate-500/20'
                            }`}>
                              <i className={`fas ${
                                fb.type === 'bug' ? 'fa-bug text-red-400' :
                                fb.type === 'feature' ? 'fa-lightbulb text-blue-400' :
                                fb.type === 'praise' ? 'fa-heart text-green-400' :
                                'fa-comment text-slate-400'
                              } text-xl`}></i>
                            </div>
                            <div>
                              <p className="text-white">{fb.message}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                                <span><i className="fas fa-user mr-1"></i>{fb.userName || 'Anonymous'}</span>
                                <span><i className="fas fa-phone mr-1"></i>{fb.userPhone || 'N/A'}</span>
                                <span><i className="fas fa-calendar mr-1"></i>{new Date(fb.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <select
                            value={fb.status}
                            onChange={(e) => handleUpdateFeedbackStatus(fb.id, e.target.value)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium ${
                              fb.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                              fb.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            <option value="pending">{isBn ? 'অপেক্ষমাণ' : 'Pending'}</option>
                            <option value="in-progress">{isBn ? 'প্রক্রিয়াধীন' : 'In Progress'}</option>
                            <option value="resolved">{isBn ? 'সমাধান' : 'Resolved'}</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">{isBn ? 'অ্যানালিটিক্স' : 'Analytics'}</h2>
                
                <div className="grid grid-cols-2 gap-6">
                  {/* User Growth */}
                  <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                    <h3 className="text-lg font-bold text-white mb-4">{isBn ? 'ইউজার গ্রোথ' : 'User Growth'}</h3>
                    <div className="h-64 flex items-center justify-center text-slate-400">
                      <div className="text-center">
                        <i className="fas fa-chart-line text-4xl mb-4"></i>
                        <p>{isBn ? 'মোট রেজিস্টার্ড ইউজার' : 'Total Registered Users'}</p>
                        <p className="text-4xl font-black text-white mt-2">{stats.totalPatients + stats.totalDoctors}</p>
                      </div>
                    </div>
                  </div>

                  {/* Doctor Distribution */}
                  <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                    <h3 className="text-lg font-bold text-white mb-4">{isBn ? 'ডাক্তার স্ট্যাটাস' : 'Doctor Status'}</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{isBn ? 'অনুমোদিত' : 'Approved'}</span>
                        <span className="text-green-400 font-bold">{allDoctors.filter(d => d.status === 'approved').length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{isBn ? 'অপেক্ষমাণ' : 'Pending'}</span>
                        <span className="text-amber-400 font-bold">{pendingDoctors.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{isBn ? 'প্রত্যাখ্যাত' : 'Rejected'}</span>
                        <span className="text-red-400 font-bold">{allDoctors.filter(d => d.status === 'rejected').length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Platform Health */}
                <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                  <h3 className="text-lg font-bold text-white mb-4">{isBn ? 'প্ল্যাটফর্ম হেলথ' : 'Platform Health'}</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-black text-green-400">✓</p>
                      <p className="text-slate-400 text-sm mt-1">{isBn ? 'সিস্টেম অনলাইন' : 'System Online'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-black text-white">{stats.totalPatients}</p>
                      <p className="text-slate-400 text-sm mt-1">{isBn ? 'মোট রোগী' : 'Total Patients'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-black text-white">{stats.totalDoctors}</p>
                      <p className="text-slate-400 text-sm mt-1">{isBn ? 'মোট ডাক্তার' : 'Total Doctors'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-black text-white">{feedbacks.length}</p>
                      <p className="text-slate-400 text-sm mt-1">{isBn ? 'মোট ফিডব্যাক' : 'Total Feedback'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Finance & Accounts Tab */}
            {activeTab === 'finance' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">{isBn ? 'অর্থ ও হিসাব' : 'Finance & Accounts'}</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingExpenses(!editingExpenses)}
                      className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition text-sm"
                    >
                      <i className={`fas ${editingExpenses ? 'fa-times' : 'fa-cog'} mr-2`}></i>
                      {editingExpenses ? (isBn ? 'বন্ধ' : 'Close') : (isBn ? 'খরচ সেটিংস' : 'Expense Settings')}
                    </button>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl p-5 border border-green-500/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-400/80 text-xs uppercase">{isBn ? 'মোট আয়' : 'Total Income'}</p>
                        <p className="text-3xl font-black text-green-400 mt-1">৳{financeData.totalIncome.toLocaleString()}</p>
                      </div>
                      <i className="fas fa-arrow-trend-up text-green-400/50 text-2xl"></i>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-2xl p-5 border border-red-500/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-red-400/80 text-xs uppercase">{isBn ? 'মোট খরচ' : 'Total Expenses'}</p>
                        <p className="text-3xl font-black text-red-400 mt-1">৳{financeData.totalExpenses.toLocaleString()}</p>
                      </div>
                      <i className="fas fa-arrow-trend-down text-red-400/50 text-2xl"></i>
                    </div>
                  </div>
                  <div className={`bg-gradient-to-br ${financeData.netProfit >= 0 ? 'from-blue-500/20 to-indigo-500/20 border-blue-500/30' : 'from-orange-500/20 to-amber-500/20 border-orange-500/30'} rounded-2xl p-5 border`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`${financeData.netProfit >= 0 ? 'text-blue-400/80' : 'text-orange-400/80'} text-xs uppercase`}>{isBn ? 'নিট লাভ/ক্ষতি' : 'Net Profit/Loss'}</p>
                        <p className={`text-3xl font-black ${financeData.netProfit >= 0 ? 'text-blue-400' : 'text-orange-400'} mt-1`}>
                          {financeData.netProfit >= 0 ? '+' : ''}৳{financeData.netProfit.toLocaleString()}
                        </p>
                      </div>
                      <i className={`fas ${financeData.netProfit >= 0 ? 'fa-chart-pie' : 'fa-exclamation-triangle'} ${financeData.netProfit >= 0 ? 'text-blue-400/50' : 'text-orange-400/50'} text-2xl`}></i>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-2xl p-5 border border-purple-500/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-400/80 text-xs uppercase">{isBn ? 'প্রতি ইউজার খরচ' : 'Cost Per User'}</p>
                        <p className="text-3xl font-black text-purple-400 mt-1">৳{financeData.perUserCost.toFixed(2)}</p>
                      </div>
                      <i className="fas fa-user-tag text-purple-400/50 text-2xl"></i>
                    </div>
                  </div>
                </div>

                {/* Expense Configuration Panel */}
                {editingExpenses && (
                  <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                    <h3 className="text-lg font-bold text-white mb-4">{isBn ? 'মাসিক খরচ কনফিগারেশন' : 'Monthly Expense Configuration'}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { key: 'supabase', label: 'Supabase', icon: 'fa-database' },
                        { key: 'vercel', label: 'Vercel', icon: 'fa-cloud' },
                        { key: 'twilio', label: 'Twilio (per SMS)', icon: 'fa-sms' },
                        { key: 'geminiApi', label: 'Gemini API (per 1K tokens)', icon: 'fa-robot' },
                        { key: 'hosting', label: 'Hosting', icon: 'fa-server' },
                        { key: 'domain', label: 'Domain', icon: 'fa-globe' },
                        { key: 'other', label: 'Other', icon: 'fa-ellipsis-h' },
                      ].map((item) => (
                        <div key={item.key}>
                          <label className="block text-xs text-slate-400 mb-1">
                            <i className={`fas ${item.icon} mr-1`}></i>{item.label}
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">৳</span>
                            <input
                              type="number"
                              value={expenseConfig[item.key as keyof ExpenseConfig]}
                              onChange={(e) => {
                                const updated = { ...expenseConfig, [item.key]: parseFloat(e.target.value) || 0 };
                                setExpenseConfig(updated);
                              }}
                              className="w-full pl-7 pr-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        saveExpenseConfig(expenseConfig);
                        // Recalculate finance data
                        const totalUsers = allPatients.length + allDoctors.length;
                        const monthlyExpenses = expenseConfig.supabase + expenseConfig.vercel + expenseConfig.hosting + expenseConfig.domain + expenseConfig.other;
                        const smsExpenses = financeData.smsUsage.totalSent * expenseConfig.twilio;
                        const aiExpenses = (financeData.aiUsage.totalTokens / 1000) * expenseConfig.geminiApi;
                        const totalExpenses = monthlyExpenses + smsExpenses + aiExpenses;
                        const perUserCost = totalUsers > 0 ? totalExpenses / totalUsers : 0;
                        
                        const updated = {
                          ...financeData,
                          totalExpenses,
                          netProfit: financeData.totalIncome - totalExpenses,
                          perUserCost,
                          expenseBreakdown: {
                            supabase: expenseConfig.supabase,
                            vercel: expenseConfig.vercel,
                            twilio: smsExpenses,
                            geminiApi: aiExpenses,
                            hosting: expenseConfig.hosting,
                            domain: expenseConfig.domain,
                            other: expenseConfig.other,
                          },
                        };
                        setFinanceData(updated);
                        saveFinanceData(updated);
                        setEditingExpenses(false);
                        alert(isBn ? '✅ খরচ সংরক্ষিত!' : '✅ Expenses saved!');
                      }}
                      className="mt-4 px-6 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition"
                    >
                      <i className="fas fa-save mr-2"></i>
                      {isBn ? 'সংরক্ষণ করুন' : 'Save Configuration'}
                    </button>
                  </div>
                )}

                {/* Income & Expense Entry */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Add Income */}
                  <div className="bg-green-500/10 backdrop-blur rounded-2xl p-6 border border-green-500/20">
                    <h3 className="text-lg font-bold text-green-400 mb-4">
                      <i className="fas fa-plus-circle mr-2"></i>
                      {isBn ? 'আয় যোগ করুন' : 'Add Income'}
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">{isBn ? 'ধরন' : 'Type'}</label>
                        <select
                          value={incomeEntry.type}
                          onChange={(e) => setIncomeEntry({ ...incomeEntry, type: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                        >
                          <option value="subscriptions">{isBn ? 'সাবস্ক্রিপশন' : 'Subscriptions'}</option>
                          <option value="consultations">{isBn ? 'পরামর্শ ফি' : 'Consultation Fees'}</option>
                          <option value="other">{isBn ? 'অন্যান্য' : 'Other'}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">{isBn ? 'পরিমাণ' : 'Amount'}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">৳</span>
                          <input
                            type="number"
                            value={incomeEntry.amount}
                            onChange={(e) => setIncomeEntry({ ...incomeEntry, amount: parseFloat(e.target.value) || 0 })}
                            className="w-full pl-7 pr-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                            min="0"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">{isBn ? 'বিবরণ' : 'Description'}</label>
                        <input
                          type="text"
                          value={incomeEntry.description}
                          onChange={(e) => setIncomeEntry({ ...incomeEntry, description: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                          placeholder={isBn ? 'ঐচ্ছিক' : 'Optional'}
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (incomeEntry.amount > 0) {
                            const updated = {
                              ...financeData,
                              totalIncome: financeData.totalIncome + incomeEntry.amount,
                              netProfit: financeData.netProfit + incomeEntry.amount,
                              incomeBreakdown: {
                                ...financeData.incomeBreakdown,
                                [incomeEntry.type]: financeData.incomeBreakdown[incomeEntry.type as keyof typeof financeData.incomeBreakdown] + incomeEntry.amount,
                              },
                            };
                            const totalUsers = allPatients.length + allDoctors.length;
                            updated.perUserRevenue = totalUsers > 0 ? updated.totalIncome / totalUsers : 0;
                            setFinanceData(updated);
                            saveFinanceData(updated);
                            setIncomeEntry({ type: 'subscriptions', amount: 0, description: '' });
                            alert(isBn ? '✅ আয় যোগ হয়েছে!' : '✅ Income added!');
                          }
                        }}
                        className="w-full py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition"
                      >
                        <i className="fas fa-plus mr-2"></i>
                        {isBn ? 'যোগ করুন' : 'Add Income'}
                      </button>
                    </div>
                  </div>

                  {/* Add Expense */}
                  <div className="bg-red-500/10 backdrop-blur rounded-2xl p-6 border border-red-500/20">
                    <h3 className="text-lg font-bold text-red-400 mb-4">
                      <i className="fas fa-minus-circle mr-2"></i>
                      {isBn ? 'খরচ যোগ করুন' : 'Add Expense'}
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">{isBn ? 'ধরন' : 'Type'}</label>
                        <select
                          value={expenseEntry.type}
                          onChange={(e) => setExpenseEntry({ ...expenseEntry, type: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                        >
                          <option value="supabase">Supabase</option>
                          <option value="vercel">Vercel</option>
                          <option value="twilio">Twilio SMS</option>
                          <option value="geminiApi">Gemini API</option>
                          <option value="hosting">Hosting</option>
                          <option value="domain">Domain</option>
                          <option value="other">{isBn ? 'অন্যান্য' : 'Other'}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">{isBn ? 'পরিমাণ' : 'Amount'}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">৳</span>
                          <input
                            type="number"
                            value={expenseEntry.amount}
                            onChange={(e) => setExpenseEntry({ ...expenseEntry, amount: parseFloat(e.target.value) || 0 })}
                            className="w-full pl-7 pr-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                            min="0"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">{isBn ? 'বিবরণ' : 'Description'}</label>
                        <input
                          type="text"
                          value={expenseEntry.description}
                          onChange={(e) => setExpenseEntry({ ...expenseEntry, description: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                          placeholder={isBn ? 'ঐচ্ছিক' : 'Optional'}
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (expenseEntry.amount > 0) {
                            const updated = {
                              ...financeData,
                              totalExpenses: financeData.totalExpenses + expenseEntry.amount,
                              netProfit: financeData.netProfit - expenseEntry.amount,
                              expenseBreakdown: {
                                ...financeData.expenseBreakdown,
                                [expenseEntry.type]: financeData.expenseBreakdown[expenseEntry.type as keyof typeof financeData.expenseBreakdown] + expenseEntry.amount,
                              },
                            };
                            const totalUsers = allPatients.length + allDoctors.length;
                            updated.perUserCost = totalUsers > 0 ? updated.totalExpenses / totalUsers : 0;
                            setFinanceData(updated);
                            saveFinanceData(updated);
                            setExpenseEntry({ type: 'other', amount: 0, description: '' });
                            alert(isBn ? '✅ খরচ যোগ হয়েছে!' : '✅ Expense added!');
                          }
                        }}
                        className="w-full py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition"
                      >
                        <i className="fas fa-plus mr-2"></i>
                        {isBn ? 'যোগ করুন' : 'Add Expense'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Breakdown Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Income Breakdown */}
                  <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                    <h3 className="text-lg font-bold text-white mb-4">
                      <i className="fas fa-chart-pie text-green-400 mr-2"></i>
                      {isBn ? 'আয়ের বিভাজন' : 'Income Breakdown'}
                    </h3>
                    <div className="space-y-3">
                      {[
                        { key: 'subscriptions', label: isBn ? 'সাবস্ক্রিপশন' : 'Subscriptions', color: 'green' },
                        { key: 'consultations', label: isBn ? 'পরামর্শ ফি' : 'Consultations', color: 'blue' },
                        { key: 'other', label: isBn ? 'অন্যান্য' : 'Other', color: 'purple' },
                      ].map((item) => {
                        const value = financeData.incomeBreakdown[item.key as keyof typeof financeData.incomeBreakdown];
                        const percentage = financeData.totalIncome > 0 ? (value / financeData.totalIncome) * 100 : 0;
                        return (
                          <div key={item.key}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-slate-300">{item.label}</span>
                              <span className={`text-${item.color}-400 font-bold`}>৳{value.toLocaleString()}</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-${item.color}-500 rounded-full transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expense Breakdown */}
                  <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                    <h3 className="text-lg font-bold text-white mb-4">
                      <i className="fas fa-chart-pie text-red-400 mr-2"></i>
                      {isBn ? 'খরচের বিভাজন' : 'Expense Breakdown'}
                    </h3>
                    <div className="space-y-3">
                      {[
                        { key: 'supabase', label: 'Supabase', color: 'emerald' },
                        { key: 'vercel', label: 'Vercel', color: 'slate' },
                        { key: 'twilio', label: 'Twilio SMS', color: 'red' },
                        { key: 'geminiApi', label: 'Gemini API', color: 'blue' },
                        { key: 'hosting', label: 'Hosting', color: 'amber' },
                        { key: 'domain', label: 'Domain', color: 'purple' },
                        { key: 'other', label: isBn ? 'অন্যান্য' : 'Other', color: 'gray' },
                      ].map((item) => {
                        const value = financeData.expenseBreakdown[item.key as keyof typeof financeData.expenseBreakdown];
                        const percentage = financeData.totalExpenses > 0 ? (value / financeData.totalExpenses) * 100 : 0;
                        return (
                          <div key={item.key}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-slate-300">{item.label}</span>
                              <span className="text-slate-400 font-medium">৳{value.toLocaleString()}</span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-red-500/70 rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Usage Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* AI Usage */}
                  <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl p-6 border border-indigo-500/20">
                    <h3 className="text-lg font-bold text-white mb-4">
                      <i className="fas fa-robot text-indigo-400 mr-2"></i>
                      {isBn ? 'AI ব্যবহার' : 'AI Usage'}
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-black text-indigo-400">{financeData.aiUsage.totalConversations}</p>
                        <p className="text-xs text-slate-400">{isBn ? 'কথোপকথন' : 'Conversations'}</p>
                      </div>
                      <div>
                        <p className="text-2xl font-black text-purple-400">{(financeData.aiUsage.totalTokens / 1000).toFixed(1)}K</p>
                        <p className="text-xs text-slate-400">{isBn ? 'টোকেন' : 'Tokens'}</p>
                      </div>
                      <div>
                        <p className="text-2xl font-black text-pink-400">৳{financeData.aiUsage.cost.toFixed(2)}</p>
                        <p className="text-xs text-slate-400">{isBn ? 'খরচ' : 'Cost'}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <input
                        type="number"
                        placeholder={isBn ? 'কথোপকথন সংখ্যা' : 'Conversations'}
                        className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                        id="aiConvInput"
                      />
                      <input
                        type="number"
                        placeholder={isBn ? 'টোকেন (K)' : 'Tokens (K)'}
                        className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                        id="aiTokenInput"
                      />
                      <button
                        onClick={() => {
                          const convInput = document.getElementById('aiConvInput') as HTMLInputElement;
                          const tokenInput = document.getElementById('aiTokenInput') as HTMLInputElement;
                          const convs = parseInt(convInput.value) || 0;
                          const tokens = (parseFloat(tokenInput.value) || 0) * 1000;
                          const cost = (tokens / 1000) * expenseConfig.geminiApi;
                          
                          const updated = {
                            ...financeData,
                            totalExpenses: financeData.totalExpenses + cost,
                            netProfit: financeData.netProfit - cost,
                            aiUsage: {
                              totalConversations: financeData.aiUsage.totalConversations + convs,
                              totalTokens: financeData.aiUsage.totalTokens + tokens,
                              cost: financeData.aiUsage.cost + cost,
                            },
                            expenseBreakdown: {
                              ...financeData.expenseBreakdown,
                              geminiApi: financeData.expenseBreakdown.geminiApi + cost,
                            },
                          };
                          const totalUsers = allPatients.length + allDoctors.length;
                          updated.perUserCost = totalUsers > 0 ? updated.totalExpenses / totalUsers : 0;
                          setFinanceData(updated);
                          saveFinanceData(updated);
                          convInput.value = '';
                          tokenInput.value = '';
                        }}
                        className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
                      >
                        <i className="fas fa-plus"></i>
                      </button>
                    </div>
                  </div>

                  {/* SMS Usage */}
                  <div className="bg-gradient-to-br from-cyan-500/10 to-teal-500/10 rounded-2xl p-6 border border-cyan-500/20">
                    <h3 className="text-lg font-bold text-white mb-4">
                      <i className="fas fa-sms text-cyan-400 mr-2"></i>
                      {isBn ? 'SMS ব্যবহার' : 'SMS Usage'}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-black text-cyan-400">{financeData.smsUsage.totalSent}</p>
                        <p className="text-xs text-slate-400">{isBn ? 'পাঠানো SMS' : 'SMS Sent'}</p>
                      </div>
                      <div>
                        <p className="text-2xl font-black text-teal-400">৳{financeData.smsUsage.cost.toFixed(2)}</p>
                        <p className="text-xs text-slate-400">{isBn ? 'খরচ' : 'Cost'}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <input
                        type="number"
                        placeholder={isBn ? 'SMS সংখ্যা' : 'Number of SMS'}
                        className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                        id="smsCountInput"
                      />
                      <button
                        onClick={() => {
                          const smsInput = document.getElementById('smsCountInput') as HTMLInputElement;
                          const count = parseInt(smsInput.value) || 0;
                          const cost = count * expenseConfig.twilio;
                          
                          const updated = {
                            ...financeData,
                            totalExpenses: financeData.totalExpenses + cost,
                            netProfit: financeData.netProfit - cost,
                            smsUsage: {
                              totalSent: financeData.smsUsage.totalSent + count,
                              cost: financeData.smsUsage.cost + cost,
                            },
                            expenseBreakdown: {
                              ...financeData.expenseBreakdown,
                              twilio: financeData.expenseBreakdown.twilio + cost,
                            },
                          };
                          const totalUsers = allPatients.length + allDoctors.length;
                          updated.perUserCost = totalUsers > 0 ? updated.totalExpenses / totalUsers : 0;
                          setFinanceData(updated);
                          saveFinanceData(updated);
                          smsInput.value = '';
                        }}
                        className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition"
                      >
                        <i className="fas fa-plus"></i>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Per User Analysis */}
                <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                  <h3 className="text-lg font-bold text-white mb-4">
                    <i className="fas fa-user-chart text-amber-400 mr-2"></i>
                    {isBn ? 'প্রতি ইউজার বিশ্লেষণ' : 'Per User Analysis'}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 rounded-xl p-4 text-center">
                      <p className="text-xs text-slate-400 mb-1">{isBn ? 'মোট ইউজার' : 'Total Users'}</p>
                      <p className="text-2xl font-black text-white">{allPatients.length + allDoctors.length}</p>
                    </div>
                    <div className="bg-green-500/10 rounded-xl p-4 text-center border border-green-500/20">
                      <p className="text-xs text-slate-400 mb-1">{isBn ? 'প্রতি ইউজার আয়' : 'Revenue/User'}</p>
                      <p className="text-2xl font-black text-green-400">৳{financeData.perUserRevenue?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="bg-red-500/10 rounded-xl p-4 text-center border border-red-500/20">
                      <p className="text-xs text-slate-400 mb-1">{isBn ? 'প্রতি ইউজার খরচ' : 'Cost/User'}</p>
                      <p className="text-2xl font-black text-red-400">৳{financeData.perUserCost.toFixed(2)}</p>
                    </div>
                    <div className={`${financeData.perUserRevenue - financeData.perUserCost >= 0 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-orange-500/10 border-orange-500/20'} rounded-xl p-4 text-center border`}>
                      <p className="text-xs text-slate-400 mb-1">{isBn ? 'প্রতি ইউজার লাভ' : 'Profit/User'}</p>
                      <p className={`text-2xl font-black ${financeData.perUserRevenue - financeData.perUserCost >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                        ৳{((financeData.perUserRevenue || 0) - financeData.perUserCost).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Reset Finance Data */}
                <details className="group">
                  <summary className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer hover:text-slate-400 py-2">
                    <i className="fas fa-chevron-right text-[10px] group-open:rotate-90 transition-transform"></i>
                    <span>{isBn ? 'ফিন্যান্স ডেটা রিসেট' : 'Reset Finance Data'}</span>
                  </summary>
                  <div className="mt-2 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <p className="text-amber-400 text-sm mb-3">{isBn ? 'এটি সব আয়-ব্যয় ডেটা মুছে ফেলবে' : 'This will clear all income/expense data'}</p>
                    <button
                      onClick={() => {
                        if (confirm(isBn ? 'আপনি কি নিশ্চিত?' : 'Are you sure?')) {
                          const resetData: FinanceData = {
                            totalIncome: 0,
                            totalExpenses: 0,
                            netProfit: 0,
                            incomeBreakdown: { subscriptions: 0, consultations: 0, other: 0 },
                            expenseBreakdown: { supabase: 0, vercel: 0, twilio: 0, geminiApi: 0, hosting: 0, domain: 0, other: 0 },
                            perUserCost: 0,
                            perUserRevenue: 0,
                            aiUsage: { totalTokens: 0, totalConversations: 0, cost: 0 },
                            smsUsage: { totalSent: 0, cost: 0 },
                          };
                          setFinanceData(resetData);
                          saveFinanceData(resetData);
                          alert(isBn ? '✅ রিসেট সম্পন্ন!' : '✅ Reset complete!');
                        }
                      }}
                      className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition text-sm"
                    >
                      <i className="fas fa-redo mr-2"></i>
                      {isBn ? 'রিসেট করুন' : 'Reset'}
                    </button>
                  </div>
                </details>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">{isBn ? 'অ্যাডমিন সেটিংস' : 'Admin Settings'}</h2>

                {/* Admin Profile */}
                <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white">{isBn ? 'অ্যাডমিন প্রোফাইল' : 'Admin Profile'}</h3>
                    <button
                      onClick={() => setEditingSettings(!editingSettings)}
                      className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition"
                    >
                      <i className={`fas ${editingSettings ? 'fa-times' : 'fa-edit'} mr-2`}></i>
                      {editingSettings ? (isBn ? 'বাতিল' : 'Cancel') : (isBn ? 'সম্পাদনা' : 'Edit')}
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">{isBn ? 'অ্যাডমিন নাম' : 'Admin Name'}</label>
                      <input
                        type="text"
                        value={adminSettings.adminName}
                        onChange={(e) => setAdminSettings({ ...adminSettings, adminName: e.target.value })}
                        disabled={!editingSettings}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">{isBn ? 'অ্যাডমিন ইমেইল' : 'Admin Email'}</label>
                      <input
                        type="email"
                        value={adminSettings.adminEmail}
                        onChange={(e) => setAdminSettings({ ...adminSettings, adminEmail: e.target.value })}
                        disabled={!editingSettings}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white disabled:opacity-50"
                      />
                    </div>

                    {editingSettings && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-2">{isBn ? 'নতুন পাসওয়ার্ড' : 'New Password'}</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder={isBn ? 'পরিবর্তন করতে চাইলে লিখুন' : 'Leave empty to keep current'}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500"
                          />
                        </div>

                        {newPassword && (
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">{isBn ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'}</label>
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                            />
                          </div>
                        )}

                        <button
                          onClick={handleSaveSettings}
                          className="w-full py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition"
                        >
                          <i className="fas fa-save mr-2"></i>
                          {isBn ? 'সংরক্ষণ করুন' : 'Save Changes'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* System Settings */}
                <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                  <h3 className="text-lg font-bold text-white mb-6">{isBn ? 'সিস্টেম সেটিংস' : 'System Settings'}</h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                      <div>
                        <p className="text-white font-medium">{isBn ? 'নোটিফিকেশন' : 'Notifications'}</p>
                        <p className="text-sm text-slate-400">{isBn ? 'নতুন ইভেন্টের জন্য নোটিফিকেশন' : 'Get notified for new events'}</p>
                      </div>
                      <button
                        onClick={() => {
                          const updated = { ...adminSettings, notificationsEnabled: !adminSettings.notificationsEnabled };
                          setAdminSettings(updated);
                          saveAdminSettings(updated);
                        }}
                        className={`w-14 h-7 rounded-full transition ${
                          adminSettings.notificationsEnabled ? 'bg-green-500' : 'bg-slate-600'
                        }`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          adminSettings.notificationsEnabled ? 'translate-x-8' : 'translate-x-1'
                        }`}></span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                      <div>
                        <p className="text-white font-medium">{isBn ? 'মেইনটেন্যান্স মোড' : 'Maintenance Mode'}</p>
                        <p className="text-sm text-slate-400">{isBn ? 'সাইট বন্ধ রাখুন' : 'Take the site offline'}</p>
                      </div>
                      <button
                        onClick={() => {
                          const updated = { ...adminSettings, maintenanceMode: !adminSettings.maintenanceMode };
                          setAdminSettings(updated);
                          saveAdminSettings(updated);
                        }}
                        className={`w-14 h-7 rounded-full transition ${
                          adminSettings.maintenanceMode ? 'bg-red-500' : 'bg-slate-600'
                        }`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          adminSettings.maintenanceMode ? 'translate-x-8' : 'translate-x-1'
                        }`}></span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Danger Zone - Small, Collapsible, Double OTP Protected */}
                <details className="group mt-8">
                  <summary className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer hover:text-slate-400 py-2">
                    <i className="fas fa-chevron-right text-[10px] group-open:rotate-90 transition-transform"></i>
                    <i className="fas fa-exclamation-triangle text-red-400/40 text-[10px]"></i>
                    <span>{isBn ? 'বিপদ অঞ্চল' : 'Danger Zone'}</span>
                  </summary>
                  
                  <div className="mt-3 p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                    {!showDangerConfirm ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-400">{isBn ? 'সব ডেটা মুছে ফেলুন' : 'Delete all data'}</p>
                          <p className="text-[10px] text-slate-500">{isBn ? 'এটি পূর্বাবস্থায় ফেরানো যাবে না' : 'This cannot be undone'}</p>
                        </div>
                        <button
                          onClick={() => {
                            const otp = Math.floor(100000 + Math.random() * 900000).toString();
                            setGeneratedDangerOtp(otp);
                            setShowDangerConfirm(true);
                            setDangerOtp1('');
                            setDangerOtp2('');
                          }}
                          className="text-[10px] px-2 py-1 text-red-400/60 border border-red-500/20 rounded hover:bg-red-500/10 transition"
                        >
                          <i className="fas fa-trash text-[8px] mr-1"></i>
                          {isBn ? 'মুছুন' : 'Delete'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-red-500/20 rounded p-2 border border-red-500/30">
                          <p className="text-red-400 text-xs font-bold">⚠️ {isBn ? 'সতর্কতা!' : 'Warning!'}</p>
                          <p className="text-red-300 text-[10px]">{isBn ? 'এই অ্যাকশন সব ইউজার, ডাক্তার এবং ডেটা মুছে ফেলবে।' : 'This will delete ALL users, doctors, and data.'}</p>
                        </div>
                        
                        <div className="bg-amber-500/10 rounded p-2 border border-amber-500/30">
                          <p className="text-amber-400 text-[10px] font-medium">🔐 {isBn ? 'ডাবল OTP ভেরিফিকেশন' : 'Double OTP Verification'}</p>
                          <p className="text-amber-300 text-sm font-mono font-bold tracking-widest mt-1">{generatedDangerOtp}</p>
                          <p className="text-amber-400/60 text-[9px] mt-1">{isBn ? 'এই কোডটি দুইবার লিখুন' : 'Enter this code twice'}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-1">{isBn ? 'প্রথম OTP' : 'First OTP'}</label>
                            <input
                              type="text"
                              value={dangerOtp1}
                              onChange={(e) => setDangerOtp1(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              className="w-full px-2 py-1.5 bg-white/5 border border-white/20 rounded text-white text-center font-mono text-xs tracking-widest"
                              placeholder="000000"
                              maxLength={6}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-1">{isBn ? 'দ্বিতীয় OTP' : 'Second OTP'}</label>
                            <input
                              type="text"
                              value={dangerOtp2}
                              onChange={(e) => setDangerOtp2(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              className="w-full px-2 py-1.5 bg-white/5 border border-white/20 rounded text-white text-center font-mono text-xs tracking-widest"
                              placeholder="000000"
                              maxLength={6}
                            />
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setShowDangerConfirm(false);
                              setDangerOtp1('');
                              setDangerOtp2('');
                              setGeneratedDangerOtp('');
                            }}
                            className="flex-1 py-1.5 text-[10px] text-slate-400 border border-slate-600 rounded hover:bg-white/5 transition"
                          >
                            {isBn ? 'বাতিল' : 'Cancel'}
                          </button>
                          <button
                            onClick={() => {
                              if (dangerOtp1 === generatedDangerOtp && dangerOtp2 === generatedDangerOtp && dangerOtp1 === dangerOtp2) {
                                if (confirm(isBn ? 'শেষ সতর্কতা! আপনি কি ১০০% নিশ্চিত?' : 'FINAL WARNING! Are you 100% sure?')) {
                                  localStorage.clear();
                                  window.location.reload();
                                }
                              } else {
                                alert(isBn ? 'OTP মিলছে না! দুটি OTP একই এবং সঠিক হতে হবে।' : 'OTP mismatch! Both OTPs must be the same and correct.');
                              }
                            }}
                            disabled={dangerOtp1.length !== 6 || dangerOtp2.length !== 6}
                            className="flex-1 py-1.5 text-[10px] bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <i className="fas fa-trash mr-1 text-[8px]"></i>
                            {isBn ? 'নিশ্চিত' : 'Confirm'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
