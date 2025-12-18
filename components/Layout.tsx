import React, { useState } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentRole, currentPage, onNavigate }) => {
  const { user, role: authRole, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Use passed role or fallback to auth role
  const role = currentRole || authRole;

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    )},
    { id: 'houses', label: 'Properties', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )},
    { id: 'members', label: 'Members', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )},
  ];

  if (role === UserRole.ADMIN || role === UserRole.OPERATIONS_MANAGER) {
      menuItems.push(
        { id: 'housing-assignment', label: 'Housing Assignment', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
        )},
        { id: 'financials', label: 'Financials', icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )},
        { id: 'maintenance', label: 'Maintenance', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
        )},
        { id: 'health', label: 'System Health', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        )},
        { id: 'migration', label: 'Migration Tool', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
        )},
        { id: 'audit', label: 'SOP Audit Log', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
        )},
        { id: 'integrity', label: 'Integrity Check', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        )},
        { id: 'debug', label: 'Debug Console', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
        )}
      );
  }

  return (
    <div className="flex h-screen bg-matte-950 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside 
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-matte-900 border-r border-white/5 flex flex-col z-20 shadow-2xl relative overflow-hidden`}
      >
        {/* Glow effect behind logo */}
        <div className="absolute top-0 left-0 w-full h-32 bg-neon-blue/5 blur-3xl pointer-events-none"></div>
        
        <div className="p-4 relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-neon-blue/10 border border-neon-blue/30 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.2)] flex-shrink-0">
               <span className="text-neon-blue font-bold text-xl tracking-tight">E</span>
            </div>
            <div className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
              <span className="block text-lg font-bold text-white leading-none tracking-wide whitespace-nowrap">EcoSysThem</span>
              <span className="text-[10px] font-bold text-neon-blue uppercase tracking-widest whitespace-nowrap">Admin Console</span>
            </div>
          </div>
          
           {/* Sidebar Toggle Button */}
           <button 
             onClick={toggleSidebar}
             className={`p-1.5 rounded-lg bg-matte-800 text-neon-blue hover:bg-matte-700 hover:text-white transition-all duration-200 border border-transparent hover:border-neon-blue/30 ${!isSidebarOpen && 'mx-auto'}`}
             title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
           >
             <svg className={`w-4 h-4 transition-transform duration-300 ${isSidebarOpen ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
             </svg>
           </button>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto overflow-x-hidden">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full group ${currentPage === item.id ? 'nav-item-active' : 'nav-item-inactive'} nav-item flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center px-2'} py-3 transition-all duration-200`}
            >
              <span className={`flex-shrink-0 transition-transform duration-300 ${currentPage === item.id ? 'text-neon-blue' : 'text-slate-400 group-hover:text-white'}`}>
                {item.icon}
              </span>
              {isSidebarOpen && (
                 <span className={`ml-3 truncate animate-enter text-sm font-medium ${currentPage === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                   {item.label}
                 </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 bg-matte-950/30">
           {isSidebarOpen ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 mb-3 hover:border-neon-blue/30 transition-colors cursor-default">
                 <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-matte-800 to-matte-950 border border-neon-blue/30 flex items-center justify-center text-sm font-bold text-neon-blue shadow-inner flex-shrink-0">
                    {user?.email?.charAt(0).toUpperCase()}
                 </div>
                 <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-bold text-white truncate">{user?.displayName || 'User'}</p>
                    <p className="text-[10px] text-slate-400 truncate uppercase tracking-wider">{role}</p>
                 </div>
              </div>
           ) : (
              <div className="flex justify-center mb-3">
                 <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-matte-800 to-matte-950 border border-neon-blue/30 flex items-center justify-center text-sm font-bold text-neon-blue shadow-inner cursor-default" title={user?.email}>
                    {user?.email?.charAt(0).toUpperCase()}
                 </div>
              </div>
           )}
          
          <button 
            onClick={signOut}
            className={`btn btn-secondary w-full text-xs py-2 hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 transition-all whitespace-nowrap overflow-hidden flex items-center justify-center gap-2`}
          >
             {isSidebarOpen ? 'Sign Out' : (
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
             )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-matte-950 relative flex flex-col transition-all duration-300">
        {/* Background ambient glow */}
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-neon-blue/5 blur-[120px] rounded-full pointer-events-none"></div>
        
        <header className="px-8 py-4 flex justify-between items-center border-b border-white/5 bg-matte-950/50 backdrop-blur-md sticky top-0 z-20">
             <div>
                <h1 className="text-2xl font-bold text-white tracking-tight capitalize glow-text">
                    {menuItems.find(i => i.id === currentPage)?.label || currentPage}
                </h1>
                <p className="text-slate-400 text-xs mt-0.5">System Overview & Resource Management</p>
             </div>
             <div className="flex items-center gap-4">
                 <div className="hidden md:block text-right">
                    <div className="text-sm font-bold text-white">{user?.displayName || 'Admin'}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">{role}</div>
                 </div>
                <div className="text-xs font-mono text-neon-blue bg-neon-blue/10 px-2 py-1 rounded border border-neon-blue/20">
                    ONLINE
                </div>
             </div>
          </header>
          
          <div className="px-8 py-8 pb-20 animate-enter flex-1">
            {children}
          </div>
      </main>
    </div>
  );
};

export default Layout;
