import React, { useState } from 'react';
import { House, UserRole } from '../../types';
import MaintenanceList from './MaintenanceList';
import { broadcastTemplateToAllHouses } from './maintenanceService';
import { MaintenancePriority, MaintenanceFrequency, TaskStatus } from './types';

interface MaintenanceConsoleProps {
    houses: House[];
    userRole: UserRole;
}

const MaintenanceConsole: React.FC<MaintenanceConsoleProps> = ({ houses, userRole }) => {
    const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);
    
    // Broadcast Form State
    const [templateTask, setTemplateTask] = useState({
        title: '',
        description: '',
        priority: MaintenancePriority.MEDIUM,
        frequency: MaintenanceFrequency.ONE_TIME,
        dueDate: new Date().toISOString().split('T')[0]
    });
    const [broadcasting, setBroadcasting] = useState(false);

    const canManage = [UserRole.ADMIN, UserRole.OPERATIONS_MANAGER].includes(userRole);

    const handleBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirm("This will create this task for ALL active houses. Continue?")) return;
        
        setBroadcasting(true);
        try {
            const activeHouseIds = houses.filter(h => h.status !== 'OFFLINE').map(h => h.id);
            // The service function signature might need adjustment or we mock the Omit type
            await broadcastTemplateToAllHouses({
                title: templateTask.title,
                description: templateTask.description,
                priority: templateTask.priority,
                frequency: templateTask.frequency,
                status: TaskStatus.PENDING,
                dueDate: templateTask.dueDate,
                createdByUserId: 'ADMIN_BROADCAST', 
                isTemplate: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            } as any, activeHouseIds); // Cast as any to bypass Omit constraints for now if they mismatch
            
            setShowBroadcastModal(false);
            setTemplateTask({
                title: '',
                description: '',
                priority: MaintenancePriority.MEDIUM,
                frequency: MaintenanceFrequency.ONE_TIME,
                dueDate: new Date().toISOString().split('T')[0]
            });
            alert("Tasks broadcasted successfully.");
        } catch (e) {
            console.error(e);
            alert("Failed to broadcast tasks.");
        } finally {
            setBroadcasting(false);
        }
    };

    const selectedHouse = houses.find(h => h.id === selectedHouseId);

    if (selectedHouse) {
        return (
            <MaintenanceList 
                house={selectedHouse} 
                userRole={userRole} 
                onBack={() => setSelectedHouseId(null)} 
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Maintenance Console</h2>
                    <p className="text-slate-500 text-sm">Manage tasks across {houses.length} properties.</p>
                </div>
                {canManage && (
                    <button 
                        onClick={() => setShowBroadcastModal(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm flex items-center"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Broadcast Task
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {houses.map(house => (
                    <div 
                        key={house.id} 
                        onClick={() => setSelectedHouseId(house.id)}
                        className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">{house.name}</h3>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${house.status === 'ONLINE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                                    {house.status}
                                </span>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">{house.address}</p>
                        </div>
                        
                        <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center text-sm">
                            <span className="text-slate-400">View Tasks</span>
                            <svg className="w-5 h-5 text-indigo-500 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </div>
                    </div>
                ))}
            </div>

            {/* BROADCAST MODAL */}
            {showBroadcastModal && (
                <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                        <div className="p-6 border-b border-slate-200">
                            <h3 className="text-lg font-bold text-slate-900">Broadcast Master Task</h3>
                            <p className="text-sm text-slate-500">This will add this task to ALL active houses.</p>
                        </div>
                        <form onSubmit={handleBroadcast} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Task Title</label>
                                <input type="text" required className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                    value={templateTask.title} onChange={e => setTemplateTask({...templateTask, title: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea className="w-full border border-slate-300 rounded-lg p-2 text-sm" rows={2}
                                    value={templateTask.description} onChange={e => setTemplateTask({...templateTask, description: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                                    <select className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                        value={templateTask.priority} onChange={e => setTemplateTask({...templateTask, priority: e.target.value as any})}>
                                        <option value={MaintenancePriority.LOW}>Low</option>
                                        <option value={MaintenancePriority.MEDIUM}>Medium</option>
                                        <option value={MaintenancePriority.HIGH}>High</option>
                                        <option value={MaintenancePriority.URGENT}>Urgent</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Frequency</label>
                                    <select className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                        value={templateTask.frequency} onChange={e => setTemplateTask({...templateTask, frequency: e.target.value as any})}>
                                        <option value={MaintenanceFrequency.ONE_TIME}>One Time</option>
                                        <option value={MaintenanceFrequency.WEEKLY}>Weekly</option>
                                        <option value={MaintenanceFrequency.MONTHLY}>Monthly</option>
                                        <option value={MaintenanceFrequency.QUARTERLY}>Quarterly</option>
                                        <option value={MaintenanceFrequency.YEARLY}>Yearly</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">First Due Date</label>
                                <input type="date" required className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                    value={templateTask.dueDate} onChange={e => setTemplateTask({...templateTask, dueDate: e.target.value})} />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowBroadcastModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm">Cancel</button>
                                <button type="submit" disabled={broadcasting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50">
                                    {broadcasting ? 'Broadcasting...' : 'Broadcast to All'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaintenanceConsole;