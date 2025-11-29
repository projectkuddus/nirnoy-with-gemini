import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { getFeedbacks, updateFeedbackStatus } from '../components/FeedbackWidget';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

// ============ TYPES ============
type AdminTab = 'overview' | 'users' | 'subscriptions' | 'payments' | 'feedback' | 'credits' | 'analytics' | 'settings';

interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  totalCredits: number;
  newUsersToday: number;
  conversionRate: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'patient' | 'doctor';
  plan: string;
  credits: number;
  createdAt: string;
  lastActive: string;
}

interface Payment {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
}

// ============ MOCK DATA ============
const MOCK_STATS: DashboardStats = {
  totalUsers: 1247,
  activeSubscriptions: 423,
  monthlyRevenue: 127500,
  totalCredits: 45230,
  newUsersToday: 23,
  conversionRate: 33.9,
};

const MOCK_USERS: User[] = [
  { id: '1', name: 'রহিম উদ্দিন', email: 'rahim@gmail.com', phone: '01712345678', role: 'patient', plan: 'Premium', credits: 150, createdAt: '2024-11-15', lastActive: '2024-11-29' },
  { id: '2', name: 'ডা. সালমা আক্তার', email: 'salma@nirnoy.ai', phone: '01812345679', role: 'doctor', plan: 'Professional', credits: 0, createdAt: '2024-11-10', lastActive: '2024-11-29' },
  { id: '3', name: 'করিম আহমেদ', email: 'karim@gmail.com', phone: '01912345680', role: 'patient', plan: 'Family', credits: 320, createdAt: '2024-11-01', lastActive: '2024-11-28' },
  { id: '4', name: 'ফাতিমা বেগম', email: 'fatima@gmail.com', phone: '01612345681', role: 'patient', plan: 'Basic', credits: 80, createdAt: '2024-10-20', lastActive: '2024-11-27' },
  { id: '5', name: 'ডা. আবুল কাশেম', email: 'kashem@nirnoy.ai', phone: '01712345682', role: 'doctor', plan: 'Enterprise', credits: 0, createdAt: '2024-10-15', lastActive: '2024-11-29' },
];

const MOCK_PAYMENTS: Payment[] = [
  { id: 'p1', userId: '1', userName: 'রহিম উদ্দিন', amount: 399, method: 'bkash', status: 'completed', createdAt: '2024-11-29 10:30' },
  { id: 'p2', userId: '3', userName: 'করিম আহমেদ', amount: 699, method: 'nagad', status: 'completed', createdAt: '2024-11-29 09:15' },
  { id: 'p3', userId: '2', userName: 'ডা. সালমা আক্তার', amount: 2499, method: 'card', status: 'completed', createdAt: '2024-11-28 14:20' },
  { id: 'p4', userId: '4', userName: 'ফাতিমা বেগম', amount: 199, method: 'bkash', status: 'pending', createdAt: '2024-11-28 11:45' },
];

const REVENUE_DATA = [
  { month: 'Jun', revenue: 45000, users: 120 },
  { month: 'Jul', revenue: 62000, users: 180 },
  { month: 'Aug', revenue: 78000, users: 250 },
  { month: 'Sep', revenue: 95000, users: 340 },
  { month: 'Oct', revenue: 112000, users: 420 },
  { month: 'Nov', revenue: 127500, users: 520 },
];

const PLAN_DISTRIBUTION = [
  { name: 'Free', value: 650, color: '#94a3b8' },
  { name: 'Basic', value: 280, color: '#3b82f6' },
  { name: 'Premium', value: 200, color: '#8b5cf6' },
  { name: 'Family', value: 117, color: '#ec4899' },
];

