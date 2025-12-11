import React, { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

// ============ TYPES ============
interface AppointmentData {
  id: string;
  date: string;
  patientId: string;
  patientName: string;
  type: 'New' | 'Follow-up' | 'Report' | 'Emergency';
  status: 'Completed' | 'No-Show' | 'Cancelled' | 'Waiting' | 'In-Progress';
  fee: number;
  paymentStatus: 'Paid' | 'Pending' | 'Waived';
  chamberId?: string;
}

interface PatientData {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female';
  riskLevel: 'High' | 'Medium' | 'Low';
  lastVisit: string;
  totalVisits: number;
  conditions: string[];
}

interface ChamberData {
  id: string;
  name: string;
  nameBn: string;
}

interface AnalyticsDashboardProps {
  appointments: AppointmentData[];
  patients: PatientData[];
  chambers?: ChamberData[];
  consultationFee: number;
}

// ============ CHART COLORS ============
const COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  slate: '#64748b',
};

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

// ============ ANALYTICS DASHBOARD COMPONENT ============
export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  appointments,
  patients,
  chambers = [],
  consultationFee,
}) => {
  // State
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [selectedChamber, setSelectedChamber] = useState<string>('all');

  // Filter appointments by time range and chamber
  const filteredAppointments = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return appointments.filter(a => {
      const aptDate = new Date(a.date);
      const dateMatch = aptDate >= startDate && aptDate <= now;
      const chamberMatch = selectedChamber === 'all' || a.chamberId === selectedChamber;
      return dateMatch && chamberMatch;
    });
  }, [appointments, timeRange, selectedChamber]);

  // ============ STATISTICS ============
  const stats = useMemo(() => {
    const completed = filteredAppointments.filter(a => a.status === 'Completed');
    const noShow = filteredAppointments.filter(a => a.status === 'No-Show');
    const cancelled = filteredAppointments.filter(a => a.status === 'Cancelled');
    const paid = completed.filter(a => a.paymentStatus === 'Paid');
    
    const totalRevenue = paid.reduce((sum, a) => sum + a.fee, 0);
    const pendingRevenue = completed.filter(a => a.paymentStatus === 'Pending').reduce((sum, a) => sum + a.fee, 0);
    
    const newPatients = completed.filter(a => a.type === 'New').length;
    const followUps = completed.filter(a => a.type === 'Follow-up').length;
    
    const completionRate = filteredAppointments.length > 0 
      ? (completed.length / filteredAppointments.length * 100).toFixed(1) 
      : 0;
    
    const noShowRate = filteredAppointments.length > 0 
      ? (noShow.length / filteredAppointments.length * 100).toFixed(1) 
      : 0;

    return {
      totalAppointments: filteredAppointments.length,
      completed: completed.length,
      noShow: noShow.length,
      cancelled: cancelled.length,
      totalRevenue,
      pendingRevenue,
      newPatients,
      followUps,
      completionRate,
      noShowRate,
      avgRevenuePerPatient: completed.length > 0 ? totalRevenue / completed.length : 0,
    };
  }, [filteredAppointments]);

  // ============ DAILY DATA FOR CHARTS ============
  const dailyData = useMemo(() => {
    const dataMap = new Map<string, { date: string; patients: number; revenue: number; newPatients: number; followUps: number }>();
    
    filteredAppointments.forEach(a => {
      const date = a.date.split('T')[0];
      const existing = dataMap.get(date) || { date, patients: 0, revenue: 0, newPatients: 0, followUps: 0 };
      
      if (a.status === 'Completed') {
        existing.patients++;
        if (a.paymentStatus === 'Paid') {
          existing.revenue += a.fee;
        }
        if (a.type === 'New') existing.newPatients++;
        if (a.type === 'Follow-up') existing.followUps++;
      }
      
      dataMap.set(date, existing);
    });

    return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredAppointments]);

  // ============ WEEKLY DATA ============
  const weeklyData = useMemo(() => {
    const days = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];
    const dataMap = new Map<number, { day: string; patients: number; revenue: number }>();
    
    // Initialize all days
    days.forEach((day, idx) => {
      dataMap.set(idx, { day, patients: 0, revenue: 0 });
    });

    filteredAppointments.forEach(a => {
      const dayOfWeek = new Date(a.date).getDay();
      const existing = dataMap.get(dayOfWeek)!;
      
      if (a.status === 'Completed') {
        existing.patients++;
        if (a.paymentStatus === 'Paid') {
          existing.revenue += a.fee;
        }
      }
    });

    return Array.from(dataMap.values());
  }, [filteredAppointments]);

  // ============ APPOINTMENT TYPE DISTRIBUTION ============
  const appointmentTypeData = useMemo(() => {
    const types: Record<string, number> = { 'নতুন': 0, 'ফলো-আপ': 0, 'রিপোর্ট': 0, 'জরুরি': 0 };
    
    filteredAppointments.filter(a => a.status === 'Completed').forEach(a => {
      switch (a.type) {
        case 'New': types['নতুন']++; break;
        case 'Follow-up': types['ফলো-আপ']++; break;
        case 'Report': types['রিপোর্ট']++; break;
        case 'Emergency': types['জরুরি']++; break;
      }
    });

    return Object.entries(types).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [filteredAppointments]);

  // ============ PATIENT DEMOGRAPHICS ============
  const demographicsData = useMemo(() => {
    const ageGroups: Record<string, number> = { 
      '০-১৮': 0, '১৯-৩৫': 0, '৩৬-৫০': 0, '৫১-৬৫': 0, '৬৫+': 0 
    };
    const genderData: Record<string, number> = { 'পুরুষ': 0, 'মহিলা': 0 };

    patients.forEach(p => {
      // Age groups
      if (p.age <= 18) ageGroups['০-১৮']++;
      else if (p.age <= 35) ageGroups['১৯-৩৫']++;
      else if (p.age <= 50) ageGroups['৩৬-৫০']++;
      else if (p.age <= 65) ageGroups['৫১-৬৫']++;
      else ageGroups['৬৫+']++;

      // Gender
      if (p.gender === 'Male') genderData['পুরুষ']++;
      else genderData['মহিলা']++;
    });

    return {
      ageGroups: Object.entries(ageGroups).map(([name, value]) => ({ name, value })),
      gender: Object.entries(genderData).map(([name, value]) => ({ name, value })),
    };
  }, [patients]);

  // ============ TOP CONDITIONS ============
  const topConditions = useMemo(() => {
    const conditionMap = new Map<string, number>();
    
    patients.forEach(p => {
      p.conditions.forEach(c => {
        conditionMap.set(c, (conditionMap.get(c) || 0) + 1);
      });
    });

    return Array.from(conditionMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [patients]);

  // ============ RISK LEVEL DISTRIBUTION ============
  const riskLevelData = useMemo(() => {
    const levels: Record<string, number> = { 'উচ্চ': 0, 'মাঝারি': 0, 'কম': 0 };
    
    patients.forEach(p => {
      switch (p.riskLevel) {
        case 'High': levels['উচ্চ']++; break;
        case 'Medium': levels['মাঝারি']++; break;
        case 'Low': levels['কম']++; break;
      }
    });

    return Object.entries(levels).map(([name, value]) => ({ name, value }));
  }, [patients]);

  // ============ CHAMBER COMPARISON ============
  const chamberData = useMemo(() => {
    if (chambers.length === 0) return [];

    return chambers.map(chamber => {
      const chamberAppts = filteredAppointments.filter(a => a.chamberId === chamber.id);
      const completed = chamberAppts.filter(a => a.status === 'Completed');
      const revenue = completed.filter(a => a.paymentStatus === 'Paid').reduce((sum, a) => sum + a.fee, 0);

      return {
        name: chamber.nameBn || chamber.name,
        patients: completed.length,
        revenue,
      };
    });
  }, [chambers, filteredAppointments]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('bn-BD', { style: 'currency', currency: 'BDT' }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">📊 বিশ্লেষণ ড্যাশবোর্ড</h2>
          <p className="text-slate-500">আপনার প্র্যাক্টিসের বিস্তারিত বিশ্লেষণ</p>
        </div>
        
        <div className="flex gap-3">
          {/* Time Range */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 glass-subtle rounded-lg border-0 text-sm"
          >
            <option value="week">গত ৭ দিন</option>
            <option value="month">গত ৩০ দিন</option>
            <option value="year">গত ১ বছর</option>
          </select>

          {/* Chamber Filter */}
          {chambers.length > 0 && (
            <select
              value={selectedChamber}
              onChange={(e) => setSelectedChamber(e.target.value)}
              className="px-4 py-2 glass-subtle rounded-lg border-0 text-sm"
            >
              <option value="all">সব চেম্বার</option>
              {chambers.map(c => (
                <option key={c.id} value={c.id}>{c.nameBn || c.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="text-sm text-slate-500 mb-1">মোট অ্যাপয়েন্টমেন্ট</div>
          <div className="text-3xl font-bold text-slate-800">{stats.totalAppointments}</div>
          <div className="text-xs text-green-600 mt-1">সম্পন্ন: {stats.completed}</div>
        </div>
        
        <div className="glass-card p-4 border-l-4 border-green-400">
          <div className="text-sm text-slate-500 mb-1">মোট আয়</div>
          <div className="text-3xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</div>
          <div className="text-xs text-amber-600 mt-1">বাকি: {formatCurrency(stats.pendingRevenue)}</div>
        </div>
        
        <div className="glass-card p-4 border-l-4 border-blue-400">
          <div className="text-sm text-slate-500 mb-1">নতুন রোগী</div>
          <div className="text-3xl font-bold text-blue-600">{stats.newPatients}</div>
          <div className="text-xs text-slate-500 mt-1">ফলো-আপ: {stats.followUps}</div>
        </div>
        
        <div className="glass-card p-4 border-l-4 border-purple-400">
          <div className="text-sm text-slate-500 mb-1">গড় আয়/রোগী</div>
          <div className="text-3xl font-bold text-purple-600">{formatCurrency(stats.avgRevenuePerPatient)}</div>
          <div className="text-xs text-slate-500 mt-1">সম্পন্ন হার: {stats.completionRate}%</div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient & Revenue Trend */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-slate-700 mb-4">📈 রোগী ও আয়ের ধারা</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis yAxisId="left" stroke="#3b82f6" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '8px' }}
                formatter={(value: number, name: string) => [
                  name === 'revenue' ? formatCurrency(value) : value,
                  name === 'patients' ? 'রোগী' : 'আয়'
                ]}
              />
              <Area yAxisId="left" type="monotone" dataKey="patients" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="patients" />
              <Area yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="revenue" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Distribution */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-slate-700 mb-4">📅 সাপ্তাহিক বিতরণ</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis yAxisId="left" stroke="#3b82f6" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '8px' }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="patients" name="রোগী" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="revenue" name="আয়" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Appointment Types */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-slate-700 mb-4">📋 অ্যাপয়েন্টমেন্টের ধরন</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={appointmentTypeData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {appointmentTypeData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gender Distribution */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-slate-700 mb-4">👥 লিঙ্গ বিতরণ</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={demographicsData.gender}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                <Cell fill="#3b82f6" />
                <Cell fill="#ec4899" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Level */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-slate-700 mb-4">⚠️ ঝুঁকির স্তর</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={riskLevelData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                <Cell fill="#ef4444" />
                <Cell fill="#f59e0b" />
                <Cell fill="#10b981" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Age Demographics */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-slate-700 mb-4">📊 বয়স বিতরণ</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={demographicsData.ageGroups} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" fontSize={12} />
              <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={12} width={60} />
              <Tooltip />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="রোগী" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Conditions */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-slate-700 mb-4">🩺 শীর্ষ ১০ রোগ</h3>
          <div className="space-y-3">
            {topConditions.map((condition, idx) => (
              <div key={condition.name} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </span>
                <span className="flex-1 text-slate-700">{condition.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(condition.count / (topConditions[0]?.count || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-500 w-8">{condition.count}</span>
                </div>
              </div>
            ))}
            {topConditions.length === 0 && (
              <p className="text-center text-slate-400 py-8">কোনো তথ্য নেই</p>
            )}
          </div>
        </div>
      </div>

      {/* Chamber Comparison */}
      {chamberData.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-semibold text-slate-700 mb-4">🏥 চেম্বার তুলনা</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chamberData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis yAxisId="left" stroke="#3b82f6" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="patients" name="রোগী" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="revenue" name="আয়" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Performance Summary */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-slate-700 mb-4">📈 কর্মক্ষমতা সারাংশ</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600">{stats.completionRate}%</div>
            <div className="text-sm text-slate-500 mt-1">সম্পন্ন হার</div>
            <div className="w-full h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full" 
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-4xl font-bold text-red-600">{stats.noShowRate}%</div>
            <div className="text-sm text-slate-500 mt-1">নো-শো হার</div>
            <div className="w-full h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-red-500 rounded-full" 
                style={{ width: `${stats.noShowRate}%` }}
              />
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600">{patients.length}</div>
            <div className="text-sm text-slate-500 mt-1">মোট রোগী</div>
          </div>
          
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-600">
              {patients.length > 0 ? (patients.reduce((sum, p) => sum + p.totalVisits, 0) / patients.length).toFixed(1) : 0}
            </div>
            <div className="text-sm text-slate-500 mt-1">গড় ভিজিট/রোগী</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;

