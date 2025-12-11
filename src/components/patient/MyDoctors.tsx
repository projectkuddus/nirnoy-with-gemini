import React, { useState, useMemo, useCallback } from 'react';

// ============ TYPES ============
export interface DoctorConnection {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorNameBn?: string;
  doctorSpecialty: string;
  doctorSpecialtyBn?: string;
  doctorImage?: string;
  doctorPhone?: string;
  doctorEmail?: string;
  
  // Connection details
  isFavorite: boolean;
  isPrimary: boolean;
  firstVisitDate: string;
  lastVisitDate: string;
  totalVisits: number;
  
  // Associated data
  upcomingAppointments: number;
  activePrescriptions: number;
  sharedRecords: number;
  
  // Notes from doctor
  doctorNotes?: string;
  lastNotesDate?: string;
  
  // Chambers
  chambers: {
    id: string;
    name: string;
    address: string;
    phone?: string;
  }[];
  
  // Communication
  canMessage: boolean;
  lastMessageDate?: string;
  unreadMessages?: number;
}

interface MyDoctorsProps {
  doctors: DoctorConnection[];
  onToggleFavorite?: (doctorId: string) => Promise<void>;
  onSetPrimary?: (doctorId: string) => Promise<void>;
  onBookAppointment?: (doctorId: string, chamberId?: string) => void;
  onSendMessage?: (doctorId: string) => void;
  onViewProfile?: (doctorId: string) => void;
  onViewHistory?: (doctorId: string) => void;
  onRemoveConnection?: (doctorId: string) => Promise<void>;
}

