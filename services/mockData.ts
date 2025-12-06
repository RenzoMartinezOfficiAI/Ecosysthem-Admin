
import { Member, House, MemberStatus, MemberLabel, PayType, UserRole, HouseStatus, Sponsorship, BedCharge, MemberPayment, SystemError, InventoryItem, AuditLogEntry, WorkOrder } from '../types';

export const MOCK_HOUSES: House[] = [
  {
    id: 'h1',
    name: 'Serenity Haven',
    address: '123 Maple Dr, Springfield',
    capacity: 6,
    status: HouseStatus.ONLINE,
    tags: ['Male Only', 'Sober Living'],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  },
  {
    id: 'h2',
    name: 'Hope Cottage',
    address: '456 Oak Ln, Springfield',
    capacity: 4,
    status: HouseStatus.MAINTENANCE,
    tags: ['Women & Children', 'Supportive'],
    createdAt: '2023-02-15T00:00:00Z',
    updatedAt: '2023-10-01T00:00:00Z'
  },
  {
    id: 'h3',
    name: 'Veteran Base Alpha',
    address: '789 Pine St, Springfield',
    capacity: 8,
    status: HouseStatus.ONLINE,
    tags: ['Veteran', 'Wheelchair Accessible'],
    createdAt: '2023-03-10T00:00:00Z',
    updatedAt: '2023-03-10T00:00:00Z'
  }
];

export const MOCK_INVENTORY: InventoryItem[] = [
  { id: 'inv1', houseId: 'h1', name: 'Toilet Paper', category: 'Household', quantity: 24, reorderThreshold: 10, unit: 'rolls', updatedAt: '2023-11-01T00:00:00Z' },
  { id: 'inv2', houseId: 'h1', name: 'Paper Towels', category: 'Household', quantity: 5, reorderThreshold: 6, unit: 'rolls', updatedAt: '2023-11-01T00:00:00Z' },
  { id: 'inv3', houseId: 'h1', name: 'Dish Soap', category: 'Cleaning', quantity: 2, reorderThreshold: 2, unit: 'bottles', updatedAt: '2023-11-01T00:00:00Z' },
  { id: 'inv4', houseId: 'h2', name: 'Laundry Detergent', category: 'Cleaning', quantity: 1, reorderThreshold: 2, unit: 'jugs', updatedAt: '2023-11-01T00:00:00Z' },
  { id: 'inv5', houseId: 'h2', name: 'Light Bulbs (60W)', category: 'Maintenance', quantity: 0, reorderThreshold: 4, unit: 'bulbs', updatedAt: '2023-11-01T00:00:00Z' }, // Critical low stock
];

export const MOCK_WORK_ORDERS: WorkOrder[] = [
    {
        id: 'wo1',
        houseId: 'h1',
        title: 'Leaking Faucet',
        status: 'NEW',
        priority: 'MEDIUM',
        reportedByUserId: 'user1',
        createdAt: '2023-11-05T09:00:00Z',
        updatedAt: '2023-11-05T09:00:00Z'
    },
    {
        id: 'wo2',
        houseId: 'h2',
        title: 'Heater Malfunction',
        status: 'IN_PROGRESS',
        priority: 'EMERGENCY',
        reportedByUserId: 'user2',
        createdAt: '2023-11-06T08:00:00Z',
        updatedAt: '2023-11-06T10:00:00Z'
    }
];

