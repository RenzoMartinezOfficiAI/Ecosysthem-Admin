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
import { HousesPage } from './components/HousesPage'; // Import the new debug page
import { useAuth } from './src/context/AuthContext';
import { UserRole } from './types';
import { MOCK_SYSTEM_ERRORS, MOCK_SPONSORSHIPS } from './services/mockData';
import { useHouses } from './src/hooks/useHouses'; 
import { useMembers } from './src/hooks/useMembers';

const App: React.FC = () => {
  const { user, role, loading: authLoading } = useAuth(); // Use 'role' from AuthContext

  // Navigation State
  const [page, setPage] = useState('dashboard');

  // Application Data State - REAL-TIME HOOKS
  const { houses, loading: housesLoading, error: housesError } = useHouses();
  const { members, loading: membersLoading, error: membersError } = useMembers(); // Pass role if needed for RBAC filtering in the future
  
  // Static/Mock data for parts not yet fully backend-integrated
  const [errors] = useState(MOCK_SYSTEM_ERRORS);
  const [sponsorships] = useState(MOCK_SPONSORSHIPS);

  // Loading Screen
  if (authLoading || (user && (membersLoading || housesLoading))) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="text-slate-500 text-sm">Loading Application Data...</p>
        
        {/* Show error messages if loading takes too long or fails */}
        {(housesError || membersError) && (
            <div className="bg-rose-50 p-4 rounded text-rose-700 text-sm max-w-md text-center border border-rose-200">
                <p className="font-bold">Error Loading Data</p>
                {housesError && <p>Houses: {housesError.message}</p>}
                {membersError && <p>Members: {membersError.message}</p>}
                <p className="mt-2 text-xs text-rose-500">Check console for details. Ensure Firestore permissions are correct.</p>
                <button onClick={() => window.location.reload()} className="mt-3 px-3 py-1 bg-white border border-rose-300 rounded hover:bg-rose-50 text-rose-800">
                    Retry
                </button>
            </div>
        )}
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

  // Determine Role (Fallback to a safe default if role is missing, though AuthContext should handle it)
  // We use the REAL role from AuthContext now.
  const currentUserRole = role || UserRole.HOUSE_LEAD; // Default to lowest privilege if undefined

  // Router Logic
  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard houses={houses} members={members} errors={errors} />;
      case 'houses':
        return <Houses houses={houses} userRole={currentUserRole} />;
      case 'houses-debug': // Add route for debugging
        return <HousesPage />;
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
      // We removed onRoleChange because we are using real Auth roles now. 
      // Layout might expect it, so we pass a dummy function or update Layout props.
      // For now, let's keep it but make it a no-op or log warning if user tries to switch.
      onRoleChange={(r) => console.warn("Role switching is disabled in Production. Authenticate as that user.")}
      currentPage={page}
      onNavigate={setPage}
    >
      {renderPage()}
    </Layout>
  );
};

export default App;