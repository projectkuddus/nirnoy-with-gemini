import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { UserRole } from './types';
import { Navbar } from './components/Navbar';

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

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
  handleLogout: () => void;
}

// Wrapper to inject navigation props to Navbar which is outside Routes
const Layout: React.FC<LayoutProps> = ({ children, role, handleLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide Navbar on certain pages for clean UX
  const hideNavbar = ["/doctor-dashboard", "/my-health", "/my-appointments", "/patient-auth", "/patient-dashboard", "/family"].includes(location.pathname);

  return (
    <>
      {!hideNavbar && (
        <Navbar role={role} onLogout={handleLogout} navigate={navigate} />
      )}
      {children}
    </>
  );
};

const AppContent: React.FC = () => {
  const [role, setRole] = useState<UserRole>(UserRole.GUEST);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for persisted session
    const savedRole = localStorage.getItem("nirnoy_role");
    if (savedRole) {
      setRole(savedRole as UserRole);
    }
    setLoading(false);
  }, []);

  const handleLogin = (newRole: UserRole) => {
    localStorage.setItem("nirnoy_role", newRole);
    setRole(newRole);
    // Imperative navigation with replace: true to avoid back-button loops
    if (newRole === UserRole.DOCTOR) {
      navigate("/doctor-dashboard", { replace: true });
    } else if (newRole === UserRole.PATIENT) {
      navigate("/patient-dashboard", { replace: true });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("nirnoy_role");
    localStorage.removeItem("nirnoy_user");
    setRole(UserRole.GUEST);
    navigate("/", { replace: true });
  };

  const { t } = useLanguage();

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-blue-600 font-bold">
        {t('common.loading')}
      </div>
    );

  // Protected route wrapper
  const ProtectedRoute: React.FC<{ 
    children: React.ReactNode; 
    allowedRoles: UserRole[];
    redirectTo?: string;
  }> = ({ children, allowedRoles, redirectTo = '/login' }) => {
    if (!allowedRoles.includes(role)) {
      return <Navigate to={redirectTo} replace />;
    }
    return <>{children}</>;
  };

  return (
    <Layout role={role} handleLogout={handleLogout}>
      {/* Global Feedback Widget */}
      <FeedbackWidget />
      
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing onLogin={handleLogin} userRole={role} onLogout={handleLogout} />} />
        <Route path="/search" element={<DoctorSearch />} />
        <Route path="/doctors/:id" element={<DoctorProfile />} />
        <Route
          path="/login"
          element={
            role === UserRole.GUEST ? (
              <Login onLogin={handleLogin} />
            ) : (
              <Navigate
                to={
                  role === UserRole.DOCTOR
                    ? "/doctor-dashboard"
                    : "/patient-dashboard"
                }
                replace
              />
            )
          }
        />
        <Route path="/patient-auth" element={<PatientAuth onLogin={() => handleLogin(UserRole.PATIENT)} />} />
        <Route path="/register" element={<PatientAuth onLogin={() => handleLogin(UserRole.PATIENT)} />} />
        <Route path="/doctor-registration" element={<DoctorRegistration />} />
        <Route path="/doctor-register" element={<DoctorRegistration />} />
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
    </Layout>
  );
};

/**
 * Full Gemini UI with auth state, protected routes, Navbar, etc.
 * Uses HashRouter for compatibility with static hosting (GitHub Pages, etc.)
 */
const GeminiApp: React.FC = () => {
  return (
    <LanguageProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </LanguageProvider>
  );
};

export default GeminiApp;
