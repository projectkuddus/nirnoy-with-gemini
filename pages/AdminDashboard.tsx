import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { getFeedbacks, updateFeedbackStatus } from '../components/FeedbackWidget';
import { useAuth, DoctorProfile, PatientProfile, STORAGE_KEYS } from '../contexts/AuthContext';

// ============ TYPES ============
type AdminTab = 'overview' | 'doctor-requests' | 'doctors' | 'patients' | 'subscribers' | 'feedback' | 'analytics' | 'settings';

interface AdminSettings {
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  notificationsEnabled: boolean;
  autoApproveVerifiedDoctors: boolean;
  maintenanceMode: boolean;
}

// ============ STORAGE KEYS ============
const ADMIN_STORAGE = {
  AUTH: 'nirnoy_admin_auth',
  SETTINGS: 'nirnoy_admin_settings',
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
  };

  const handleAdminLogin = () => {
    const settings = getAdminSettings();
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