export const MOCK_MEMBERS: Member[] = [
  {
    id: 'm1',
    fullName: 'John Doe',
    status: MemberStatus.ACTIVE,
    label: MemberLabel.MEMBER,
    intakeDate: '2023-06-01T00:00:00Z',
    payType: PayType.SELF_PAY,
    bedRateMonthly: 600,
    houseId: 'h1',
    isVeteran: true,
    veteranBranch: 'Army',
    mediaRelease: true,
    lastBilledPeriodIndex: 5,
    lastBilledThrough: '2023-11-30T00:00:00Z',
    accountBalance: -150, // Owes money
    legacyBalance: -150, // Matched
    hasOutstandingBalance: true,
    createdAt: '2023-06-01T00:00:00Z',
    updatedAt: '2023-11-01T00:00:00Z'
  },
  {
    id: 'm2',
    fullName: 'Jane Smith',
    status: MemberStatus.ACTIVE,
    label: MemberLabel.PATIENT,
    intakeDate: '2023-08-15T00:00:00Z',
    payType: PayType.SPONSORED,
    bedRateMonthly: 800,
    houseId: 'h2',
    isVeteran: false,
    mediaRelease: false,
    lastBilledPeriodIndex: 5,
    lastBilledThrough: '2023-11-30T00:00:00Z',
    accountBalance: 0,
    legacyBalance: 50, // Intentional mismatch for Phase B testing
    hasOutstandingBalance: false,
    createdAt: '2023-08-15T00:00:00Z',
    updatedAt: '2023-10-01T00:00:00Z'
  },
  {
    id: 'm3',
    fullName: 'Robert Brown',
    status: MemberStatus.PENDING,
    label: MemberLabel.BOTH,
    intakeDate: '2023-11-01T00:00:00Z',
    payType: PayType.MIXED,
    bedRateMonthly: 700,
    houseId: null,
    isVeteran: true,
    veteranBranch: 'Navy',
    mediaRelease: true,
    lastBilledPeriodIndex: -1,
    accountBalance: 0,
    legacyBalance: 0,
    hasOutstandingBalance: false,
    createdAt: '2023-11-01T00:00:00Z',
    updatedAt: '2023-11-01T00:00:00Z'
  },
  {
    id: 'm4',
    fullName: "Christopher Mendes",
    phone: "847-828-0322",
    email: "katmendes@me.com",
    dateOfBirth: "1998-04-17",
    status: MemberStatus.ACTIVE,
    label: MemberLabel.MEMBER,
    houseId: "h3", // Mapped to Veteran Base Alpha
    isVeteran: true,
    veteranBranch: "Marine Corps",
    payType: PayType.SPONSORED,
    bedRateMonthly: 900,
    incomeSources: [
      { type: "Part-time job", amountMonthly: 800 },
      { type: "VA", note: "Pending increase" }
    ],
    intakeDate: "2025-11-01",
    emergencyContact: {
      name: "Nimsi Martinez",
      phone: "503-555-0000",
      relationship: "Sibling"
    },
    insuranceProviderName: "Florida Blue Cross Blue Shield",
    insuranceMemberId: "VMDH51430925",
    mediaRelease: true,
    notes: "Prefers bottom bunk. Limited night shifts.",
    lastBilledPeriodIndex: -1,
    accountBalance: 0,
    hasOutstandingBalance: false,
    createdAt: "2025-12-05T00:00:00.000Z",
    updatedAt: "2025-12-05T00:00:00.000Z"
  }
];

export const MOCK_SPONSORSHIPS: Sponsorship[] = [
  {
    id: 's1',
    memberId: 'm2',
    sponsorName: 'Community Health Fund',
    totalAmount: 5000,
    remainingAmount: 2600,
    priority: 1,
    startDate: '2023-08-15T00:00:00Z',
    isActive: true,
    createdAt: '2023-08-15T00:00:00Z',
    updatedAt: '2023-11-01T00:00:00Z'
  }
];

export const MOCK_SYSTEM_ERRORS: SystemError[] = [
  {
    id: 'err1',
    type: 'BILLING',
    severity: 'WARNING',
    message: 'Failed to process recurring charge: Insufficient sponsorship funds.',
    context: { memberId: 'm2', sponsorshipId: 's1', required: 800, available: 600 },
    resolved: false,
    createdAt: '2023-11-01T09:00:00Z'
  },
  {
    id: 'err2',
    type: 'DATA_INTEGRITY',
    severity: 'CRITICAL',
    message: 'Member assigned to offline house.',
    context: { memberId: 'm99', houseId: 'h2' },
    resolved: false,
    createdAt: '2023-11-02T14:30:00Z'
  }
];

export const MOCK_TRANSACTIONS: (BedCharge | MemberPayment)[] = [
  {
    id: 'bc1',
    memberId: 'm1',
    periodIndex: 4,
    periodStart: '2023-10-01T00:00:00Z',
    periodEnd: '2023-10-31T00:00:00Z',
    bedRateAtTime: 600,
    houseIdAtTime: 'h1',
    createdAt: '2023-10-01T00:00:00Z'
  } as BedCharge,
  {
    id: 'mp1',
    memberId: 'm1',
    amount: 450,
    source: 'SELF',
    receivedDate: '2023-10-05T00:00:00Z',
    createdByUserId: 'admin1',
    createdAt: '2023-10-05T00:00:00Z'
  } as MemberPayment
];

export const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
    {
        id: 'aud1',
        action: 'MEMBER_INTAKE',
        actorId: 'user-admin',
        targetId: 'm1',
        timestamp: '2023-06-01T09:00:00Z',
        details: 'Intake completed for John Doe',
        sopReference: 'SOP-OPS-01'
    },
    {
        id: 'aud2',
        action: 'MANUAL_ADJUSTMENT',
        actorId: 'user-admin',
        targetId: 'm1',
        timestamp: '2023-11-01T10:00:00Z',
        details: 'Credit applied for maintenance work',
        sopReference: 'SOP-FIN-05'
    }
];
