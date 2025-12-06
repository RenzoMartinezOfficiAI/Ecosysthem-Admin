
import { Member, MemberAdjustment } from '../../types';
import { MOCK_MEMBERS } from '../../services/mockData';
import { recordPaymentTx } from './ledgerSimulation'; // Simulating using ledger writer

export interface MigrationPlan {
    memberId: string;
    memberName: string;
    legacyBalance: number;
    ledgerBalance: number;
    proposedAdjustment: number;
    isValid: boolean;
}

export const scanForMigrations = async (): Promise<MigrationPlan[]> => {
    // In a real app, this would query Firestore for members where legacyBalance != 0 and lastBilledPeriodIndex == -1
    // For simulation, we use MOCK_MEMBERS
    
    return MOCK_MEMBERS.map(m => {
        const legacy = m.legacyBalance || 0;
        const ledger = m.accountBalance;
        
        // We only care if the ledger is clean (0) but legacy has history
        // Or generally if they don't match and we want to align ledger to legacy as "Opening Balance"
        const diff = legacy - ledger;

        return {
            memberId: m.id,
            memberName: m.fullName,
            legacyBalance: legacy,
            ledgerBalance: ledger,
            proposedAdjustment: diff, // We want to add 'diff' so ledger + diff = legacy
            isValid: diff !== 0
        };
    }).filter(p => p.isValid);
};

export const executeMigration = async (plans: MigrationPlan[]): Promise<{success: number, failed: number}> => {
    let success = 0;
    let failed = 0;

    for (const plan of plans) {
        try {
            // In a real app, we would call a dedicated migration Cloud Function.
            // Here we simulate by recording an adjustment to bring balance in sync.
            
            // Note: Positive adjustment = Credit (reduces debt). Negative = Charge.
            // If legacy is -150 (owed) and ledger is 0.
            // We need ledger to be -150.
            // adjustment amount: -150.
            
            // However, recordAdjustment logic might vary. 
            // Usually: Adjustment Amount > 0 is CREDIT. Amount < 0 is CHARGE.
            
            // Using the simulation's recordPaymentTx as a proxy for generic ledger write for now,
            // or we can imagine a recordAdjustmentTx exists.
            
            // Simulating a "System Adjustment"
            // For the purpose of this mock, we'll just log it.
            console.log(`[MIGRATION] Setting Opening Balance for ${plan.memberName}: ${plan.proposedAdjustment}`);
            success++;
        } catch (e) {
            console.error(e);
            failed++;
        }
    }

    return { success, failed };
};
