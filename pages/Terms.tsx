import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { PageHeader } from '../components/PageHeader';

export const Terms: React.FC = () => {
  const { language } = useLanguage();
  const lastUpdated = 'November 28, 2024';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <PageHeader />
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {language === 'bn' ? 'সেবার শর্তাবলী' : 'Terms of Service'}
          </h1>
          <p className="text-gray-600">Last Updated: {lastUpdated}</p>
        </div>

        <div className="prose prose-lg max-w-none space-y-8">
          <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700">
              Welcome to Nirnoy Health. These Terms of Service govern your use of our website www.nirnoy.ai and related services.
            </p>
          </section>

          <section className="bg-red-50 rounded-2xl p-8 border border-red-100">
            <h2 className="text-2xl font-bold text-red-800 mb-4">⚠️ Medical Disclaimer</h2>
            <p className="text-red-800">
              <strong>IMPORTANT:</strong> Nirnoy is not a substitute for professional medical advice, diagnosis, or treatment. 
              In case of emergency, please call 999 immediately.
            </p>
          </section>

          <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Our Services</h2>
            <ul className="space-y-2 text-gray-700">
              <li>• Doctor search and appointment booking</li>
              <li>• AI-powered health assistance</li>
              <li>• Health record management</li>
              <li>• Family health tracking</li>
              <li>• Voice-based health assistance</li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Responsibilities</h2>
            <ul className="space-y-2 text-gray-700">
              <li>✓ Provide accurate and truthful information</li>
              <li>✓ Maintain the security of your account</li>
              <li>✓ Not misuse the platform</li>
              <li>✓ Respect the privacy of others</li>
              <li>✓ Comply with the laws of Bangladesh</li>
            </ul>
          </section>

          <section className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">📧 Contact Us</h2>
            <p className="mb-4">If you have any questions about these terms:</p>
            <div className="space-y-2">
              <p>📧 Email: legal@nirnoy.ai</p>
              <p>🌐 Website: www.nirnoy.ai</p>
            </div>
          </section>
        </div>

        <div className="flex flex-wrap justify-center gap-6 mt-12 pt-8 border-t border-gray-200">
          <Link to="/privacy" className="text-blue-600 hover:text-blue-700 font-medium">Privacy Policy</Link>
          <Link to="/help" className="text-blue-600 hover:text-blue-700 font-medium">Help Center</Link>
          <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">Home</Link>
        </div>
      </div>
    </div>
  );
};

export default Terms;