// ============ COMPONENT ============
export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<DashboardStats>(MOCK_STATS);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [payments, setPayments] = useState<Payment[]>(MOCK_PAYMENTS);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Load feedbacks
  useEffect(() => {
    const loadedFeedbacks = getFeedbacks();
    setFeedbacks(loadedFeedbacks);
  }, [activeTab]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  // Check admin auth
  useEffect(() => {
    const auth = localStorage.getItem('nirnoy_admin_auth');
    if (auth === 'authenticated') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleAdminLogin = () => {
    // Simple admin password (in production, use proper auth)
    if (adminPassword === 'nirnoy2024') {
      localStorage.setItem('nirnoy_admin_auth', 'authenticated');
      setIsAuthenticated(true);
    } else {
      alert('Invalid password');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nirnoy_admin_auth');
    setIsAuthenticated(false);
  };

  // Login screen
  if (!isAuthenticated) {
  
  // Render Feedback
  const renderFeedback = () => {
    const newCount = feedbacks.filter(f => f.status === 'new').length;
    const resolvedCount = feedbacks.filter(f => f.status === 'resolved').length;
    
    const handleStatusChange = (id: string, status: 'new' | 'reviewed' | 'resolved') => {
      updateFeedbackStatus(id, status);
      setFeedbacks(getFeedbacks());
    };
    
    const getMoodEmoji = (mood: string) => {
      switch(mood) {
        case 'happy': return '😊';
        case 'sad': return '😞';
        default: return '😐';
      }
    };
    
    const getTypeColor = (type: string) => {
      switch(type) {
        case 'bug': return 'bg-red-500/20 text-red-400';
        case 'feature': return 'bg-blue-500/20 text-blue-400';
        case 'complaint': return 'bg-orange-500/20 text-orange-400';
        case 'doctor': return 'bg-purple-500/20 text-purple-400';
        default: return 'bg-slate-500/20 text-slate-400';
      }
    };
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">User Feedback</h2>
          <div className="flex gap-3">
            <div className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-xl font-medium">
              {newCount} New
            </div>
            <div className="px-4 py-2 bg-green-500/20 text-green-400 rounded-xl font-medium">
              {resolvedCount} Resolved
            </div>
          </div>
        </div>
        
        {feedbacks.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 border border-white/10 text-center">
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">💬</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Feedback Yet</h3>
            <p className="text-slate-400">User feedback will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((feedback) => (
              <div key={feedback.id} className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/10">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getMoodEmoji(feedback.mood)}</span>
                    <div>
                      <div className="text-white font-medium">{feedback.userName || feedback.phone || 'Anonymous'}</div>
                      <div className="text-slate-400 text-sm">{feedback.page} • {new Date(feedback.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getTypeColor(feedback.type)}`}>
                      {feedback.type}
                    </span>
                    <select
                      value={feedback.status}
                      onChange={(e) => handleStatusChange(feedback.id, e.target.value as any)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium bg-white/10 border border-white/20 text-white focus:outline-none ${
                        feedback.status === 'new' ? 'text-amber-400' :
                        feedback.status === 'reviewed' ? 'text-blue-400' : 'text-green-400'
                      }`}
                    >
                      <option value="new">New</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>
                <p className="text-slate-300 bg-white/5 rounded-xl p-3">{feedback.message}</p>
                {(feedback.email || feedback.phone) && (
                  <div className="mt-3 text-sm text-slate-400">
                    Contact: {feedback.email || feedback.phone}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 w-full max-w-md border border-white/20">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-black">ন</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-slate-400 mt-2">Nirnoy Health Platform</p>
          </div>
          
          <div className="space-y-4">
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              placeholder="Admin Password"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
            />
            <button
              onClick={handleAdminLogin}
              className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg transition"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Sidebar items
  const sidebarItems = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'users', icon: '👥', label: 'Users' },
    { id: 'subscriptions', icon: '💳', label: 'Subscriptions' },
    { id: 'payments', icon: '💰', label: 'Payments' },
    { id: 'feedback', icon: '💬', label: 'Feedback' },
    { id: 'credits', icon: '🎮', label: 'Credits' },
    { id: 'analytics', icon: '📈', label: 'Analytics' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ];

  // Render Overview
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: '👥', color: 'from-blue-500 to-indigo-600' },
          { label: 'Active Subs', value: stats.activeSubscriptions.toLocaleString(), icon: '💳', color: 'from-emerald-500 to-teal-600' },
          { label: 'Monthly Revenue', value: `৳${(stats.monthlyRevenue/1000).toFixed(1)}K`, icon: '💰', color: 'from-amber-500 to-orange-600' },
          { label: 'Total Credits', value: stats.totalCredits.toLocaleString(), icon: '🎮', color: 'from-purple-500 to-pink-600' },
          { label: 'New Today', value: stats.newUsersToday, icon: '📈', color: 'from-cyan-500 to-blue-600' },
          { label: 'Conversion', value: `${stats.conversionRate}%`, icon: '🎯', color: 'from-rose-500 to-red-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
              <span className="text-xl">{stat.icon}</span>
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-slate-400 text-sm">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <h3 className="text-lg font-bold text-white mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={REVENUE_DATA}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }} />
              <Area type="monotone" dataKey="revenue" stroke="#14b8a6" fill="url(#revenueGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Plan Distribution */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <h3 className="text-lg font-bold text-white mb-4">Plan Distribution</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={PLAN_DISTRIBUTION}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {PLAN_DISTRIBUTION.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {PLAN_DISTRIBUTION.map((plan, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: plan.color }}></div>
                <span className="text-slate-300 text-sm">{plan.name}: {plan.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <h3 className="text-lg font-bold text-white mb-4">Recent Users</h3>
          <div className="space-y-3">
            {users.slice(0, 5).map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.role === 'doctor' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {user.role === 'doctor' ? '👨‍⚕️' : '👤'}
                  </div>
                  <div>
                    <div className="text-white font-medium">{user.name}</div>
                    <div className="text-slate-400 text-sm">{user.plan}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-teal-400 font-medium">{user.credits} credits</div>
                  <div className="text-slate-500 text-xs">{user.lastActive}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <h3 className="text-lg font-bold text-white mb-4">Recent Payments</h3>
          <div className="space-y-3">
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    payment.method === 'bkash' ? 'bg-pink-500/20' : 
                    payment.method === 'nagad' ? 'bg-orange-500/20' : 'bg-blue-500/20'
                  }`}>
                    {payment.method === 'bkash' ? '📱' : payment.method === 'nagad' ? '📱' : '💳'}
                  </div>
                  <div>
                    <div className="text-white font-medium">{payment.userName}</div>
                    <div className="text-slate-400 text-sm capitalize">{payment.method}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-400 font-bold">৳{payment.amount}</div>
                  <div className={`text-xs ${payment.status === 'completed' ? 'text-green-400' : 'text-amber-400'}`}>
                    {payment.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Render Users
  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">User Management</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
          />
          <button className="px-4 py-2 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600">
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="text-left p-4 text-slate-400 font-medium">User</th>
              <th className="text-left p-4 text-slate-400 font-medium">Contact</th>
              <th className="text-left p-4 text-slate-400 font-medium">Role</th>
              <th className="text-left p-4 text-slate-400 font-medium">Plan</th>
              <th className="text-left p-4 text-slate-400 font-medium">Credits</th>
              <th className="text-left p-4 text-slate-400 font-medium">Last Active</th>
              <th className="text-left p-4 text-slate-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase())).map((user) => (
              <tr key={user.id} className="border-t border-white/5 hover:bg-white/5">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.role === 'doctor' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {user.role === 'doctor' ? '👨‍⚕️' : '👤'}
                    </div>
                    <span className="text-white font-medium">{user.name}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-white text-sm">{user.email}</div>
                  <div className="text-slate-400 text-xs">{user.phone}</div>
                </td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.role === 'doctor' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="p-4 text-white">{user.plan}</td>
                <td className="p-4 text-amber-400 font-medium">{user.credits}</td>
                <td className="p-4 text-slate-400 text-sm">{user.lastActive}</td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-white">👁️</button>
                    <button className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-white">✏️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Render Payments
  const renderPayments = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Payment History</h2>
        <div className="flex gap-3">
          <select className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none">
            <option value="all">All Methods</option>
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
            <option value="card">Card</option>
          </select>
          <select className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none">
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Today', value: '৳12,500', change: '+15%', color: 'emerald' },
          { label: 'This Week', value: '৳45,200', change: '+8%', color: 'blue' },
          { label: 'This Month', value: '৳127,500', change: '+23%', color: 'purple' },
          { label: 'Pending', value: '৳3,400', change: '4 txn', color: 'amber' },
        ].map((stat, i) => (
          <div key={i} className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
            <div className="text-slate-400 text-sm">{stat.label}</div>
            <div className="text-2xl font-bold text-white mt-1">{stat.value}</div>
            <div className={`text-${stat.color}-400 text-sm mt-1`}>{stat.change}</div>
          </div>
        ))}
      </div>

      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="text-left p-4 text-slate-400 font-medium">Transaction ID</th>
              <th className="text-left p-4 text-slate-400 font-medium">User</th>
              <th className="text-left p-4 text-slate-400 font-medium">Amount</th>
              <th className="text-left p-4 text-slate-400 font-medium">Method</th>
              <th className="text-left p-4 text-slate-400 font-medium">Status</th>
              <th className="text-left p-4 text-slate-400 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-t border-white/5 hover:bg-white/5">
                <td className="p-4 text-white font-mono text-sm">{payment.id}</td>
                <td className="p-4 text-white">{payment.userName}</td>
                <td className="p-4 text-emerald-400 font-bold">৳{payment.amount}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                    payment.method === 'bkash' ? 'bg-pink-500/20 text-pink-400' :
                    payment.method === 'nagad' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {payment.method}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    payment.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    payment.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {payment.status}
                  </span>
                </td>
                <td className="p-4 text-slate-400 text-sm">{payment.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Render Settings
  const renderSettings = () => (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-white">Settings</h2>

      {/* Payment Gateway Settings */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-bold text-white mb-4">💳 Payment Gateways</h3>
        <div className="space-y-4">
          {[
            { name: 'bKash', status: 'Connected', color: 'pink' },
            { name: 'Nagad', status: 'Connected', color: 'orange' },
            { name: 'SSLCommerz', status: 'Sandbox', color: 'blue' },
          ].map((gateway, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-${gateway.color}-500/20 flex items-center justify-center`}>
                  📱
                </div>
                <span className="text-white font-medium">{gateway.name}</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium bg-${gateway.color}-500/20 text-${gateway.color}-400`}>
                {gateway.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-bold text-white mb-4">🔔 Notifications</h3>
        <div className="space-y-4">
          {[
            { label: 'New User Signup', enabled: true },
            { label: 'New Subscription', enabled: true },
            { label: 'Payment Failed', enabled: true },
            { label: 'Daily Report', enabled: false },
          ].map((setting, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
              <span className="text-white">{setting.label}</span>
              <button className={`w-12 h-6 rounded-full transition ${setting.enabled ? 'bg-teal-500' : 'bg-slate-600'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition ${setting.enabled ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/10 backdrop-blur-xl rounded-2xl p-6 border border-red-500/20">
        <h3 className="text-lg font-bold text-red-400 mb-4">⚠️ Danger Zone</h3>
        <button
          onClick={handleLogout}
          className="px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600"
        >
          Logout from Admin
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white/5 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-xl flex items-center justify-center">
            <span className="text-white font-black">ন</span>
          </div>
          <div>
            <div className="text-white font-bold">Nirnoy</div>
            <div className="text-slate-400 text-xs">Admin Panel</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as AdminTab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-left ${
                activeTab === item.id
                  ? 'bg-teal-500/20 text-teal-400'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'payments' && renderPayments()}
        {activeTab === 'settings' && renderSettings()}
        {activeTab === 'subscriptions' && renderOverview()}
        {activeTab === 'credits' && renderOverview()}
        {activeTab === 'analytics' && renderOverview()}
      </main>
    </div>
  );
};

export default AdminDashboard;
