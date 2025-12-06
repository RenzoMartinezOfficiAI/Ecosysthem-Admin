import { Member, BedCharge, SponsorshipCharge, MemberPayment, MemberAdjustment, Sponsorship, MemberStatus, SystemError, PayType, MemberMonthlySummary } from '../../types';
import { calculateBillablePeriods, getBillingPeriod } from '../utils/billingMath';
import { MOCK_MEMBERS, MOCK_SPONSORSHIPS, MOCK_TRANSACTIONS, MOCK_SYSTEM_ERRORS } from '../../services/mockData';

// In-Memory Storage for Simulation
let simMembers = JSON.parse(JSON.stringify(MOCK_MEMBERS)) as Member[];
let simSponsorships = JSON.parse(JSON.stringify(MOCK_SPONSORSHIPS)) as Sponsorship[];
let simBedCharges: BedCharge[] = MOCK_TRANSACTIONS.filter((t: any) => 'bedRateAtTime' in t) as BedCharge[];
let simPayments: MemberPayment[] = MOCK_TRANSACTIONS.filter((t: any) => 'source' in t) as MemberPayment[];
let simSponsorshipCharges: SponsorshipCharge[] = [];
let simAdjustments: MemberAdjustment[] = [];
let simErrors: SystemError[] = JSON.parse(JSON.stringify(MOCK_SYSTEM_ERRORS)) as SystemError[];
let simSummaries: MemberMonthlySummary[] = []; // Phase C

export const getSimulatedData = () => {
  updateSummaries(); // Ensure summaries are fresh
  return {
    members: simMembers,
    sponsorships: simSponsorships,
    bedCharges: simBedCharges,
    payments: simPayments,
    sponsorshipCharges: simSponsorshipCharges,
    adjustments: simAdjustments,
    errors: simErrors,
    summaries: simSummaries
  };
};

// --- PHASE C: STRICT FLOWS ---

