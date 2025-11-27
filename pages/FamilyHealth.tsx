import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import PageHeader from '../components/PageHeader';

// ============ TYPES ============
interface FamilyMember {
  id: string;
  name: string;
  nameBn: string;
  relation: 'self' | 'spouse' | 'child' | 'parent' | 'sibling' | 'grandparent';
  age: number;
  gender: 'male' | 'female';
  bloodGroup: string;
  profileImage: string;
  healthScore: number;
  conditions: string[];
  medications: string[];
  allergies: string[];
  lastCheckup: string;
  upcomingAppointment?: { date: string; doctor: string; type: string };
  riskAlerts: { type: string; severity: 'low' | 'medium' | 'high'; message: string }[];
  isAdmin?: boolean;
}

interface FamilyProfile {
  id: string;
  name: string;
  createdAt: string;
  members: FamilyMember[];
  sharedConditions: string[];
  emergencyContacts: { name: string; phone: string; relation: string }[];
  totalHealthScore: number;
}

// ============ MOCK DATA ============
const FAMILY_DATA: FamilyProfile = {
  id: 'F-12345',
  name: 'রহিম পরিবার',
  createdAt: '2024-01-15',
  totalHealthScore: 82,
  sharedConditions: ['ডায়াবেটিস', 'উচ্চ রক্তচাপ', 'হৃদরোগ'],
  emergencyContacts: [
    { name: 'ডা. আবুল কাশেম', phone: '01712345678', relation: 'পারিবারিক ডাক্তার' },
    { name: 'নাসির হাসপাতাল', phone: '02-9876543', relation: 'হাসপাতাল' },
  ],
  members: [
    {
      id: 'M1',
      name: 'Rahim Uddin',
      nameBn: 'রহিম উদ্দিন',
      relation: 'self',
      age: 45,
      gender: 'male',
      bloodGroup: 'A+',
      profileImage: 'https://randomuser.me/api/portraits/men/32.jpg',
      healthScore: 78,
      conditions: ['উচ্চ রক্তচাপ', 'প্রি-ডায়াবেটিক'],
      medications: ['এমলোডিপিন ৫মিগ্রা'],
      allergies: ['পেনিসিলিন'],
      lastCheckup: '২০ নভেম্বর ২০২৪',
      upcomingAppointment: { date: '১৫ ডিসেম্বর ২০২৪', doctor: 'ডা. আবুল কাশেম', type: 'ফলো-আপ' },
      riskAlerts: [
        { type: 'cardiovascular', severity: 'medium', message: 'হৃদরোগের ঝুঁকি - পারিবারিক ইতিহাস' },
        { type: 'diabetes', severity: 'high', message: 'ডায়াবেটিস ঝুঁকি - প্রি-ডায়াবেটিক অবস্থা' },
      ],
      isAdmin: true,
    },
    {
      id: 'M2',
      name: 'Fatima Rahim',
      nameBn: 'ফাতিমা রহিম',
      relation: 'spouse',
      age: 40,
      gender: 'female',
      bloodGroup: 'B+',
      profileImage: 'https://randomuser.me/api/portraits/women/44.jpg',
      healthScore: 85,
      conditions: ['থাইরয়েড'],
      medications: ['থাইরক্সিন ৫০'],
      allergies: [],
      lastCheckup: '১০ অক্টোবর ২০২৪',
      riskAlerts: [
        { type: 'thyroid', severity: 'low', message: 'থাইরয়েড নিয়মিত চেক করুন' },
      ],
    },
    {
      id: 'M3',
      name: 'Ahmed Rahim',
      nameBn: 'আহমেদ রহিম',
      relation: 'child',
      age: 18,
      gender: 'male',
      bloodGroup: 'A+',
      profileImage: 'https://randomuser.me/api/portraits/men/22.jpg',
      healthScore: 95,
      conditions: [],
      medications: [],
      allergies: ['ধুলাবালি'],
      lastCheckup: '৫ সেপ্টেম্বর ২০২৪',
      riskAlerts: [
        { type: 'genetics', severity: 'low', message: 'ডায়াবেটিস সতর্কতা - পারিবারিক ইতিহাস' },
      ],
    },
    {
      id: 'M4',
      name: 'Ayesha Rahim',
      nameBn: 'আয়েশা রহিম',
      relation: 'child',
      age: 14,
      gender: 'female',
      bloodGroup: 'B+',
      profileImage: 'https://randomuser.me/api/portraits/women/22.jpg',
      healthScore: 92,
      conditions: [],
      medications: [],
      allergies: [],
      lastCheckup: '১২ আগস্ট ২০২৪',
      riskAlerts: [],
    },
    {
      id: 'M5',
      name: 'Karim Uddin',
      nameBn: 'করিম উদ্দিন',
      relation: 'parent',
      age: 72,
      gender: 'male',
      bloodGroup: 'O+',
      profileImage: 'https://randomuser.me/api/portraits/men/75.jpg',
      healthScore: 65,
      conditions: ['ডায়াবেটিস', 'উচ্চ রক্তচাপ', 'আর্থ্রাইটিস'],
      medications: ['মেটফরমিন ৫০০', 'এমলোডিপিন ৫', 'গ্লুকোসামিন'],
      allergies: [],
      lastCheckup: '২৫ নভেম্বর ২০২৪',
      upcomingAppointment: { date: '১০ ডিসেম্বর ২০২৪', doctor: 'ডা. সালমা বেগম', type: 'রুটিন চেকআপ' },
      riskAlerts: [
        { type: 'diabetes', severity: 'high', message: 'সুগার লেভেল নিয়মিত মনিটর করুন' },
        { type: 'heart', severity: 'medium', message: 'হার্ট চেকআপ প্রয়োজন' },
      ],
    },
    {
      id: 'M6',
      name: 'Kulsum Begum',
      nameBn: 'কুলসুম বেগম',
      relation: 'parent',
      age: 68,
      gender: 'female',
      bloodGroup: 'A-',
      profileImage: 'https://randomuser.me/api/portraits/women/75.jpg',
      healthScore: 70,
      conditions: ['উচ্চ রক্তচাপ', 'অস্টিওপোরোসিস'],
      medications: ['এমলোডিপিন ৫', 'ক্যালসিয়াম ট্যাবলেট'],
      allergies: ['সালফা'],
      lastCheckup: '১৮ নভেম্বর ২০২৪',
      riskAlerts: [
        { type: 'bone', severity: 'medium', message: 'হাড়ের যত্ন নিন - পড়ে যাওয়া থেকে সাবধান' },
      ],
    },
  ],
};

