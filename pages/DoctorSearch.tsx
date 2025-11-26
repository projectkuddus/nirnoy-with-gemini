import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MOCK_DOCTORS } from '../data/mockData';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';

// Extract unique values
const ALL_SPECIALTIES = [...new Set(MOCK_DOCTORS.flatMap(d => d.specialties))].sort();
const ALL_LOCATIONS = [...new Set(MOCK_DOCTORS.map(d => d.chambers[0]?.area).filter(Boolean))].sort();

// Specialty icons and colors
const SPECIALTY_META: Record<string, { icon: string; color: string; colorClass: string }> = {
  'Internal Medicine': { icon: 'fa-stethoscope', color: '#3b82f6', colorClass: 'bg-blue-500' },
  'Cardiology': { icon: 'fa-heartbeat', color: '#ef4444', colorClass: 'bg-red-500' },
  'Gynaecology & Obstetrics': { icon: 'fa-venus', color: '#ec4899', colorClass: 'bg-pink-500' },
  'Paediatrics': { icon: 'fa-baby', color: '#06b6d4', colorClass: 'bg-cyan-500' },
  'Orthopedics': { icon: 'fa-bone', color: '#f97316', colorClass: 'bg-orange-500' },
  'Dermatology': { icon: 'fa-allergies', color: '#8b5cf6', colorClass: 'bg-purple-500' },
  'ENT': { icon: 'fa-head-side-cough', color: '#14b8a6', colorClass: 'bg-teal-500' },
  'Eye (Ophthalmology)': { icon: 'fa-eye', color: '#6366f1', colorClass: 'bg-indigo-500' },
  'Neurology': { icon: 'fa-brain', color: '#f59e0b', colorClass: 'bg-amber-500' },
  'Psychiatry': { icon: 'fa-brain', color: '#10b981', colorClass: 'bg-emerald-500' },
  'Gastroenterology': { icon: 'fa-stomach', color: '#84cc16', colorClass: 'bg-lime-500' },
  'Nephrology': { icon: 'fa-kidneys', color: '#f43f5e', colorClass: 'bg-rose-500' },
  'Pulmonology (Chest)': { icon: 'fa-lungs', color: '#0ea5e9', colorClass: 'bg-sky-500' },
  'Endocrinology & Diabetes': { icon: 'fa-syringe', color: '#a855f7', colorClass: 'bg-violet-500' },
  'General Surgery': { icon: 'fa-scalpel', color: '#64748b', colorClass: 'bg-slate-500' },
  'Dental Surgery': { icon: 'fa-tooth', color: '#22c55e', colorClass: 'bg-green-500' },
};

const getSpecialtyMeta = (specialty: string) => {
  return SPECIALTY_META[specialty] || { icon: 'fa-user-md', color: '#6b7280', colorClass: 'bg-gray-500' };
};

