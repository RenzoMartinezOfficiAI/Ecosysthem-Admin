import { Member, Sponsorship, BedCharge, SponsorshipCharge } from '../../types';

// --- DATE UTILS (UTC Enforcement) ---

/**
 * Parses an ISO date string and returns a Date object set to UTC midnight.
 * Removes time components to avoid timezone shifts.
 */
export function parseDateUTC(dateStr: string): Date {
    const d = new Date(dateStr);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Adds N months to a UTC Date, clamping to the last day of the month.
 * Returns a new UTC Date.
 */
export function addMonthsUTC(date: Date, months: number): Date {
    const d = new Date(date.getTime());
    d.setUTCMonth(d.getUTCMonth() + months);
    
    // Check for day overflow (e.g. Jan 31 -> Feb 28/29)
    // If the day changed, it means we overflowed. Set to 0 (last day of prev month).
    if (d.getUTCDate() !== date.getUTCDate()) {
        d.setUTCDate(0);
    }
    return d;
}

/**
 * Formats a UTC Date back to YYYY-MM-DD string.
 */
export function formatDateUTC(date: Date): string {
    return date.toISOString().split('T')[0];
}

export function getBillingPeriod(intakeDateStr: string, periodIndex: number): { start: string; end: string } {
    const intakeDate = parseDateUTC(intakeDateStr);
    const start = addMonthsUTC(intakeDate, periodIndex);
    const end = addMonthsUTC(start, 1);
    return { 
        start: formatDateUTC(start), 
        end: formatDateUTC(end) 
    };
}

// --- BILLING LOGIC ---

export interface BillingResult {
    newLastBilledIndex: number;
    newLastBilledThrough: string; // ISO date string
    totalCharges: number;
    totalCovered: number;
    newCharges: BedCharge[];
    newSponsorshipCharges: SponsorshipCharge[];
    updatedSponsorships: Sponsorship[];
}

/**
 * Core pure function to calculate charges and sponsorship coverage.
 * Does NOT mutate external state.
 */
export function calculateBilling(
    member: Member,
    sponsorships: Sponsorship[], // Active sponsorships
    asOfDateStr: string
): BillingResult {
    const intakeDate = parseDateUTC(member.intakeDate);
    const asOfDate = parseDateUTC(asOfDateStr);
    
    // Sort sponsorships by priority (1 = highest)
    const sortedSponsorships = [...sponsorships].sort((a, b) => a.priority - b.priority);
    
    // Track mutable state for the duration of this calculation
    let currentPeriodIndex = member.lastBilledPeriodIndex + 1;
    let totalCharges = 0;
    let totalCovered = 0;
    
    const newCharges: BedCharge[] = [];
    const newSponsorshipCharges: SponsorshipCharge[] = [];
    
    // Clone sponsorships to track remainingAmount depletion in memory
    const mutableSponsorships = sortedSponsorships.map(s => ({ ...s }));

    // Safety limit: 120 months (10 years) to prevent infinite loops
    const MAX_CYCLES = 120;
    let cycles = 0;

    let lastPeriodEndStr = member.lastBilledThrough || member.intakeDate;

    while (cycles < MAX_CYCLES) {
        const { start: startStr, end: endStr } = getBillingPeriod(member.intakeDate, currentPeriodIndex);
        const periodStart = parseDateUTC(startStr);
        
        // Stop if the period starts AFTER the asOfDate
        // We bill if periodStart <= asOfDate. 
        // Example: asOf = Jan 15. Period Jan 1-Feb 1. Start (Jan 1) <= Jan 15. Bill it.
        // Example: asOf = Jan 15. Period Feb 1-Mar 1. Start (Feb 1) > Jan 15. Stop.
        if (periodStart > asOfDate) {
            break;
        }

        // 1. Create Bed Charge
        const chargeAmount = member.bedRateMonthly;
        const bedCharge: BedCharge = {
            id: `charge_${member.id}_${currentPeriodIndex}`, // deterministic ID for idempotency checks if needed
            memberId: member.id,
            periodIndex: currentPeriodIndex,
            periodStart: startStr,
            periodEnd: endStr,
            bedRateAtTime: chargeAmount,
            houseIdAtTime: member.houseId || null,
            createdAt: new Date().toISOString()
        };
        newCharges.push(bedCharge);
        totalCharges += chargeAmount;

        // 2. Apply Sponsorships
        let amountToCover = chargeAmount;
        
        for (const sponsor of mutableSponsorships) {
            if (amountToCover <= 0) break;
            if (sponsor.remainingAmount <= 0) continue;
            if (!sponsor.isActive) continue;

            // Check if sponsorship is valid for this period
            // (Simple logic: if start <= periodStart). 
            // Ideally should check overlap, but for bed billing, start date validity is key.
            const sponsorStart = parseDateUTC(sponsor.startDate);
            const sponsorEnd = sponsor.endDate ? parseDateUTC(sponsor.endDate) : null;

            if (sponsorStart > periodStart) continue; // Starts later
            if (sponsorEnd && sponsorEnd <= periodStart) continue; // Ended before this period

            const cover = Math.min(amountToCover, sponsor.remainingAmount);
            
            sponsor.remainingAmount -= cover;
            amountToCover -= cover;
            totalCovered += cover;

            const spCharge: SponsorshipCharge = {
                id: `sp_charge_${member.id}_${sponsor.id}_${currentPeriodIndex}`,
                memberId: member.id,
                sponsorshipId: sponsor.id,
                periodIndex: currentPeriodIndex,
                periodStart: startStr,
                periodEnd: endStr,
                amountCovered: cover,
                createdAt: new Date().toISOString()
            };
            newSponsorshipCharges.push(spCharge);
        }

        lastPeriodEndStr = endStr;
        currentPeriodIndex++;
        cycles++;
    }

    return {
        newLastBilledIndex: currentPeriodIndex - 1,
        newLastBilledThrough: lastPeriodEndStr,
        totalCharges,
        totalCovered,
        newCharges,
        newSponsorshipCharges,
        updatedSponsorships: mutableSponsorships
    };
}
