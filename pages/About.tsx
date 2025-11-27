
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

export const About: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <PageHeader showNav={true} showGetStarted={true} />
      
      {/* Hero */}
      <section className="relative pt-28 pb-20 bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-5xl font-bold mb-6">Revolutionizing Healthcare in Bangladesh</h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Nirnoy Care is bridging the gap between patients and doctors through intelligent, data-driven technology.
          </p>
        </div>
      </section>

      {/* Mission & Story */}
      <section className="py-20 container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
             <div className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4">Our Mission</div>
             <h2 className="text-3xl font-bold text-slate-800 mb-6">Making Quality Healthcare Accessible & Efficient</h2>
             <div className="space-y-4 text-slate-600 leading-relaxed">
               <p>
                 In Dhaka, millions of patients waste countless hours in waiting rooms, often for just a few minutes of consultation. Medical records are fragmented, paper-based, and easily lost.
               </p>
               <p>
                 <strong>Nirnoy Care</strong> was born from this frustration. We believe that healthcare should be synchronized, not chaotic. By leveraging AI and real-time data, we empower doctors to manage their practice efficiently and patients to take control of their health journey.
               </p>
             </div>
          </div>
          <div className="relative">
             <div className="absolute inset-0 bg-blue-500 rounded-2xl rotate-3 opacity-20"></div>
             <img 
               src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
               alt="Doctors Team" 
               className="relative rounded-2xl shadow-2xl z-10" 
             />
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 bg-white border-y border-slate-100">
        <div className="container mx-auto px-4">
           <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-800">Why We Do It</h2>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 text-center hover:shadow-lg transition">
                 <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
                    <i className="fas fa-users"></i>
                 </div>
                 <h3 className="text-xl font-bold mb-3">Patient Centric</h3>
                 <p className="text-slate-500 text-sm">We build every feature with the patient's convenience and well-being in mind.</p>
              </div>
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 text-center hover:shadow-lg transition">
                 <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
                    <i className="fas fa-brain"></i>
                 </div>
                 <h3 className="text-xl font-bold mb-3">Data Driven</h3>
                 <p className="text-slate-500 text-sm">We use advanced AI to turn raw medical data into actionable health insights.</p>
              </div>
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 text-center hover:shadow-lg transition">
                 <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
                    <i className="fas fa-shield-alt"></i>
                 </div>
                 <h3 className="text-xl font-bold mb-3">Trust & Privacy</h3>
                 <p className="text-slate-500 text-sm">Your health data is sacred. We protect it with enterprise-grade security.</p>
              </div>
           </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center">
         <h2 className="text-3xl font-bold text-slate-800 mb-6">Ready to experience better healthcare?</h2>
         <button 
           onClick={() => navigate('/search')}
           className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 transition"
         >
            Find a Doctor Now
         </button>
      </section>
      
      {/* Footer Simple */}
      <footer className="bg-slate-900 text-slate-400 py-8 text-center text-sm">
         <p>&copy; 2025 Nirnoy Health Tech Ltd.</p>
      </footer>
    </div>
  );
};