export const intakeMemberSimulation = async (memberData: Partial<Member>, sponsorshipData?: Partial<Sponsorship>) => {
    console.log("[SIM] Intake Member", memberData);
    
    // Strict Validation
    if ((memberData.payType === PayType.SPONSORED || memberData.payType === PayType.MIXED) && !sponsorshipData) {
        throw new Error("Sponsored members must have a sponsorship configured.");
    }

    const newMemberId = `m-${Date.now()}`;
    const newMember: Member = {
        ...memberData as Member,
        id: newMemberId,
        status: MemberStatus.ACTIVE,
        lastBilledPeriodIndex: -1,
        accountBalance: 0,
        hasOutstandingBalance: false,
        legacyBalance: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    simMembers.push(newMember);

    if (sponsorshipData) {
        const newSponsorship: Sponsorship = {
            ...sponsorshipData as Sponsorship,
            id: `s-${Date.now()}`,
            memberId: newMemberId,
            remainingAmount: sponsorshipData.totalAmount || 0,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        simSponsorships.push(newSponsorship);
    }
    return newMember;
};

export const exitMemberSimulation = async (memberId: string, exitDate: string, reason: string) => {
    console.log("[SIM] Exit Member", memberId);
    const member = simMembers.find(m => m.id === memberId);
    if (!member) throw new Error("Member not found");

    if (new Date(exitDate) < new Date(member.lastBilledThrough || member.intakeDate)) {
        throw new Error("Exit date cannot be before last billed date.");
    }

    // 1. Run Final Billing (simplified)
    await runBillingSimulation(memberId, exitDate);

    // 2. Deactivate Sponsorships
    simSponsorships.filter(s => s.memberId === memberId && s.isActive).forEach(s => {
        s.isActive = false;
        s.endDate = exitDate;
        s.updatedAt = new Date().toISOString();
    });

    // 3. Update Status
    member.status = MemberStatus.INACTIVE;
    member.exitDate = exitDate;
    member.updatedAt = new Date().toISOString();
};

// --- CORE BILLING ---

export const runBillingSimulation = async (memberId: string, asOfDateStr: string) => {
  const member = simMembers.find(m => m.id === memberId);
  if (!member) throw new Error("Member not found");
  if (member.status !== MemberStatus.ACTIVE) return;

  const periodsToBill = calculateBillablePeriods(member.intakeDate, member.lastBilledPeriodIndex, asOfDateStr);

  if (periodsToBill.length === 0) return { billed: 0 };

  const memberSponsorships = simSponsorships
    .filter(s => s.memberId === memberId && s.isActive)
    .sort((a, b) => a.priority - b.priority);

  for (const pIndex of periodsToBill) {
    const { start, end } = getBillingPeriod(member.intakeDate, pIndex);

    // 1. Create Bed Charge
    const charge: BedCharge = {
      id: `sim-bc-${Date.now()}-${pIndex}`,
      memberId,
      periodIndex: pIndex,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      bedRateAtTime: member.bedRateMonthly,
      houseIdAtTime: member.houseId || null,
      createdAt: new Date().toISOString()
    };
    simBedCharges.push(charge);
    member.accountBalance -= member.bedRateMonthly;

    // 2. Apply Sponsorships
    let remainingToCover = member.bedRateMonthly;
    
    for (const sponsor of memberSponsorships) {
      if (remainingToCover <= 0) break;
      if (sponsor.remainingAmount <= 0) continue;

      const coverAmount = Math.min(remainingToCover, sponsor.remainingAmount);

      const spCharge: SponsorshipCharge = {
        id: `sim-sc-${Date.now()}-${pIndex}`,
        memberId,
        sponsorshipId: sponsor.id,
        periodIndex: pIndex,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        amountCovered: coverAmount,
        createdAt: new Date().toISOString()
      };
      simSponsorshipCharges.push(spCharge);
      
      sponsor.remainingAmount -= coverAmount;
      remainingToCover -= coverAmount;
      member.accountBalance += coverAmount; // Credit
    }

    member.lastBilledPeriodIndex = pIndex;
  }

  member.lastBilledThrough = new Date().toISOString();
  member.hasOutstandingBalance = member.accountBalance < 0;
  
  return { success: true, periodsBilled: periodsToBill.length };
};

export const recordPaymentTx = async (memberId: string, amount: number, source: 'SELF') => {
  const member = simMembers.find(m => m.id === memberId);
  if (!member) throw new Error("Member not found");

  const payment: MemberPayment = {
    id: `sim-pay-${Date.now()}`,
    memberId,
    amount,
    source,
    receivedDate: new Date().toISOString(),
    createdByUserId: 'admin-sim',
    createdAt: new Date().toISOString()
  };
  simPayments.push(payment);
  member.accountBalance += amount;
  member.hasOutstandingBalance = member.accountBalance < 0;
  return payment;
};

// --- PHASE C: SUMMARY AGGREGATION ---

const updateSummaries = () => {
    // Clear and rebuild summaries from transactions for simulation consistency
    const summaries: Record<string, MemberMonthlySummary> = {};

    const getMonthKey = (dateStr: string) => dateStr.substring(0, 7); // YYYY-MM
    const getSummary = (memberId: string, dateStr: string) => {
        const key = `${memberId}_${getMonthKey(dateStr)}`;
        if (!summaries[key]) {
            summaries[key] = {
                id: key,
                memberId,
                yearMonth: getMonthKey(dateStr),
                totalCharges: 0,
                totalPayments: 0,
                totalSponsorCoverage: 0,
                totalAdjustments: 0,
                netDelta: 0,
                openingBalance: 0, // Simplified for sim
                closingBalance: 0, // Simplified for sim
                periodsBilled: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        }
        return summaries[key];
    };

    simBedCharges.forEach(c => {
        const s = getSummary(c.memberId, c.createdAt);
        s.totalCharges += c.bedRateAtTime;
        s.netDelta -= c.bedRateAtTime;
        s.periodsBilled++;
    });

    simSponsorshipCharges.forEach(s => {
        const sum = getSummary(s.memberId, s.createdAt);
        sum.totalSponsorCoverage += s.amountCovered;
        sum.netDelta += s.amountCovered;
    });

    simPayments.forEach(p => {
        const s = getSummary(p.memberId, p.createdAt);
        s.totalPayments += p.amount;
        s.netDelta += p.amount;
    });

    simSummaries = Object.values(summaries).sort((a,b) => b.yearMonth.localeCompare(a.yearMonth));
};

export const compareLegacyAndLedgerBalances = async () => {
    // Phase C: Legacy comparisons are deprecated/irrelevant for strict flows
    return [];
};

export const resetSimulation = () => {
    simMembers = JSON.parse(JSON.stringify(MOCK_MEMBERS));
    simSponsorships = JSON.parse(JSON.stringify(MOCK_SPONSORSHIPS));
    simBedCharges = MOCK_TRANSACTIONS.filter((t: any) => 'bedRateAtTime' in t) as BedCharge[];
    simPayments = MOCK_TRANSACTIONS.filter((t: any) => 'source' in t) as MemberPayment[];
    simSponsorshipCharges = [];
    simAdjustments = [];
    simErrors = JSON.parse(JSON.stringify(MOCK_SYSTEM_ERRORS));
    simSummaries = [];
};