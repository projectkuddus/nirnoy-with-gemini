import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { UserRole } from './types';

// Pages
import { Landing } from './pages/Landing';
import { DoctorSearch } from './pages/DoctorSearch';
import { DoctorProfile } from './pages/DoctorProfile';
import { Login } from './pages/Login';
import { PatientAuth } from './pages/PatientAuth';
import { PatientDashboard } from './pages/PatientDashboard';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { DoctorRegistration } from './pages/DoctorRegistration';
import { MyAppointments } from './pages/MyAppointments';
import { FamilyHealth } from './pages/FamilyHealth';
import { About } from './pages/About';
import { Privacy } from './pages/Privacy';
import { Help } from './pages/Help';
import { Pricing } from './pages/Pricing';
import { FreeCare } from './pages/FreeCare';
import FeedbackWidget from './components/FeedbackWidget';

const App: React.FC = () => {
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const stored = localStorage.getItem('nirnoy_role');
    return (stored as UserRole) || UserRole.GUEST;
  });

  const handleLogin = (role: UserRole) => {
    setUserRole(role);
    localStorage.setItem('nirnoy_role', role);
  };

  const handleLogout = () => {
    setUserRole(UserRole.GUEST);
    localStorage.removeItem('nirnoy_role');
    localStorage.removeItem('nirnoy_user');
  };

  // Protected route wrapper
  const ProtectedRoute: React.FC<{ 
    children: React.ReactNode; 
    allowedRoles: UserRole[];
    redirectTo?: string;
  }> = ({ children, allowedRoles, redirectTo = '/login' }) => {
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to={redirectTo} replace />;
    }
    return <>{children}</>;
  };

  return (
    <LanguageProvider>
      <BrowserRouter>
        {/* Global Feedback Widget */}
        <FeedbackWidget />
        
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing onLogin={handleLogin} userRole={userRole} onLogout={handleLogout} />} />
          <Route path="/search" element={<DoctorSearch />} />
          <Route path="/doctors/:id" element={<DoctorProfile />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/patient-auth" element={<PatientAuth onLogin={() => handleLogin(UserRole.PATIENT)} />} />
          <Route path="/doctor-registration" element={<DoctorRegistration />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/help" element={<Help />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/free-care" element={<FreeCare />} />
          <Route path="/ai-health" element={<FreeCare />} />

          {/* Patient Routes */}
          <Route 
            path="/patient-dashboard" 
            element={
              <ProtectedRoute allowedRoles={[UserRole.PATIENT, UserRole.ADMIN]}>
                <PatientDashboard onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/my-health" 
            element={
              <ProtectedRoute allowedRoles={[UserRole.PATIENT, UserRole.ADMIN]}>
                <PatientDashboard onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/my-appointments" 
            element={
              <ProtectedRoute allowedRoles={[UserRole.PATIENT, UserRole.ADMIN]}>
                <MyAppointments />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/family" 
            element={
              <ProtectedRoute allowedRoles={[UserRole.PATIENT, UserRole.ADMIN]}>
                <FamilyHealth />
              </ProtectedRoute>
            } 
          />

          {/* Doctor Routes */}
          <Route 
            path="/doctor-dashboard" 
            element={
              <ProtectedRoute allowedRoles={[UserRole.DOCTOR, UserRole.ADMIN]}>
                <DoctorDashboard onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/my-practice" 
            element={
              <ProtectedRoute allowedRoles={[UserRole.DOCTOR, UserRole.ADMIN]}>
                <DoctorDashboard onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
};

export default App;

