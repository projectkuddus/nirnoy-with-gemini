import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'doctors' | 'patients' | 'feedback' | 'settings'>('overview');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(true);

  const [stats] = useState({
    totalDoctors: 156, totalPatients: 2847, todayAppointments: 89,
    pendingVerifications: 12, totalRevenue: 1250000, newFeedback: 23, activeUsers: 342
  });

  useEffect(() => {
    const adminAuth = localStorage.getItem('nirnoy_admin_auth');
    if (adminAuth === 'authenticated') setIsAuthenticated(true);
    setLoading(false);
  }, []);

  const handleAdminLogin = () => {
    if (adminPassword === 'nirnoy@admin2024') {
      setIsAuthenticated(true);
      localStorage.setItem('nirnoy_admin_auth', 'authenticated');
    } else alert('Invalid password');
  };

  const handleLogout = () => {
    localStorage.removeItem('nirnoy_admin_auth');
    setIsAuthenticated(false);
    navigate('/');
  };

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800/80 backdrop-blur-xl rounded-2xl p-8 w-full max-w-md border border-gray-700 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Admin Access</h1>
            <p className="text-gray-400 mt-2">Nirnoy Health Command Center</p>
          </div>
          <div className="space-y-4">
            <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter admin password" />
            <button onClick={handleAdminLogin} className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all">Access Dashboard</button>
            <Link to="/" className="block text-center text-gray-400 hover:text-white transition-colors">← Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="fixed left-0 top-0 h-full w-64 bg-gray-800 border-r border-gray-700 z-50">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <div><h1 className="text-white font-bold">Nirnoy Admin</h1><p className="text-xs text-gray-400">Command Center</p></div>
          </div>
          <nav className="space-y-2">
            {[{id:'overview',label:'Overview',icon:'📊'},{id:'doctors',label:'Doctors',icon:'👨‍⚕️'},{id:'patients',label:'Patients',icon:'👥'},{id:'feedback',label:'Feedback',icon:'💬'},{id:'settings',label:'Settings',icon:'⚙️'}].map((item) => (
              <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
                <span>{item.icon}</span><span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-700">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            <span>Logout</span>
          </button>
        </div>
      </div>

      <div className="ml-64 p-8">
        <div className="flex items-center justify-between mb-8">
          <div><h1 className="text-2xl font-bold text-white">Dashboard Overview</h1><p className="text-gray-400 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-full"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div><span className="text-sm font-medium">{stats.activeUsers} Active Users</span></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
            <p className="text-blue-200 text-sm">Total Doctors</p><p className="text-3xl font-bold mt-1">{stats.totalDoctors}</p>
          </div>
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-6 text-white">
            <p className="text-green-200 text-sm">Total Patients</p><p className="text-3xl font-bold mt-1">{stats.totalPatients.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-6 text-white">
            <p className="text-purple-200 text-sm">Today's Appointments</p><p className="text-3xl font-bold mt-1">{stats.todayAppointments}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-2xl p-6 text-white">
            <p className="text-orange-200 text-sm">Total Revenue</p><p className="text-3xl font-bold mt-1">৳{(stats.totalRevenue / 1000).toFixed(0)}K</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">⚠️ Pending Verifications ({stats.pendingVerifications})</h3>
            <p className="text-gray-400">Doctor verification requests pending review.</p>
          </div>
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">💬 New Feedback ({stats.newFeedback})</h3>
            <p className="text-gray-400">User feedback waiting for response.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
