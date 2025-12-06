import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Houses from './components/Houses';
import Members from './components/Members';
import Financials from './components/Financials';
import FinancialDebug from './components/admin/FinancialDebug';
import FinancialIntegrity from './components/admin/FinancialIntegrity';
import SystemHealth from './components/admin/SystemHealth';
import MigrationTool from './components/admin/MigrationTool';
import AuditLog from './components/admin/AuditLog';
import Auth from './components/Auth';
import Profile from './components/Profile';
import { useAuth } from './src/context/AuthContext';
import { UserRole, House } from './types';
import { MOCK_SYSTEM_ERRORS, MOCK_SPONSORSHIPS } from './services/mockData';
import { fetchHouses } from './src/services/houseService';
import { useMembers } from './src/hooks/useMembers';

const App: React.FC = () => {
  const { user, loading } = useAuth();

  // Navigation State
  const [page, setPage] = useState('dashboard');
  
  // Auth/Role State (Simulated)
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(UserRole.ADMIN);

  // Application Data State
  const [houses, setHouses] = useState<House[]>([]);
  const { members, loading: membersLoading, reload: reloadMembers } = useMembers(); // Fetch real members
  const [errors] = useState(MOCK_SYSTEM_ERRORS);
  const [sponsorships] = useState(MOCK_SPONSORSHIPS);

  // Load Houses from Firestore
  const loadHouses = async () => {
    if (user) {
      try {
        const data = await fetchHouses();
        setHouses(data);
      } catch (err) {
        console.error("Failed to load houses:", err);
      }
    }
  };

  useEffect(() => {
    loadHouses();
  }, [user]);

  if (loading || (user && membersLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // If not logged in, show Auth (Login/Register)
  if (!user) {
    return <Auth />;
  }

  // If logged in but email not verified, show Verification Screen
  if (user && !user.emailVerified) {
    return <Auth needsVerification={true} email={user.email || ''} />;
  }

  // Router Logic (Simple hash router replacement)
  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard houses={houses} members={members} errors={errors} />;
      case 'houses':
        return <Houses houses={houses} userRole={currentUserRole} onRefresh={loadHouses} />;
      case 'members':
        return <Members members={members} houses={houses} userRole={currentUserRole} onRefresh={reloadMembers} />;
      case 'financials':
        return <Financials members={members} sponsorships={sponsorships} userRole={currentUserRole} />;
      case 'debug':
        return <FinancialDebug userRole={currentUserRole} />;
      case 'integrity':
        return <FinancialIntegrity userRole={currentUserRole} />;
      case 'health':
        return <SystemHealth />;
      case 'migration':
        return <MigrationTool />;
      case 'audit':
        return <AuditLog />;
      case 'profile':
        return <Profile />;
      default:
        return <Dashboard houses={houses} members={members} errors={errors} />;
    }
  };

  return (
    <Layout 
      currentRole={currentUserRole} 
      onRoleChange={setCurrentUserRole}
      currentPage={page}
      onNavigate={setPage}
    >
      {renderPage()}
    </Layout>
  );
};

export default App;