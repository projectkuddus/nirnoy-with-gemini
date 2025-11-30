import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MOCK_DOCTORS } from '../data/mockData';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';

const ALL_SPECIALTIES = [...new Set(MOCK_DOCTORS.flatMap(d => d.specialties))].sort();
const ALL_LOCATIONS = [...new Set(MOCK_DOCTORS.map(d => d.chambers[0]?.area).filter(Boolean))].sort();

const SPECIALTY_META: Record<string, { icon: string; color: string }> = {
  'Internal Medicine': { icon: 'fa-stethoscope', color: '#3b82f6' },
  'Cardiology': { icon: 'fa-heartbeat', color: '#ef4444' },
  'Gynaecology & Obstetrics': { icon: 'fa-venus', color: '#ec4899' },
  'Paediatrics': { icon: 'fa-baby', color: '#06b6d4' },
  'Orthopedics': { icon: 'fa-bone', color: '#f97316' },
  'Dermatology': { icon: 'fa-allergies', color: '#8b5cf6' },
  'ENT': { icon: 'fa-head-side-cough', color: '#14b8a6' },
  'Eye (Ophthalmology)': { icon: 'fa-eye', color: '#6366f1' },
  'Neurology': { icon: 'fa-brain', color: '#f59e0b' },
  'Psychiatry': { icon: 'fa-brain', color: '#10b981' },
};

const getSpecialtyMeta = (specialty: string) => SPECIALTY_META[specialty] || { icon: 'fa-user-md', color: '#6b7280' };

