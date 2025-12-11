import React, { useState, useMemo, useCallback } from 'react';

// ============ TYPES ============
export interface PatientRecord {
  id: string;
  name: string;
  nameBn: string;
  age: number;
  gender: 'Male' | 'Female';
  phone: string;
  bloodGroup: string;
  profileImage: string;
  lastVisit: string;
  totalVisits: number;
  diagnosis: string;
  diagnosisBn: string;
  riskLevel: 'High' | 'Medium' | 'Low';
  conditions: string[];
  medications: string[];
  allergies: string[];
  familyHistory: { condition: string; relation: string }[];
  vitals: { date: string; bp: string; hr: number; weight: number; temp?: number }[];
  consultations: { date: string; diagnosis: string; notes: string; prescription: any[] }[];
  aiSummary?: string;
  tags?: string[];
  notes?: string;
  isVIP?: boolean;
  needsFollowUp?: boolean;
  lastPrescription?: string;
}

interface PatientManagerProps {
  patients: PatientRecord[];
  onSelectPatient: (patient: PatientRecord) => void;
  onUpdatePatient?: (patient: PatientRecord) => void;
}

type SortField = 'name' | 'lastVisit' | 'totalVisits' | 'riskLevel' | 'age';
type SortOrder = 'asc' | 'desc';
type FilterRisk = 'All' | 'High' | 'Medium' | 'Low';
type ViewMode = 'grid' | 'list';

