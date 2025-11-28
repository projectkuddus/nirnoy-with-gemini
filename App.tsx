import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { UserRole } from './types';
import ErrorBoundary from './components/ErrorBoundary';
import { PageLoading } from './components/LoadingSpinner';
import FeedbackWidget from './components/FeedbackWidget';

// Lazy load pages for better performance
const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const DoctorSearch = lazy(() => import('./pages/DoctorSearch').then(m => ({ default: m.DoctorSearch })));
const DoctorProfile = lazy(() => import('./pages/DoctorProfile').then(m => ({ default: m.DoctorProfile })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const PatientAuth = lazy(() => import('./pages/PatientAuth').then(m => ({ default: m.PatientAuth })));
const PatientDashboard = lazy(() => import('./pages/PatientDashboard').then(m => ({ default: m.PatientDashboard })));
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard').then(m => ({ default: m.DoctorDashboard })));
const DoctorRegistration = lazy(() => import('./pages/DoctorRegistration').then(m => ({ default: m.DoctorRegistration })));
const MyAppointments = lazy(() => import('./pages/MyAppointments').then(m => ({ default: m.MyAppointments })));
const FamilyHealth = lazy(() => import('./pages/FamilyHealth').then(m => ({ default: m.FamilyHealth })));
const About = lazy(() => import('./pages/About').then(m => ({ default: m.About })));
const Privacy = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const Terms = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));
const Help = lazy(() => import('./pages/Help').then(m => ({ default: m.Help })));
const Pricing = lazy(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })));
const FreeCare = lazy(() => import('./pages/FreeCare').then(m => ({ default: m.FreeCare })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

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

  const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles: UserRole[]; redirectTo?: string; }> = 
    ({ children, allowedRoles, redirectTo = '/login' }) => {
      if (!allowedRoles.includes(userRole)) return <Navigate to={redirectTo} replace />;
      return <>{children}</>;
    };

  return (
    <ErrorBoundary>
      <LanguageProvider>
        <BrowserRouter>
          <FeedbackWidget />
          <Suspense fallback={<PageLoading message="Loading..." />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing onLogin={handleLogin} userRole={userRole} onLogout={handleLogout} />} />
              <Route path="/search" element={<DoctorSearch />} />
              <Route path="/doctors/:id" element={<DoctorProfile />} />
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
              <Route path="/patient-auth" element={<PatientAuth onLogin={() => handleLogin(UserRole.PATIENT)} />} />
              <Route path="/register" element={<PatientAuth onLogin={() => handleLogin(UserRole.PATIENT)} />} />
              <Route path="/doctor-registration" element={<DoctorRegistration />} />
              <Route path="/doctor-register" element={<DoctorRegistration />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/help" element={<Help />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/free-care" element={<FreeCare />} />
              <Route path="/ai-health" element={<FreeCare />} />
              <Route path="/ai-chat" element={<FreeCare />} />

              {/* Patient Routes */}
              <Route path="/patient-dashboard" element={<ProtectedRoute allowedRoles={[UserRole.PATIENT, UserRole.ADMIN]}><PatientDashboard onLogout={handleLogout} /></ProtectedRoute>} />
              <Route path="/my-health" element={<ProtectedRoute allowedRoles={[UserRole.PATIENT, UserRole.ADMIN]}><PatientDashboard onLogout={handleLogout} /></ProtectedRoute>} />
              <Route path="/my-appointments" element={<ProtectedRoute allowedRoles={[UserRole.PATIENT, UserRole.ADMIN]}><MyAppointments /></ProtectedRoute>} />
              <Route path="/family" element={<ProtectedRoute allowedRoles={[UserRole.PATIENT, UserRole.ADMIN]}><FamilyHealth /></ProtectedRoute>} />

              {/* Doctor Routes */}
              <Route path="/doctor-dashboard" element={<ProtectedRoute allowedRoles={[UserRole.DOCTOR, UserRole.ADMIN]}><DoctorDashboard onLogout={handleLogout} /></ProtectedRoute>} />
              <Route path="/my-practice" element={<ProtectedRoute allowedRoles={[UserRole.DOCTOR, UserRole.ADMIN]}><DoctorDashboard onLogout={handleLogout} /></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/*" element={<AdminDashboard />} />

              {/* 404 Page */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </LanguageProvider>
    </ErrorBoundary>
  );
};

export default App;
