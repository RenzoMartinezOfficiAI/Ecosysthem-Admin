
import { House, UserRole } from '../../types';

export enum MaintenanceFrequency {
    ONE_TIME = 'ONE_TIME',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
    QUARTERLY = 'QUARTERLY',
    YEARLY = 'YEARLY'
}

export enum MaintenancePriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    URGENT = 'URGENT'
}

export enum TaskStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    OVERDUE = 'OVERDUE'
}

export interface MaintenanceTask {
    id: string;
    houseId: string;
    title: string;
    description?: string;
    frequency: MaintenanceFrequency;
    priority: MaintenancePriority;
    status: TaskStatus;
    
    assignedToUserId?: string; // Optional assignment
    
    dueDate?: string; // ISO Date for next occurrence
    completedDate?: string; // ISO Date if completed (for history)
    
    // If it's a recurring task master, this tracks the template
    isTemplate?: boolean; 
    
    createdAt: string;
    updatedAt: string;
    createdByUserId: string;
}

export interface MaintenanceProps {
    house: House;
    userRole: UserRole;
    onBack: () => void;
}
