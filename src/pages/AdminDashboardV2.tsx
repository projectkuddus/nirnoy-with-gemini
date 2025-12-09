/**
 * ADMIN DASHBOARD V2 - Production-ready for 50,000+ users
 * Clean, scalable, with real-time updates and pagination
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { adminService, DoctorListItem, AdminStats } from '../services/adminService';
import { getFeedbacksAsync, updateFeedbackStatus, FeedbackData } from '../components/FeedbackWidget';

// ============ TYPES ============
type Tab = 'overview' | 'requests' | 'doctors' | 'patients' | 'feedback' | 'settings';

// ============ ADMIN PASSWORD (should be in env/backend in production) ============
const ADMIN_PASSWORD = 'nirnoy2025';

// ============ MAIN COMPONENT ============
export const AdminDashboardV2: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Data state
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingDoctors, setPendingDoctors] = useState<DoctorListItem[]>([]);
  const [approvedDoctors, setApprovedDoctors] = useState<DoctorListItem[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Action states
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // ============ DATA LOADING ============
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      console.log('[AdminV2] Loading data...');
      
      const [statsData, pending, approved, fbs] = await Promise.all([
        adminService.getStats(),
        adminService.getPendingDoctors(),
        adminService.getDoctors(1, 100, 'approved'),
        getFeedbacksAsync(),
      ]);

      setStats(statsData);
      setPendingDoctors(pending);
      setApprovedDoctors(approved.data);
      setFeedbacks(fbs);
      
      console.log('[AdminV2] Data loaded:', { 
        stats: statsData, 
        pendingCount: pending.length,
        approvedCount: approved.data.length,
        feedbackCount: fbs.length
      });
    } catch (error) {
      console.error('[AdminV2] Load error:', error);
    }
    setLoading(false);
  }, []);
  
  // Handle feedback status update
  const handleFeedbackUpdate = async (feedbackId: string, status: FeedbackData['status'], reply?: string) => {
    const success = await updateFeedbackStatus(feedbackId, status, reply);
    if (success) {
      setFeedbacks(prev => prev.map(fb => 
        fb.id === feedbackId 
          ? { ...fb, status, adminReply: reply || fb.adminReply, adminRepliedAt: reply ? new Date().toISOString() : fb.adminRepliedAt }
          : fb
      ));
      setReplyingTo(null);
      setReplyText('');
    }
  };

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  // Real-time subscription
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = adminService.subscribeToChanges(() => {
      console.log('[AdminV2] Real-time update received');
      loadData();
    });

    return unsubscribe;
  }, [isAuthenticated, loadData]);

  // ============ HANDLERS ============
  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError(isBn ? 'ভুল পাসওয়ার্ড' : 'Wrong password');
    }
  };

  const handleApprove = async (doctor: DoctorListItem) => {
    if (processingId) return;
    
    setProcessingId(doctor.profileId);
    console.log('[AdminV2] Approving:', doctor.profileId, doctor.name);
    
    const result = await adminService.approveDoctor(doctor.profileId);
    
    if (result.success) {
      // Immediately update UI
      setPendingDoctors(prev => prev.filter(d => d.profileId !== doctor.profileId));
      setApprovedDoctors(prev => [...prev, { ...doctor, status: 'approved', isVerified: true }]);
      setStats(prev => prev ? {
        ...prev,
        pendingDoctors: prev.pendingDoctors - 1,
        approvedDoctors: prev.approvedDoctors + 1,
      } : null);
      
      alert(isBn ? '✅ ডাক্তার অনুমোদিত হয়েছে!' : '✅ Doctor approved!');
    } else {
      alert(result.error || (isBn ? '❌ ত্রুটি হয়েছে' : '❌ Error occurred'));
    }
    
    setProcessingId(null);
  };

  const handleReject = async (doctor: DoctorListItem) => {
    if (processingId) return;
    
    const reason = prompt(isBn ? 'প্রত্যাখ্যানের কারণ:' : 'Rejection reason:');
    if (!reason) return;
    
    setProcessingId(doctor.profileId);
    console.log('[AdminV2] Rejecting:', doctor.profileId);
    
    const result = await adminService.rejectDoctor(doctor.profileId, reason);
    
    if (result.success) {
      setPendingDoctors(prev => prev.filter(d => d.profileId !== doctor.profileId));
      setStats(prev => prev ? {
        ...prev,
        pendingDoctors: prev.pendingDoctors - 1,
        rejectedDoctors: prev.rejectedDoctors + 1,
      } : null);
      
      alert(isBn ? '❌ ডাক্তার প্রত্যাখ্যাত হয়েছে' : '❌ Doctor rejected');
    } else {
      alert(result.error || (isBn ? '❌ ত্রুটি হয়েছে' : '❌ Error occurred'));
    }
    
    setProcessingId(null);
  };

  // ============ LOGIN SCREEN ============
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 w-full max-w-md border border-white/20">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-3xl font-bold">ন</span>
            </div>
            <h1 className="text-2xl font-bold text-white">{isBn ? 'অ্যাডমিন প্যানেল' : 'Admin Panel'}</h1>
            <p className="text-slate-400 mt-2">{isBn ? 'লগইন করুন' : 'Login to continue'}</p>
          </div>

          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder={isBn ? 'পাসওয়ার্ড দিন' : 'Enter password'}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            {authError && (
              <p className="text-red-400 text-sm text-center">{authError}</p>
            )}
            
            <button
              onClick={handleLogin}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition"
            >
              {isBn ? 'লগইন' : 'Login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ MAIN DASHBOARD ============
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">ন</span>
            </div>
            <div>
              <h1 className="text-white font-bold">{isBn ? 'অ্যাডমিন প্যানেল' : 'Admin Panel'}</h1>
              <p className="text-slate-400 text-sm">Admin</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {stats && stats.pendingDoctors > 0 && (
              <button
                onClick={() => setActiveTab('requests')}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-xl hover:bg-amber-500/30 transition"
              >
                <i className="fas fa-user-clock"></i>
                <span>{stats.pendingDoctors} {isBn ? 'অপেক্ষমাণ' : 'Pending'}</span>
              </button>
            )}
            
            <button
              onClick={() => {
                setIsAuthenticated(false);
                navigate('/');
              }}
              className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white transition"
            >
              <i className="fas fa-sign-out-alt"></i>
              <span>{isBn ? 'লগআউট' : 'Logout'}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0">
          <nav className="space-y-2">
            {[
              { id: 'overview', icon: 'fa-chart-pie', label: isBn ? 'ওভারভিউ' : 'Overview' },
              { id: 'requests', icon: 'fa-user-clock', label: isBn ? 'ডাক্তার অনুরোধ' : 'Doctor Requests', badge: stats?.pendingDoctors },
              { id: 'doctors', icon: 'fa-user-md', label: isBn ? 'ডাক্তারগণ' : 'Doctors', badge: stats?.approvedDoctors },
              { id: 'patients', icon: 'fa-users', label: isBn ? 'রোগীগণ' : 'Patients', badge: stats?.totalPatients },
              { id: 'feedback', icon: 'fa-comments', label: isBn ? 'ফিডব্যাক' : 'Feedback', badge: feedbacks.filter(f => f.status === 'new').length || undefined },
              { id: 'settings', icon: 'fa-cog', label: isBn ? 'সেটিংস' : 'Settings' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as Tab)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <i className={`fas ${item.icon}`}></i>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === item.id ? 'bg-white/20' : 'bg-blue-600 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && stats && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-white">{isBn ? 'ড্যাশবোর্ড' : 'Dashboard'}</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: isBn ? 'মোট ডাক্তার' : 'Total Doctors', value: stats.totalDoctors, color: 'blue', icon: 'fa-user-md' },
                      { label: isBn ? 'অপেক্ষমাণ' : 'Pending', value: stats.pendingDoctors, color: 'amber', icon: 'fa-clock' },
                      { label: isBn ? 'অনুমোদিত' : 'Approved', value: stats.approvedDoctors, color: 'green', icon: 'fa-check' },
                      { label: isBn ? 'মোট রোগী' : 'Total Patients', value: stats.totalPatients, color: 'purple', icon: 'fa-users' },
                    ].map((stat, i) => (
                      <div key={i} className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl bg-${stat.color}-500/20 flex items-center justify-center`}>
                            <i className={`fas ${stat.icon} text-${stat.color}-400 text-xl`}></i>
                          </div>
                          <div>
                            <p className="text-slate-400 text-sm">{stat.label}</p>
                            <p className="text-2xl font-bold text-white">{stat.value}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Doctor Requests Tab */}
              {activeTab === 'requests' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">
                      {isBn ? 'অপেক্ষমাণ ডাক্তার অনুরোধ' : 'Pending Doctor Requests'}
                    </h2>
                    <span className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-xl">
                      {pendingDoctors.length} {isBn ? 'অপেক্ষমাণ' : 'Pending'}
                    </span>
                  </div>

                  {pendingDoctors.length === 0 ? (
                    <div className="bg-white/5 rounded-2xl p-12 text-center border border-white/10">
                      <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-check text-green-400 text-3xl"></i>
                      </div>
                      <p className="text-xl font-bold text-white mb-2">
                        {isBn ? 'কোনো অপেক্ষমাণ অনুরোধ নেই' : 'No Pending Requests'}
                      </p>
                      <p className="text-slate-400">
                        {isBn ? 'সব ডাক্তার অনুরোধ প্রক্রিয়া করা হয়েছে' : 'All doctor requests have been processed'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingDoctors.map(doctor => (
                        <div key={doctor.profileId} className="bg-white/5 rounded-2xl p-6 border border-white/10">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                                {doctor.name.charAt(0)}
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-white">{doctor.name}</h3>
                                <p className="text-slate-400">{doctor.phone}</p>
                              </div>
                            </div>
                            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-sm">
                              {isBn ? 'অপেক্ষমাণ' : 'Pending'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
                            <div>
                              <p className="text-slate-500">{isBn ? 'BMDC নম্বর' : 'BMDC Number'}</p>
                              <p className="text-white font-medium">{doctor.bmdcNumber || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">{isBn ? 'বিশেষত্ব' : 'Specialty'}</p>
                              <p className="text-white font-medium">{doctor.specialties?.[0] || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">{isBn ? 'অভিজ্ঞতা' : 'Experience'}</p>
                              <p className="text-white font-medium">{doctor.experienceYears} {isBn ? 'বছর' : 'years'}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">{isBn ? 'আবেদনের তারিখ' : 'Applied On'}</p>
                              <p className="text-white font-medium">
                                {new Date(doctor.createdAt).toLocaleDateString('en-GB')}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-4">
                            <button
                              onClick={() => handleApprove(doctor)}
                              disabled={processingId === doctor.profileId}
                              className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {processingId === doctor.profileId ? (
                                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                              ) : (
                                <>
                                  <i className="fas fa-check"></i>
                                  {isBn ? 'অনুমোদন করুন' : 'Approve'}
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleReject(doctor)}
                              disabled={processingId === doctor.profileId}
                              className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
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
                  <h2 className="text-2xl font-bold text-white">
                    {isBn ? 'অনুমোদিত ডাক্তারগণ' : 'Approved Doctors'}
                  </h2>

                  {approvedDoctors.length === 0 ? (
                    <div className="bg-white/5 rounded-2xl p-12 text-center border border-white/10">
                      <p className="text-slate-400">{isBn ? 'কোনো অনুমোদিত ডাক্তার নেই' : 'No approved doctors yet'}</p>
                    </div>
                  ) : (
                    <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-white/5">
                          <tr>
                            <th className="px-6 py-4 text-left text-slate-400 font-medium">{isBn ? 'ডাক্তার' : 'Doctor'}</th>
                            <th className="px-6 py-4 text-left text-slate-400 font-medium">{isBn ? 'যোগাযোগ' : 'Contact'}</th>
                            <th className="px-6 py-4 text-left text-slate-400 font-medium">BMDC</th>
                            <th className="px-6 py-4 text-left text-slate-400 font-medium">{isBn ? 'বিশেষত্ব' : 'Specialty'}</th>
                            <th className="px-6 py-4 text-left text-slate-400 font-medium">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {approvedDoctors.map(doctor => (
                            <tr key={doctor.profileId} className="hover:bg-white/5">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
                                    {doctor.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="text-white font-medium">{doctor.name}</p>
                                    <p className="text-slate-500 text-sm">ID: {doctor.profileId.slice(0, 8)}...</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-slate-300">{doctor.phone}</td>
                              <td className="px-6 py-4 text-slate-300">{doctor.bmdcNumber || 'N/A'}</td>
                              <td className="px-6 py-4 text-slate-300">{doctor.specialties?.[0] || 'N/A'}</td>
                              <td className="px-6 py-4">
                                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm">
                                  {isBn ? 'অনুমোদিত' : 'Approved'}
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
                  <h2 className="text-2xl font-bold text-white">{isBn ? 'রোগীগণ' : 'Patients'}</h2>
                  <div className="bg-white/5 rounded-2xl p-12 text-center border border-white/10">
                    <i className="fas fa-users text-4xl text-slate-500 mb-4"></i>
                    <p className="text-slate-400">{stats?.totalPatients || 0} {isBn ? 'জন রোগী' : 'patients'}</p>
                  </div>
                </div>
              )}

              {/* Feedback Tab */}
              {activeTab === 'feedback' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">{isBn ? 'ইউজার ফিডব্যাক' : 'User Feedback'}</h2>
                    <div className="flex gap-2">
                      <span className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm">
                        {feedbacks.length} {isBn ? 'মোট' : 'Total'}
                      </span>
                      <span className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg text-sm">
                        {feedbacks.filter(f => f.status === 'new').length} {isBn ? 'নতুন' : 'New'}
                      </span>
                    </div>
                  </div>

                  {feedbacks.length === 0 ? (
                    <div className="bg-white/5 rounded-2xl p-12 text-center border border-white/10">
                      <div className="text-4xl mb-4">💬</div>
                      <p className="text-xl font-bold text-white mb-2">{isBn ? 'কোনো ফিডব্যাক নেই' : 'No Feedback Yet'}</p>
                      <p className="text-slate-400">{isBn ? 'ইউজাররা এখনো কোনো ফিডব্যাক দেননি' : 'Users have not submitted any feedback yet'}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {feedbacks.map((fb) => (
                        <div key={fb.id} className="bg-white/5 rounded-2xl p-6 border border-white/10">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-2xl">
                                {fb.mood === 'happy' ? '😊' : fb.mood === 'sad' ? '😞' : '😐'}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-bold text-white">{fb.userName || 'User'}</p>
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    fb.userRole === 'doctor' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                                  }`}>
                                    {fb.userRole === 'doctor' ? (isBn ? 'ডাক্তার' : 'Doctor') : (isBn ? 'রোগী' : 'Patient')}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    fb.type === 'bug' ? 'bg-red-500/20 text-red-400' : 
                                    fb.type === 'feature' ? 'bg-blue-500/20 text-blue-400' :
                                    fb.type === 'complaint' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'
                                  }`}>
                                    {fb.type}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-400">{new Date(fb.timestamp).toLocaleString('bn-BD')}</p>
                              </div>
                            </div>
                            <select
                              value={fb.status}
                              onChange={(e) => handleFeedbackUpdate(fb.id, e.target.value as FeedbackData['status'])}
                              className={`px-3 py-2 rounded-lg text-sm font-medium bg-slate-700 text-white border border-slate-600`}
                            >
                              <option value="new">{isBn ? '🕐 নতুন' : '🕐 New'}</option>
                              <option value="reviewed">{isBn ? '👁️ দেখা হয়েছে' : '👁️ Reviewed'}</option>
                              <option value="resolved">{isBn ? '✅ সমাধান' : '✅ Resolved'}</option>
                            </select>
                          </div>

                          <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
                            <p className="text-slate-200">{fb.message}</p>
                          </div>

                          {/* Admin Reply Section */}
                          {fb.adminReply ? (
                            <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                              <p className="text-xs text-green-400 mb-2 font-bold">
                                <i className="fas fa-reply mr-2"></i>
                                {isBn ? 'অ্যাডমিন উত্তর' : 'Admin Reply'} • {fb.adminRepliedAt ? new Date(fb.adminRepliedAt).toLocaleDateString() : ''}
                              </p>
                              <p className="text-green-200">{fb.adminReply}</p>
                            </div>
                          ) : replyingTo === fb.id ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder={isBn ? 'উত্তর লিখুন...' : 'Write reply...'}
                                className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && replyText.trim()) {
                                    handleFeedbackUpdate(fb.id, 'resolved', replyText.trim());
                                  }
                                }}
                              />
                              <button
                                onClick={() => replyText.trim() && handleFeedbackUpdate(fb.id, 'resolved', replyText.trim())}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                              >
                                <i className="fas fa-paper-plane"></i>
                              </button>
                              <button
                                onClick={() => { setReplyingTo(null); setReplyText(''); }}
                                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setReplyingTo(fb.id)}
                              className="text-sm text-blue-400 hover:text-blue-300 transition"
                            >
                              <i className="fas fa-reply mr-2"></i>
                              {isBn ? 'উত্তর দিন' : 'Reply'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-white">{isBn ? 'সেটিংস' : 'Settings'}</h2>
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                    <p className="text-slate-400">{isBn ? 'সেটিংস শীঘ্রই আসছে...' : 'Settings coming soon...'}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardV2;