// ============ COMPONENTS ============
const RelationIcon: React.FC<{ relation: string }> = ({ relation }) => {
  const icons: Record<string, { icon: string; color: string }> = {
    self: { icon: 'fa-user', color: 'text-blue-500' },
    spouse: { icon: 'fa-heart', color: 'text-pink-500' },
    child: { icon: 'fa-child', color: 'text-cyan-500' },
    parent: { icon: 'fa-user-shield', color: 'text-purple-500' },
    sibling: { icon: 'fa-users', color: 'text-orange-500' },
    grandparent: { icon: 'fa-user-clock', color: 'text-amber-500' },
  };
  const { icon, color } = icons[relation] || icons.self;
  return <i className={`fas ${icon} ${color}`}></i>;
};

const RelationLabel: React.FC<{ relation: string }> = ({ relation }) => {
  const labels: Record<string, string> = {
    self: 'নিজে',
    spouse: 'স্বামী/স্ত্রী',
    child: 'সন্তান',
    parent: 'বাবা/মা',
    sibling: 'ভাই/বোন',
    grandparent: 'দাদা/নানা',
  };
  return <span>{labels[relation] || relation}</span>;
};

const HealthScoreBadge: React.FC<{ score: number; size?: 'sm' | 'md' | 'lg' }> = ({ score, size = 'md' }) => {
  const getColor = () => {
    if (score >= 85) return 'from-green-400 to-emerald-500';
    if (score >= 70) return 'from-amber-400 to-orange-500';
    return 'from-red-400 to-rose-500';
  };
  
  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-14 h-14 text-lg',
    lg: 'w-20 h-20 text-2xl',
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${getColor()} flex items-center justify-center text-white font-bold shadow-lg`}>
      {score}
    </div>
  );
};

const RiskAlertCard: React.FC<{ alert: { type: string; severity: string; message: string } }> = ({ alert }) => {
  const severityStyles: Record<string, string> = {
    low: 'bg-blue-50 border-blue-200 text-blue-800',
    medium: 'bg-amber-50 border-amber-200 text-amber-800',
    high: 'bg-red-50 border-red-200 text-red-800',
  };
  
  const severityIcons: Record<string, string> = {
    low: 'fa-info-circle',
    medium: 'fa-exclamation-triangle',
    high: 'fa-exclamation-circle',
  };

  return (
    <div className={`p-3 rounded-xl border ${severityStyles[alert.severity]} flex items-start gap-3`}>
      <i className={`fas ${severityIcons[alert.severity]} mt-0.5`}></i>
      <p className="text-sm flex-1">{alert.message}</p>
    </div>
  );
};

// ============ MAIN COMPONENT ============
export const FamilyHealth: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';
  
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'members' | 'insights' | 'settings'>('overview');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const family = FAMILY_DATA;

  const allRiskAlerts = useMemo(() => {
    return family.members.flatMap(m => 
      m.riskAlerts.map(a => ({ ...a, memberName: m.nameBn, memberId: m.id }))
    ).sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.severity as keyof typeof order] - order[b.severity as keyof typeof order];
    });
  }, [family.members]);

  const upcomingAppointments = useMemo(() => {
    return family.members
      .filter(m => m.upcomingAppointment)
      .map(m => ({ member: m, appointment: m.upcomingAppointment! }));
  }, [family.members]);

  // ============ RENDER OVERVIEW ============
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Family Score Card */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black">{family.name}</h2>
            <p className="text-white/70 text-sm">{family.members.length} জন সদস্য</p>
          </div>
          <HealthScoreBadge score={family.totalHealthScore} size="lg" />
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'সুস্থ', value: family.members.filter(m => m.healthScore >= 85).length, icon: '💚' },
            { label: 'সতর্ক', value: family.members.filter(m => m.healthScore >= 70 && m.healthScore < 85).length, icon: '💛' },
            { label: 'যত্ন দরকার', value: family.members.filter(m => m.healthScore < 70).length, icon: '❤️' },
          ].map((stat, i) => (
            <div key={i} className="bg-white/10 rounded-xl p-3 text-center backdrop-blur">
              <span className="text-2xl">{stat.icon}</span>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
              <p className="text-xs text-white/70">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Family Members Strip */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">{isBn ? 'পরিবারের সদস্য' : 'Family Members'}</h3>
          <button 
            onClick={() => setShowInviteModal(true)}
            className="text-sm text-blue-600 font-semibold flex items-center gap-1"
          >
            <i className="fas fa-plus-circle"></i> {isBn ? 'যোগ করুন' : 'Add'}
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {family.members.map((member) => (
            <button
              key={member.id}
              onClick={() => { setSelectedMember(member); setActiveView('members'); }}
              className={`flex-shrink-0 bg-white rounded-2xl p-4 border-2 transition-all w-32 ${
                selectedMember?.id === member.id ? 'border-blue-500 shadow-lg' : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <div className="relative">
                <img src={member.profileImage} alt="" className="w-16 h-16 rounded-full mx-auto border-4 border-slate-50" />
                <div className="absolute -bottom-1 -right-1">
                  <HealthScoreBadge score={member.healthScore} size="sm" />
                </div>
              </div>
              <p className="font-bold text-slate-800 mt-3 text-sm truncate">{member.nameBn}</p>
              <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                <RelationIcon relation={member.relation} />
                <RelationLabel relation={member.relation} />
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Risk Alerts */}
      {allRiskAlerts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 bg-red-50 border-b border-red-100">
            <h3 className="font-bold text-red-800 flex items-center gap-2">
              <i className="fas fa-bell"></i> {isBn ? 'স্বাস্থ্য সতর্কতা' : 'Health Alerts'}
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{allRiskAlerts.length}</span>
            </h3>
          </div>
          <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
            {allRiskAlerts.slice(0, 5).map((alert, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  alert.severity === 'high' ? 'bg-red-100 text-red-600' :
                  alert.severity === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  <i className="fas fa-exclamation text-xs"></i>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{alert.message}</p>
                  <p className="text-xs text-slate-500">{alert.memberName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 bg-blue-50 border-b border-blue-100">
            <h3 className="font-bold text-blue-800 flex items-center gap-2">
              <i className="fas fa-calendar-check"></i> {isBn ? 'আসন্ন অ্যাপয়েন্টমেন্ট' : 'Upcoming Appointments'}
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {upcomingAppointments.map(({ member, appointment }, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <img src={member.profileImage} alt="" className="w-12 h-12 rounded-xl" />
                <div className="flex-1">
                  <p className="font-bold text-slate-800">{member.nameBn}</p>
                  <p className="text-sm text-slate-500">{appointment.doctor} • {appointment.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-blue-600">{appointment.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shared Conditions */}
      <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100">
        <h3 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
          <i className="fas fa-dna"></i> {isBn ? 'পারিবারিক স্বাস্থ্য ইতিহাস' : 'Family Health History'}
        </h3>
        <div className="flex flex-wrap gap-2">
          {family.sharedConditions.map((condition, i) => (
            <span key={i} className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
              {condition}
            </span>
          ))}
        </div>
        <p className="text-xs text-purple-600 mt-3">
          <i className="fas fa-lightbulb mr-1"></i>
          এই রোগগুলো পরিবারে দেখা গেছে। নিয়মিত চেকআপ করুন।
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/search')}
          className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl p-5 text-left shadow-lg"
        >
          <i className="fas fa-user-md text-2xl mb-3 opacity-80"></i>
          <p className="font-bold">ডাক্তার খুঁজুন</p>
          <p className="text-xs text-white/70 mt-1">পরিবারের জন্য</p>
        </button>
        <button
          onClick={() => setActiveView('insights')}
          className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-5 text-left shadow-lg"
        >
          <i className="fas fa-chart-line text-2xl mb-3 opacity-80"></i>
          <p className="font-bold">AI বিশ্লেষণ</p>
          <p className="text-xs text-white/70 mt-1">পারিবারিক স্বাস্থ্য</p>
        </button>
      </div>
    </div>
  );

  // ============ RENDER MEMBER DETAIL ============
  const renderMemberDetail = () => {
    if (!selectedMember) {
      return (
        <div className="text-center py-20">
          <i className="fas fa-users text-6xl text-slate-200 mb-4"></i>
          <p className="text-slate-500">সদস্য নির্বাচন করুন</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Member Profile Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-start gap-5">
            <div className="relative">
              <img src={selectedMember.profileImage} alt="" className="w-24 h-24 rounded-2xl" />
              <div className="absolute -bottom-2 -right-2">
                <HealthScoreBadge score={selectedMember.healthScore} size="md" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-slate-800">{selectedMember.nameBn}</h2>
                {selectedMember.isAdmin && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">অ্যাডমিন</span>
                )}
              </div>
              <p className="text-slate-500 flex items-center gap-2">
                <RelationIcon relation={selectedMember.relation} />
                <RelationLabel relation={selectedMember.relation} /> • {selectedMember.age} বছর
              </p>
              <div className="flex gap-3 mt-3">
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold">{selectedMember.bloodGroup}</span>
                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">{selectedMember.gender === 'male' ? 'পুরুষ' : 'মহিলা'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Alerts */}
        {selectedMember.riskAlerts.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800">⚠️ সতর্কতা</h3>
            {selectedMember.riskAlerts.map((alert, i) => (
              <RiskAlertCard key={i} alert={alert} />
            ))}
          </div>
        )}

        {/* Conditions */}
        {selectedMember.conditions.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <i className="fas fa-heartbeat text-red-500"></i> বর্তমান সমস্যা
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedMember.conditions.map((c, i) => (
                <span key={i} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-sm">{c}</span>
              ))}
            </div>
          </div>
        )}

        {/* Medications */}
        {selectedMember.medications.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <i className="fas fa-pills text-blue-500"></i> ওষুধ
            </h3>
            <div className="space-y-2">
              {selectedMember.medications.map((m, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                  <i className="fas fa-capsules text-blue-500"></i>
                  <span className="text-slate-700">{m}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Allergies */}
        {selectedMember.allergies.length > 0 && (
          <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
            <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
              <i className="fas fa-exclamation-triangle"></i> এলার্জি
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedMember.allergies.map((a, i) => (
                <span key={i} className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">{a}</span>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Appointment */}
        {selectedMember.upcomingAppointment && (
          <div className="bg-green-50 rounded-2xl p-5 border border-green-200">
            <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
              <i className="fas fa-calendar-check"></i> আসন্ন অ্যাপয়েন্টমেন্ট
            </h3>
            <div className="bg-white rounded-xl p-4">
              <p className="font-bold text-slate-800">{selectedMember.upcomingAppointment.doctor}</p>
              <p className="text-sm text-slate-500">{selectedMember.upcomingAppointment.type}</p>
              <p className="text-sm text-green-600 font-medium mt-2">
                <i className="fas fa-clock mr-1"></i>
                {selectedMember.upcomingAppointment.date}
              </p>
            </div>
          </div>
        )}

        {/* Last Checkup */}
        <div className="bg-slate-100 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <i className="fas fa-history text-slate-400"></i>
            <span className="text-sm text-slate-600">শেষ চেকআপ: {selectedMember.lastCheckup}</span>
          </div>
          <button 
            onClick={() => navigate('/search')}
            className="text-sm text-blue-600 font-medium"
          >
            বুক করুন →
          </button>
        </div>
      </div>
    );
  };

  // ============ RENDER INSIGHTS ============
  const renderInsights = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <i className="fas fa-brain text-xl"></i>
          </div>
          <div>
            <h2 className="font-bold text-lg">AI পারিবারিক বিশ্লেষণ</h2>
            <p className="text-white/70 text-sm">আপনার পরিবারের স্বাস্থ্য প্যাটার্ন</p>
          </div>
        </div>
      </div>

      {/* Genetic Risk Analysis */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <i className="fas fa-dna text-purple-500"></i> জেনেটিক ঝুঁকি বিশ্লেষণ
        </h3>
        <div className="space-y-4">
          {[
            { condition: 'ডায়াবেটিস', risk: 75, affected: 2, note: 'বাবা ও দাদায় ডায়াবেটিস আছে' },
            { condition: 'উচ্চ রক্তচাপ', risk: 65, affected: 3, note: 'পরিবারে সাধারণ সমস্যা' },
            { condition: 'হৃদরোগ', risk: 45, affected: 1, note: 'দাদার হৃদরোগ ছিল' },
          ].map((item, i) => (
            <div key={i} className="p-4 bg-slate-50 rounded-xl">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold text-slate-800">{item.condition}</p>
                  <p className="text-xs text-slate-500">{item.note}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                  item.risk >= 70 ? 'bg-red-100 text-red-700' :
                  item.risk >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                }`}>
                  {item.risk}% ঝুঁকি
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    item.risk >= 70 ? 'bg-red-500' :
                    item.risk >= 50 ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${item.risk}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
        <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
          <i className="fas fa-lightbulb"></i> AI সুপারিশ
        </h3>
        <div className="space-y-3">
          {[
            '৬ মাসে একবার পরিবারের সবার সুগার টেস্ট করান',
            'বাবার নিয়মিত কার্ডিয়াক চেকআপ দরকার',
            'সন্তানদের জীবনযাত্রায় স্বাস্থ্যকর অভ্যাস গড়ে তুলুন',
            'পরিবারে ডায়াবেটিস-বান্ধব খাবার রাখুন',
          ].map((rec, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-xl">
              <span className="text-blue-500">💡</span>
              <p className="text-sm text-slate-700">{rec}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============ SIDEBAR TABS ============
  const tabs = [
    { id: 'overview', icon: 'fa-home', label: 'সারসংক্ষেপ' },
    { id: 'members', icon: 'fa-users', label: 'সদস্য' },
    { id: 'insights', icon: 'fa-chart-pie', label: 'বিশ্লেষণ' },
    { id: 'settings', icon: 'fa-cog', label: 'সেটিংস' },
  ];

  // ============ MAIN LAYOUT ============
  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title={isBn ? 'পারিবারিক স্বাস্থ্য' : 'Family Health'} />

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-72 bg-white border-r border-slate-200 min-h-[calc(100vh-64px)] sticky top-16">
          <div className="p-5 border-b border-slate-100">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
              <h3 className="font-bold">{family.name}</h3>
              <p className="text-sm text-white/70">{family.members.length} সদস্য</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-3xl font-black">{family.totalHealthScore}</span>
                <span className="text-sm text-white/70">স্বাস্থ্য স্কোর</span>
              </div>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
                  activeView === tab.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <i className={`fas ${tab.icon} w-5 text-center`}></i>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 mt-auto">
            <button
              onClick={() => setShowInviteModal(true)}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-bold"
            >
              <i className="fas fa-user-plus mr-2"></i>
              সদস্য যোগ করুন
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8">
          <div className="max-w-4xl mx-auto">
            {activeView === 'overview' && renderOverview()}
            {activeView === 'members' && renderMemberDetail()}
            {activeView === 'insights' && renderInsights()}
            {activeView === 'settings' && (
              <div className="text-center py-20">
                <i className="fas fa-cog text-6xl text-slate-200 mb-4"></i>
                <p className="text-slate-500">সেটিংস শীঘ্রই আসছে</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`flex-1 py-3 flex flex-col items-center gap-1 ${
                activeView === tab.id ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              <i className={`fas ${tab.icon}`}></i>
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg">পরিবারে যোগ করুন</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ফোন নম্বর</label>
                <input type="tel" placeholder="০১XXXXXXXXX" className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">সম্পর্ক</label>
                <select className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">নির্বাচন করুন</option>
                  <option value="spouse">স্বামী/স্ত্রী</option>
                  <option value="child">সন্তান</option>
                  <option value="parent">বাবা/মা</option>
                  <option value="sibling">ভাই/বোন</option>
                </select>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
                <i className="fas fa-info-circle mr-2"></i>
                সদস্যকে SMS এ আমন্ত্রণ পাঠানো হবে
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowInviteModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl font-medium">বাতিল</button>
              <button className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium">আমন্ত্রণ পাঠান</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyHealth;

