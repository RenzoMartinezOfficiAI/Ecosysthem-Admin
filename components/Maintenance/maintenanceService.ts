
import { db } from '../../src/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';
import { MaintenanceTask, TaskStatus, MaintenanceFrequency, MaintenancePriority } from './types';

// Helper to calculate next due date based on frequency
export const calculateNextDueDate = (baseDate: Date, frequency: MaintenanceFrequency): Date => {
    const nextDate = new Date(baseDate);
    switch (frequency) {
        case MaintenanceFrequency.WEEKLY:
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case MaintenanceFrequency.MONTHLY:
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        case MaintenanceFrequency.QUARTERLY:
            nextDate.setMonth(nextDate.getMonth() + 3);
            break;
        case MaintenanceFrequency.YEARLY:
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
        default:
            // One-time tasks don't recur automatically, but if forced, default to tomorrow
            nextDate.setDate(nextDate.getDate() + 1); 
    }
    return nextDate;
};

// FETCH TASKS FOR A HOUSE
export const fetchTasksForHouse = async (houseId: string): Promise<MaintenanceTask[]> => {
    const tasksRef = collection(db, 'maintenance_tasks');
    const q = query(
        tasksRef, 
        where('houseId', '==', houseId), 
        // We ideally want active tasks. Completed recurring tasks spawn new ones, completed one-time tasks are history.
        // For simplicity, let's fetch all and filter in UI or split queries if needed.
        orderBy('dueDate', 'asc') 
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceTask));
};

// CREATE TASK
export const createMaintenanceTask = async (task: Omit<MaintenanceTask, 'id' | 'createdAt' | 'updatedAt'>) => {
    const tasksRef = collection(db, 'maintenance_tasks');
    const now = new Date().toISOString();
    
    await addDoc(tasksRef, {
        ...task,
        createdAt: now,
        updatedAt: now
    });
};

// UPDATE TASK STATUS
export const updateTaskStatus = async (taskId: string, newStatus: TaskStatus, completedDate?: string) => {
    const taskRef = doc(db, 'maintenance_tasks', taskId);
    const update: any = {
        status: newStatus,
        updatedAt: new Date().toISOString()
    };
    
    if (completedDate) {
        update.completedDate = completedDate;
    }
    
    await updateDoc(taskRef, update);
};

// DELETE TASK
export const deleteTask = async (taskId: string) => {
    await deleteDoc(doc(db, 'maintenance_tasks', taskId));
};

// DUPLICATE TEMPLATE TO ALL HOUSES (Admin Feature)
export const broadcastTemplateToAllHouses = async (templateTask: Omit<MaintenanceTask, 'id' | 'houseId'>, houseIds: string[]) => {
    const batchPromises = houseIds.map(houseId => {
        return createMaintenanceTask({
            ...templateTask,
            houseId: houseId,
            status: TaskStatus.PENDING
        });
    });
    
    await Promise.all(batchPromises);
};