// ============ MY DOCTORS COMPONENT ============
export const MyDoctors: React.FC<MyDoctorsProps> = ({
  doctors,
  onToggleFavorite,
  onSetPrimary,
  onBookAppointment,
  onSendMessage,
  onViewProfile,
  onViewHistory,
  onRemoveConnection,
}) => {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'visits' | 'recent'>('recent');
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorConnection | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Get unique specialties
  const specialties = useMemo(() => {
    const specs = new Set(doctors.map(d => d.doctorSpecialty));
    return Array.from(specs).sort();
  }, [doctors]);

  // Filter and sort doctors
  const filteredDoctors = useMemo(() => {
    let result = [...doctors];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(d =>
        d.doctorName.toLowerCase().includes(query) ||
        d.doctorNameBn?.includes(query) ||
        d.doctorSpecialty.toLowerCase().includes(query) ||
        d.doctorSpecialtyBn?.includes(query)
      );
    }

    // Specialty filter
    if (filterSpecialty !== 'all') {
      result = result.filter(d => d.doctorSpecialty === filterSpecialty);
    }

    // Sort
    result.sort((a, b) => {
      // Primary always first
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;

      // Favorites second
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;

      // Then by sort criteria
      switch (sortBy) {
        case 'name':
          return (a.doctorNameBn || a.doctorName).localeCompare(b.doctorNameBn || b.doctorName);
        case 'visits':
          return b.totalVisits - a.totalVisits;
        case 'recent':
          return new Date(b.lastVisitDate).getTime() - new Date(a.lastVisitDate).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [doctors, searchQuery, filterSpecialty, sortBy]);

  // Stats
  const stats = useMemo(() => ({
    total: doctors.length,
    favorites: doctors.filter(d => d.isFavorite).length,
    upcoming: doctors.reduce((sum, d) => sum + d.upcomingAppointments, 0),
    activePrescriptions: doctors.reduce((sum, d) => sum + d.activePrescriptions, 0),
  }), [doctors]);

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get relative date
  const getRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'আজ';
    if (diffDays === 1) return 'গতকাল';
    if (diffDays < 7) return `${diffDays} দিন আগে`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} সপ্তাহ আগে`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} মাস আগে`;
    return `${Math.floor(diffDays / 365)} বছর আগে`;
  };

  // Handle toggle favorite
  const handleToggleFavorite = useCallback(async (doctorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onToggleFavorite) return;
    
    setIsProcessing(true);
    try {
      await onToggleFavorite(doctorId);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [onToggleFavorite]);

  // Handle set primary
  const handleSetPrimary = useCallback(async (doctorId: string) => {
    if (!onSetPrimary) return;
    
    setIsProcessing(true);
    try {
      await onSetPrimary(doctorId);
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Error setting primary:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [onSetPrimary]);

  // Handle remove connection
  const handleRemove = useCallback(async () => {
    if (!selectedDoctor || !onRemoveConnection) return;
    
    setIsProcessing(true);
    try {
      await onRemoveConnection(selectedDoctor.doctorId);
      setShowConfirmRemove(false);
      setShowDetailsModal(false);
      setSelectedDoctor(null);
    } catch (error) {
      console.error('Error removing connection:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedDoctor, onRemoveConnection]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">👨‍⚕️ আমার ডাক্তাররা</h2>
          <p className="text-slate-500">আপনার সাথে সংযুক্ত সব ডাক্তার</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-slate-500">মোট ডাক্তার</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-red-400">
          <div className="text-3xl font-bold text-red-600">{stats.favorites}</div>
          <div className="text-sm text-slate-500">পছন্দের</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-green-400">
          <div className="text-3xl font-bold text-green-600">{stats.upcoming}</div>
          <div className="text-sm text-slate-500">আসন্ন অ্যাপয়েন্টমেন্ট</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-purple-400">
          <div className="text-3xl font-bold text-purple-600">{stats.activePrescriptions}</div>
          <div className="text-sm text-slate-500">সক্রিয় প্রেসক্রিপশন</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass-card p-4 flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ডাক্তার খুঁজুন..."
            className="w-full pl-10 pr-4 py-2 glass-subtle rounded-lg border-0"
          />
        </div>

        {/* Specialty Filter */}
        <select
          value={filterSpecialty}
          onChange={(e) => setFilterSpecialty(e.target.value)}
          className="px-4 py-2 glass-subtle rounded-lg border-0"
        >
          <option value="all">সব বিশেষজ্ঞতা</option>
          {specialties.map(spec => (
            <option key={spec} value={spec}>{spec}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 glass-subtle rounded-lg border-0"
        >
          <option value="recent">সাম্প্রতিক ভিজিট</option>
          <option value="visits">বেশি ভিজিট</option>
          <option value="name">নাম অনুসারে</option>
        </select>
      </div>

      {/* Doctors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDoctors.map(doctor => (
          <div
            key={doctor.id}
            className={`glass-card p-4 cursor-pointer transition hover:shadow-lg ${
              doctor.isPrimary ? 'ring-2 ring-blue-400 ring-offset-2' : ''
            }`}
            onClick={() => {
              setSelectedDoctor(doctor);
              setShowDetailsModal(true);
            }}
          >
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              {/* Image */}
              <div className="relative">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100">
                  {doctor.doctorImage ? (
                    <img src={doctor.doctorImage} alt={doctor.doctorName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">👨‍⚕️</div>
                  )}
                </div>
                {doctor.isPrimary && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 truncate">
                  {doctor.doctorNameBn || doctor.doctorName}
                </h3>
                <p className="text-sm text-slate-500">
                  {doctor.doctorSpecialtyBn || doctor.doctorSpecialty}
                </p>
                {doctor.isPrimary && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                    প্রাথমিক ডাক্তার
                  </span>
                )}
              </div>

              {/* Favorite */}
              <button
                onClick={(e) => handleToggleFavorite(doctor.doctorId, e)}
                className={`text-2xl transition ${doctor.isFavorite ? 'text-red-500' : 'text-slate-300 hover:text-red-400'}`}
              >
                {doctor.isFavorite ? '❤️' : '🤍'}
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="text-center p-2 bg-slate-50 rounded-lg">
                <div className="text-lg font-bold text-slate-700">{doctor.totalVisits}</div>
                <div className="text-xs text-slate-500">মোট ভিজিট</div>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">{doctor.upcomingAppointments}</div>
                <div className="text-xs text-slate-500">আসন্ন</div>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">{doctor.activePrescriptions}</div>
                <div className="text-xs text-slate-500">প্রেসক্রিপশন</div>
              </div>
            </div>

            {/* Last Visit */}
            <div className="flex items-center justify-between text-sm text-slate-500 border-t border-slate-100 pt-3">
              <span>সর্বশেষ ভিজিট:</span>
              <span className="font-medium">{getRelativeDate(doctor.lastVisitDate)}</span>
            </div>

            {/* Doctor Notes */}
            {doctor.doctorNotes && (
              <div className="mt-3 p-2 bg-blue-50 rounded-lg border-l-2 border-blue-400">
                <div className="text-xs text-blue-600 mb-1">ডাক্তারের নোট:</div>
                <p className="text-sm text-slate-700 line-clamp-2">{doctor.doctorNotes}</p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2 mt-4">
              {onBookAppointment && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onBookAppointment(doctor.doctorId);
                  }}
                  className="flex-1 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
                >
                  📅 অ্যাপয়েন্টমেন্ট
                </button>
              )}
              {onSendMessage && doctor.canMessage && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSendMessage(doctor.doctorId);
                  }}
                  className="relative px-3 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600"
                >
                  💬
                  {doctor.unreadMessages && doctor.unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {doctor.unreadMessages}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredDoctors.length === 0 && (
        <div className="glass-card p-12 text-center">
          <div className="text-6xl mb-4">👨‍⚕️</div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">
            {searchQuery || filterSpecialty !== 'all' ? 'কোনো ডাক্তার পাওয়া যায়নি' : 'কোনো ডাক্তার নেই'}
          </h3>
          <p className="text-slate-500 mb-4">
            {searchQuery || filterSpecialty !== 'all' 
              ? 'অন্য ফিল্টার ব্যবহার করুন' 
              : 'ডাক্তার দেখালে এখানে দেখাবে'
            }
          </p>
        </div>
      )}

      {/* Doctor Details Modal */}
      {showDetailsModal && selectedDoctor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-strong rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100">
                    {selectedDoctor.doctorImage ? (
                      <img src={selectedDoctor.doctorImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">👨‍⚕️</div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">
                      {selectedDoctor.doctorNameBn || selectedDoctor.doctorName}
                    </h2>
                    <p className="text-slate-500">{selectedDoctor.doctorSpecialtyBn || selectedDoctor.doctorSpecialty}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {selectedDoctor.isPrimary && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          প্রাথমিক ডাক্তার
                        </span>
                      )}
                      {selectedDoctor.isFavorite && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                          ❤️ পছন্দের
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-white/50 rounded-full"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)] space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="glass-subtle p-3 rounded-xl text-center">
                  <div className="text-2xl font-bold text-slate-700">{selectedDoctor.totalVisits}</div>
                  <div className="text-xs text-slate-500">মোট ভিজিট</div>
                </div>
                <div className="glass-subtle p-3 rounded-xl text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedDoctor.upcomingAppointments}</div>
                  <div className="text-xs text-slate-500">আসন্ন</div>
                </div>
                <div className="glass-subtle p-3 rounded-xl text-center">
                  <div className="text-2xl font-bold text-green-600">{selectedDoctor.activePrescriptions}</div>
                  <div className="text-xs text-slate-500">প্রেসক্রিপশন</div>
                </div>
                <div className="glass-subtle p-3 rounded-xl text-center">
                  <div className="text-2xl font-bold text-purple-600">{selectedDoctor.sharedRecords}</div>
                  <div className="text-xs text-slate-500">শেয়ার্ড রেকর্ড</div>
                </div>
              </div>

              {/* Visit Info */}
              <div className="glass-subtle p-4 rounded-xl">
                <h4 className="font-medium text-slate-700 mb-3">📅 ভিজিট তথ্য</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-500">প্রথম ভিজিট</div>
                    <div className="font-medium text-slate-700">{formatDate(selectedDoctor.firstVisitDate)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">সর্বশেষ ভিজিট</div>
                    <div className="font-medium text-slate-700">{formatDate(selectedDoctor.lastVisitDate)}</div>
                  </div>
                </div>
              </div>

              {/* Chambers */}
              <div className="glass-subtle p-4 rounded-xl">
                <h4 className="font-medium text-slate-700 mb-3">🏥 চেম্বার</h4>
                <div className="space-y-3">
                  {selectedDoctor.chambers.map(chamber => (
                    <div key={chamber.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <div className="font-medium text-slate-700">{chamber.name}</div>
                        <div className="text-sm text-slate-500">{chamber.address}</div>
                      </div>
                      {onBookAppointment && (
                        <button
                          onClick={() => {
                            onBookAppointment(selectedDoctor.doctorId, chamber.id);
                            setShowDetailsModal(false);
                          }}
                          className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200"
                        >
                          📅 বুক করুন
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Doctor Notes */}
              {selectedDoctor.doctorNotes && (
                <div className="glass-subtle p-4 rounded-xl border-l-4 border-blue-400">
                  <h4 className="font-medium text-slate-700 mb-2">📝 ডাক্তারের নোট</h4>
                  <p className="text-slate-600">{selectedDoctor.doctorNotes}</p>
                  {selectedDoctor.lastNotesDate && (
                    <p className="text-xs text-slate-400 mt-2">
                      আপডেট: {formatDate(selectedDoctor.lastNotesDate)}
                    </p>
                  )}
                </div>
              )}

              {/* Contact */}
              <div className="glass-subtle p-4 rounded-xl">
                <h4 className="font-medium text-slate-700 mb-3">📞 যোগাযোগ</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDoctor.doctorPhone && (
                    <a
                      href={`tel:${selectedDoctor.doctorPhone}`}
                      className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                    >
                      📞 {selectedDoctor.doctorPhone}
                    </a>
                  )}
                  {selectedDoctor.canMessage && onSendMessage && (
                    <button
                      onClick={() => {
                        onSendMessage(selectedDoctor.doctorId);
                        setShowDetailsModal(false);
                      }}
                      className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200"
                    >
                      💬 মেসেজ পাঠান
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-slate-200 flex flex-wrap gap-2">
              {!selectedDoctor.isPrimary && onSetPrimary && (
                <button
                  onClick={() => handleSetPrimary(selectedDoctor.doctorId)}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50"
                >
                  ⭐ প্রাথমিক ডাক্তার করুন
                </button>
              )}
              {onViewProfile && (
                <button
                  onClick={() => {
                    onViewProfile(selectedDoctor.doctorId);
                    setShowDetailsModal(false);
                  }}
                  className="px-4 py-2 glass-subtle text-slate-600 rounded-lg text-sm hover:bg-slate-100"
                >
                  👤 প্রোফাইল দেখুন
                </button>
              )}
              {onViewHistory && (
                <button
                  onClick={() => {
                    onViewHistory(selectedDoctor.doctorId);
                    setShowDetailsModal(false);
                  }}
                  className="px-4 py-2 glass-subtle text-slate-600 rounded-lg text-sm hover:bg-slate-100"
                >
                  📋 ইতিহাস দেখুন
                </button>
              )}
              <div className="flex-1" />
              {onRemoveConnection && (
                <button
                  onClick={() => setShowConfirmRemove(true)}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                >
                  🗑️ সংযোগ সরান
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Remove Modal */}
      {showConfirmRemove && selectedDoctor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="glass-strong rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">🗑️ সংযোগ সরান?</h3>
            <p className="text-slate-600 mb-6">
              আপনি কি নিশ্চিত <strong>{selectedDoctor.doctorNameBn || selectedDoctor.doctorName}</strong> কে আপনার ডাক্তার তালিকা থেকে সরাতে চান?
            </p>
            <p className="text-sm text-slate-500 mb-6">
              এটি করলে আপনার সাথে এই ডাক্তারের কোনো সংযোগ থাকবে না। তবে আপনার পুরানো রেকর্ড ও প্রেসক্রিপশন মুছে যাবে না।
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmRemove(false)}
                className="flex-1 py-3 glass-subtle text-slate-600 rounded-xl font-medium"
              >
                বাতিল
              </button>
              <button
                onClick={handleRemove}
                disabled={isProcessing}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {isProcessing ? '⏳ সরানো হচ্ছে...' : 'হ্যাঁ, সরান'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyDoctors;

