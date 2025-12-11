import React, { useState, useMemo, useCallback } from 'react';

// ============ TYPES ============
export interface FamilyMember {
  id: string;
  name: string;
  nameBn?: string;
  relation: 'self' | 'spouse' | 'child' | 'parent' | 'sibling' | 'grandparent' | 'other';
  relationLabel: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female';
  bloodGroup?: string;
  phone?: string;
  image?: string;
  
  // Health Info
  heightCm?: number;
  weightKg?: number;
  chronicConditions?: string[];
  allergies?: string[];
  currentMedications?: string[];
  
  // Permissions
  canBook?: boolean;
  canViewRecords?: boolean;
  isAdmin?: boolean;
  
  // Stats
  healthScore?: number;
  lastCheckup?: string;
  upcomingAppointments?: number;
  medicationsCount?: number;
}

interface UpcomingAppointment {
  id: string;
  memberId: string;
  memberName: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
}

interface FamilyHealthProps {
  members: FamilyMember[];
  upcomingAppointments?: UpcomingAppointment[];
  onSelectMember?: (member: FamilyMember) => void;
  onAddMember?: () => void;
  onBookAppointment?: (memberId: string) => void;
  onViewRecords?: (memberId: string) => void;
  onEditMember?: (member: FamilyMember) => void;
  onInviteMember?: () => void;
}

// ============ RELATION CONFIG ============
const RELATION_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  self: { icon: '👤', color: 'text-blue-600', bg: 'bg-blue-100' },
  spouse: { icon: '💑', color: 'text-pink-600', bg: 'bg-pink-100' },
  child: { icon: '👶', color: 'text-green-600', bg: 'bg-green-100' },
  parent: { icon: '👴', color: 'text-amber-600', bg: 'bg-amber-100' },
  sibling: { icon: '👫', color: 'text-purple-600', bg: 'bg-purple-100' },
  grandparent: { icon: '👵', color: 'text-orange-600', bg: 'bg-orange-100' },
  other: { icon: '👥', color: 'text-slate-600', bg: 'bg-slate-100' },
};

