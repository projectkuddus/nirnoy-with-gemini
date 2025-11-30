import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
const HealthArticles = lazy(() => import('./pages/HealthArticles').then(m => ({ default: m.HealthArticles })));
const Privacy = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const Terms = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));
const Help = lazy(() => import('./pages/Help').then(m => ({ default: m.Help })));
const Pricing = lazy(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })));
const FreeCare = lazy(() => import('./pages/FreeCare').then(m => ({ default: m.FreeCare })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

// Protected Route Component using AuthContext
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  allowedRoles: ('PATIENT' | 'DOCTOR' | 'ADMIN')[]; 
  redirectTo?: string;
}> = ({ children, allowedRoles, redirectTo = '/login' }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <PageLoading message="Loading..." />;
  }
  
  if (!user || !allowedRoles.includes(user.role as any)) {
    return <Navigate to={redirectTo} replace />;
  }
  
  return <>{children}</>;
};

// Main App Routes
const AppRoutes: React.FC = () => {
  const { logout } = useAuth();
  
  const handleLogout = () => {
    logout();
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/search" element={<DoctorSearch />} />
      <Route path="/doctors/:id" element={<DoctorProfile />} />
      <Route path="/login" element={<Login onLogin={() => {}} />} />
      <Route path="/patient-auth" element={<PatientAuth />} />
      <Route path="/register" element={<PatientAuth />} />
      <Route path="/doctor-registration" element={<DoctorRegistration />} />
      <Route path="/doctor-register" element={<DoctorRegistration />} />
      <Route path="/about" element={<About />} />
      <Route path="/health" element={<HealthArticles />} />
      <Route path="/health/:articleId" element={<HealthArticles />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/help" element={<Help />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/free-care" element={<FreeCare />} />
      <Route path="/ai-health" element={<FreeCare />} />
      <Route path="/ai-chat" element={<FreeCare />} />

      {/* Patient Routes */}
      <Route path="/patient-dashboard" element={
        <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']} redirectTo="/patient-auth">
          <PatientDashboard onLogout={handleLogout} />
        </ProtectedRoute>
      } />
      <Route path="/my-health" element={
        <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']} redirectTo="/patient-auth">
          <PatientDashboard onLogout={handleLogout} />
        </ProtectedRoute>
      } />
      <Route path="/my-appointments" element={
        <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']} redirectTo="/patient-auth">
          <MyAppointments />
        </ProtectedRoute>
      } />
      <Route path="/family" element={
        <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']} redirectTo="/patient-auth">
          <FamilyHealth />
        </ProtectedRoute>
      } />

      {/* Doctor Routes */}
      <Route path="/doctor-dashboard" element={
        <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']} redirectTo="/doctor-registration">
          <DoctorDashboard onLogout={handleLogout} />
        </ProtectedRoute>
      } />
      <Route path="/my-practice" element={
        <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']} redirectTo="/doctor-registration">
          <DoctorDashboard onLogout={handleLogout} />
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/*" element={<AdminDashboard />} />

      {/* 404 Page */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <BrowserRouter>
            <FeedbackWidget />
            <Suspense fallback={<PageLoading message="Loading..." />}>
              <AppRoutes />
            </Suspense>
          </BrowserRouter>
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