export const DoctorSearch: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const isBn = language === 'bn';
  
  // Get initial values from URL params
  const initialSpecialty = searchParams.get('specialty') || '';
  const initialSearch = searchParams.get('q') || '';
  
  // State
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedSpecialty, setSelectedSpecialty] = useState(initialSpecialty);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (selectedSpecialty) params.set('specialty', selectedSpecialty);
    setSearchParams(params, { replace: true });
  }, [searchTerm, selectedSpecialty, setSearchParams]);

  // Filter doctors
  const filteredDoctors = useMemo(() => {
    let results = MOCK_DOCTORS.filter(d => {
      const matchesSearch = !searchTerm || 
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        d.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
        d.chambers[0]?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSpecialty = !selectedSpecialty || d.specialties.includes(selectedSpecialty);
      const matchesLocation = !selectedLocation || d.chambers[0]?.area === selectedLocation;
      const matchesGender = !selectedGender || d.gender === selectedGender;

      return matchesSearch && matchesSpecialty && matchesLocation && matchesGender;
    });

    // Sort
    switch (sortBy) {
      case 'rating': results.sort((a, b) => b.rating - a.rating); break;
      case 'experience': results.sort((a, b) => b.experience - a.experience); break;
      case 'fee-low': results.sort((a, b) => (a.chambers[0]?.fee || 0) - (b.chambers[0]?.fee || 0)); break;
      case 'fee-high': results.sort((a, b) => (b.chambers[0]?.fee || 0) - (a.chambers[0]?.fee || 0)); break;
    }

    return results;
  }, [searchTerm, selectedSpecialty, selectedLocation, selectedGender, sortBy]);

  // Get specialty counts
  const specialtyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    MOCK_DOCTORS.forEach(d => {
      d.specialties.forEach(s => {
        counts[s] = (counts[s] || 0) + 1;
      });
    });
    return counts;
  }, []);

  // Top specialties for quick filter
  const topSpecialties = Object.entries(specialtyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name]) => name);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSpecialty('');
    setSelectedLocation('');
    setSelectedGender('');
    setSortBy('rating');
  };

  const hasActiveFilters = searchTerm || selectedSpecialty || selectedLocation || selectedGender;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header with Language Toggle */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <span className="text-white font-black text-lg">ন</span>
              </div>
              <div className="leading-tight">
                <span className="font-black text-slate-900 text-lg tracking-tight">Nirnoy</span>
                <span className="text-[10px] text-blue-600 font-semibold block -mt-0.5 tracking-widest uppercase">Health Synchronized</span>
              </div>
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <button onClick={() => navigate('/patient-auth')} className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-bold rounded-xl hover:from-blue-600 hover:to-indigo-600 transition shadow-lg shadow-blue-500/25">
              {isBn ? 'শুরু করুন' : 'Get Started'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Search Section */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-black mb-3">
              {isBn ? 'আপনার ডাক্তার খুঁজুন' : 'Find Your Doctor'}
            </h1>
            <p className="text-blue-100 text-lg">
              {isBn ? `${MOCK_DOCTORS.length}+ বিশেষজ্ঞ ডাক্তার আপনার সেবায়` : `${MOCK_DOCTORS.length}+ expert doctors at your service`}
            </p>
          </div>

          {/* Main Search Bar */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl p-2 shadow-2xl flex flex-col md:flex-row gap-2">
              <div className="flex-1 flex items-center px-4 bg-slate-50 rounded-xl">
                <i className="fas fa-search text-slate-400 mr-3"></i>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={isBn ? 'ডাক্তার, বিশেষত্ব বা হাসপাতাল...' : 'Doctor, specialty or hospital...'}
                  className="flex-1 py-3 bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
              
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="px-4 py-3 bg-slate-50 rounded-xl text-slate-700 outline-none border-0 cursor-pointer"
              >
                <option value="">{isBn ? 'সব এলাকা' : 'All Areas'}</option>
                {ALL_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              
              <button
                onClick={() => {}}
                className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg"
              >
                <i className="fas fa-search mr-2"></i>
                {isBn ? 'খুঁজুন' : 'Search'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Specialty Quick Filters */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedSpecialty('')}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
                !selectedSpecialty
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {isBn ? 'সব' : 'All'}
            </button>
            
            {topSpecialties.map(spec => {
              const meta = getSpecialtyMeta(spec);
              const isActive = selectedSpecialty === spec;
              return (
                <button
                  key={spec}
                  onClick={() => setSelectedSpecialty(isActive ? '' : spec)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                    isActive
                      ? `${meta.colorClass} text-white shadow-lg`
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <i className={`fas ${meta.icon} text-xs`}></i>
                  <span className="whitespace-nowrap">{spec}</span>
                  <span className={`text-xs ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                    ({specialtyCounts[spec]})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar Filters - FIXED SCROLLING */}
          <aside className="lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <i className="fas fa-sliders-h text-blue-500"></i>
                  {isBn ? 'ফিল্টার' : 'Filters'}
                </h3>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-600 font-medium">
                    {isBn ? 'রিসেট' : 'Reset'}
                  </button>
                )}
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Gender */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    {isBn ? 'ডাক্তারের লিঙ্গ' : 'Doctor Gender'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: '', label: isBn ? 'সব' : 'All', icon: 'fa-users' },
                      { value: 'Male', label: isBn ? 'পুরুষ' : 'Male', icon: 'fa-mars' },
                      { value: 'Female', label: isBn ? 'মহিলা' : 'Female', icon: 'fa-venus' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setSelectedGender(opt.value)}
                        className={`py-2.5 px-3 rounded-xl text-sm font-medium transition flex flex-col items-center gap-1 ${
                          selectedGender === opt.value
                            ? 'bg-blue-500 text-white shadow-lg'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <i className={`fas ${opt.icon}`}></i>
                        <span className="text-xs">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    {isBn ? 'সাজান' : 'Sort By'}
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'rating', label: isBn ? 'সর্বোচ্চ রেটিং' : 'Highest Rating', icon: 'fa-star' },
                      { value: 'experience', label: isBn ? 'অভিজ্ঞতা' : 'Experience', icon: 'fa-briefcase' },
                      { value: 'fee-low', label: isBn ? 'কম ফি' : 'Lowest Fee', icon: 'fa-arrow-down' },
                      { value: 'fee-high', label: isBn ? 'বেশি ফি' : 'Highest Fee', icon: 'fa-arrow-up' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setSortBy(opt.value)}
                        className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition flex items-center gap-3 ${
                          sortBy === opt.value
                            ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-2 border-transparent'
                        }`}
                      >
                        <i className={`fas ${opt.icon} w-4`}></i>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* All Specialties - Now properly scrollable */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    {isBn ? 'সব বিশেষত্ব' : 'All Specialties'}
                  </label>
                  <div className="space-y-1">
                    {ALL_SPECIALTIES.map(spec => {
                      const meta = getSpecialtyMeta(spec);
                      const isActive = selectedSpecialty === spec;
                      return (
                        <button
                          key={spec}
                          onClick={() => setSelectedSpecialty(isActive ? '' : spec)}
                          className={`w-full py-2 px-3 rounded-lg text-sm transition flex items-center justify-between ${
                            isActive
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <i className={`fas ${meta.icon} text-xs`} style={{ color: meta.color }}></i>
                            <span className="truncate">{spec}</span>
                          </span>
                          <span className="text-xs text-slate-400">({specialtyCounts[spec]})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Results */}
          <main className="flex-1 min-w-0">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-slate-600">
                  <span className="font-bold text-slate-900 text-xl">{filteredDoctors.length}</span>
                  {' '}{isBn ? 'জন ডাক্তার পাওয়া গেছে' : 'doctors found'}
                </p>
                {selectedSpecialty && (
                  <p className="text-sm text-blue-600 mt-1">
                    <i className="fas fa-filter mr-1"></i>
                    {selectedSpecialty}
                    <button onClick={() => setSelectedSpecialty('')} className="ml-2 text-slate-400 hover:text-slate-600">
                      <i className="fas fa-times"></i>
                    </button>
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}
                >
                  <i className="fas fa-list"></i>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}
                >
                  <i className="fas fa-th-large"></i>
                </button>
              </div>
            </div>

            {/* Doctor Cards */}
            {filteredDoctors.length > 0 ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
                {filteredDoctors.map(doctor => (
                  <div
                    key={doctor.id}
                    onClick={() => navigate(`/doctors/${doctor.id}`)}
                    className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer group"
                  >
                    <div className="flex gap-5">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center overflow-hidden">
                          {doctor.image ? (
                            <img src={doctor.image} alt={doctor.name} className="w-full h-full object-cover" />
                          ) : (
                            <i className="fas fa-user-md text-3xl text-blue-400"></i>
                          )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-900 px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow">
                          <i className="fas fa-star text-[10px]"></i>
                          {doctor.rating}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition truncate">
                          {doctor.name}
                        </h3>
                        <p className="text-sm text-slate-500 truncate mb-2">{doctor.degrees}</p>
                        
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {doctor.specialties.slice(0, 2).map(s => {
                            const meta = getSpecialtyMeta(s);
                            return (
                              <span
                                key={s}
                                className="text-xs px-2 py-1 rounded-full font-medium"
                                style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
                              >
                                {s}
                              </span>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <i className="fas fa-briefcase text-slate-400"></i>
                            {doctor.experience} {isBn ? 'বছর' : 'yrs'}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <i className="fas fa-map-marker-alt text-slate-400"></i>
                            {doctor.chambers[0]?.area}
                          </span>
                        </div>
                      </div>

                      {/* Price & Action */}
                      <div className="flex flex-col items-end justify-between">
                        <div className="text-right">
                          <p className="text-xs text-slate-400">{isBn ? 'ফি' : 'Fee'}</p>
                          <p className="text-2xl font-black text-slate-800">৳{doctor.chambers[0]?.fee}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/doctors/${doctor.id}`);
                          }}
                          className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-bold rounded-xl hover:from-blue-600 hover:to-indigo-600 transition shadow-lg shadow-blue-500/20"
                        >
                          {isBn ? 'বুক করুন' : 'Book'}
                        </button>
                      </div>
                    </div>

                    {/* Chamber Info */}
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <i className="fas fa-hospital text-blue-500"></i>
                        <span className="truncate">{doctor.chambers[0]?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-green-600 font-medium">
                          <i className="fas fa-clock mr-1"></i>
                          {doctor.nextAvailable}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
                <div className="w-20 h-20 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-search text-3xl text-slate-300"></i>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  {isBn ? 'কোনো ডাক্তার পাওয়া যায়নি' : 'No doctors found'}
                </h3>
                <p className="text-slate-500 mb-4">
                  {isBn ? 'অন্য ফিল্টার ব্যবহার করে দেখুন' : 'Try different filters'}
                </p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-indigo-600 transition shadow-lg"
                >
                  {isBn ? 'ফিল্টার রিসেট করুন' : 'Reset Filters'}
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default DoctorSearch;
