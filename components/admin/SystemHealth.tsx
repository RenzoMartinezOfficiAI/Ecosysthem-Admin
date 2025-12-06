
import React, { useState } from 'react';
import { SystemError, WorkOrder, InventoryItem } from '../../types';
import { MOCK_SYSTEM_ERRORS, MOCK_INVENTORY, MOCK_WORK_ORDERS } from '../../services/mockData';

const SystemHealth: React.FC = () => {
  const [errors, setErrors] = useState<SystemError[]>(MOCK_SYSTEM_ERRORS);
  const [workOrders] = useState<WorkOrder[]>(MOCK_WORK_ORDERS);
  const [inventory] = useState<InventoryItem[]>(MOCK_INVENTORY);

  const criticalErrors = errors.filter(e => e.severity === 'CRITICAL' && !e.resolved);
  const warningErrors = errors.filter(e => e.severity === 'WARNING' && !e.resolved);
  
  const emergencyWorkOrders = workOrders.filter(wo => wo.priority === 'EMERGENCY' && wo.status !== 'COMPLETED');
  const criticalInventory = inventory.filter(i => i.quantity === 0);

  const handleResolveError = (id: string) => {
      if(confirm("Mark this error as resolved?")) {
          setErrors(prev => prev.map(e => e.id === id ? { ...e, resolved: true } : e));
      }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold">Operations Center</h2>
        <p className="text-slate-400 text-sm">System Health & Signal Monitoring</p>
      </div>

      {/* SIGNAL CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-lg border ${criticalErrors.length > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Critical System Errors</div>
              <div className={`text-3xl font-bold mt-2 ${criticalErrors.length > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                  {criticalErrors.length}
              </div>
          </div>
          <div className={`p-4 rounded-lg border ${emergencyWorkOrders.length > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Emergency Work Orders</div>
              <div className={`text-3xl font-bold mt-2 ${emergencyWorkOrders.length > 0 ? 'text-orange-600' : 'text-slate-700'}`}>
                  {emergencyWorkOrders.length}
              </div>
          </div>
          <div className={`p-4 rounded-lg border ${criticalInventory.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Stockouts</div>
              <div className={`text-3xl font-bold mt-2 ${criticalInventory.length > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                  {criticalInventory.length}
              </div>
          </div>
          <div className="p-4 rounded-lg border bg-white border-slate-200">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Billing Warnings</div>
              <div className="text-3xl font-bold mt-2 text-slate-700">
                  {warningErrors.length}
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ERROR LOG */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-slate-800">Unresolved System Errors</h3>
              </div>
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-auto">
                  {criticalErrors.concat(warningErrors).length === 0 ? (
                      <div className="p-8 text-center text-slate-400">All systems nominal.</div>
                  ) : (
                      criticalErrors.concat(warningErrors).map(error => (
                          <div key={error.id} className="p-4 hover:bg-slate-50">
                              <div className="flex justify-between items-start">
                                  <div>
                                      <div className="flex items-center gap-2">
                                          {error.severity === 'CRITICAL' && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded">CRITICAL</span>}
                                          {error.severity === 'WARNING' && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded">WARNING</span>}
                                          <span className="text-sm font-semibold text-slate-900">{error.type}</span>
                                      </div>
                                      <p className="text-sm text-slate-600 mt-1">{error.message}</p>
                                      <p className="text-xs text-slate-400 mt-1">{new Date(error.createdAt).toLocaleString()}</p>
                                  </div>
                                  <button 
                                    onClick={() => handleResolveError(error.id)}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                  >
                                      Resolve
                                  </button>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>

          {/* OPERATIONAL ALERTS */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-slate-800">Operational Attention Needed</h3>
              </div>
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-auto">
                  {emergencyWorkOrders.map(wo => (
                      <div key={wo.id} className="p-4 hover:bg-slate-50">
                           <div className="flex items-start gap-3">
                                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900">{wo.title}</h4>
                                    <p className="text-xs text-slate-500">House: {wo.houseId}</p>
                                    <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide text-orange-600 bg-orange-50 px-2 py-0.5 rounded">Emergency Work Order</span>
                                </div>
                           </div>
                      </div>
                  ))}
                  {criticalInventory.map(inv => (
                      <div key={inv.id} className="p-4 hover:bg-slate-50">
                           <div className="flex items-start gap-3">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900">Stockout: {inv.name}</h4>
                                    <p className="text-xs text-slate-500">House: {inv.houseId}</p>
                                    <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Restock Immediately</span>
                                </div>
                           </div>
                      </div>
                  ))}
                  {emergencyWorkOrders.length === 0 && criticalInventory.length === 0 && (
                      <div className="p-8 text-center text-slate-400">No operational emergencies.</div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default SystemHealth;