export const DoctorSearch: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const isBn = language === 'bn';
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [selectedSpecialty, setSelectedSpecialty] = useState(searchParams.get('specialty') || '');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [sortBy, setSortBy] = useState('rating');

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (selectedSpecialty) params.set('specialty', selectedSpecialty);
    setSearchParams(params, { replace: true });
  }, [searchTerm, selectedSpecialty, setSearchParams]);

  const filteredDoctors = useMemo(() => {
    let results = MOCK_DOCTORS.filter(d => {
      const matchesSearch = !searchTerm || 
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        d.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesSpecialty = !selectedSpecialty || d.specialties.includes(selectedSpecialty);
      const matchesLocation = !selectedLocation || d.chambers[0]?.area === selectedLocation;
      const matchesGender = !selectedGender || d.gender === selectedGender;
      return matchesSearch && matchesSpecialty && matchesLocation && matchesGender;
    });

    switch (sortBy) {
      case 'rating': results.sort((a, b) => b.rating - a.rating); break;
      case 'experience': results.sort((a, b) => b.experience - a.experience); break;
      case 'fee-low': results.sort((a, b) => (a.chambers[0]?.fee || 0) - (b.chambers[0]?.fee || 0)); break;
      case 'fee-high': results.sort((a, b) => (b.chambers[0]?.fee || 0) - (a.chambers[0]?.fee || 0)); break;
    }
    return results;
  }, [searchTerm, selectedSpecialty, selectedLocation, selectedGender, sortBy]);

  const specialtyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    MOCK_DOCTORS.forEach(d => d.specialties.forEach(s => { counts[s] = (counts[s] || 0) + 1; }));
    return counts;
  }, []);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSpecialty('');
    setSelectedLocation('');
    setSelectedGender('');
    setSortBy('rating');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-lg">ন</span>
            </div>
            <span className="font-black text-slate-900 text-lg">Nirnoy</span>
          </button>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <button onClick={() => navigate('/patient-auth')} className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-bold rounded-xl">
              {isBn ? 'শুরু করুন' : 'Get Started'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Search */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl font-black mb-3">{isBn ? 'আপনার ডাক্তার খুঁজুন' : 'Find Your Doctor'}</h1>
          <p className="text-blue-100 mb-8">{isBn ? `${MOCK_DOCTORS.length}+ বিশেষজ্ঞ ডাক্তার` : `${MOCK_DOCTORS.length}+ expert doctors`}</p>
          
          <div className="max-w-4xl mx-auto bg-white rounded-2xl p-2 shadow-2xl flex flex-col md:flex-row gap-2">
            <div className="flex-1 flex items-center px-4 bg-slate-50 rounded-xl">
              <i className="fas fa-search text-slate-400 mr-3"></i>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isBn ? 'ডাক্তার বা বিশেষত্ব খুঁজুন...' : 'Search doctor or specialty...'}
                className="flex-1 py-3 bg-transparent outline-none text-slate-800"
              />
            </div>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-4 py-3 bg-slate-50 rounded-xl text-slate-700 outline-none"
            >
              <option value="">{isBn ? 'সব এলাকা' : 'All Areas'}</option>
              {ALL_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <button className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition">
              {isBn ? 'খুঁজুন' : 'Search'}
            </button>
          </div>
        </div>
      </div>

      {/* Specialty Pills */}
      <div className="bg-white border-b sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedSpecialty('')}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${!selectedSpecialty ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {isBn ? 'সব' : 'All'}
            </button>
            {ALL_SPECIALTIES.slice(0, 10).map(spec => {
              const meta = getSpecialtyMeta(spec);
              return (
                <button
                  key={spec}
                  onClick={() => setSelectedSpecialty(selectedSpecialty === spec ? '' : spec)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${selectedSpecialty === spec ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  <i className={`fas ${meta.icon} text-xs`}></i>
                  <span className="whitespace-nowrap">{spec}</span>
                  <span className="text-xs opacity-70">({specialtyCounts[spec]})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className="lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-36">
              <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <i className="fas fa-sliders-h text-blue-500"></i>
                  {isBn ? 'ফিল্টার' : 'Filters'}
                </h3>
                {(searchTerm || selectedSpecialty || selectedLocation || selectedGender) && (
                  <button onClick={clearFilters} className="text-xs text-red-500 font-medium">{isBn ? 'রিসেট' : 'Reset'}</button>
                )}
              </div>

              <div className="p-4 space-y-6 max-h-96 overflow-y-auto">
                {/* Gender */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-3">{isBn ? 'লিঙ্গ' : 'Gender'}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: '', label: isBn ? 'সব' : 'All', icon: 'fa-users' },
                      { value: 'Male', label: isBn ? 'পুরুষ' : 'Male', icon: 'fa-mars' },
                      { value: 'Female', label: isBn ? 'মহিলা' : 'Female', icon: 'fa-venus' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setSelectedGender(opt.value)}
                        className={`py-2.5 px-3 rounded-xl text-sm font-medium transition flex flex-col items-center gap-1 ${selectedGender === opt.value ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        <i className={`fas ${opt.icon}`}></i>
                        <span className="text-xs">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-3">{isBn ? 'সাজান' : 'Sort By'}</label>
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
                        className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition flex items-center gap-3 ${sortBy === opt.value ? 'bg-blue-50 text-blue-700 border-2 border-blue-200' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-2 border-transparent'}`}
                      >
                        <i className={`fas ${opt.icon} w-4`}></i>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Results */}
          <main className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <p className="text-slate-600">
                <span className="font-bold text-slate-900 text-xl">{filteredDoctors.length}</span>
                {' '}{isBn ? 'জন ডাক্তার পাওয়া গেছে' : 'doctors found'}
              </p>
            </div>

            {filteredDoctors.length > 0 ? (
              <div className="space-y-4">
                {filteredDoctors.map(doctor => (
                  <div
                    key={doctor.id}
                    onClick={() => navigate(`/doctors/${doctor.id}`)}
                    className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer group"
                  >
                    <div className="flex gap-5">
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

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition truncate">{doctor.name}</h3>
                          {(doctor as any).isDemo && (
                            <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">DEMO</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {doctor.specialties.slice(0, 2).map(s => {
                            const meta = getSpecialtyMeta(s);
                            return (
                              <span key={s} className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>{s}</span>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span><i className="fas fa-briefcase mr-1.5 text-slate-400"></i>{doctor.experience} {isBn ? 'বছর' : 'yrs'}</span>
                          <span><i className="fas fa-map-marker-alt mr-1.5 text-slate-400"></i>{doctor.chambers[0]?.area}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between">
                        <div className="text-right">
                          <p className="text-xs text-slate-400">{isBn ? 'ফি' : 'Fee'}</p>
                          <p className="text-2xl font-black text-slate-800">৳{doctor.chambers[0]?.fee}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/doctors/${doctor.id}`); }}
                          className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20"
                        >
                          {isBn ? 'বুক করুন' : 'Book'}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <i className="fas fa-hospital text-blue-500"></i>
                        <span className="truncate">{doctor.chambers[0]?.name}</span>
                      </div>
                      <div className="text-sm text-green-600 font-medium">
                        <i className="fas fa-clock mr-1"></i>
                        {doctor.nextAvailable}
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
                <h3 className="text-xl font-bold text-slate-800 mb-2">{isBn ? 'কোনো ডাক্তার পাওয়া যায়নি' : 'No doctors found'}</h3>
                <button onClick={clearFilters} className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-xl">
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



