import React from 'react';
import { House, Member } from '../../../types';

interface DashboardProps {
  houses: House[];
  members: Member[];
}

const Dashboard: React.FC<DashboardProps> = ({ houses, members }) => {
  const totalCapacity = houses.reduce((acc, h) => acc + h.capacity, 0);
  const activeMembers = members.filter(m => m.status === 'ACTIVE').length;
  const occupancyRate = totalCapacity > 0 ? Math.round((activeMembers / totalCapacity) * 100) : 0;
  
  return (
    <div className="p-6 animate-enter">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {/* Stat Card 1: Occupancy Rate */}
         <div className="bg-matte-900 border border-matte-800 rounded-lg p-6 flex flex-col justify-between h-40 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-neon-blue-500/5 blur-2xl rounded-full group-hover:bg-neon-blue-500/10 transition-all duration-500"></div>
            
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex justify-between items-start">
                <h3 className="text-white text-sm font-bold uppercase tracking-widest">Occupancy</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${occupancyRate > 90 ? 'bg-neon-amber-500/10 text-neon-amber-500 border-neon-amber-500/20' : 'bg-neon-green-500/10 text-neon-green-500 border-neon-green-500/20'}`}>
                   {occupancyRate > 90 ? 'CRITICAL' : 'OPTIMAL'}
                </span>
              </div>
              
              <div className="flex items-baseline gap-2">
                 <span className={`text-4xl font-bold tracking-tight ${occupancyRate > 90 ? 'text-neon-amber-500' : 'text-neon-green-500'}`}>{occupancyRate}%</span>
                 <span className="text-xs text-slate-500">Capacity</span>
              </div>

               <div className="w-full bg-black/50 rounded-full h-1.5 overflow-hidden border border-white/5 mt-2">
                  <div className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_currentColor] ${occupancyRate > 90 ? 'bg-neon-amber-500 text-neon-amber-500' : 'bg-neon-green-500 text-neon-green-500'}`} style={{ width: `${occupancyRate}%` }}></div>
               </div>
            </div>
         </div>
         
         {/* Stat Card 2: Portfolio Health */}
         <div className="bg-matte-900 border border-matte-800 rounded-lg p-6 flex flex-col justify-between h-40 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-neon-purple-500/5 blur-2xl rounded-full group-hover:bg-neon-purple-500/10 transition-all duration-500"></div>
            
            <div className="relative z-10 flex flex-col h-full justify-between">
               <h3 className="text-white text-sm font-bold uppercase tracking-widest">Portfolio Status</h3>
               <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white tracking-tight">
                     {houses.filter(h => h.status === 'ONLINE').length}
                  </span>
                  <span className="text-sm font-medium text-slate-500">/ {houses.length} Active</span>
               </div>
               <div className="text-xs text-slate-500 font-medium truncate">
                  Properties currently online
               </div>
            </div>
         </div>

         {/* Stat Card 3: Total Residents */}
         <div className="bg-matte-900 border border-matte-800 rounded-lg p-6 flex flex-col justify-between h-40 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-24 h-24 bg-neon-blue-500/5 blur-2xl rounded-full group-hover:bg-neon-blue-500/10 transition-all duration-500"></div>
            <div className="relative z-10 flex flex-col h-full justify-between">
               <h3 className="text-white text-sm font-bold uppercase tracking-widest">Residents</h3>
               <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-neon-blue-500 tracking-tight">{activeMembers}</span>
                  <span className="text-sm font-medium text-slate-500">Active</span>
               </div>
             <div className="text-xs text-slate-500 font-medium truncate">
               Total housed across sectors
            </div>
            </div>
         </div>

         {/* Stat Card 4: Quick Actions / System Status */}
         <div className="bg-matte-900 border border-matte-800 rounded-lg p-6 flex flex-col justify-between h-40 relative overflow-hidden group">
            <div className="relative z-10 flex flex-col h-full justify-between">
               <h3 className="text-white text-sm font-bold uppercase tracking-widest">System Status</h3>
               <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-neon-green-500 shadow-[0_0_8px_rgba(74,222,128,0.5)] animate-pulse"></div>
                  <span className="text-lg font-bold text-white">Operational</span>
               </div>
               <div className="text-xs text-slate-500 font-medium">
                  All systems nominal
               </div>
            </div>
         </div>

         {/* Large Widgets Section - Spanning Columns */}
         
         {/* Occupancy Trends - Spans 2 columns on large screens */}
          <div className="md:col-span-2 bg-matte-900 border border-matte-800 rounded-lg p-8 min-h-[300px] flex flex-col items-center justify-center text-center relative overflow-hidden">
             <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-slate-600 border border-white/5">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Occupancy Trends</h3>
              <p className="text-sm text-slate-500 max-w-sm">Historical data visualization module awaiting connection.</p>
          </div>

           {/* System Notifications - Spans 2 columns on large screens */}
           <div className="md:col-span-2 bg-matte-900 border border-matte-800 rounded-lg p-8 min-h-[300px] flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-slate-600 border border-white/5">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">System Notifications</h3>
              <p className="text-sm text-slate-500 max-w-sm">No critical alerts requiring immediate operational attention.</p>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
