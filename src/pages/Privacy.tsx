
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

export const Privacy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader showNav={true} showGetStarted={true} />
      
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-8 sm:p-10 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
            <p className="mt-2 text-sm text-slate-500">Last updated: October 26, 2023</p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <i className="fas fa-times text-2xl"></i>
          </button>
        </div>
        
        <div className="p-6 sm:p-10 space-y-8 text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-4">1. Introduction</h2>
            <p>
              Welcome to Nirnoy Care. We are committed to protecting your personal and medical information. 
              This Privacy Policy explains how we collect, use, and safeguard your data when you use our 
              telemedicine and practice management platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-4">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Personal Information:</strong> Name, phone number, age, and gender required for booking.</li>
              <li><strong>Medical Records:</strong> Prescriptions, diagnosis notes, and vitals entered by you or your doctor.</li>
              <li><strong>Usage Data:</strong> Information on how you interact with the dashboard and AI features.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-4">3. How We Use Your Data</h2>
            <p>We use your data to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Facilitate appointment bookings and manage doctor schedules.</li>
              <li>Provide AI-powered health summaries and insights (processed securely).</li>
              <li>Send appointment reminders via SMS or App notifications.</li>
              <li>Improve platform performance and user experience.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-4">4. AI & Data Processing</h2>
            <p>
              Our platform uses advanced AI (Gemini models) to summarize medical records and provide health intelligence. 
              Medical data processed by AI is transient and used solely to generate the response requested by you or your doctor.
              We do not use your personal health data to train public AI models.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-4">5. Data Security</h2>
            <p>
              We implement industry-standard security measures including encryption at rest and in transit to protect your sensitive health information. 
              Access to patient data is strictly restricted to the patient and their authorized healthcare providers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-4">6. Contact Us</h2>
            <p>
              If you have questions about this policy or your data, please contact our Data Protection Officer at 
              <a href="mailto:privacy@nirnoy.com" className="text-blue-600 hover:underline ml-1">privacy@nirnoy.com</a>.
            </p>
          </section>
        </div>

        <div className="bg-slate-50 px-6 py-6 sm:px-10 border-t border-slate-100">
           <button 
             onClick={() => navigate('/')}
             className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg"
           >
             I Understand
           </button>
        </div>
      </div>
      </div>
    </div>
  );
};
