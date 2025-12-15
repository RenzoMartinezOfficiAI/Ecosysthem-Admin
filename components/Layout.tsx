
import React, { useState } from 'react';
import { UserRole } from '../types';
import { useAuth } from '../src/context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentRole, onRoleChange, currentPage, onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { signOut, user } = useAuth();

  const isAdmin = [UserRole.ADMIN, UserRole.OPERATIONS_MANAGER].includes(currentRole);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'houses', label: 'Houses', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { id: 'members', label: 'Members', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    
    // Only show Housing Assignment to Admins/Ops
    ...(isAdmin ? [{ id: 'housing-assignment', label: 'Housing Assignment', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' }] : []),
    
    { id: 'maintenance', label: 'Maintenance', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    
    { id: 'financials', label: 'Financials', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];
  
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center">
        <div className="font-bold text-lg">EcosysTHEM</div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 transition-transform duration-300 transform 
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 md:static md:inset-auto md:flex md:flex-col
      `}>
        <div className="p-6 border-b border-slate-800">
          <div className="font-bold text-xl text-white tracking-wider">EcosysTHEM</div>
          <div className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Admin Console</div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 
                ${currentPage === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
          
          {isAdmin && (
            <>
              <button
                onClick={() => { onNavigate('health'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 
                ${currentPage === 'health' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
              >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 <span className="font-medium">System Health</span>
              </button>

              <div className="mt-8 pt-4 border-t border-slate-800">
                  <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Admin Tools</p>
                  <button
                      onClick={() => { onNavigate('migration'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors duration-200 
                      ${currentPage === 'migration' ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                      <span>Migration Tool</span>
                  </button>
                  <button
                      onClick={() => { onNavigate('audit'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors duration-200 
                      ${currentPage === 'audit' ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                      <span>SOP Audit Log</span>
                  </button>
                  
                   <button
                      onClick={() => { onNavigate('integrity'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors duration-200 
                      ${currentPage === 'integrity' ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span>Integrity Check</span>
                  </button>
                   <button
                      onClick={() => { onNavigate('debug'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors duration-200 
                      ${currentPage === 'debug' ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                      <span>Debug Console</span>
                  </button>
              </div>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="mb-4">
             <button onClick={signOut} className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-sm transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
             </button>
          </div>

           {/* Role Badge instead of Simulator */}
           <div className="bg-slate-800 rounded-lg p-3 flex flex-col items-center">
            <span className="text-xs text-slate-500 uppercase font-bold mb-1">Authenticated As</span>
            <span className={`px-2 py-1 rounded text-xs font-bold ${
                currentRole === UserRole.ADMIN ? 'bg-indigo-900 text-indigo-200' : 
                currentRole === UserRole.HOUSE_LEAD ? 'bg-emerald-900 text-emerald-200' : 
                'bg-slate-700 text-slate-300'
            }`}>
                {currentRole}
            </span>
          </div>

          <div className="mt-4 text-xs text-slate-500 text-center">
             status
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="bg-white shadow-sm border-b border-slate-200 p-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800 capitalize">
            {currentPage === 'debug' ? 'System Debugger' : 
             currentPage === 'health' ? 'System Health' :
             currentPage === 'migration' ? 'Migration Tool' :
             currentPage === 'audit' ? 'SOP Audit Log' :
             currentPage === 'housing-assignment' ? 'Housing Assignment' :
             currentPage === 'integrity' ? 'Financial Integrity Monitor' :
             currentPage}
          </h1>
          <div className="flex items-center space-x-4">
             <div className="hidden md:block text-right cursor-pointer" onClick={() => onNavigate('profile')}>
                <div className="text-sm font-medium text-slate-900 hover:text-indigo-600 transition-colors">{user?.displayName || 'Admin User'}</div>
                <div className="text-xs text-slate-500">{currentRole}</div>
             </div>
             <button onClick={() => onNavigate('profile')} className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 hover:ring-2 hover:ring-indigo-300 transition-all">
                {user?.displayName ? user.displayName.charAt(0) : 'U'}
             </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;