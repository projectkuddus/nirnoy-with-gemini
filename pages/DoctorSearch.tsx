
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_DOCTORS } from '../data/mockData';

export const DoctorSearch: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredDoctors = MOCK_DOCTORS.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Find a Doctor</h1>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4 flex-wrap">
             <div className="flex-1 relative min-w-[200px]">
               <i className="fas fa-search absolute left-3 top-3.5 text-slate-400"></i>
               <input 
                 type="text" 
                 placeholder="Search by name or specialty" 
                 className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
             </div>
             <select className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-600 outline-none">
               <option>Any Gender</option>
               <option>Male</option>
               <option>Female</option>
             </select>
             <select className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-600 outline-none">
               <option>Availability: Any</option>
               <option>Today</option>
               <option>Tomorrow</option>
             </select>
          </div>
        </div>

        {/* Doctor List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {filteredDoctors.map(doctor => (
             <div 
                key={doctor.id} 
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col sm:flex-row gap-5 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => navigate(`/doctors/${doctor.id}`)}
             >
                <img src={doctor.image} alt={doctor.name} className="w-24 h-24 rounded-lg object-cover bg-slate-100 group-hover:opacity-90 transition" />
                <div className="flex-1">
                   <div className="flex justify-between items-start">
                     <div>
                       <h3 className="text-lg font-bold text-slate-800 group-hover:text-primary transition">{doctor.name}</h3>
                       <p className="text-sm text-slate-500 mb-1">{doctor.degrees}</p>
                       <div className="flex flex-wrap gap-1 mb-2">
                         {doctor.specialties.map(s => (
                           <span key={s} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-100">{s}</span>
                         ))}
                       </div>
                     </div>
                     <div className="flex items-center bg-yellow-50 px-2 py-1 rounded text-yellow-700 text-xs font-bold">
                        <i className="fas fa-star mr-1 text-yellow-500"></i>
                        {doctor.rating}
                     </div>
                   </div>
                   
                   <div className="flex items-center text-sm text-slate-600 mb-2">
                     <i className="fas fa-map-marker-alt w-4 text-center mr-2 text-slate-400"></i>
                     {doctor.chambers[0]?.name}, {doctor.chambers[0]?.address}
                   </div>
                   
                   <div className="flex items-center text-sm text-slate-600 mb-4">
                     <i className="fas fa-clock w-4 text-center mr-2 text-slate-400"></i>
                     Next available: <span className="text-green-600 font-medium ml-1">{doctor.nextAvailable}</span>
                   </div>

                   <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div>
                         <p className="text-xs text-slate-500">Consultation Fee</p>
                         <p className="text-lg font-bold text-slate-800">৳ {doctor.chambers[0]?.fee}</p>
                      </div>
                      <button 
                        className="bg-primary hover:bg-secondary text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/doctors/${doctor.id}`);
                        }}
                      >
                        Book Appointment
                      </button>
                   </div>
                </div>
             </div>
           ))}
        </div>
        
        {filteredDoctors.length === 0 && (
           <div className="text-center py-20 text-slate-500">
             <i className="fas fa-user-md text-4xl mb-4 text-slate-300"></i>
             <p>No doctors found matching your search.</p>
           </div>
        )}
      </div>
    </div>
  );
};