// ============ PATIENT MANAGER COMPONENT ============
export const PatientManager: React.FC<PatientManagerProps> = ({
  patients,
  onSelectPatient,
  onUpdatePatient
}) => {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<FilterRisk>('All');
  const [filterCondition, setFilterCondition] = useState<string>('All');
  const [filterTag, setFilterTag] = useState<string>('All');
  const [sortField, setSortField] = useState<SortField>('lastVisit');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [showPatientDetail, setShowPatientDetail] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  // Get unique conditions from all patients
  const allConditions = useMemo(() => {
    const conditions = new Set<string>();
    patients.forEach(p => p.conditions.forEach(c => conditions.add(c)));
    return ['All', ...Array.from(conditions).sort()];
  }, [patients]);

  // Get unique tags from all patients
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    patients.forEach(p => p.tags?.forEach(t => tags.add(t)));
    return ['All', ...Array.from(tags).sort()];
  }, [patients]);

  // Filter and sort patients
  const filteredPatients = useMemo(() => {
    let result = [...patients];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.nameBn.includes(query) ||
        p.phone.includes(query) ||
        p.diagnosis.toLowerCase().includes(query) ||
        p.diagnosisBn.includes(query)
      );
    }

    // Risk filter
    if (filterRisk !== 'All') {
      result = result.filter(p => p.riskLevel === filterRisk);
    }

    // Condition filter
    if (filterCondition !== 'All') {
      result = result.filter(p => p.conditions.includes(filterCondition));
    }

    // Tag filter
    if (filterTag !== 'All') {
      result = result.filter(p => p.tags?.includes(filterTag));
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'lastVisit':
          comparison = new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime();
          break;
        case 'totalVisits':
          comparison = b.totalVisits - a.totalVisits;
          break;
        case 'age':
          comparison = a.age - b.age;
          break;
        case 'riskLevel':
          const riskOrder = { High: 3, Medium: 2, Low: 1 };
          comparison = riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
          break;
      }
      return sortOrder === 'asc' ? -comparison : comparison;
    });

    return result;
  }, [patients, searchQuery, filterRisk, filterCondition, filterTag, sortField, sortOrder]);

  // Get selected patient
  const selectedPatient = useMemo(() => 
    patients.find(p => p.id === selectedPatientId),
    [patients, selectedPatientId]
  );

  // Calculate stats
  const stats = useMemo(() => ({
    total: patients.length,
    highRisk: patients.filter(p => p.riskLevel === 'High').length,
    needsFollowUp: patients.filter(p => p.needsFollowUp).length,
    vip: patients.filter(p => p.isVIP).length,
    newThisMonth: patients.filter(p => {
      const visitDate = new Date(p.lastVisit);
      const now = new Date();
      return visitDate.getMonth() === now.getMonth() && 
             visitDate.getFullYear() === now.getFullYear() &&
             p.totalVisits === 1;
    }).length
  }), [patients]);

  // Handle patient click
  const handlePatientClick = useCallback((patient: PatientRecord) => {
    setSelectedPatientId(patient.id);
    setShowPatientDetail(true);
  }, []);

  // Handle start consultation
  const handleStartConsultation = useCallback((patient: PatientRecord) => {
    onSelectPatient(patient);
  }, [onSelectPatient]);

  // Handle toggle VIP
  const handleToggleVIP = useCallback((patient: PatientRecord) => {
    if (onUpdatePatient) {
      onUpdatePatient({ ...patient, isVIP: !patient.isVIP });
    }
  }, [onUpdatePatient]);

  // Handle toggle follow-up
  const handleToggleFollowUp = useCallback((patient: PatientRecord) => {
    if (onUpdatePatient) {
      onUpdatePatient({ ...patient, needsFollowUp: !patient.needsFollowUp });
    }
  }, [onUpdatePatient]);

  // Handle add note
  const handleSaveNote = useCallback((patient: PatientRecord) => {
    if (onUpdatePatient && noteText.trim()) {
      onUpdatePatient({ ...patient, notes: noteText.trim() });
      setEditingNotes(null);
      setNoteText('');
    }
  }, [onUpdatePatient, noteText]);

  // Handle add tag
  const handleAddTag = useCallback((patient: PatientRecord, tag: string) => {
    if (onUpdatePatient && tag.trim()) {
      const newTags = [...(patient.tags || []), tag.trim()];
      onUpdatePatient({ ...patient, tags: newTags });
    }
  }, [onUpdatePatient]);

  // Risk level badge color
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'High': return 'bg-red-100 text-red-700 border-red-200';
      case 'Medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'আজ';
    if (diffDays === 1) return 'গতকাল';
    if (diffDays < 7) return `${diffDays} দিন আগে`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} সপ্তাহ আগে`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} মাস আগে`;
    return date.toLocaleDateString('bn-BD');
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-slate-700">{stats.total}</div>
          <div className="text-sm text-slate-500">মোট রোগী</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-red-400">
          <div className="text-3xl font-bold text-red-600">{stats.highRisk}</div>
          <div className="text-sm text-slate-500">উচ্চ ঝুঁকি</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-amber-400">
          <div className="text-3xl font-bold text-amber-600">{stats.needsFollowUp}</div>
          <div className="text-sm text-slate-500">ফলো-আপ দরকার</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-purple-400">
          <div className="text-3xl font-bold text-purple-600">{stats.vip}</div>
          <div className="text-sm text-slate-500">VIP রোগী</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-blue-400">
          <div className="text-3xl font-bold text-blue-600">{stats.newThisMonth}</div>
          <div className="text-sm text-slate-500">এই মাসে নতুন</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="রোগী খুঁজুন... (নাম, ফোন, রোগ)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 glass-subtle rounded-xl border-0 focus:ring-2 focus:ring-blue-300 text-slate-700"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {/* Risk Filter */}
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value as FilterRisk)}
              className="px-4 py-2 glass-subtle rounded-lg border-0 text-sm text-slate-600"
            >
              <option value="All">সব ঝুঁকি</option>
              <option value="High">উচ্চ ঝুঁকি</option>
              <option value="Medium">মাঝারি ঝুঁকি</option>
              <option value="Low">কম ঝুঁকি</option>
            </select>

            {/* Condition Filter */}
            <select
              value={filterCondition}
              onChange={(e) => setFilterCondition(e.target.value)}
              className="px-4 py-2 glass-subtle rounded-lg border-0 text-sm text-slate-600"
            >
              {allConditions.map(c => (
                <option key={c} value={c}>{c === 'All' ? 'সব রোগ' : c}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortField(field as SortField);
                setSortOrder(order as SortOrder);
              }}
              className="px-4 py-2 glass-subtle rounded-lg border-0 text-sm text-slate-600"
            >
              <option value="lastVisit-desc">সাম্প্রতিক ভিজিট</option>
              <option value="lastVisit-asc">পুরনো ভিজিট</option>
              <option value="name-asc">নাম (A-Z)</option>
              <option value="name-desc">নাম (Z-A)</option>
              <option value="totalVisits-desc">সবচেয়ে বেশি ভিজিট</option>
              <option value="riskLevel-desc">ঝুঁকি অনুসারে</option>
              <option value="age-asc">বয়স (কম)</option>
              <option value="age-desc">বয়স (বেশি)</option>
            </select>

            {/* View Toggle */}
            <div className="flex glass-subtle rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-slate-600'}`}
              >
                ▦
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-slate-600'}`}
              >
                ☰
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters */}
        {(filterRisk !== 'All' || filterCondition !== 'All' || searchQuery) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {searchQuery && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1">
                🔍 "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-blue-900">×</button>
              </span>
            )}
            {filterRisk !== 'All' && (
              <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${getRiskColor(filterRisk)}`}>
                {filterRisk} ঝুঁকি
                <button onClick={() => setFilterRisk('All')} className="ml-1">×</button>
              </span>
            )}
            {filterCondition !== 'All' && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-1">
                {filterCondition}
                <button onClick={() => setFilterCondition('All')} className="ml-1">×</button>
              </span>
            )}
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterRisk('All');
                setFilterCondition('All');
                setFilterTag('All');
              }}
              className="px-3 py-1 text-slate-500 hover:text-slate-700 text-sm"
            >
              সব ফিল্টার মুছুন
            </button>
          </div>
        )}

        <div className="mt-2 text-sm text-slate-500">
          {filteredPatients.length} জন রোগী পাওয়া গেছে
        </div>
      </div>

      {/* Patient List/Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map(patient => (
            <div
              key={patient.id}
              className="glass-card p-4 cursor-pointer hover:shadow-lg transition group"
              onClick={() => handlePatientClick(patient)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={patient.profileImage}
                      alt={patient.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {patient.isVIP && (
                      <span className="absolute -top-1 -right-1 text-sm">⭐</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{patient.nameBn}</h3>
                    <p className="text-sm text-slate-500">{patient.name}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRiskColor(patient.riskLevel)}`}>
                  {patient.riskLevel === 'High' ? 'উচ্চ' : patient.riskLevel === 'Medium' ? 'মাঝারি' : 'কম'}
                </span>
              </div>

              {/* Info */}
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div className="text-slate-600">
                  <span className="text-slate-400">বয়স:</span> {patient.age} বছর
                </div>
                <div className="text-slate-600">
                  <span className="text-slate-400">রক্ত:</span> {patient.bloodGroup}
                </div>
                <div className="text-slate-600">
                  <span className="text-slate-400">ভিজিট:</span> {patient.totalVisits} বার
                </div>
                <div className="text-slate-600">
                  <span className="text-slate-400">শেষ:</span> {formatDate(patient.lastVisit)}
                </div>
              </div>

              {/* Diagnosis */}
              <div className="mb-3">
                <div className="text-xs text-slate-400 mb-1">রোগ নির্ণয়:</div>
                <div className="text-sm font-medium text-slate-700">{patient.diagnosisBn}</div>
              </div>

              {/* Conditions Tags */}
              {patient.conditions.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {patient.conditions.slice(0, 3).map((condition, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                      {condition}
                    </span>
                  ))}
                  {patient.conditions.length > 3 && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                      +{patient.conditions.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Tags */}
              {patient.tags && patient.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {patient.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Alerts */}
              <div className="flex items-center gap-2">
                {patient.needsFollowUp && (
                  <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-full text-xs flex items-center gap-1">
                    🔔 ফলো-আপ
                  </span>
                )}
                {patient.allergies.length > 0 && (
                  <span className="px-2 py-1 bg-red-50 text-red-600 rounded-full text-xs flex items-center gap-1">
                    ⚠️ এলার্জি
                  </span>
                )}
              </div>

              {/* Quick Actions (visible on hover) */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartConsultation(patient);
                  }}
                  className="flex-1 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition"
                >
                  👨‍⚕️ কনসাল্ট
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleVIP(patient);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm transition ${
                    patient.isVIP 
                      ? 'bg-yellow-100 text-yellow-700' 
                      : 'bg-slate-100 text-slate-600 hover:bg-yellow-50'
                  }`}
                >
                  ⭐
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFollowUp(patient);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm transition ${
                    patient.needsFollowUp 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'bg-slate-100 text-slate-600 hover:bg-amber-50'
                  }`}
                >
                  🔔
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List View
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">রোগী</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">বয়স/লিঙ্গ</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">রোগ</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">ঝুঁকি</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">ভিজিট</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">শেষ ভিজিট</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.map(patient => (
                  <tr 
                    key={patient.id} 
                    className="hover:bg-blue-50/30 cursor-pointer transition"
                    onClick={() => handlePatientClick(patient)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={patient.profileImage}
                            alt={patient.name}
                            className="w-10 h-10 rounded-full"
                          />
                          {patient.isVIP && (
                            <span className="absolute -top-1 -right-1 text-xs">⭐</span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{patient.nameBn}</div>
                          <div className="text-xs text-slate-500">{patient.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {patient.age} বছর, {patient.gender === 'Male' ? 'পুরুষ' : 'মহিলা'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-700">{patient.diagnosisBn}</div>
                      {patient.conditions.length > 0 && (
                        <div className="text-xs text-slate-500 mt-1">
                          {patient.conditions.slice(0, 2).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRiskColor(patient.riskLevel)}`}>
                        {patient.riskLevel === 'High' ? 'উচ্চ' : patient.riskLevel === 'Medium' ? 'মাঝারি' : 'কম'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {patient.totalVisits} বার
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {formatDate(patient.lastVisit)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartConsultation(patient);
                          }}
                          className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600"
                        >
                          কনসাল্ট
                        </button>
                        {patient.needsFollowUp && (
                          <span className="text-amber-500">🔔</span>
                        )}
                        {patient.allergies.length > 0 && (
                          <span className="text-red-500">⚠️</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredPatients.length === 0 && (
        <div className="glass-card p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">কোনো রোগী পাওয়া যায়নি</h3>
          <p className="text-slate-500">আপনার সার্চ বা ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন</p>
        </div>
      )}

      {/* Patient Detail Modal */}
      {showPatientDetail && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-strong rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={selectedPatient.profileImage}
                    alt={selectedPatient.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  {selectedPatient.isVIP && (
                    <span className="absolute -top-1 -right-1 text-xl">⭐</span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{selectedPatient.nameBn}</h2>
                  <p className="text-slate-500">{selectedPatient.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                    <span>{selectedPatient.age} বছর</span>
                    <span>•</span>
                    <span>{selectedPatient.gender === 'Male' ? 'পুরুষ' : 'মহিলা'}</span>
                    <span>•</span>
                    <span>{selectedPatient.bloodGroup}</span>
                    <span>•</span>
                    <span>📞 {selectedPatient.phone}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowPatientDetail(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Risk & Conditions */}
                  <div className="glass-subtle p-4 rounded-xl">
                    <h3 className="font-semibold text-slate-700 mb-3">ঝুঁকি ও রোগের অবস্থা</h3>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${getRiskColor(selectedPatient.riskLevel)}`}>
                        {selectedPatient.riskLevel === 'High' ? '🔴 উচ্চ ঝুঁকি' : selectedPatient.riskLevel === 'Medium' ? '🟡 মাঝারি ঝুঁকি' : '🟢 কম ঝুঁকি'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedPatient.conditions.map((condition, idx) => (
                        <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                          {condition}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Current Medications */}
                  <div className="glass-subtle p-4 rounded-xl">
                    <h3 className="font-semibold text-slate-700 mb-3">💊 বর্তমান ওষুধ</h3>
                    {selectedPatient.medications.length > 0 ? (
                      <ul className="space-y-2">
                        {selectedPatient.medications.map((med, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-slate-600">
                            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                            {med}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-500">কোনো ওষুধ নেই</p>
                    )}
                  </div>

                  {/* Allergies */}
                  <div className="glass-subtle p-4 rounded-xl">
                    <h3 className="font-semibold text-slate-700 mb-3">⚠️ এলার্জি</h3>
                    {selectedPatient.allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedPatient.allergies.map((allergy, idx) => (
                          <span key={idx} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                            {allergy}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500">কোনো জানা এলার্জি নেই</p>
                    )}
                  </div>

                  {/* Family History */}
                  <div className="glass-subtle p-4 rounded-xl">
                    <h3 className="font-semibold text-slate-700 mb-3">👨‍👩‍👧‍👦 পারিবারিক ইতিহাস</h3>
                    {selectedPatient.familyHistory.length > 0 ? (
                      <ul className="space-y-2">
                        {selectedPatient.familyHistory.map((fh, idx) => (
                          <li key={idx} className="flex items-center justify-between text-slate-600">
                            <span>{fh.condition}</span>
                            <span className="text-sm text-slate-400">({fh.relation})</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-500">কোনো তথ্য নেই</p>
                    )}
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Latest Vitals */}
                  <div className="glass-subtle p-4 rounded-xl">
                    <h3 className="font-semibold text-slate-700 mb-3">📊 সর্বশেষ ভাইটাল</h3>
                    {selectedPatient.vitals.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-white/50 rounded-lg">
                          <div className="text-2xl font-bold text-red-600">{selectedPatient.vitals[0].bp}</div>
                          <div className="text-xs text-slate-500">রক্তচাপ</div>
                        </div>
                        <div className="text-center p-3 bg-white/50 rounded-lg">
                          <div className="text-2xl font-bold text-pink-600">{selectedPatient.vitals[0].hr}</div>
                          <div className="text-xs text-slate-500">হার্ট রেট</div>
                        </div>
                        <div className="text-center p-3 bg-white/50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{selectedPatient.vitals[0].weight} kg</div>
                          <div className="text-xs text-slate-500">ওজন</div>
                        </div>
                        <div className="text-center p-3 bg-white/50 rounded-lg">
                          <div className="text-2xl font-bold text-amber-600">{selectedPatient.vitals[0].temp || '-'}°F</div>
                          <div className="text-xs text-slate-500">তাপমাত্রা</div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-500">কোনো ভাইটাল নেই</p>
                    )}
                  </div>

                  {/* Visit History Summary */}
                  <div className="glass-subtle p-4 rounded-xl">
                    <h3 className="font-semibold text-slate-700 mb-3">📋 ভিজিটের সারাংশ</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">মোট ভিজিট</span>
                        <span className="font-bold text-slate-800">{selectedPatient.totalVisits} বার</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">প্রথম ভিজিট</span>
                        <span className="text-slate-700">-</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">শেষ ভিজিট</span>
                        <span className="text-slate-700">{formatDate(selectedPatient.lastVisit)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Doctor's Notes */}
                  <div className="glass-subtle p-4 rounded-xl">
                    <h3 className="font-semibold text-slate-700 mb-3">📝 ডাক্তারের নোট</h3>
                    {editingNotes === selectedPatient.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="এখানে নোট লিখুন..."
                          className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveNote(selectedPatient)}
                            className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg"
                          >
                            সেভ করুন
                          </button>
                          <button
                            onClick={() => {
                              setEditingNotes(null);
                              setNoteText('');
                            }}
                            className="px-4 py-2 bg-slate-100 text-slate-600 text-sm rounded-lg"
                          >
                            বাতিল
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {selectedPatient.notes ? (
                          <p className="text-slate-600 mb-2">{selectedPatient.notes}</p>
                        ) : (
                          <p className="text-slate-400 mb-2">কোনো নোট নেই</p>
                        )}
                        <button
                          onClick={() => {
                            setEditingNotes(selectedPatient.id);
                            setNoteText(selectedPatient.notes || '');
                          }}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          + নোট যোগ করুন
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="glass-subtle p-4 rounded-xl">
                    <h3 className="font-semibold text-slate-700 mb-3">🏷️ ট্যাগ</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedPatient.tags?.map((tag, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          #{tag}
                        </span>
                      ))}
                      <button
                        onClick={() => {
                          const tag = prompt('নতুন ট্যাগ লিখুন:');
                          if (tag) handleAddTag(selectedPatient, tag);
                        }}
                        className="px-3 py-1 border-2 border-dashed border-slate-300 text-slate-500 rounded-full text-sm hover:border-blue-400 hover:text-blue-600"
                      >
                        + ট্যাগ
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Summary */}
              {selectedPatient.aiSummary && (
                <div className="mt-6 glass-card p-4 border-l-4 border-purple-400">
                  <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    🤖 AI সারাংশ
                  </h3>
                  <p className="text-slate-600">{selectedPatient.aiSummary}</p>
                </div>
              )}

              {/* Recent Consultations */}
              <div className="mt-6">
                <h3 className="font-semibold text-slate-700 mb-3">🩺 সাম্প্রতিক কনসাল্টেশন</h3>
                {selectedPatient.consultations.length > 0 ? (
                  <div className="space-y-3">
                    {selectedPatient.consultations.slice(0, 5).map((consult, idx) => (
                      <div key={idx} className="glass-subtle p-4 rounded-xl">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-slate-700">{consult.diagnosis}</span>
                          <span className="text-sm text-slate-500">{new Date(consult.date).toLocaleDateString('bn-BD')}</span>
                        </div>
                        <p className="text-sm text-slate-600">{consult.notes}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 glass-subtle p-4 rounded-xl">কোনো কনসাল্টেশন নেই</p>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-200 flex justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleVIP(selectedPatient)}
                  className={`px-4 py-2 rounded-lg text-sm transition ${
                    selectedPatient.isVIP 
                      ? 'bg-yellow-100 text-yellow-700' 
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  ⭐ VIP {selectedPatient.isVIP ? 'সরান' : 'করুন'}
                </button>
                <button
                  onClick={() => handleToggleFollowUp(selectedPatient)}
                  className={`px-4 py-2 rounded-lg text-sm transition ${
                    selectedPatient.needsFollowUp 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  🔔 ফলো-আপ {selectedPatient.needsFollowUp ? 'সরান' : 'যোগ'}
                </button>
              </div>
              <button
                onClick={() => {
                  setShowPatientDetail(false);
                  handleStartConsultation(selectedPatient);
                }}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                👨‍⚕️ কনসাল্টেশন শুরু করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientManager;

