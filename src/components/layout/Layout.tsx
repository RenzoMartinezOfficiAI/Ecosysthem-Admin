import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../../types';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate }) => {
  const { user, role, signOut } = useAuth();
  
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
    { id: 'housing-assignment', label: 'Housing Assignment', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
    )},
  ];

  if (role === UserRole.ADMIN || role === UserRole.OPERATIONS_MANAGER) {
      menuItems.push({ id: 'financials', label: 'Financials', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )});
  }

  return (
    <div className="flex h-screen bg-black-matte overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-dark-surface border-r border-white/5 flex flex-col z-20 shadow-2xl relative">
        {/* Glow effect behind logo */}
        <div className="absolute top-0 left-0 w-full h-32 bg-cyber-blue-500/5 blur-3xl pointer-events-none"></div>
        
        <div className="p-6 relative z-10">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 bg-cyber-blue-500/10 border border-cyber-blue-500/30 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.2)]">
               <span className="text-cyber-blue-500 font-bold text-xl tracking-tight">E</span>
            </div>
            <div>
              <span className="block text-lg font-bold text-white leading-none tracking-wide">EcoSysThem</span>
              <span className="text-[10px] font-bold text-cyber-blue-500 uppercase tracking-widest">Admin Console</span>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full group ${currentPage === item.id ? 'nav-item-active' : 'nav-item-inactive'} nav-item`}
            >
              <span className={`transition-transform duration-300 ${currentPage === item.id ? 'text-cyber-blue-500' : 'text-slate-500 group-hover:text-white'}`}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 bg-black-matte/30">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 mb-3 hover:border-cyber-blue-500/30 transition-colors cursor-default">
             <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyber-blue-900 to-black-matte border border-cyber-blue-500/30 flex items-center justify-center text-sm font-bold text-cyber-blue-500 shadow-inner">
                {user?.email?.charAt(0).toUpperCase()}
             </div>
             <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{user?.displayName || 'User'}</p>
                <p className="text-[10px] text-slate-400 truncate uppercase tracking-wider">{role}</p>
             </div>
          </div>
          <button 
            onClick={signOut}
            className="btn btn-secondary w-full text-xs py-2 hover:text-neon-red-500 hover:border-neon-red-500/30 hover:bg-neon-red-500/5 transition-all"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-black-matte relative">
        {/* Background ambient glow */}
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-cyber-blue-500/5 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <header className="px-8 py-8 flex justify-between items-end border-b border-white/5 bg-black-matte/50 backdrop-blur-md sticky top-0 z-20">
             <div>
                <h1 className="text-3xl font-bold text-white tracking-tight capitalize glow-text">
                    {menuItems.find(i => i.id === currentPage)?.label || currentPage}
                </h1>
                <p className="text-slate-400 mt-1 text-sm">System Overview & Resource Management</p>
             </div>
             <div className="text-right">
                <div className="text-xs font-mono text-cyber-blue-500 bg-cyber-blue-500/10 px-2 py-1 rounded border border-cyber-blue-500/20">
                    SYSTEM ONLINE
                </div>
             </div>
          </header>
          
          <div className="px-8 py-8 pb-20 animate-enter">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
