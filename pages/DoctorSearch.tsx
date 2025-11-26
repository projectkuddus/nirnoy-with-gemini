
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_DOCTORS } from '../data/mockData';
import { useLanguage } from '../contexts/LanguageContext';

// Extract unique values for filters
const ALL_SPECIALTIES = [...new Set(MOCK_DOCTORS.flatMap(d => d.specialties))].sort();
const ALL_LOCATIONS = [...new Set(MOCK_DOCTORS.map(d => d.chambers[0]?.area).filter(Boolean))].sort();
const ALL_HOSPITALS = [...new Set(MOCK_DOCTORS.map(d => d.chambers[0]?.name).filter(Boolean))].sort();

// Fee ranges
const FEE_RANGES = [
  { label: 'Any Fee', labelBn: 'যেকোনো ফি', min: 0, max: Infinity },
  { label: 'Under ৳500', labelBn: '৳৫০০ এর নিচে', min: 0, max: 500 },
  { label: '৳500 - ৳800', labelBn: '৳৫০০ - ৳৮০০', min: 500, max: 800 },
  { label: '৳800 - ৳1200', labelBn: '৳৮০০ - ৳১২০০', min: 800, max: 1200 },
  { label: 'Above ৳1200', labelBn: '৳১২০০ এর উপরে', min: 1200, max: Infinity },
];

// Experience ranges
const EXPERIENCE_RANGES = [
  { label: 'Any Experience', labelBn: 'যেকোনো অভিজ্ঞতা', min: 0, max: Infinity },
  { label: '5-10 Years', labelBn: '৫-১০ বছর', min: 5, max: 10 },
  { label: '10-15 Years', labelBn: '১০-১৫ বছর', min: 10, max: 15 },
  { label: '15-20 Years', labelBn: '১৫-২০ বছর', min: 15, max: 20 },
  { label: '20+ Years', labelBn: '২০+ বছর', min: 20, max: Infinity },
];

