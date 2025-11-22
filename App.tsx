
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { DoctorSearch } from './pages/DoctorSearch';
import { PatientDashboard } from './pages/PatientDashboard';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { DoctorProfile } from './pages/DoctorProfile';
import { Privacy } from './pages/Privacy';
import { About } from './pages/About';
import { VoiceAgent } from './components/VoiceAgent';
import { UserRole } from './types';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
  handleLogout: () => void;
}

// Wrapper to inject navigation props to Navbar which is outside Routes
const Layout: React.FC<LayoutProps> = ({ children, role, handleLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide Navbar and Voice Agent on Doctor Dashboard to give it a "Cockpit" feel
  const isDoctorDashboard = location.pathname === '/doctor-dashboard';

  return (
    <>
      {!isDoctorDashboard && <Navbar role={role} onLogout={handleLogout} navigate={navigate} />}
      {children}
      {!isDoctorDashboard && <VoiceAgent />}
    </>
  );
};

const AppContent: React.FC = () => {
  const [role, setRole] = useState<UserRole>(UserRole.GUEST);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for persisted session
    const savedRole = localStorage.getItem('nirnoy_role');
    if (savedRole) {
      setRole(savedRole as UserRole);
    }
    setLoading(false);
  }, []);

  const handleLogin = (newRole: UserRole) => {
    localStorage.setItem('nirnoy_role', newRole);
    setRole(newRole);
    // Imperative navigation with replace: true to avoid back-button loops
    if (newRole === UserRole.DOCTOR) {
      navigate('/doctor-dashboard', { replace: true });
    } else if (newRole === UserRole.PATIENT) {
      navigate('/patient-dashboard', { replace: true });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nirnoy_role');
    setRole(UserRole.GUEST);
    navigate('/', { replace: true });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-primary font-bold">Loading Nirnoy Care...</div>;

  return (
    <Layout role={role} handleLogout={handleLogout}>
      <Routes>
        <Route 
          path="/" 
          element={<Landing />} 
        />
        <Route 
          path="/login" 
          element={
            role === UserRole.GUEST 
              ? <Login onLogin={handleLogin} /> 
              : <Navigate to={role === UserRole.DOCTOR ? "/doctor-dashboard" : "/patient-dashboard"} replace />
          } 
        />
        <Route path="/search" element={<DoctorSearch />} />
        <Route path="/doctors/:id" element={<DoctorProfile />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/about" element={<About />} />
        
        {/* Protected Routes */}
        <Route 
          path="/patient-dashboard" 
          element={role === UserRole.PATIENT ? <PatientDashboard /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/doctor-dashboard" 
          element={role === UserRole.DOCTOR ? <DoctorDashboard onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
        />
      </Routes>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
