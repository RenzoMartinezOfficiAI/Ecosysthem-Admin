import React, { useState } from 'react';
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
import { UserRole } from './types';
import { MOCK_SYSTEM_ERRORS, MOCK_SPONSORSHIPS } from './services/mockData';
import { useHouses } from './src/hooks/useHouses'; 
import { useMembers } from './src/hooks/useMembers';

const App: React.FC = () => {
  const { user, loading } = useAuth();

  // Navigation State
  const [page, setPage] = useState('dashboard');
  
  // Auth/Role State (Simulated for Demo)
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(UserRole.ADMIN);

  // Application Data State - REAL-TIME HOOKS
  const { houses, loading: housesLoading } = useHouses();
  const { members, loading: membersLoading } = useMembers(); 
  
  // Static/Mock data for parts not yet fully backend-integrated
  const [errors] = useState(MOCK_SYSTEM_ERRORS);
  const [sponsorships] = useState(MOCK_SPONSORSHIPS);

  if (loading || (user && (membersLoading || housesLoading))) {
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

  // Router Logic
  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard houses={houses} members={members} errors={errors} />;
      case 'houses':
        return <Houses houses={houses} userRole={currentUserRole} />;
      case 'members':
        return <Members members={members} houses={houses} userRole={currentUserRole} />;
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