export const DoctorSearch: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedHospital, setSelectedHospital] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [selectedFeeRange, setSelectedFeeRange] = useState<number>(0);
  const [selectedExperience, setSelectedExperience] = useState<number>(0);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('rating');
  
  // Mobile filter panel toggle
  const [showFilters, setShowFilters] = useState(false);

  // Filtered and sorted doctors
  const filteredDoctors = useMemo(() => {
    let results = MOCK_DOCTORS.filter(d => {
      // Text search
      const matchesSearch = !searchTerm || 
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        d.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
        d.chambers[0]?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Specialty filter
      const matchesSpecialty = !selectedSpecialty || d.specialties.includes(selectedSpecialty);
      
      // Location filter
      const matchesLocation = !selectedLocation || d.chambers[0]?.area === selectedLocation;
      
      // Hospital filter
      const matchesHospital = !selectedHospital || d.chambers[0]?.name === selectedHospital;
      
      // Gender filter
      const matchesGender = !selectedGender || d.gender === selectedGender;
      
      // Fee range filter
      const feeRange = FEE_RANGES[selectedFeeRange];
      const fee = d.chambers[0]?.fee || 0;
      const matchesFee = fee >= feeRange.min && fee <= feeRange.max;
      
      // Experience filter
      const expRange = EXPERIENCE_RANGES[selectedExperience];
      const matchesExperience = d.experience >= expRange.min && d.experience <= expRange.max;
      
      // Rating filter
      const matchesRating = selectedRating === 0 || d.rating >= selectedRating;

      return matchesSearch && matchesSpecialty && matchesLocation && matchesHospital && 
             matchesGender && matchesFee && matchesExperience && matchesRating;
    });

    // Sort results
    switch (sortBy) {
      case 'rating':
        results.sort((a, b) => b.rating - a.rating);
        break;
      case 'experience':
        results.sort((a, b) => b.experience - a.experience);
        break;
      case 'fee-low':
        results.sort((a, b) => (a.chambers[0]?.fee || 0) - (b.chambers[0]?.fee || 0));
        break;
      case 'fee-high':
        results.sort((a, b) => (b.chambers[0]?.fee || 0) - (a.chambers[0]?.fee || 0));
        break;
      case 'name':
        results.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return results;
  }, [searchTerm, selectedSpecialty, selectedLocation, selectedHospital, selectedGender, 
      selectedFeeRange, selectedExperience, selectedRating, sortBy]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSpecialty('');
    setSelectedLocation('');
    setSelectedHospital('');
    setSelectedGender('');
    setSelectedFeeRange(0);
    setSelectedExperience(0);
    setSelectedRating(0);
    setSortBy('rating');
  };

  // Count active filters
  const activeFilterCount = [
    selectedSpecialty, selectedLocation, selectedHospital, selectedGender,
    selectedFeeRange > 0, selectedExperience > 0, selectedRating > 0
  ].filter(Boolean).length;

  // Translations
  const t = {
    title: language === 'bn' ? 'ডাক্তার খুঁজুন' : 'Find a Doctor',
    searchPlaceholder: language === 'bn' ? 'নাম, বিশেষজ্ঞতা বা হাসপাতাল দিয়ে খুঁজুন...' : 'Search by name, specialty or hospital...',
    filters: language === 'bn' ? 'ফিল্টার' : 'Filters',
    clearAll: language === 'bn' ? 'সব মুছুন' : 'Clear All',
    specialty: language === 'bn' ? 'বিশেষজ্ঞতা' : 'Specialty',
    allSpecialties: language === 'bn' ? 'সব বিশেষজ্ঞতা' : 'All Specialties',
    location: language === 'bn' ? 'এলাকা' : 'Location',
    allLocations: language === 'bn' ? 'সব এলাকা' : 'All Locations',
    hospital: language === 'bn' ? 'হাসপাতাল' : 'Hospital',
    allHospitals: language === 'bn' ? 'সব হাসপাতাল' : 'All Hospitals',
    gender: language === 'bn' ? 'লিঙ্গ' : 'Gender',
    anyGender: language === 'bn' ? 'যেকোনো' : 'Any Gender',
    male: language === 'bn' ? 'পুরুষ' : 'Male',
    female: language === 'bn' ? 'মহিলা' : 'Female',
    fee: language === 'bn' ? 'ফি' : 'Consultation Fee',
    experience: language === 'bn' ? 'অভিজ্ঞতা' : 'Experience',
    rating: language === 'bn' ? 'রেটিং' : 'Rating',
    anyRating: language === 'bn' ? 'যেকোনো রেটিং' : 'Any Rating',
    andAbove: language === 'bn' ? 'ও উপরে' : '& above',
    sortBy: language === 'bn' ? 'সাজান' : 'Sort By',
    sortRating: language === 'bn' ? 'সর্বোচ্চ রেটিং' : 'Highest Rating',
    sortExperience: language === 'bn' ? 'সর্বোচ্চ অভিজ্ঞতা' : 'Most Experienced',
    sortFeeLow: language === 'bn' ? 'কম ফি' : 'Lowest Fee',
    sortFeeHigh: language === 'bn' ? 'বেশি ফি' : 'Highest Fee',
    sortName: language === 'bn' ? 'নাম (A-Z)' : 'Name (A-Z)',
    results: language === 'bn' ? 'জন ডাক্তার পাওয়া গেছে' : 'doctors found',
    nextAvailable: language === 'bn' ? 'পরবর্তী সময়:' : 'Next available:',
    consultationFee: language === 'bn' ? 'পরামর্শ ফি' : 'Consultation Fee',
    bookAppointment: language === 'bn' ? 'অ্যাপয়েন্টমেন্ট বুক করুন' : 'Book Appointment',
    noResults: language === 'bn' ? 'কোনো ডাক্তার পাওয়া যায়নি।' : 'No doctors found matching your criteria.',
    years: language === 'bn' ? 'বছর' : 'years',
    patients: language === 'bn' ? 'রোগী' : 'patients',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Search Header */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
            {/* Search Input */}
            <div className="flex-1 relative">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input 
                type="text" 
                placeholder={t.searchPlaceholder}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-slate-800 bg-slate-50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Quick Filters (Desktop) */}
            <div className="hidden lg:flex items-center gap-3">
              <select 
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 outline-none hover:border-teal-400 transition cursor-pointer"
              >
                <option value="">{t.allSpecialties}</option>
                {ALL_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <select 
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 outline-none hover:border-teal-400 transition cursor-pointer"
              >
                <option value="">{t.allLocations}</option>
                {ALL_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>

              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 outline-none hover:border-teal-400 transition cursor-pointer"
              >
                <option value="rating">{t.sortRating}</option>
                <option value="experience">{t.sortExperience}</option>
                <option value="fee-low">{t.sortFeeLow}</option>
                <option value="fee-high">{t.sortFeeHigh}</option>
                <option value="name">{t.sortName}</option>
              </select>
            </div>

            {/* Mobile Filter Toggle */}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl font-medium"
            >
              <i className="fas fa-sliders-h"></i>
              {t.filters}
              {activeFilterCount > 0 && (
                <span className="bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full">{activeFilterCount}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex gap-6">
          
          {/* Sidebar Filters (Desktop) */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm sticky top-36 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <i className="fas fa-filter text-teal-600"></i> {t.filters}
                </h3>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 font-medium">
                    {t.clearAll}
                  </button>
                )}
              </div>

              <div className="p-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
                
                {/* Specialty */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.specialty}</label>
                  <select 
                    value={selectedSpecialty}
                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  >
                    <option value="">{t.allSpecialties}</option>
                    {ALL_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.location}</label>
                  <select 
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  >
                    <option value="">{t.allLocations}</option>
                    {ALL_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                {/* Hospital */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.hospital}</label>
                  <select 
                    value={selectedHospital}
                    onChange={(e) => setSelectedHospital(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  >
                    <option value="">{t.allHospitals}</option>
                    {ALL_HOSPITALS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.gender}</label>
                  <div className="flex gap-2">
                    {[
                      { value: '', label: t.anyGender },
                      { value: 'Male', label: t.male },
                      { value: 'Female', label: t.female },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setSelectedGender(opt.value)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                          selectedGender === opt.value 
                            ? 'bg-teal-500 text-white' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fee Range */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.fee}</label>
                  <div className="space-y-1">
                    {FEE_RANGES.map((range, idx) => (
                      <label key={idx} className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="feeRange"
                          checked={selectedFeeRange === idx}
                          onChange={() => setSelectedFeeRange(idx)}
                          className="w-4 h-4 text-teal-600 border-slate-300 focus:ring-teal-500"
                        />
                        <span className="text-sm text-slate-600 group-hover:text-slate-800">
                          {language === 'bn' ? range.labelBn : range.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Experience */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.experience}</label>
                  <div className="space-y-1">
                    {EXPERIENCE_RANGES.map((range, idx) => (
                      <label key={idx} className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="experience"
                          checked={selectedExperience === idx}
                          onChange={() => setSelectedExperience(idx)}
                          className="w-4 h-4 text-teal-600 border-slate-300 focus:ring-teal-500"
                        />
                        <span className="text-sm text-slate-600 group-hover:text-slate-800">
                          {language === 'bn' ? range.labelBn : range.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.rating}</label>
                  <div className="space-y-1">
                    {[0, 4.5, 4.0, 3.5].map(rating => (
                      <label key={rating} className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="rating"
                          checked={selectedRating === rating}
                          onChange={() => setSelectedRating(rating)}
                          className="w-4 h-4 text-teal-600 border-slate-300 focus:ring-teal-500"
                        />
                        <span className="text-sm text-slate-600 group-hover:text-slate-800 flex items-center gap-1">
                          {rating === 0 ? t.anyRating : (
                            <>
                              <i className="fas fa-star text-yellow-500 text-xs"></i>
                              {rating} {t.andAbove}
                            </>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Mobile Filter Panel */}
          {showFilters && (
            <div className="fixed inset-0 bg-black/50 z-50 lg:hidden" onClick={() => setShowFilters(false)}>
              <div 
                className="absolute right-0 top-0 h-full w-80 bg-white shadow-2xl overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0">
                  <h3 className="font-bold text-slate-800">{t.filters}</h3>
                  <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-slate-600">
                    <i className="fas fa-times text-xl"></i>
                  </button>
                </div>

                <div className="p-4 space-y-6">
                  {/* Same filter content as desktop sidebar */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t.specialty}</label>
                    <select 
                      value={selectedSpecialty}
                      onChange={(e) => setSelectedSpecialty(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm"
                    >
                      <option value="">{t.allSpecialties}</option>
                      {ALL_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t.location}</label>
                    <select 
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm"
                    >
                      <option value="">{t.allLocations}</option>
                      {ALL_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t.hospital}</label>
                    <select 
                      value={selectedHospital}
                      onChange={(e) => setSelectedHospital(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm"
                    >
                      <option value="">{t.allHospitals}</option>
                      {ALL_HOSPITALS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t.gender}</label>
                    <select 
                      value={selectedGender}
                      onChange={(e) => setSelectedGender(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm"
                    >
                      <option value="">{t.anyGender}</option>
                      <option value="Male">{t.male}</option>
                      <option value="Female">{t.female}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t.fee}</label>
                    <select 
                      value={selectedFeeRange}
                      onChange={(e) => setSelectedFeeRange(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm"
                    >
                      {FEE_RANGES.map((range, idx) => (
                        <option key={idx} value={idx}>{language === 'bn' ? range.labelBn : range.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t.sortBy}</label>
                    <select 
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm"
                    >
                      <option value="rating">{t.sortRating}</option>
                      <option value="experience">{t.sortExperience}</option>
                      <option value="fee-low">{t.sortFeeLow}</option>
                      <option value="fee-high">{t.sortFeeHigh}</option>
                      <option value="name">{t.sortName}</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 sticky bottom-0 bg-white">
                  <div className="flex gap-3">
                    <button 
                      onClick={clearFilters}
                      className="flex-1 py-3 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50"
                    >
                      {t.clearAll}
                    </button>
                    <button 
                      onClick={() => setShowFilters(false)}
                      className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700"
                    >
                      {language === 'bn' ? 'দেখুন' : 'Apply'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          <main className="flex-1">
            {/* Results Count */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-slate-600">
                <span className="font-bold text-slate-800">{filteredDoctors.length}</span> {t.results}
              </p>
              
              {/* Active Filter Tags */}
              {activeFilterCount > 0 && (
                <div className="hidden md:flex items-center gap-2 flex-wrap">
                  {selectedSpecialty && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 text-xs rounded-full border border-teal-100">
                      {selectedSpecialty}
                      <button onClick={() => setSelectedSpecialty('')} className="hover:text-teal-900"><i className="fas fa-times"></i></button>
                    </span>
                  )}
                  {selectedLocation && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100">
                      {selectedLocation}
                      <button onClick={() => setSelectedLocation('')} className="hover:text-blue-900"><i className="fas fa-times"></i></button>
                    </span>
                  )}
                  {selectedGender && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full border border-purple-100">
                      {selectedGender}
                      <button onClick={() => setSelectedGender('')} className="hover:text-purple-900"><i className="fas fa-times"></i></button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Doctor Cards */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredDoctors.map(doctor => (
                <div 
                  key={doctor.id} 
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col sm:flex-row gap-5 hover:shadow-lg hover:border-teal-200 transition-all cursor-pointer group"
                  onClick={() => navigate(`/doctors/${doctor.id}`)}
                >
                  <div className="relative">
                    <img 
                      src={doctor.image} 
                      alt={doctor.name} 
                      className="w-24 h-24 rounded-xl object-cover bg-slate-100 group-hover:scale-105 transition-transform" 
                    />
                    <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
                      <i className="fas fa-star text-[10px]"></i>
                      {doctor.rating}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h3 className="text-lg font-bold text-slate-800 group-hover:text-teal-600 transition truncate">{doctor.name}</h3>
                    </div>
                    
                    <p className="text-sm text-slate-500 mb-2 truncate">{doctor.degrees}</p>
                    
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {doctor.specialties.map(s => (
                        <span key={s} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-100 font-medium">{s}</span>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                      <span className="flex items-center gap-1">
                        <i className="fas fa-briefcase-medical text-slate-400"></i>
                        {doctor.experience} {t.years}
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="fas fa-users text-slate-400"></i>
                        {doctor.patientCount}+ {t.patients}
                      </span>
                    </div>

                    <div className="flex items-center text-sm text-slate-600 mb-1">
                      <i className="fas fa-map-marker-alt w-4 text-center mr-2 text-teal-500"></i>
                      <span className="truncate">{doctor.chambers[0]?.name}, {doctor.chambers[0]?.area}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-slate-600">
                      <i className="fas fa-clock w-4 text-center mr-2 text-teal-500"></i>
                      {t.nextAvailable} <span className="text-green-600 font-medium ml-1">{doctor.nextAvailable}</span>
                    </div>
                  </div>

                  <div className="sm:border-l sm:border-slate-100 sm:pl-5 flex sm:flex-col justify-between items-end sm:items-center gap-3">
                    <div className="text-center">
                      <p className="text-xs text-slate-400 mb-1">{t.consultationFee}</p>
                      <p className="text-2xl font-bold text-slate-800">৳{doctor.chambers[0]?.fee}</p>
                    </div>
                    <button 
                      className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors whitespace-nowrap shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/doctors/${doctor.id}`);
                      }}
                    >
                      {t.bookAppointment}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredDoctors.length === 0 && (
              <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
                <i className="fas fa-user-md text-6xl mb-4 text-slate-200"></i>
                <p className="text-slate-500 text-lg">{t.noResults}</p>
                <button 
                  onClick={clearFilters}
                  className="mt-4 text-teal-600 font-medium hover:underline"
                >
                  {t.clearAll}
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
