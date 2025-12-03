import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import ErrorBoundary from './components/ErrorBoundary';
import { FeedbackWidget } from './components/FeedbackWidget';

// Lazy load pages
const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const PatientAuth = lazy(() => import('./pages/PatientAuth').then(m => ({ default: m.PatientAuth })));
const PatientDashboard = lazy(() => import('./pages/PatientDashboard').then(m => ({ default: m.PatientDashboard })));
const DoctorRegistration = lazy(() => import('./pages/DoctorRegistration').then(m => ({ default: m.DoctorRegistration })));
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard').then(m => ({ default: m.DoctorDashboard })));
const DoctorSearch = lazy(() => import('./pages/DoctorSearch').then(m => ({ default: m.DoctorSearch })));
const DoctorProfile = lazy(() => import('./pages/DoctorProfile').then(m => ({ default: m.DoctorProfile })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboardV2').then(m => ({ default: m.AdminDashboardV2 })));
const MyAppointments = lazy(() => import('./pages/MyAppointments').then(m => ({ default: m.MyAppointments })));
const FamilyHealth = lazy(() => import('./pages/FamilyHealth').then(m => ({ default: m.FamilyHealth })));
const About = lazy(() => import('./pages/About').then(m => ({ default: m.About })));
const Pricing = lazy(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })));
const Help = lazy(() => import('./pages/Help').then(m => ({ default: m.Help })));
const Privacy = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const Terms = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));
const FAQ = lazy(() => import('./pages/FAQ').then(m => ({ default: m.FAQ })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

// Loading component
const PageLoading: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">{message}</p>
    </div>
  </div>
);

// ============ PROTECTED ROUTE - FIXED ============
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  allowedRoles: string[];
  redirectTo?: string;
}> = ({ children, allowedRoles, redirectTo = '/patient-auth' }) => {
  const { user, isLoading, role } = useAuth();
  
  console.log('[ProtectedRoute] Check:', { user: user?.name, role, isLoading, allowedRoles });
  
  // Show loading while auth is initializing
  if (isLoading) {
    return <PageLoading message="লোড হচ্ছে..." />;
  }
  
  // No user = redirect to login
  if (!user) {
    console.log('[ProtectedRoute] No user, redirecting to:', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }
  
  // Check role (case-insensitive)
  const userRole = (role || '').toUpperCase();
  const allowed = allowedRoles.map(r => r.toUpperCase());
  
  if (!allowed.includes(userRole)) {
    console.log('[ProtectedRoute] Role mismatch:', { userRole, allowed });
    return <Navigate to={redirectTo} replace />;
  }
  
  console.log('[ProtectedRoute] Access granted for:', user.name);
  return <>{children}</>;
};

// Doctor Protected Route
const DoctorProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, role } = useAuth();
  
  if (isLoading) {
    return <PageLoading message="লোড হচ্ছে..." />;
  }
  
  const userRole = (role || '').toUpperCase();
  
  if (!user || userRole !== 'DOCTOR') {
    return <Navigate to="/doctor-registration" replace />;
  }
  
  if ('status' in user && user.status !== 'approved') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⏳</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">অপেক্ষমাণ অনুমোদন</h2>
          <p className="text-slate-600 mb-4">আপনার অ্যাকাউন্ট এডমিন অনুমোদনের অপেক্ষায় আছে।</p>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};

// Main App Routes
const AppRoutes: React.FC = () => {
  const handleLogout = () => {
    window.location.href = '/';
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/patient-auth" element={<PatientAuth />} />
      <Route path="/register" element={<PatientAuth />} />
      <Route path="/login" element={<PatientAuth />} />
      <Route path="/doctor-registration" element={<DoctorRegistration />} />
      <Route path="/search" element={<DoctorSearch />} />
      <Route path="/doctors" element={<DoctorSearch />} />
      <Route path="/doctor/:id" element={<DoctorProfile />} />
      <Route path="/doctors/:id" element={<DoctorProfile />} />
      <Route path="/about" element={<About />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/help" element={<Help />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/faq" element={<FAQ />} />

      {/* Patient Protected Routes */}
      <Route 
        path="/patient-dashboard" 
        element={
          <ProtectedRoute allowedRoles={['PATIENT', 'patient', 'ADMIN', 'admin']}>
            <PatientDashboard onLogout={handleLogout} />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['PATIENT', 'patient', 'ADMIN', 'admin']}>
            <PatientDashboard onLogout={handleLogout} />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/appointments" 
        element={
          <ProtectedRoute allowedRoles={['PATIENT', 'patient', 'ADMIN', 'admin']}>
            <MyAppointments />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/family" 
        element={
          <ProtectedRoute allowedRoles={['PATIENT', 'patient', 'ADMIN', 'admin']}>
            <FamilyHealth />
          </ProtectedRoute>
        } 
      />

      {/* Doctor Protected Routes */}
      <Route 
        path="/doctor-dashboard" 
        element={
          <DoctorProtectedRoute>
            <DoctorDashboard onLogout={handleLogout} />
          </DoctorProtectedRoute>
        } 
      />
      <Route 
        path="/doctor-panel" 
        element={
          <DoctorProtectedRoute>
            <DoctorDashboard onLogout={handleLogout} />
          </DoctorProtectedRoute>
        } 
      />


      {/* Admin Routes - AdminDashboard has its own password auth */}
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/*" element={<AdminDashboard />} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />

      {/* 404 */}
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// Main App Component
function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <FeedbackWidget />
            <Suspense fallback={<PageLoading message="লোড হচ্ছে..." />}>
              <AppRoutes />
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
