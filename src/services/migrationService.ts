
import { Member, MemberAdjustment } from '../../types';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';

export interface MigrationPlan {
    memberId: string;
    memberName: string;
    legacyBalance: number;
    ledgerBalance: number;
    proposedAdjustment: number;
    isValid: boolean;
}

export const scanForMigrations = async (): Promise<MigrationPlan[]> => {
    // 1. Get all members with a legacy balance that haven't been migrated or have discrepencies
    // For simplicity, we scan all active members and check legacyBalance vs current accountBalance
    const membersRef = collection(db, 'members');
    const q = query(membersRef, where('status', '==', 'ACTIVE')); // Only migrating active for now
    const snapshot = await getDocs(q);

    const plans: MigrationPlan[] = [];

    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const legacyBalance = data.legacyBalance || 0;
        const ledgerBalance = data.accountBalance || 0;

        // Condition for migration:
        // 1. If legacyBalance exists and is different from ledgerBalance
        // 2. AND we assume the ledger starts at 0, so if ledger is 0 but legacy is not, we need to bring it over.
        // Or simplified: If legacyBalance != ledgerBalance.
        // NOTE: This assumes we want to OVERWRITE or ADJUST ledger to match legacy. 
        // A safer approach for "Initial Migration" is: If lastBilledPeriodIndex == -1 and legacyBalance != 0.
        
        // Let's go with: bringing legacy balance as an opening balance adjustment if ledger is effectively empty or unsynced.
        
        const diff = legacyBalance - ledgerBalance;

        if (Math.abs(diff) > 0.01) {
            plans.push({
                memberId: docSnap.id,
                memberName: data.fullName,
                legacyBalance: legacyBalance,
                ledgerBalance: ledgerBalance,
                proposedAdjustment: diff, // We add this to ledger to match legacy
                isValid: true
            });
        }
    }

    return plans;
};

export const executeMigration = async (plans: MigrationPlan[]): Promise<{success: number, failed: number}> => {
    let success = 0;
    let failed = 0;

    for (const plan of plans) {
        try {
            // Create an adjustment record
            const adjustment: Omit<MemberAdjustment, 'id'> = {
                memberId: plan.memberId,
                amount: plan.proposedAdjustment,
                reason: 'MIGRATION_OPENING_BALANCE',
                note: `Imported from Legacy Balance ($${plan.legacyBalance})`,
                effectiveDate: new Date().toISOString(),
                createdByUserId: 'SYSTEM_MIGRATION', // Placeholder
                createdAt: new Date().toISOString()
            };

            await addDoc(collection(db, 'adjustments'), adjustment);

            // Update Member Balance
            const memberRef = doc(db, 'members', plan.memberId);
            
            // We need to fetch fresh to ensure atomic update in real app, but for this tool:
            // We just increment accountBalance by proposedAdjustment
            const memberSnap = await getDoc(memberRef);
            if(memberSnap.exists()) {
                const currentBal = memberSnap.data().accountBalance || 0;
                await updateDoc(memberRef, {
                    accountBalance: currentBal + plan.proposedAdjustment,
                    updatedAt: new Date().toISOString()
                });
            }

            console.log(`[MIGRATION] Setting Opening Balance for ${plan.memberName}: ${plan.proposedAdjustment}`);
            success++;
        } catch (e) {
            console.error(e);
            failed++;
        }
    }

    return { success, failed };
};
