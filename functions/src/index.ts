import { https, config, firestore } from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Member, Sponsorship, MemberStatus, PayType, MemberPayment, MemberAdjustment } from './types';
import { calculateBilling } from './billing';

admin.initializeApp();
const db = admin.firestore();

// --- HELPERS ---

const logSystemError = async (type: string, message: string, context: any) => {
  try {
      await db.collection('systemErrors').add({
        type,
        message,
        context,
        createdAt: new Date().toISOString()
      });
  } catch (e) {
      console.error("Failed to log system error", e);
  }
};

const checkAuth = (context: https.CallableContext, allowedRoles: string[]) => {
    if (!context.auth) {
        throw new https.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const role = context.auth.token.role || '';
    if (!allowedRoles.includes(role)) {
        throw new https.HttpsError('permission-denied', `Role ${role} unauthorized.`);
    }
    return context.auth.uid;
};

const ADMIN_OPS = ['ADMIN', 'OPERATIONS_MANAGER'];

// Helper to safely get config
const getGeminiKey = () => {
    const fromEnv = process.env.GEMINI_API_KEY;
    if (fromEnv) {
        console.log("Found GEMINI_API_KEY in env");
        return fromEnv;
    }
    try {
        const conf = (config as any)();
        if (conf.gemini && conf.gemini.key) {
             console.log("Found gemini.key in functions config");
             return conf.gemini.key;
        }
    } catch (e) {
        console.warn("Failed to read functions config", e);
    }
    console.warn("No Gemini API Key found in env or config");
    return undefined;
}

// --- GEMINI AI SERVICES ---

export const analyzeSystemError = https.onCall(async (data, context) => {
    checkAuth(context, ADMIN_OPS);
    const { error } = data;
    
    // Securely access API Key
    const apiKey = getGeminiKey();

    if (!apiKey) {
        console.error("Gemini API Key missing in environment variables.");
        // Return a friendly string instead of throwing, so the UI can display it
        return "AI Analysis unavailable (Missing API Key Configuration).";
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
          You are a technical support agent for a housing management system called EcosysTHEM.
          Analyze the following system error and provide a human-readable explanation and 3 steps for remediation.
          
          Error Type: ${error.type}
          Message: ${error.message}
          Context: ${JSON.stringify(error.context)}
          Timestamp: ${error.createdAt}
    
          Keep the tone professional and operational.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (err: any) {
        console.error("Gemini API Error:", err);
        await logSystemError('AI_ANALYSIS_ERROR', err.message, { errorId: error.id });
        // Propagate the actual error message for better debugging
        throw new https.HttpsError('internal', `Gemini Analysis Failed: ${err.message}`);
    }
});

export const summarizeMemberFinancials = https.onCall(async (data, context) => {
    checkAuth(context, ADMIN_OPS);
    const { member, transactions } = data;

    // Logic-based summary (Replaces AI interpretation to avoid errors/dependencies)
    try {
        const balanceStatus = member.accountBalance < 0 
            ? `owes $${Math.abs(member.accountBalance).toFixed(2)}` 
            : `has a credit of $${member.accountBalance.toFixed(2)}`;
        
        let summary = `${member.fullName} (${member.status}) ${balanceStatus}. Pay Type: ${member.payType}.`;

        if (member.hasOutstandingBalance) {
            summary += ` Account is in arrears.`;
        }

        if (transactions && transactions.length > 0) {
            const lastTx = transactions[0]; // Assumes sorted desc
            const type = 'bedRateAtTime' in lastTx ? 'Charge' : 'Payment';
            const amount = 'amount' in lastTx ? lastTx.amount : lastTx.bedRateAtTime;
            const dateStr = lastTx.createdAt ? lastTx.createdAt.split('T')[0] : 'Unknown Date';
            
            summary += ` Last activity: ${type} of $${Number(amount).toFixed(2)} on ${dateStr}.`;
        } else {
            summary += ` No recent transactions recorded.`;
        }

        return summary;
    } catch (err: any) {
        console.error("Summary Generation Error:", err);
        return "Unable to generate financial summary.";
    }
});

export const summarizeFile = https.onCall(async (data, context) => {
    if (!context.auth) throw new https.HttpsError('unauthenticated', 'User must be logged in.');
    
    const { filePath, fileType } = data;
    const apiKey = getGeminiKey();
    if (!apiKey) return "AI Summary unavailable (Configuration Missing).";

    try {
        const bucket = admin.storage().bucket();
        const file = bucket.file(filePath);
        
        const [buffer] = await file.download();

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        let promptParts: any[] = ["Summarize this file content briefly (max 50 words). Return only the summary."];

        if (fileType.startsWith('text/')) {
            const textContent = buffer.toString('utf-8');
            promptParts.push(`\n\nFile Content:\n${textContent}`);
        } else {
            promptParts.push({
                inlineData: {
                    data: buffer.toString('base64'),
                    mimeType: fileType
                }
            });
        }

        const result = await model.generateContent(promptParts);
        const response = await result.response;
        return response.text();
    } catch (err: any) {
        console.error("Gemini File Summary Error:", err);
        return `Failed to summarize file: ${err.message}`;
    }
});

// --- PHASE C: STRICT FLOWS ---

export const intakeMember = https.onCall(async (data, context) => {
    checkAuth(context, ADMIN_OPS);

    // Destructure to prevent pollution
    const { 
        fullName, phone, email, dateOfBirth, 
        isVeteran, veteranBranch, 
        payType, bedRateMonthly, 
        intakeDate, 
        emergencyContact, 
        insuranceProviderName, insuranceMemberId, mediaRelease,
        notes,
        houseId // Added to respect intake form selection
    } = data.memberData || {};
    
    const { sponsorshipData } = data; 

    // Validation
    if (!fullName || !intakeDate || !payType || bedRateMonthly === undefined) {
        throw new https.HttpsError('invalid-argument', 'Missing required intake fields.');
    }

    if ((payType === PayType.SPONSORED || payType === PayType.MIXED) && !sponsorshipData) {
        throw new https.HttpsError('failed-precondition', 'Sponsored/Mixed members must have a sponsorship.');
    }

    try {
        await db.runTransaction(async (t) => {
            const memberRef = db.collection('members').doc();
            const now = new Date().toISOString();
            
            const newMember: Member = {
                id: memberRef.id,
                fullName,
                phone: phone || undefined,
                email: email || undefined,
                dateOfBirth: dateOfBirth || undefined,
                
                status: MemberStatus.ACTIVE,
                label: data.memberData.label || 'MEMBER', 
                
                intakeDate,
                payType,
                bedRateMonthly: Number(bedRateMonthly),
                houseId: houseId || null, 
                
                isVeteran: !!isVeteran,
                veteranBranch: veteranBranch || undefined,
                
                emergencyContact: emergencyContact || undefined,
                insuranceProviderName: insuranceProviderName || undefined,
                insuranceMemberId: insuranceMemberId || undefined,
                mediaRelease: !!mediaRelease,
                
                notes: notes || undefined,

                // Ledger Defaults
                lastBilledPeriodIndex: -1,
                lastBilledThrough: undefined,
                accountBalance: 0,
                hasOutstandingBalance: false,
                legacyBalance: 0,
                
                createdAt: now,
                updatedAt: now
            };

            t.set(memberRef, newMember);

            if (sponsorshipData && (payType === PayType.SPONSORED || payType === PayType.MIXED)) {
                const sponsorRef = db.collection('sponsorships').doc();
                const sponsorship: Sponsorship = {
                    id: sponsorRef.id,
                    memberId: memberRef.id,
                    sponsorName: sponsorshipData.sponsorName,
                    totalAmount: Number(sponsorshipData.totalAmount),
                    remainingAmount: Number(sponsorshipData.totalAmount),
                    priority: Number(sponsorshipData.priority) || 1,
                    startDate: intakeDate, // Default to intake
                    endDate: sponsorshipData.endDate || undefined,
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
        await logSystemError('INTAKE_ERROR', error.message, { ...data });
        throw new https.HttpsError('internal', error.message);
    }
});

// --- CORE LEDGER FUNCTIONS ---

export const runBillingForMemberTx = https.onCall(async (data, context) => {
    checkAuth(context, ADMIN_OPS);
    const { memberId, asOfDate } = data;
    
    if (!memberId || !asOfDate) {
        throw new https.HttpsError('invalid-argument', 'Missing memberId or asOfDate');
    }

    try {
        const result = await db.runTransaction(async (t) => {
            const memberRef = db.collection('members').doc(memberId);
            const memberDoc = await t.get(memberRef);
            if (!memberDoc.exists) throw new Error("Member not found");
            const member = memberDoc.data() as Member;

            if (member.status !== MemberStatus.ACTIVE) {
                // If not active, we only bill up to exitDate? 
                // For now, assume billing stops at exit, handled by passing exitDate as asOfDate in exit flow.
                // If manual run, limit to exitDate if present.
                if (member.exitDate && new Date(asOfDate) > new Date(member.exitDate)) {
                   // clamp logic could go here, or just let the caller handle it.
                }
            }

            // Fetch active sponsorships
            const sponsorshipsSnap = await t.get(db.collection('sponsorships')
                .where('memberId', '==', memberId)
                .where('isActive', '==', true));
            
            const sponsorships = sponsorshipsSnap.docs.map(d => d.data() as Sponsorship);

            // Calculate
            const billingResult = calculateBilling(member, sponsorships, asOfDate);

            if (billingResult.newCharges.length === 0) {
                return { billed: false, message: "Up to date." };
            }

            // Writes
            // 1. Bed Charges
            billingResult.newCharges.forEach(charge => {
                const ref = db.collection('bedCharges').doc(charge.id);
                t.set(ref, charge);
            });

            // 2. Sponsorship Charges
            billingResult.newSponsorshipCharges.forEach(spCharge => {
                const ref = db.collection('sponsorshipCharges').doc(spCharge.id);
                t.set(ref, spCharge);
            });

            // 3. Update Sponsorships (remaining amounts)
            billingResult.updatedSponsorships.forEach(sp => {
                const original = sponsorships.find(s => s.id === sp.id);
                if (original && original.remainingAmount !== sp.remainingAmount) {
                    const ref = db.collection('sponsorships').doc(sp.id);
                    t.update(ref, { 
                        remainingAmount: sp.remainingAmount,
                        updatedAt: new Date().toISOString()
                    });
                }
            });

            // 4. Update Member
            const netChange = billingResult.totalCharges - billingResult.totalCovered;
            const newBalance = member.accountBalance - netChange; 

            t.update(memberRef, {
                lastBilledPeriodIndex: billingResult.newLastBilledIndex,
                lastBilledThrough: billingResult.newLastBilledThrough,
                accountBalance: newBalance,
                hasOutstandingBalance: newBalance < 0,
                updatedAt: new Date().toISOString()
            });

            return { 
                billed: true, 
                periods: billingResult.newCharges.length, 
                totalCharged: billingResult.totalCharges,
                totalCovered: billingResult.totalCovered 
            };
        });

        return result;
    } catch (error: any) {
        console.error("Billing Error:", error);
        await logSystemError('BILLING_ERROR', error.message, { memberId, asOfDate });
        throw new https.HttpsError('internal', error.message);
    }
});

export const recordPaymentTx = https.onCall(async (data, context) => {
    const uid = checkAuth(context, ADMIN_OPS);
    const { memberId, amount, receivedDate, note } = data;

    if (!memberId || !amount || amount <= 0) {
        throw new https.HttpsError('invalid-argument', 'Invalid payment data');
    }

    try {
        await db.runTransaction(async (t) => {
            const memberRef = db.collection('members').doc(memberId);
            const memberDoc = await t.get(memberRef);
            if (!memberDoc.exists) throw new Error("Member not found");
            const member = memberDoc.data() as Member;

            // Create Payment Record
            const paymentRef = db.collection('memberPayments').doc();
            const payment: MemberPayment = {
                id: paymentRef.id,
                memberId,
                amount: Number(amount),
                source: 'SELF', // default for now
                receivedDate: receivedDate || new Date().toISOString(),
                createdByUserId: uid,
                createdAt: new Date().toISOString(),
                // could add note field to interface later
            };
            t.set(paymentRef, payment);

            // Update Ledger
            // Payment INCREASES balance (adds credit or reduces debt)
            const newBalance = member.accountBalance + Number(amount);
            
            t.update(memberRef, {
                accountBalance: newBalance,
                hasOutstandingBalance: newBalance < 0,
                updatedAt: new Date().toISOString()
            });
        });

        return { success: true };
    } catch (error: any) {
        console.error("Payment Error:", error);
        await logSystemError('PAYMENT_ERROR', error.message, { memberId, amount, note });
        throw new https.HttpsError('internal', error.message);
    }
});

export const recordAdjustmentTx = https.onCall(async (data, context) => {
    const uid = checkAuth(context, ADMIN_OPS);
    const { memberId, amount, reason, note, effectiveDate } = data;

    if (!memberId || amount === undefined || !reason) {
        throw new https.HttpsError('invalid-argument', 'Invalid adjustment data');
    }

    try {
        await db.runTransaction(async (t) => {
            const memberRef = db.collection('members').doc(memberId);
            const memberDoc = await t.get(memberRef);
            if (!memberDoc.exists) throw new Error("Member not found");
            const member = memberDoc.data() as Member;

            const adjRef = db.collection('memberAdjustments').doc();
            const adj: MemberAdjustment = {
                id: adjRef.id,
                memberId,
                amount: Number(amount), // +credit, -debt
                reason,
                note: note || '',
                effectiveDate: effectiveDate || new Date().toISOString(),
                createdByUserId: uid,
                createdAt: new Date().toISOString()
            };
            t.set(adjRef, adj);

            const newBalance = member.accountBalance + Number(amount);

            t.update(memberRef, {
                accountBalance: newBalance,
                hasOutstandingBalance: newBalance < 0,
                updatedAt: new Date().toISOString()
            });
        });

        return { success: true };
    } catch (error: any) {
        console.error("Adjustment Error:", error);
        await logSystemError('ADJUSTMENT_ERROR', error.message, { memberId, amount, reason });
        throw new https.HttpsError('internal', error.message);
    }
});

export const exitMemberFlow = https.onCall(async (data, context) => {
    checkAuth(context, ADMIN_OPS);
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

            // --- BILLING SUB-ROUTINE ---
            const sponsorshipsSnap = await t.get(db.collection('sponsorships')
                .where('memberId', '==', memberId)
                .where('isActive', '==', true));
            const sponsorships = sponsorshipsSnap.docs.map(d => d.data() as Sponsorship);
            
            const billingResult = calculateBilling(member, sponsorships, exitDate);
            
            // Apply billing writes
            billingResult.newCharges.forEach(charge => {
                t.set(db.collection('bedCharges').doc(charge.id), charge);
            });
            billingResult.newSponsorshipCharges.forEach(spCharge => {
                t.set(db.collection('sponsorshipCharges').doc(spCharge.id), spCharge);
            });
            billingResult.updatedSponsorships.forEach(sp => {
                const original = sponsorships.find(s => s.id === sp.id);
                if (original && original.remainingAmount !== sp.remainingAmount) {
                    t.update(db.collection('sponsorships').doc(sp.id), { 
                        remainingAmount: sp.remainingAmount,
                        updatedAt: new Date().toISOString()
                    });
                }
            });
            
            const netChange = billingResult.totalCharges - billingResult.totalCovered;
            let currentBalance = member.accountBalance - netChange;
            // --- END BILLING SUB-ROUTINE ---

            // Deactivate Sponsorships
            sponsorshipsSnap.forEach(doc => {
                t.update(doc.ref, { 
                    isActive: false, 
                    endDate: exitDate,
                    updatedAt: new Date().toISOString()
                });
            });

            // Update Member
            t.update(memberRef, {
                status: MemberStatus.INACTIVE,
                exitDate: exitDate,
                notes: note ? (member.notes ? `${member.notes}\nExit Note: ${note}` : `Exit Note: ${note}`) : member.notes,
                
                // Commit billing updates along with status change
                lastBilledPeriodIndex: billingResult.newLastBilledIndex,
                lastBilledThrough: billingResult.newLastBilledThrough,
                accountBalance: currentBalance,
                hasOutstandingBalance: currentBalance < 0,
                
                updatedAt: new Date().toISOString()
            });
        });
        return { success: true };
    } catch (error: any) {
        console.error("Exit Error:", error);
        await logSystemError('EXIT_ERROR', error.message, { memberId, exitDate, reason });
        throw new https.HttpsError('internal', error.message);
    }
});

// --- SUMMARIES ---
// (Stubs kept for future)
export const onBedChargeCreated = firestore.document('bedCharges/{docId}').onCreate(async (snap: any, context: any) => {
});
