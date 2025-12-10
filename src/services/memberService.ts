import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  QueryConstraint,
  onSnapshot,
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import type { Member, MemberStatus, PayType, MemberIncomeSource, EmergencyContact, Sponsorship, MemberLabel } from '../../types';
import { calculateBilling } from '../utils/billingLogic';

const membersCol = collection(db, 'members');

function memberConverter(data: any, id: string): Member {
  return {
    id,
    fullName: data.fullName,
    phone: data.phone ?? undefined,
    email: data.email ?? undefined,
    dateOfBirth: data.dateOfBirth ?? undefined,

    status: data.status ?? 'PENDING',
    label: data.label ?? 'MEMBER',

    houseId: data.houseId ?? null,

    isVeteran: !!data.isVeteran,
    veteranBranch: data.veteranBranch ?? undefined,

    payType: data.payType ?? 'SELF_PAY',
    bedRateMonthly: data.bedRateMonthly ?? 0,

    incomeSources: data.incomeSources ?? [],

    intakeDate: data.intakeDate,
    exitDate: data.exitDate ?? undefined,

    emergencyContact: data.emergencyContact ?? undefined,
    insuranceProviderName: data.insuranceProviderName ?? undefined,
    insuranceMemberId: data.insuranceMemberId ?? undefined,

    mediaRelease: !!data.mediaRelease,
    notes: data.notes ?? undefined,

    // Ledger defaults
    lastBilledPeriodIndex: data.lastBilledPeriodIndex ?? -1,
    lastBilledThrough: data.lastBilledThrough ?? undefined,
    accountBalance: data.accountBalance ?? 0,
    hasOutstandingBalance: data.hasOutstandingBalance ?? false,

    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
  };
}

export async function fetchMembers(statusFilter?: MemberStatus, houseIdFilter?: string[]): Promise<Member[]> {
  const constraints: QueryConstraint[] = [];
  if (statusFilter) constraints.push(where('status', '==', statusFilter));
  if (houseIdFilter && houseIdFilter.length > 0) {
    constraints.push(where('houseId', 'in', houseIdFilter.slice(0, 10)));
  }
  constraints.push(orderBy('fullName'));

  const q = query(membersCol, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => memberConverter(d.data(), d.id));
}

export function subscribeToMembers(
  onUpdate: (members: Member[]) => void, 
  statusFilter?: MemberStatus, 
  houseIdFilter?: string[],
  onError?: (error: Error) => void
): () => void {
  const constraints: QueryConstraint[] = [];
  if (statusFilter) constraints.push(where('status', '==', statusFilter));
  if (houseIdFilter && houseIdFilter.length > 0) {
    constraints.push(where('houseId', 'in', houseIdFilter.slice(0, 10)));
  }
  constraints.push(orderBy('fullName'));

  const q = query(membersCol, ...constraints);
  
  return onSnapshot(q, (snapshot) => {
    const members = snapshot.docs.map(d => memberConverter(d.data(), d.id));
    onUpdate(members);
  }, (error) => {
    console.error("Error subscribing to members", error);
    if (onError) onError(error);
  });
}

