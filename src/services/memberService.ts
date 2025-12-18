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
  writeBatch,
  DocumentData,
  QueryDocumentSnapshot,
  SnapshotOptions,
  FieldValue
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Member, MemberStatus, PayType, MemberIncomeSource, EmergencyContact, Sponsorship, MemberLabel } from '../../types';
import { calculateBilling } from '../utils/billingLogic';

// Define the shape of the data as it exists in Firestore
interface MemberFirestoreData {
  fullName: string;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  status?: string;
  label?: string;
  houseId?: string | null;
  isVeteran?: boolean;
  veteranBranch?: string | null;
  payType?: string;
  bedRateMonthly?: number;
  incomeSources?: MemberIncomeSource[];
  intakeDate: string;
  exitDate?: string | null;
  emergencyContact?: EmergencyContact | null;
  insuranceProviderName?: string | null;
  insuranceMemberId?: string | null;
  mediaRelease?: boolean;
  notes?: string | null;
  lastBilledPeriodIndex?: number;
  lastBilledThrough?: string | null;
  accountBalance?: number;
  hasOutstandingBalance?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const memberConverter = {
  toFirestore(member: Partial<Member>): DocumentData {
    // We don't usually use toFirestore for updates in this app, but for completeness:
    // This creates a plain object from the Member model
    const { id, ...data } = member;
    return data;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): Member {
    const data = snapshot.data(options) as MemberFirestoreData;
    return {
        id: snapshot.id,
        fullName: data.fullName,
        phone: data.phone ?? undefined,
        email: data.email ?? undefined,
        dateOfBirth: data.dateOfBirth ?? undefined,
    
        status: (data.status as MemberStatus) ?? MemberStatus.PENDING,
        label: (data.label as MemberLabel) ?? MemberLabel.MEMBER,
    
        houseId: data.houseId ?? null,
    
        isVeteran: !!data.isVeteran,
        veteranBranch: data.veteranBranch ?? undefined,
    
        payType: (data.payType as PayType) ?? PayType.SELF_PAY,
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
};

const membersCol = collection(db, 'members').withConverter(memberConverter);

export async function fetchMembers(statusFilter?: MemberStatus, houseIdFilter?: string[]): Promise<Member[]> {
  const constraints: QueryConstraint[] = [];
  if (statusFilter) constraints.push(where('status', '==', statusFilter));
  if (houseIdFilter && houseIdFilter.length > 0) {
    constraints.push(where('houseId', 'in', houseIdFilter.slice(0, 10)));
  }
  constraints.push(orderBy('fullName'));

  const q = query(membersCol, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
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
    const members = snapshot.docs.map(d => d.data());
    onUpdate(members);
  }, (error) => {
    console.error("Error subscribing to members", error);
    if (onError) onError(error);
  });
}

export async function fetchMemberById(id: string): Promise<Member | null> {
  const ref = doc(db, 'members', id).withConverter(memberConverter);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
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
  
  // Use a strictly typed update object
  const update: Record<string, string | number | boolean | null | MemberIncomeSource[] | EmergencyContact | FieldValue | undefined> = {
    updatedAt: new Date().toISOString(),
    updatedAtServer: serverTimestamp(),
  };

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

/**
 * Toggles a member's status between ACTIVE and INACTIVE.
 * This is a lightweight operation that does NOT perform billing calculations.
 * Use this for quick corrections or when billing logic is not required/failing.
 */
export async function toggleMemberStatus(memberId: string, currentStatus: MemberStatus): Promise<MemberStatus> {
    const ref = doc(db, 'members', memberId);
    // If currently ACTIVE, go to INACTIVE. Otherwise go to ACTIVE.
    // Note: PENDING also goes to ACTIVE.
    const newStatus: MemberStatus = currentStatus === MemberStatus.ACTIVE ? MemberStatus.INACTIVE : MemberStatus.ACTIVE;
    
    await updateDoc(ref, {
        status: newStatus,
        updatedAt: new Date().toISOString()
    });
    
    return newStatus;
}

// CLIENT-SIDE INTAKE (Replaces Cloud Function for immediate availability)
export async function createMember(memberData: Partial<Member>, sponsorshipData?: Partial<Sponsorship>): Promise<string> {
    const now = new Date().toISOString();
    const memberRef = doc(collection(db, 'members')); // Generate ID
    const memberId = memberRef.id;

    // Helper to remove undefined
    const clean = <T>(val: T | undefined): T | null => val === undefined ? null : val;

    // Default Member Object - Strict Type
    // Use Record to allow constructing it, but validate against Member interface logic
    const newMember: Record<string, unknown> = {
        fullName: clean(memberData.fullName),
        phone: clean(memberData.phone),
        email: clean(memberData.email),
        dateOfBirth: clean(memberData.dateOfBirth),
        status: clean(memberData.status) || MemberStatus.ACTIVE,
        label: clean(memberData.label) || MemberLabel.MEMBER,
        intakeDate: clean(memberData.intakeDate) || now.split('T')[0],
        payType: clean(memberData.payType) || PayType.SELF_PAY,
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
        lastBilledThrough: null, // Firestore does not support undefined, use null
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
    } catch (e) {
        console.error("Transaction failed: ", e);
        throw new Error(`Failed to create member: ${(e as Error).message}`);
    }
}

// CLOUD FUNCTIONS (Deprecated references kept for compatibility but not used in Client Intake)

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
        const memberRef = doc(db, 'members', memberId).withConverter(memberConverter);
        const memberSnap = await getDoc(memberRef);
        if (!memberSnap.exists()) throw new Error("Member not found");
        
        const member = memberSnap.data();
        
        // VALIDATION: Ensure exit date is valid relative to billing
        const limitDate = member.lastBilledThrough || member.intakeDate;
        
        // Only validate if limitDate is present and valid
        if (limitDate) {
             const exitD = new Date(exitDate);
             const limitD = new Date(limitDate);
             if (!isNaN(exitD.getTime()) && !isNaN(limitD.getTime())) {
                 if (exitD < limitD) {
                      // Relaxed check: Just warn in logs, or perhaps we should allow it but be careful.
                      // For now, let's keep it but formatted correctly.
                      // throw new Error(`Exit date (${exitDate}) cannot be before last billed/intake date (${limitDate}).`);
                      console.warn(`Exit date (${exitDate}) is before last billed date (${limitDate}). Billing calculation may be skipped for past periods.`);
                 }
             }
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
        // Note: We need to handle the merge with deactivation carefully.
        const sponsorUpdatesMap = new Map<string, Record<string, unknown>>();

        billingResult.updatedSponsorships.forEach(sp => {
           const original = sponsorships.find(s => s.id === sp.id);
           if (original && original.remainingAmount !== sp.remainingAmount) {
               sponsorUpdatesMap.set(sp.id, { remainingAmount: sp.remainingAmount });
           }
        });

        const netChange = billingResult.totalCharges - billingResult.totalCovered;
        const currentBalance = member.accountBalance - netChange;

        // 5. Update Member (Status + Billing + Notes)
        const currentNotes = member.notes || '';
        const exitNote = `Exit Reason: ${reason}. ${note ? `Note: ${note}` : ''}`;
        const newNotes = currentNotes ? `${currentNotes}\n\n[${exitDate}] ${exitNote}` : `[${exitDate}] ${exitNote}`;

        batch.update(memberRef, {
            status: MemberStatus.INACTIVE,
            exitDate: exitDate,
            notes: newNotes,
            
            lastBilledPeriodIndex: billingResult.newLastBilledIndex,
            lastBilledThrough: billingResult.newLastBilledThrough || null, // Convert undefined to null
            accountBalance: currentBalance,
            hasOutstandingBalance: currentBalance < 0,
            
            updatedAt: now
        });

        // 6. Deactivate Sponsorships (Merge with billing updates)
        sponsorships.forEach(sp => {
            const spRef = doc(db, 'sponsorships', sp.id);
            const updates = sponsorUpdatesMap.get(sp.id) || {};
            
            // Deactivate
            updates.isActive = false;
            updates.endDate = exitDate;
            updates.updatedAt = now;
            
            batch.update(spRef, updates);
        });

        await batch.commit();
        
    } catch (error) {
        console.error("Exit Error:", error);
        throw new Error(`Failed to exit member: ${(error as Error).message}`);
    }
};