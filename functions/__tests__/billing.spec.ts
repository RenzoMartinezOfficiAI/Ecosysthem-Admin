import { describe, it, expect } from '@jest/globals';
import { calculateBilling, parseDateUTC, addMonthsUTC } from '../src/billing';
import { Member, MemberStatus, PayType, Sponsorship } from '../../types';

// Mock Factory
const createMember = (overrides: Partial<Member> = {}): Member => ({
    id: 'mem1',
    fullName: 'Test User',
    status: MemberStatus.ACTIVE,
    label: 'MEMBER', // Cast to any if enum issues in test
    intakeDate: '2024-01-01',
    payType: PayType.SPONSORED,
    bedRateMonthly: 1000,
    lastBilledPeriodIndex: -1,
    lastBilledThrough: undefined,
    accountBalance: 0,
    hasOutstandingBalance: false,
    mediaRelease: false,
    isVeteran: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
} as Member);

const createSponsorship = (overrides: Partial<Sponsorship> = {}): Sponsorship => ({
    id: 'sp1',
    memberId: 'mem1',
    sponsorName: 'Test Sponsor',
    totalAmount: 5000,
    remainingAmount: 5000,
    priority: 1,
    startDate: '2024-01-01',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
});

describe('Billing Engine (Phase A)', () => {
    
    describe('Date Utils', () => {
        it('should add months correctly (UTC)', () => {
            const d1 = parseDateUTC('2024-01-31');
            const d2 = addMonthsUTC(d1, 1);
            // 2024 is leap year, Feb has 29 days.
            expect(d2.toISOString().split('T')[0]).toBe('2024-02-29');
            
            const d3 = addMonthsUTC(d1, 2);
            expect(d3.toISOString().split('T')[0]).toBe('2024-03-31');
        });
    });

    describe('calculateBilling', () => {
        it('should bill 1 period for new member (Intake Jan 1, AsOf Jan 15)', () => {
            const member = createMember({ intakeDate: '2024-01-01' });
            const result = calculateBilling(member, [], '2024-01-15');
            
            expect(result.newCharges).toHaveLength(1);
            expect(result.newCharges[0].periodStart).toBe('2024-01-01');
            expect(result.newCharges[0].periodEnd).toBe('2024-02-01');
            expect(result.totalCharges).toBe(1000);
            expect(result.newLastBilledIndex).toBe(0);
        });

        it('should NOT bill if period starts after asOfDate', () => {
            // Intake Jan 1. Period 0: Jan 1. Period 1: Feb 1.
            // AsOf: Jan 15. Should only generate Period 0.
            const member = createMember({ intakeDate: '2024-01-01' });
            const result = calculateBilling(member, [], '2024-01-15');
            expect(result.newCharges).toHaveLength(1);
        });

        it('should apply sponsorship correctly (Full Coverage)', () => {
            const member = createMember({ intakeDate: '2024-01-01', bedRateMonthly: 1000 });
            const sponsor = createSponsorship({ remainingAmount: 5000 });
            
            // Bill for 2 months (Jan, Feb) -> AsOf Feb 15
            const result = calculateBilling(member, [sponsor], '2024-02-15');
            
            expect(result.newCharges).toHaveLength(2); // Jan, Feb
            expect(result.totalCharges).toBe(2000);
            expect(result.totalCovered).toBe(2000);
            expect(result.newSponsorshipCharges).toHaveLength(2);
            
            // Check remaining amount in result
            const updatedSp = result.updatedSponsorships[0];
            expect(updatedSp.remainingAmount).toBe(3000);
        });

        it('should handle partial sponsorship coverage', () => {
            const member = createMember({ intakeDate: '2024-01-01', bedRateMonthly: 1000 });
            // Sponsor has only $1500 left
            const sponsor = createSponsorship({ remainingAmount: 1500 });
            
            // Bill for 2 months (Jan, Feb) -> Total Charge $2000
            const result = calculateBilling(member, [sponsor], '2024-02-15');
            
            expect(result.totalCharges).toBe(2000);
            expect(result.totalCovered).toBe(1500); // Max cap
            
            // Check individual charges
            // Charge 1 (Jan): $1000 charge, $1000 covered.
            // Charge 2 (Feb): $1000 charge, $500 covered.
            expect(result.newSponsorshipCharges[0].amountCovered).toBe(1000);
            expect(result.newSponsorshipCharges[1].amountCovered).toBe(500);
            
            expect(result.updatedSponsorships[0].remainingAmount).toBe(0);
        });

        it('should respect sponsorship start/end dates', () => {
            const member = createMember({ intakeDate: '2024-01-01', bedRateMonthly: 1000 });
            // Sponsor starts Feb 1
            const sponsor = createSponsorship({ startDate: '2024-02-01', remainingAmount: 5000 });
            
            // Bill Jan and Feb
            const result = calculateBilling(member, [sponsor], '2024-02-15');
            
            // Jan (Period 0): Not covered (sponsor starts Feb 1)
            // Feb (Period 1): Covered
            
            expect(result.totalCharges).toBe(2000);
            expect(result.newSponsorshipCharges).toHaveLength(1); // Only Feb
            expect(result.newSponsorshipCharges[0].periodIndex).toBe(1);
            expect(result.totalCovered).toBe(1000);
        });
    });
});