export async function fetchMemberById(id: string): Promise<Member | null> {
  const ref = doc(db, 'members', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return memberConverter(snap.data(), snap.id);
}

export interface UpdateMemberInput {
  fullName?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  status?: MemberStatus;
  label?: MemberLabel;
  houseId?: string | null;
  isVeteran?: boolean;
  veteranBranch?: string | null;
  payType?: PayType;
  bedRateMonthly?: number;
  incomeSources?: MemberIncomeSource[];
  intakeDate?: string;
  exitDate?: string | null;
  emergencyContact?: EmergencyContact | null;
  insuranceProviderName?: string | null;
  insuranceMemberId?: string | null;
  mediaRelease?: boolean;
  notes?: string | null;
}

export async function updateMember(id: string, input: UpdateMemberInput): Promise<void> {
  const ref = doc(db, 'members', id);
  
  const update: Record<string, any> = {
    updatedAt: new Date().toISOString(),
    updatedAtServer: serverTimestamp(),
  };

  // Explicit mapping prevents any accidental injection of ledger fields
  if (input.fullName !== undefined) update.fullName = input.fullName.trim();
  if (input.phone !== undefined) update.phone = input.phone;
  if (input.email !== undefined) update.email = input.email;
  if (input.dateOfBirth !== undefined) update.dateOfBirth = input.dateOfBirth;
  if (input.status !== undefined) update.status = input.status;
  if (input.label !== undefined) update.label = input.label;
  if (input.houseId !== undefined) update.houseId = input.houseId;
  if (input.isVeteran !== undefined) update.isVeteran = input.isVeteran;
  if (input.veteranBranch !== undefined) update.veteranBranch = input.veteranBranch;
  if (input.payType !== undefined) update.payType = input.payType;
  if (input.bedRateMonthly !== undefined) update.bedRateMonthly = input.bedRateMonthly;
  if (input.incomeSources !== undefined) update.incomeSources = input.incomeSources;
  if (input.intakeDate !== undefined) update.intakeDate = input.intakeDate;
  if (input.exitDate !== undefined) update.exitDate = input.exitDate;
  if (input.emergencyContact !== undefined) update.emergencyContact = input.emergencyContact;
  if (input.insuranceProviderName !== undefined) update.insuranceProviderName = input.insuranceProviderName;
  if (input.insuranceMemberId !== undefined) update.insuranceMemberId = input.insuranceMemberId;
  if (input.mediaRelease !== undefined) update.mediaRelease = input.mediaRelease;
  if (input.notes !== undefined) update.notes = input.notes;

  await updateDoc(ref, update);
}

// CLIENT-SIDE INTAKE (Replaces Cloud Function for immediate availability)
export async function createMember(memberData: Partial<Member>, sponsorshipData?: Partial<Sponsorship>): Promise<string> {
    const now = new Date().toISOString();
    const memberRef = doc(collection(db, 'members')); // Generate ID
    const memberId = memberRef.id;

    // Helper to remove undefined
    const clean = (val: any) => val === undefined ? null : val;

    // Default Member Object
    const newMember: any = {
        fullName: clean(memberData.fullName),
        phone: clean(memberData.phone),
        email: clean(memberData.email),
        dateOfBirth: clean(memberData.dateOfBirth),
        status: clean(memberData.status) || 'ACTIVE',
        label: clean(memberData.label) || 'MEMBER',
        intakeDate: clean(memberData.intakeDate) || now.split('T')[0],
        payType: clean(memberData.payType) || 'SELF_PAY',
        bedRateMonthly: clean(memberData.bedRateMonthly) || 0,
        houseId: clean(memberData.houseId),
        isVeteran: !!memberData.isVeteran,
        mediaRelease: !!memberData.mediaRelease,
        
        // Ensure sub-objects are also clean
        emergencyContact: memberData.emergencyContact ? {
            name: clean(memberData.emergencyContact.name),
            phone: clean(memberData.emergencyContact.phone),
            relationship: clean(memberData.emergencyContact.relationship)
        } : null,
        
        // Ledger Defaults
        lastBilledPeriodIndex: -1,
        lastBilledThrough: undefined,
        accountBalance: 0,
        hasOutstandingBalance: false,
        
        createdAt: now,
        updatedAt: now
    };

    // Prepare Sponsorship if needed
    let sponsorshipRef = null;
    let newSponsorship = null;
    if (sponsorshipData) {
        sponsorshipRef = doc(collection(db, 'sponsorships'));
        newSponsorship = {
            memberId: memberId,
            sponsorName: clean(sponsorshipData.sponsorName),
            totalAmount: clean(sponsorshipData.totalAmount) || 0,
            remainingAmount: clean(sponsorshipData.totalAmount) || 0,
            priority: clean(sponsorshipData.priority) || 1,
            startDate: clean(sponsorshipData.startDate) || now.split('T')[0],
            isActive: true,
            createdAt: now,
            updatedAt: now
        };
    }

    try {
        await runTransaction(db, async (transaction) => {
            transaction.set(memberRef, newMember);
            if (sponsorshipRef && newSponsorship) {
                transaction.set(sponsorshipRef, newSponsorship);
            }
        });
        return memberId;
    } catch (e: any) {
        console.error("Transaction failed: ", e);
        throw new Error(`Failed to create member: ${e.message}`);
    }
}

// CLOUD FUNCTIONS (Deprecated references kept for compatibility but not used in Client Intake)

interface IntakePayload {
    memberData: Omit<Partial<Member>, 'id' | 'accountBalance' | 'lastBilledPeriodIndex' | 'hasOutstandingBalance'>;
    sponsorshipData?: Partial<Sponsorship>;
}

export const callIntakeMember = async (memberData: Partial<Member>, sponsorshipData?: Partial<Sponsorship>) => {
    // Redirect to client-side logic
    return createMember(memberData, sponsorshipData);
};

export const callExitMember = async (memberId: string, exitDate: string, reason: string, note?: string) => {
    // Client-side implementation to replace Cloud Function (with full Billing logic)
    try {
        const batch = writeBatch(db);
        const now = new Date().toISOString();

        // 1. Get Member
        const memberRef = doc(db, 'members', memberId);
        const memberSnap = await getDoc(memberRef);
        if (!memberSnap.exists()) throw new Error("Member not found");
        
        // Use converter to ensure full Member object structure
        const member = memberConverter(memberSnap.data(), memberId);
        
        // VALIDATION: Ensure exit date is valid relative to billing
        const limitDate = member.lastBilledThrough || member.intakeDate;
        
        if (limitDate && new Date(exitDate) < new Date(limitDate)) {
             throw new Error(`Exit date (${exitDate}) cannot be before last billed/intake date (${limitDate}).`);
        }

        // 2. Fetch Active Sponsorships for Billing
        const sponsorshipsRef = collection(db, 'sponsorships');
        const q = query(sponsorshipsRef, where('memberId', '==', memberId), where('isActive', '==', true));
        const spSnap = await getDocs(q);
        const sponsorships = spSnap.docs.map(d => ({ id: d.id, ...d.data() } as Sponsorship));

        // 3. Calculate Billing
        const billingResult = calculateBilling(member, sponsorships, exitDate);

        // 4. Apply Billing Writes to Batch
        
        // Bed Charges
        billingResult.newCharges.forEach(charge => {
            const chargeRef = doc(collection(db, 'bedCharges'), charge.id); 
            batch.set(chargeRef, charge);
        });

        // Sponsorship Charges
        billingResult.newSponsorshipCharges.forEach(spCharge => {
            const spChargeRef = doc(collection(db, 'sponsorshipCharges'), spCharge.id);
            batch.set(spChargeRef, spCharge);
        });

        // Update Sponsorships (Remaining Amount)
        billingResult.updatedSponsorships.forEach(sp => {
           const original = sponsorships.find(s => s.id === sp.id);
           if (original && original.remainingAmount !== sp.remainingAmount) {
               const spRef = doc(db, 'sponsorships', sp.id);
               // We will merge this with deactivation below if needed, but since we can't update twice in batch:
               // We track state and do one update per sponsorship at the end.
           }
        });

        const netChange = billingResult.totalCharges - billingResult.totalCovered;
        const currentBalance = member.accountBalance - netChange;

        // 5. Update Member (Status + Billing + Notes)
        const currentNotes = member.notes || '';
        const exitNote = `Exit Reason: ${reason}. ${note ? `Note: ${note}` : ''}`;
        const newNotes = currentNotes ? `${currentNotes}\n\n[${exitDate}] ${exitNote}` : `[${exitDate}] ${exitNote}`;

        batch.update(memberRef, {
            status: 'INACTIVE',
            exitDate: exitDate,
            notes: newNotes,
            
            lastBilledPeriodIndex: billingResult.newLastBilledIndex,
            lastBilledThrough: billingResult.newLastBilledThrough,
            accountBalance: currentBalance,
            hasOutstandingBalance: currentBalance < 0,
            
            updatedAt: now
        });

        // 6. Deactivate Sponsorships (Merge with billing updates)
        sponsorships.forEach(sp => {
            const spRef = doc(db, 'sponsorships', sp.id);
            const updates: any = {};
            
            // Check if updated in billing
            const updatedSp = billingResult.updatedSponsorships.find(s => s.id === sp.id);
            if (updatedSp && updatedSp.remainingAmount !== sp.remainingAmount) {
                updates.remainingAmount = updatedSp.remainingAmount;
            }
            
            // Deactivate
            updates.isActive = false;
            updates.endDate = exitDate;
            updates.updatedAt = now;
            
            batch.update(spRef, updates);
        });

        await batch.commit();
        
    } catch (error: any) {
        console.error("Exit Error:", error);
        throw new Error(`Failed to exit member: ${error.message}`);
    }
};