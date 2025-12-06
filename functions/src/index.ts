import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { calculateBillablePeriods, getBillingPeriod } from '../../src/utils/billingMath';
import { BedCharge, SponsorshipCharge, Member, Sponsorship, MemberPayment, MemberAdjustment, MemberStatus, PayType } from '../../types';

admin.initializeApp();
const db = admin.firestore();

// --- HELPERS ---

const logSystemError = async (type: string, message: string, context: any) => {
  await db.collection('systemErrors').add({
    type,
    message,
    context,
    createdAt: new Date().toISOString()
  });
};

// --- PHASE C: STRICT FLOWS ---

export const intakeMember = functions.https.onCall(async (data, context) => {
    // 1. RBAC Check
    if (!context.auth || !['ADMIN', 'OPERATIONS_MANAGER'].includes(context.auth.token.role)) {
        throw new functions.https.HttpsError('permission-denied', 'Unauthorized. Only Admins or Ops can perform intake.');
    }

    const { memberData, sponsorshipData } = data; 

    // 2. Data Validation
    if (!memberData.fullName || !memberData.intakeDate || !memberData.payType || memberData.bedRateMonthly === undefined) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required intake fields (Name, Date, PayType, Rate).');
    }

    if ((memberData.payType === PayType.SPONSORED || memberData.payType === PayType.MIXED) && !sponsorshipData) {
        throw new functions.https.HttpsError('failed-precondition', 'Sponsored/Mixed members must have a sponsorship configured at intake.');
    }

    try {
        await db.runTransaction(async (t) => {
            const memberRef = db.collection('members').doc();
            const now = new Date().toISOString();
            
            // 3. Construct Member Object with Ledger Defaults
            const newMember: Member = {
                ...memberData,
                id: memberRef.id,
                status: MemberStatus.ACTIVE, // Force ACTIVE on intake
                
                // Ledger Initialization (Backend Only)
                lastBilledPeriodIndex: -1,
                lastBilledThrough: undefined,
                accountBalance: 0,
                hasOutstandingBalance: false,
                legacyBalance: 0, // Zero out legacy for new members
                
                createdAt: now,
                updatedAt: now
            };

            t.set(memberRef, newMember);

            // 4. Handle Sponsorship if present
            if (sponsorshipData && (memberData.payType === PayType.SPONSORED || memberData.payType === PayType.MIXED)) {
                const sponsorRef = db.collection('sponsorships').doc();
                const sponsorship: Sponsorship = {
                    ...sponsorshipData,
                    id: sponsorRef.id,
                    memberId: memberRef.id,
                    // Initialize remaining amount to total amount
                    remainingAmount: Number(sponsorshipData.totalAmount), 
                    isActive: true,
                    createdAt: now,
                    updatedAt: now
                };
                t.set(sponsorRef, sponsorship);
            }
        });

        return { success: true, message: "Intake successful" };
    } catch (error: any) {
        console.error("Intake Error:", error);
        throw new functions.https.HttpsError('internal', error.message || "Intake transaction failed.");
    }
});

export const exitMemberFlow = functions.https.onCall(async (data, context) => {
    if (!context.auth || !['ADMIN', 'OPERATIONS_MANAGER'].includes(context.auth.token.role)) {
        throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
    }

    const { memberId, exitDate, reason, note } = data;

    try {
        await db.runTransaction(async (t) => {
            const memberRef = db.collection('members').doc(memberId);
            const memberDoc = await t.get(memberRef);
            if (!memberDoc.exists) throw new Error("Member not found");
            const member = memberDoc.data() as Member;

            if (new Date(exitDate) < new Date(member.lastBilledThrough || member.intakeDate)) {
                 throw new Error("Exit date cannot be before last billed date.");
            }

            // Deactivate Sponsorships
            const sponsorshipsSnap = await t.get(db.collection('sponsorships').where('memberId', '==', memberId).where('isActive', '==', true));
            sponsorshipsSnap.forEach(doc => {
                t.update(doc.ref, { 
                    isActive: false, 
                    endDate: exitDate,
                    updatedAt: new Date().toISOString()
                });
            });

            // Update Member Status
            t.update(memberRef, {
                status: MemberStatus.INACTIVE,
                exitDate: exitDate,
                notes: note ? (member.notes ? `${member.notes}\nExit Note: ${note}` : `Exit Note: ${note}`) : member.notes,
                updatedAt: new Date().toISOString()
            });
        });
        return { success: true };
    } catch (error: any) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// --- CORE LEDGER FUNCTIONS ---

export const runBillingForMemberTx = functions.https.onCall(async (data, context) => {
  return { success: true };
});

export const recordPaymentTx = functions.https.onCall(async (data, context) => {
  return { success: true };
});

// --- SUMMARIES ---

export const onBedChargeCreated = functions.firestore.document('bedCharges/{docId}').onCreate(async (snap, context) => {
    // Placeholder for summary trigger logic
});