// ============ FAMILY HEALTH COMPONENT ============
export const FamilyHealth: React.FC<FamilyHealthProps> = ({
  members,
  upcomingAppointments = [],
  onSelectMember,
  onAddMember,
  onBookAppointment,
  onViewRecords,
  onEditMember,
  onInviteMember,
}) => {
  // State
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'calendar' | 'medications'>('overview');

  // Calculate age
  const getAge = (dateOfBirth: string) => {
    const birth = new Date(dateOfBirth);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Get selected member
  const selectedMember = useMemo(() => 
    members.find(m => m.id === selectedMemberId),
    [members, selectedMemberId]
  );

  // Calculate family stats
  const familyStats = useMemo(() => {
    const totalMembers = members.length;
    const avgHealthScore = members.reduce((sum, m) => sum + (m.healthScore || 0), 0) / totalMembers || 0;
    const upcomingCount = upcomingAppointments.length;
    const medicationsTotal = members.reduce((sum, m) => sum + (m.medicationsCount || 0), 0);
    const needsCheckup = members.filter(m => {
      if (!m.lastCheckup) return true;
      const lastDate = new Date(m.lastCheckup);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return lastDate < sixMonthsAgo;
    }).length;

    return {
      totalMembers,
      avgHealthScore: avgHealthScore.toFixed(0),
      upcomingCount,
      medicationsTotal,
      needsCheckup,
    };
  }, [members, upcomingAppointments]);

  // Get health score color
  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('bn-BD', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Handle member select
  const handleMemberSelect = useCallback((member: FamilyMember) => {
    setSelectedMemberId(member.id);
    if (onSelectMember) {
      onSelectMember(member);
    }
  }, [onSelectMember]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">👨‍👩‍👧‍👦 পরিবারের স্বাস্থ্য</h2>
          <p className="text-slate-500">আপনার পরিবারের সকলের স্বাস্থ্য এক নজরে</p>
        </div>
        <div className="flex gap-2">
          {onInviteMember && (
            <button
              onClick={onInviteMember}
              className="px-4 py-2 glass-subtle text-slate-600 rounded-lg hover:bg-slate-100 transition flex items-center gap-2"
            >
              <span>📲</span>
              <span>আমন্ত্রণ পাঠান</span>
            </button>
          )}
          {onAddMember && (
            <button
              onClick={onAddMember}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
            >
              <span>+</span>
              <span>সদস্য যোগ করুন</span>
            </button>
          )}
        </div>
      </div>

      {/* Family Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-slate-700">{familyStats.totalMembers}</div>
          <div className="text-sm text-slate-500">সদস্য</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-green-400">
          <div className={`text-3xl font-bold ${getHealthScoreColor(parseInt(familyStats.avgHealthScore))}`}>
            {familyStats.avgHealthScore}
          </div>
          <div className="text-sm text-slate-500">গড় স্বাস্থ্য স্কোর</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-blue-400">
          <div className="text-3xl font-bold text-blue-600">{familyStats.upcomingCount}</div>
          <div className="text-sm text-slate-500">আসন্ন অ্যাপয়েন্টমেন্ট</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-purple-400">
          <div className="text-3xl font-bold text-purple-600">{familyStats.medicationsTotal}</div>
          <div className="text-sm text-slate-500">চলমান ওষুধ</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-amber-400">
          <div className="text-3xl font-bold text-amber-600">{familyStats.needsCheckup}</div>
          <div className="text-sm text-slate-500">চেকআপ প্রয়োজন</div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'overview', label: 'ওভারভিউ', icon: '👥' },
          { id: 'calendar', label: 'ক্যালেন্ডার', icon: '📅' },
          { id: 'medications', label: 'ওষুধ', icon: '💊' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id as any)}
            className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
              viewMode === tab.id
                ? 'bg-blue-500 text-white'
                : 'glass-subtle text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(member => {
            const config = RELATION_CONFIG[member.relation] || RELATION_CONFIG.other;
            const age = getAge(member.dateOfBirth);
            const isSelected = selectedMemberId === member.id;

            return (
              <div
                key={member.id}
                className={`glass-card p-4 cursor-pointer transition hover:shadow-lg ${
                  isSelected ? 'ring-2 ring-blue-400' : ''
                }`}
                onClick={() => handleMemberSelect(member)}
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="relative">
                    <img
                      src={member.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=${member.gender === 'Male' ? '3b82f6' : 'ec4899'}&color=fff&size=200`}
                      alt={member.name}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                    <span className={`absolute -bottom-1 -right-1 w-6 h-6 ${config.bg} rounded-full flex items-center justify-center text-sm`}>
                      {config.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">{member.nameBn || member.name}</h3>
                    <p className={`text-sm ${config.color}`}>{member.relationLabel}</p>
                    <p className="text-xs text-slate-500">
                      {age} বছর • {member.gender === 'Male' ? 'পুরুষ' : 'মহিলা'}
                      {member.bloodGroup && ` • ${member.bloodGroup}`}
                    </p>
                  </div>
                </div>

                {/* Health Score */}
                {member.healthScore !== undefined && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-500">স্বাস্থ্য স্কোর</span>
                      <span className={`font-bold ${getHealthScoreColor(member.healthScore)}`}>
                        {member.healthScore}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          member.healthScore >= 80 ? 'bg-green-500' :
                          member.healthScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${member.healthScore}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                  <div className="p-2 glass-subtle rounded-lg">
                    <div className="text-lg font-bold text-slate-700">
                      {member.upcomingAppointments || 0}
                    </div>
                    <div className="text-xs text-slate-500">অ্যাপয়েন্টমেন্ট</div>
                  </div>
                  <div className="p-2 glass-subtle rounded-lg">
                    <div className="text-lg font-bold text-slate-700">
                      {member.medicationsCount || 0}
                    </div>
                    <div className="text-xs text-slate-500">ওষুধ</div>
                  </div>
                  <div className="p-2 glass-subtle rounded-lg">
                    <div className="text-lg font-bold text-slate-700">
                      {member.chronicConditions?.length || 0}
                    </div>
                    <div className="text-xs text-slate-500">রোগ</div>
                  </div>
                </div>

                {/* Conditions */}
                {member.chronicConditions && member.chronicConditions.length > 0 && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-1">
                      {member.chronicConditions.slice(0, 3).map((condition, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                          {condition}
                        </span>
                      ))}
                      {member.chronicConditions.length > 3 && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                          +{member.chronicConditions.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Last Checkup Alert */}
                {member.lastCheckup && (
                  <div className="text-xs text-slate-500 mb-3">
                    শেষ চেকআপ: {formatDate(member.lastCheckup)}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  {onBookAppointment && member.canBook !== false && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onBookAppointment(member.id);
                      }}
                      className="flex-1 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition"
                    >
                      📅 বুকিং
                    </button>
                  )}
                  {onViewRecords && member.canViewRecords !== false && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewRecords(member.id);
                      }}
                      className="flex-1 py-2 glass-subtle text-slate-600 text-sm rounded-lg hover:bg-slate-100 transition"
                    >
                      📋 রেকর্ড
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add Member Card */}
          {onAddMember && (
            <div
              className="glass-card p-4 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center min-h-[250px] cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition"
              onClick={onAddMember}
            >
              <div className="text-4xl mb-2">➕</div>
              <div className="font-medium text-slate-600">সদস্য যোগ করুন</div>
              <div className="text-sm text-slate-400">পরিবারের নতুন সদস্য</div>
            </div>
          )}
        </div>
      )}

      {viewMode === 'calendar' && (
        <div className="glass-card p-6">
          <h3 className="font-semibold text-slate-700 mb-4">📅 আসন্ন অ্যাপয়েন্টমেন্ট</h3>
          
          {upcomingAppointments.length > 0 ? (
            <div className="space-y-3">
              {upcomingAppointments.map(apt => {
                const member = members.find(m => m.id === apt.memberId);
                const config = member ? RELATION_CONFIG[member.relation] || RELATION_CONFIG.other : RELATION_CONFIG.other;

                return (
                  <div key={apt.id} className="flex items-center gap-4 p-4 glass-subtle rounded-xl">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {new Date(apt.date).getDate()}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(apt.date).toLocaleDateString('bn-BD', { month: 'short' })}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 ${config.bg} ${config.color} rounded text-xs`}>
                          {apt.memberName}
                        </span>
                      </div>
                      <div className="font-medium text-slate-800">{apt.doctorName}</div>
                      <div className="text-sm text-slate-500">{apt.specialty}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-slate-700">{apt.time}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <div className="text-4xl mb-2">📅</div>
              <p>কোনো আসন্ন অ্যাপয়েন্টমেন্ট নেই</p>
            </div>
          )}
        </div>
      )}

      {viewMode === 'medications' && (
        <div className="glass-card p-6">
          <h3 className="font-semibold text-slate-700 mb-4">💊 পরিবারের ওষুধ তালিকা</h3>
          
          <div className="space-y-4">
            {members.filter(m => m.currentMedications && m.currentMedications.length > 0).map(member => {
              const config = RELATION_CONFIG[member.relation] || RELATION_CONFIG.other;

              return (
                <div key={member.id} className="p-4 glass-subtle rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 ${config.bg} ${config.color} rounded-full text-sm`}>
                      {config.icon} {member.nameBn || member.name}
                    </span>
                    <span className="text-sm text-slate-500">{member.relationLabel}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {member.currentMedications?.map((med, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700">
                        💊 {med}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}

            {members.filter(m => m.currentMedications && m.currentMedications.length > 0).length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <div className="text-4xl mb-2">💊</div>
                <p>কোনো চলমান ওষুধ নেই</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Member Detail Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-strong rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className={`p-6 ${RELATION_CONFIG[selectedMember.relation]?.bg || 'bg-slate-100'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedMember.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedMember.name)}&background=fff&color=333&size=200`}
                    alt={selectedMember.name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow"
                  />
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">{selectedMember.nameBn || selectedMember.name}</h2>
                    <p className={`${RELATION_CONFIG[selectedMember.relation]?.color || 'text-slate-600'}`}>
                      {selectedMember.relationLabel}
                    </p>
                    <p className="text-sm text-slate-600">
                      {getAge(selectedMember.dateOfBirth)} বছর • {selectedMember.gender === 'Male' ? 'পুরুষ' : 'মহিলা'}
                      {selectedMember.bloodGroup && ` • ${selectedMember.bloodGroup}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMemberId(null)}
                  className="p-2 hover:bg-white/50 rounded-full transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-4">
              {/* Health Score */}
              {selectedMember.healthScore !== undefined && (
                <div className="glass-subtle p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-700">স্বাস্থ্য স্কোর</span>
                    <span className={`text-2xl font-bold ${getHealthScoreColor(selectedMember.healthScore)}`}>
                      {selectedMember.healthScore}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        selectedMember.healthScore >= 80 ? 'bg-green-500' :
                        selectedMember.healthScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${selectedMember.healthScore}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Conditions */}
              {selectedMember.chronicConditions && selectedMember.chronicConditions.length > 0 && (
                <div className="glass-subtle p-4 rounded-xl">
                  <h4 className="font-medium text-slate-700 mb-2">🩺 দীর্ঘস্থায়ী রোগ</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMember.chronicConditions.map((condition, idx) => (
                      <span key={idx} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                        {condition}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Allergies */}
              {selectedMember.allergies && selectedMember.allergies.length > 0 && (
                <div className="glass-subtle p-4 rounded-xl">
                  <h4 className="font-medium text-slate-700 mb-2">⚠️ এলার্জি</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMember.allergies.map((allergy, idx) => (
                      <span key={idx} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                        {allergy}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Medications */}
              {selectedMember.currentMedications && selectedMember.currentMedications.length > 0 && (
                <div className="glass-subtle p-4 rounded-xl">
                  <h4 className="font-medium text-slate-700 mb-2">💊 বর্তমান ওষুধ</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMember.currentMedications.map((med, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {med}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-200 flex gap-2">
              {onBookAppointment && (
                <button
                  onClick={() => {
                    setSelectedMemberId(null);
                    onBookAppointment(selectedMember.id);
                  }}
                  className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  📅 অ্যাপয়েন্টমেন্ট বুক করুন
                </button>
              )}
              {onViewRecords && (
                <button
                  onClick={() => {
                    setSelectedMemberId(null);
                    onViewRecords(selectedMember.id);
                  }}
                  className="flex-1 py-2 glass-subtle text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  📋 রেকর্ড দেখুন
                </button>
              )}
              {onEditMember && (
                <button
                  onClick={() => {
                    setSelectedMemberId(null);
                    onEditMember(selectedMember);
                  }}
                  className="px-4 py-2 glass-subtle text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  ✏️
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyHealth;

