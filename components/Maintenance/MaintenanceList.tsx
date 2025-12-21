
import React, { useState, useEffect } from 'react';
import { MaintenanceProps, MaintenanceTask, TaskStatus, MaintenanceFrequency, MaintenancePriority } from './types';
import { fetchTasksForHouse, createMaintenanceTask, updateTaskStatus, deleteTask, calculateNextDueDate } from './maintenanceService';
import { UserRole } from '../../types'; // App types
import { useAuth } from '../../src/context/AuthContext';

const MaintenanceList: React.FC<MaintenanceProps> = ({ house, userRole, onBack }) => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<TaskStatus | 'ALL'>('ALL');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    
    // Add Form State
    const [newTask, setNewTask] = useState<Partial<MaintenanceTask>>({
        title: '',
        description: '',
        priority: MaintenancePriority.MEDIUM,
        frequency: MaintenanceFrequency.ONE_TIME,
        dueDate: new Date().toISOString().split('T')[0]
    });

    const canManage = [UserRole.ADMIN, UserRole.OPERATIONS_MANAGER, UserRole.HOUSE_LEAD].includes(userRole);
    const canComplete = canManage;

    useEffect(() => {
        loadTasks();
    }, [house.id]);

    const loadTasks = async () => {
        setLoading(true);
        try {
            const data = await fetchTasksForHouse(house.id);
            setTasks(data);
        } catch (e) {
            console.error("Failed to load tasks", e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.title || !user) return;
        
        try {
            await createMaintenanceTask({
                houseId: house.id,
                title: newTask.title,
                description: newTask.description,
                priority: newTask.priority || MaintenancePriority.MEDIUM,
                frequency: newTask.frequency || MaintenanceFrequency.ONE_TIME,
                status: TaskStatus.PENDING,
                dueDate: newTask.dueDate,
                createdByUserId: user.uid,
                isTemplate: false 
            } as any);
            
            setIsAddModalOpen(false);
            setNewTask({ title: '', description: '', priority: MaintenancePriority.MEDIUM, frequency: MaintenanceFrequency.ONE_TIME, dueDate: new Date().toISOString().split('T')[0] });
            loadTasks();
        } catch (e) {
            alert("Failed to create task");
        }
    };

    const handleMarkComplete = async (task: MaintenanceTask) => {
        if (!confirm("Mark this task as completed?")) return;
        
        try {
            const now = new Date().toISOString();
            await updateTaskStatus(task.id, TaskStatus.COMPLETED, now);
            
            // If recurring, spawn next task
            if (task.frequency !== MaintenanceFrequency.ONE_TIME && task.dueDate) {
                const nextDate = calculateNextDueDate(new Date(task.dueDate), task.frequency);
                await createMaintenanceTask({
                    ...task,
                    status: TaskStatus.PENDING,
                    dueDate: nextDate.toISOString().split('T')[0],
                    completedDate: undefined, // Reset
                    createdByUserId: 'SYSTEM_RECURRENCE' 
                } as any);
            }
            
            loadTasks();
        } catch (e) {
            console.error(e);
            alert("Failed to update task");
        }
    };
    
    const handleDelete = async (id: string) => {
        if(!confirm("Delete this task?")) return;
        await deleteTask(id);
        loadTasks();
    };

    const getPriorityColor = (p: MaintenancePriority) => {
        switch(p) {
            case MaintenancePriority.URGENT: return 'text-red-500 bg-red-500/10 border-red-500/20';
            case MaintenancePriority.HIGH: return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            case MaintenancePriority.MEDIUM: return 'text-neon-blue bg-neon-blue/10 border-neon-blue/20';
            default: return 'text-gray-400 bg-matte-800 border-matte-700';
        }
    };

    const getStatusBadge = (s: TaskStatus) => {
        switch(s) {
            case TaskStatus.COMPLETED: return 'bg-neon-green/10 text-neon-green border border-neon-green/20';
            case TaskStatus.IN_PROGRESS: return 'bg-neon-blue/10 text-neon-blue border border-neon-blue/20';
            case TaskStatus.OVERDUE: return 'bg-red-500/10 text-red-500 border border-red-500/20';
            default: return 'bg-matte-800 text-gray-400 border border-matte-700';
        }
    };

    const filteredTasks = tasks.filter(t => filterStatus === 'ALL' ? true : t.status === filterStatus);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-matte-800 rounded-full text-gray-400 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-white glow-text">Maintenance: {house.name}</h2>
                        <p className="text-sm text-gray-500">Manage tasks and recurring maintenance.</p>
                    </div>
                </div>
                {canManage && (
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-4 py-2 bg-neon-blue text-matte-950 rounded-lg hover:bg-cyan-400 text-sm font-bold shadow-glow-blue transition-all"
                    >
                        + Add Task
                    </button>
                )}
            </div>

            {/* FILTERS */}
            <div className="flex gap-2 border-b border-matte-800 pb-4">
                {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status as any)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterStatus === status ? 'bg-matte-800 text-neon-blue border border-neon-blue shadow-glow-blue' : 'bg-matte-900 text-gray-500 border border-matte-800 hover:text-white'}`}
                    >
                        {status.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* TASK LIST */}
            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading tasks...</div>
            ) : filteredTasks.length === 0 ? (
                <div className="text-center py-12 bg-matte-900 rounded-xl border border-dashed border-matte-700">
                    <p className="text-gray-500">No tasks found for this filter.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredTasks.map(task => (
                        <div key={task.id} className="bg-matte-900 p-4 rounded-xl border border-matte-800 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start md:items-center group hover:border-matte-600 transition-all">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded border ${getPriorityColor(task.priority)}`}>
                                        {task.priority}
                                    </span>
                                    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${getStatusBadge(task.status)}`}>
                                        {task.status.replace('_', ' ')}
                                    </span>
                                    {task.frequency !== MaintenanceFrequency.ONE_TIME && (
                                        <span className="text-xs text-neon-purple flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            {task.frequency}
                                        </span>
                                    )}
                                </div>
                                <h3 className={`font-bold text-white ${task.status === TaskStatus.COMPLETED ? 'line-through text-gray-500' : ''}`}>
                                    {task.title}
                                </h3>
                                {task.description && <p className="text-sm text-gray-400 mt-0.5">{task.description}</p>}
                                <div className="text-xs text-gray-500 mt-2 flex gap-4">
                                    <span>Due: {task.dueDate || 'No Date'}</span>
                                    {task.completedDate && <span className="text-neon-green">Completed: {new Date(task.completedDate).toLocaleDateString()}</span>}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {task.status !== TaskStatus.COMPLETED && canComplete && (
                                    <button 
                                        onClick={() => handleMarkComplete(task)}
                                        className="px-3 py-1.5 bg-matte-950 border border-matte-700 text-gray-300 hover:border-neon-green hover:text-neon-green rounded text-sm font-medium transition-colors"
                                    >
                                        Mark Complete
                                    </button>
                                )}
                                {canManage && (
                                    <button 
                                        onClick={() => handleDelete(task.id)}
                                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                                        title="Delete Task"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ADD MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-matte-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-matte-900 rounded-xl shadow-2xl border border-matte-700 max-w-md w-full">
                        <div className="p-6 border-b border-matte-800">
                            <h3 className="text-lg font-bold text-white glow-text">Add Maintenance Task</h3>
                        </div>
                        <form onSubmit={handleCreateTask} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Task Title</label>
                                <input 
                                    type="text" required 
                                    className="w-full bg-matte-950 border border-matte-700 rounded-lg p-2 text-sm text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue outline-none"
                                    value={newTask.title}
                                    onChange={e => setNewTask({...newTask, title: e.target.value})}
                                    placeholder="e.g. Inspect HVAC Filters"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                                <textarea 
                                    className="w-full bg-matte-950 border border-matte-700 rounded-lg p-2 text-sm text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue outline-none"
                                    value={newTask.description}
                                    onChange={e => setNewTask({...newTask, description: e.target.value})}
                                    rows={2}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Priority</label>
                                    <select 
                                        className="w-full bg-matte-950 border border-matte-700 rounded-lg p-2 text-sm text-white focus:border-neon-blue outline-none"
                                        value={newTask.priority}
                                        onChange={e => setNewTask({...newTask, priority: e.target.value as any})}
                                    >
                                        <option value={MaintenancePriority.LOW}>Low</option>
                                        <option value={MaintenancePriority.MEDIUM}>Medium</option>
                                        <option value={MaintenancePriority.HIGH}>High</option>
                                        <option value={MaintenancePriority.URGENT}>Urgent</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Frequency</label>
                                    <select 
                                        className="w-full bg-matte-950 border border-matte-700 rounded-lg p-2 text-sm text-white focus:border-neon-blue outline-none"
                                        value={newTask.frequency}
                                        onChange={e => setNewTask({...newTask, frequency: e.target.value as any})}
                                    >
                                        <option value={MaintenanceFrequency.ONE_TIME}>One Time</option>
                                        <option value={MaintenanceFrequency.WEEKLY}>Weekly</option>
                                        <option value={MaintenanceFrequency.MONTHLY}>Monthly</option>
                                        <option value={MaintenanceFrequency.QUARTERLY}>Quarterly</option>
                                        <option value={MaintenanceFrequency.YEARLY}>Yearly</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Due Date</label>
                                <input 
                                    type="date" required 
                                    className="w-full bg-matte-950 border border-matte-700 rounded-lg p-2 text-sm text-white focus:border-neon-blue outline-none"
                                    value={newTask.dueDate}
                                    onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-matte-800">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white rounded-lg text-sm transition-colors">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-neon-blue text-matte-950 rounded-lg hover:bg-cyan-400 text-sm font-bold shadow-glow-blue transition-all">Create Task</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaintenanceList;
