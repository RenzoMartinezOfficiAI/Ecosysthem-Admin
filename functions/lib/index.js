"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onBedChargeCreated = exports.exitMemberFlow = exports.recordAdjustmentTx = exports.recordPaymentTx = exports.runBillingForMemberTx = exports.intakeMember = exports.summarizeFile = exports.summarizeMemberFinancials = exports.analyzeSystemError = void 0;
const v1_1 = require("firebase-functions/v1");
const admin = __importStar(require("firebase-admin"));
const generative_ai_1 = require("@google/generative-ai");
const types_1 = require("./types");
const billing_1 = require("./billing");
admin.initializeApp();
const db = admin.firestore();
// --- HELPERS ---
const logSystemError = async (type, message, context) => {
    try {
        await db.collection('systemErrors').add({
            type,
            message,
            context,
            createdAt: new Date().toISOString()
        });
    }
    catch (e) {
        console.error("Failed to log system error", e);
    }
};
const checkAuth = (context, allowedRoles) => {
    if (!context.auth) {
        throw new v1_1.https.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const role = context.auth.token.role || '';
    if (!allowedRoles.includes(role)) {
        throw new v1_1.https.HttpsError('permission-denied', `Role ${role} unauthorized.`);
    }
    return context.auth.uid;
};
const ADMIN_OPS = ['ADMIN', 'OPERATIONS_MANAGER'];
// Helper to safely get config
const getGeminiKey = () => {
    var _a;
    const fromEnv = process.env.GEMINI_API_KEY;
    if (fromEnv)
        return fromEnv;
    try {
        return (_a = v1_1.config().gemini) === null || _a === void 0 ? void 0 : _a.key;
    }
    catch (e) {
        return undefined;
    }
};
// --- GEMINI AI SERVICES ---
exports.analyzeSystemError = v1_1.https.onCall(async (data, context) => {
    checkAuth(context, ADMIN_OPS);
    const { error } = data;
    // Securely access API Key
    const apiKey = getGeminiKey();
    if (!apiKey) {
        console.error("Gemini API Key missing in environment variables.");
        return "AI Analysis unavailable (Missing Configuration).";
    }
    try {
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
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
    }
    catch (err) {
        console.error("Gemini API Error:", err);
        await logSystemError('AI_ANALYSIS_ERROR', err.message, { errorId: error.id });
        throw new v1_1.https.HttpsError('internal', "Failed to analyze error.");
    }
});
exports.summarizeMemberFinancials = v1_1.https.onCall(async (data, context) => {
    checkAuth(context, ADMIN_OPS);
    const { member, transactions } = data;
    const apiKey = getGeminiKey();
    if (!apiKey) {
        return "Summary unavailable (Missing Configuration).";
    }
    try {
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const txSummary = transactions
            .map((t) => `${t.createdAt}: ${'bedRateAtTime' in t ? 'CHARGE' : 'PAYMENT'} amount=${'amount' in t ? t.amount : t.bedRateAtTime}`)
            .join('\n');
        const prompt = `
          You are a financial operations assistant.
          Summarize the financial standing of this member.
          
          Member: ${member.fullName} (${member.status})
          Pay Type: ${member.payType}
          Balance: $${member.accountBalance}
          Outstanding: ${member.hasOutstandingBalance}
          
          Recent Transactions:
          ${txSummary}
    
          Provide a brief status report (max 100 words) and highlight any immediate actions needed (e.g. collection).
        `;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }
    catch (err) {
        console.error("Gemini API Error:", err);
        throw new v1_1.https.HttpsError('internal', "Failed to generate summary.");
    }
});
exports.summarizeFile = v1_1.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new v1_1.https.HttpsError('unauthenticated', 'User must be logged in.');
    const { filePath, fileType } = data;
    const apiKey = getGeminiKey();
    if (!apiKey)
        return "AI Summary unavailable (Configuration Missing).";
    try {
        const bucket = admin.storage().bucket();
        const file = bucket.file(filePath);
        const [buffer] = await file.download();
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        let promptParts = ["Summarize this file content briefly (max 50 words). Return only the summary."];
        if (fileType.startsWith('text/')) {
            const textContent = buffer.toString('utf-8');
            promptParts.push(`\n\nFile Content:\n${textContent}`);
        }
        else {
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
    }
    catch (err) {
        console.error("Gemini File Summary Error:", err);
        return "Failed to summarize file.";
    }
});
// --- PHASE C: STRICT FLOWS ---
exports.intakeMember = v1_1.https.onCall(async (data, context) => {
    checkAuth(context, ADMIN_OPS);
    // Destructure to prevent pollution
    const { fullName, phone, email, dateOfBirth, isVeteran, veteranBranch, payType, bedRateMonthly, intakeDate, emergencyContact, insuranceProviderName, insuranceMemberId, mediaRelease, notes, houseId // Added to respect intake form selection
     } = data.memberData || {};
    const { sponsorshipData } = data;
    // Validation
    if (!fullName || !intakeDate || !payType || bedRateMonthly === undefined) {
        throw new v1_1.https.HttpsError('invalid-argument', 'Missing required intake fields.');
    }
    if ((payType === types_1.PayType.SPONSORED || payType === types_1.PayType.MIXED) && !sponsorshipData) {
        throw new v1_1.https.HttpsError('failed-precondition', 'Sponsored/Mixed members must have a sponsorship.');
    }
    try {
        await db.runTransaction(async (t) => {
            const memberRef = db.collection('members').doc();
            const now = new Date().toISOString();
            const newMember = {
                id: memberRef.id,
                fullName,
                phone: phone || undefined,
                email: email || undefined,
                dateOfBirth: dateOfBirth || undefined,
                status: types_1.MemberStatus.ACTIVE,
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
            if (sponsorshipData && (payType === types_1.PayType.SPONSORED || payType === types_1.PayType.MIXED)) {
                const sponsorRef = db.collection('sponsorships').doc();
                const sponsorship = {
                    id: sponsorRef.id,
                    memberId: memberRef.id,
                    sponsorName: sponsorshipData.sponsorName,
                    totalAmount: Number(sponsorshipData.totalAmount),
                    remainingAmount: Number(sponsorshipData.totalAmount),
                    priority: Number(sponsorshipData.priority) || 1,
                    startDate: intakeDate,
                    endDate: sponsorshipData.endDate || undefined,
                    isActive: true,
                    createdAt: now,
                    updatedAt: now
                };
                t.set(sponsorRef, sponsorship);
            }
        });
        return { success: true, message: "Intake successful" };
    }
    catch (error) {
        console.error("Intake Error:", error);
        await logSystemError('INTAKE_ERROR', error.message, Object.assign({}, data));
        throw new v1_1.https.HttpsError('internal', error.message);
    }
});
// --- CORE LEDGER FUNCTIONS ---
exports.runBillingForMemberTx = v1_1.https.onCall(async (data, context) => {
    checkAuth(context, ADMIN_OPS);
    const { memberId, asOfDate } = data;
    if (!memberId || !asOfDate) {
        throw new v1_1.https.HttpsError('invalid-argument', 'Missing memberId or asOfDate');
    }
    try {
        const result = await db.runTransaction(async (t) => {
            const memberRef = db.collection('members').doc(memberId);
            const memberDoc = await t.get(memberRef);
            if (!memberDoc.exists)
                throw new Error("Member not found");
            const member = memberDoc.data();
            if (member.status !== types_1.MemberStatus.ACTIVE) {
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
            const sponsorships = sponsorshipsSnap.docs.map(d => d.data());
            // Calculate
            const billingResult = (0, billing_1.calculateBilling)(member, sponsorships, asOfDate);
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
    }
    catch (error) {
        console.error("Billing Error:", error);
        await logSystemError('BILLING_ERROR', error.message, { memberId, asOfDate });
        throw new v1_1.https.HttpsError('internal', error.message);
    }
});
exports.recordPaymentTx = v1_1.https.onCall(async (data, context) => {
    const uid = checkAuth(context, ADMIN_OPS);
    const { memberId, amount, receivedDate, note } = data;
    if (!memberId || !amount || amount <= 0) {
        throw new v1_1.https.HttpsError('invalid-argument', 'Invalid payment data');
    }
    try {
        await db.runTransaction(async (t) => {
            const memberRef = db.collection('members').doc(memberId);
            const memberDoc = await t.get(memberRef);
            if (!memberDoc.exists)
                throw new Error("Member not found");
            const member = memberDoc.data();
            // Create Payment Record
            const paymentRef = db.collection('memberPayments').doc();
            const payment = {
                id: paymentRef.id,
                memberId,
                amount: Number(amount),
                source: 'SELF',
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
    }
    catch (error) {
        console.error("Payment Error:", error);
        await logSystemError('PAYMENT_ERROR', error.message, { memberId, amount, note });
        throw new v1_1.https.HttpsError('internal', error.message);
    }
});
exports.recordAdjustmentTx = v1_1.https.onCall(async (data, context) => {
    const uid = checkAuth(context, ADMIN_OPS);
    const { memberId, amount, reason, note, effectiveDate } = data;
    if (!memberId || amount === undefined || !reason) {
        throw new v1_1.https.HttpsError('invalid-argument', 'Invalid adjustment data');
    }
    try {
        await db.runTransaction(async (t) => {
            const memberRef = db.collection('members').doc(memberId);
            const memberDoc = await t.get(memberRef);
            if (!memberDoc.exists)
                throw new Error("Member not found");
            const member = memberDoc.data();
            const adjRef = db.collection('memberAdjustments').doc();
            const adj = {
                id: adjRef.id,
                memberId,
                amount: Number(amount),
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
    }
    catch (error) {
        console.error("Adjustment Error:", error);
        await logSystemError('ADJUSTMENT_ERROR', error.message, { memberId, amount, reason });
        throw new v1_1.https.HttpsError('internal', error.message);
    }
});
exports.exitMemberFlow = v1_1.https.onCall(async (data, context) => {
    checkAuth(context, ADMIN_OPS);
    const { memberId, exitDate, reason, note } = data;
    try {
        await db.runTransaction(async (t) => {
            const memberRef = db.collection('members').doc(memberId);
            const memberDoc = await t.get(memberRef);
            if (!memberDoc.exists)
                throw new Error("Member not found");
            const member = memberDoc.data();
            if (new Date(exitDate) < new Date(member.lastBilledThrough || member.intakeDate)) {
                throw new Error("Exit date cannot be before last billed date.");
            }
            // --- BILLING SUB-ROUTINE ---
            const sponsorshipsSnap = await t.get(db.collection('sponsorships')
                .where('memberId', '==', memberId)
                .where('isActive', '==', true));
            const sponsorships = sponsorshipsSnap.docs.map(d => d.data());
            const billingResult = (0, billing_1.calculateBilling)(member, sponsorships, exitDate);
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
                status: types_1.MemberStatus.INACTIVE,
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
    }
    catch (error) {
        console.error("Exit Error:", error);
        await logSystemError('EXIT_ERROR', error.message, { memberId, exitDate, reason });
        throw new v1_1.https.HttpsError('internal', error.message);
    }
});
// --- SUMMARIES ---
// (Stubs kept for future)
exports.onBedChargeCreated = v1_1.firestore.document('bedCharges/{docId}').onCreate(async (snap, context) => {
});
//# sourceMappingURL=index.js.map