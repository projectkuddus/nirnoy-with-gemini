import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * FamilyHealth Page
 * Redirects to the Patient Dashboard's Family tab
 * Family management is now integrated into the main dashboard
 */
export const FamilyHealth: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user && user.role === 'PATIENT') {
        // Redirect to patient dashboard family tab
        navigate('/patient-dashboard?tab=family', { replace: true });
      } else {
        // Not logged in or not a patient
        navigate('/patient-auth', { replace: true });
      }
    }
  }, [user, isLoading, navigate]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">পারিবারিক স্বাস্থ্য পৃষ্ঠায় যাচ্ছি...</p>
      </div>
    </div>
  );
};

export default FamilyHealth;
