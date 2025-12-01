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
const Privacy = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const Terms = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));
const Help = lazy(() => import('./pages/Help').then(m => ({ default: m.Help })));
const Pricing = lazy(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })));
const FreeCare = lazy(() => import('./pages/FreeCare').then(m => ({ default: m.FreeCare })));
const FAQ = lazy(() => import('./pages/FAQ').then(m => ({ default: m.FAQ })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

// Protected Route Component
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  allowedRoles: ('PATIENT' | 'DOCTOR' | 'ADMIN')[];
  redirectTo?: string;
}> = ({ children, allowedRoles, redirectTo = '/patient-auth' }) => {
  const { user, isLoading, role } = useAuth();
  
  if (isLoading) {
    return <PageLoading message="Loading..." />;
  }
  
  if (!user || !allowedRoles.includes(role as any)) {
    return <Navigate to={redirectTo} replace />;
  }
  
  return <>{children}</>;
};

// Doctor Protected Route (checks approval status)
const DoctorProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <PageLoading message="Loading..." />;
  }
  
  if (!user || user.role !== 'DOCTOR') {
    return <Navigate to="/doctor-registration" replace />;
  }
  
  // Check if doctor is approved
  if ('status' in user && user.status !== 'approved') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-clock text-amber-600 text-2xl"></i>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">অপেক্ষমাণ অনুমোদন</h2>
          <p className="text-slate-600 mb-4">
            আপনার অ্যাকাউন্ট এডমিন অনুমোদনের অপেক্ষায় রয়েছে। অনুমোদন পেলে আপনাকে জানানো হবে।
          </p>
          <p className="text-sm text-slate-500">
            Your account is pending admin approval. You'll be notified once approved.
          </p>
          {'status' in user && user.status === 'rejected' && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                আপনার আবেদন প্রত্যাখ্যান করা হয়েছে। কারণ: {('rejectionReason' in user && user.rejectionReason) || 'N/A'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};

// Main App Routes
const AppRoutes: React.FC = () => {
  const { user, logout, role } = useAuth();
  
  // Convert role for Landing page compatibility
  const userRole = role === 'PATIENT' ? 'PATIENT' : role === 'DOCTOR' ? 'DOCTOR' : role === 'ADMIN' ? 'ADMIN' : 'GUEST';
  
  const handleLogin = () => {
    // Login is now handled by AuthContext
  };
  
  const handleLogout = async () => {
    await logout();
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing onLogin={handleLogin as any} userRole={userRole as any} onLogout={handleLogout} />} />
      <Route path="/search" element={<DoctorSearch />} />
      <Route path="/doctors/:id" element={<DoctorProfile />} />
      <Route path="/login" element={<Login onLogin={handleLogin as any} />} />
      <Route path="/patient-auth" element={<PatientAuth onLogin={() => handleLogin()} />} />
      <Route path="/register" element={<PatientAuth onLogin={() => handleLogin()} />} />
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
      <Route path="/faq" element={<FAQ />} />
      <Route path="/help" element={<FAQ />} />

      {/* Patient Routes */}
      <Route 
        path="/patient-dashboard" 
        element={
          <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
            <PatientDashboard onLogout={handleLogout} />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/my-health" 
        element={
          <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
            <PatientDashboard onLogout={handleLogout} />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/my-appointments" 
        element={
          <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
            <MyAppointments />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/family" 
        element={
          <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
            <FamilyHealth />
          </ProtectedRoute>
        } 
      />

      {/* Doctor Routes */}
      <Route 
        path="/doctor-dashboard" 
        element={
          <DoctorProtectedRoute>
            <DoctorDashboard onLogout={handleLogout} />
          </DoctorProtectedRoute>
        } 
      />
      <Route 
        path="/my-practice" 
        element={
          <DoctorProtectedRoute>
            <DoctorDashboard onLogout={handleLogout} />
          </DoctorProtectedRoute>
        } 
      />

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/*" element={<AdminDashboard />} />

      {/* 404 Page */}
      <Route path="/404" element={<NotFound />} />
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
            {/* Global Feedback Widget */}
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
