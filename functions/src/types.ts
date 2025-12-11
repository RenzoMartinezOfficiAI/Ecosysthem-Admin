
// AUTH & ROLES
export enum UserRole {
  ADMIN = 'ADMIN',
  OPERATIONS_MANAGER = 'OPERATIONS_MANAGER',
  HOUSE_LEAD = 'HOUSE_LEAD'
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
}

export interface UserFile {
  id: string;
  uid: string;
  name: string;
  type: string;
  size: number;
  url: string;
  path: string; // Storage path
  notes?: string;
  aiSummary?: string;
  createdAt: string;
}

export enum MemberStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

export enum MemberLabel {
  MEMBER = 'MEMBER',
  PATIENT = 'PATIENT',
  BOTH = 'BOTH'
}

export enum PayType {
  SPONSORED = 'SPONSORED',
  SELF_PAY = 'SELF_PAY',
  MIXED = 'MIXED'
}

// MEMBERS

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship?: string;
}

export interface MemberIncomeSource {
  type: string;              // e.g. "Job", "SSI", "Disability"
  amountMonthly?: number;    // optional
  note?: string;
}

export interface Member {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  status: MemberStatus;
  label: MemberLabel;
  intakeDate: string; // ISO
  exitDate?: string; // ISO
  payType: PayType;
  bedRateMonthly: number;
  houseId?: string | null;
  
  isVeteran: boolean;
  veteranBranch?: string;
  
  emergencyContact?: EmergencyContact;

  insuranceProviderName?: string;
  insuranceMemberId?: string;
  mediaRelease: boolean;

  // Additional fields
  incomeSources?: MemberIncomeSource[];
  notes?: string;

  // Ledger fields
  lastBilledPeriodIndex: number;      // -1 = never billed
  lastBilledThrough?: string;         // ISO
  accountBalance: number;             // current ledger balance
  hasOutstandingBalance: boolean;     // accountBalance < 0
  
  // Phase B: Legacy field for shadow comparison (Deprecated in Phase C)
  legacyBalance?: number;

  createdAt: string;
  updatedAt: string;
}

// HOUSES
export enum HouseStatus {
  ONLINE = 'ONLINE',
  MAINTENANCE = 'MAINTENANCE',
  OFFLINE = 'OFFLINE'
}

export interface House {
  id: string;
  name: string;
  address: string;
  capacity: number;
  status: HouseStatus;
  tags: string[];
  city?: string;
  state?: string;
  postalCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  houseId: string;
  name: string;
  category?: string;
  quantity: number;
  reorderThreshold: number;
  unit: string;
  updatedAt: string;
}

// OPERATIONS
export interface WorkOrder {
  id: string;
  houseId: string;
  title: string;
  description?: string;
  status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  reportedByUserId: string;
  assignedToUserId?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

// FINANCIALS
export interface Sponsorship {
  id: string;
  memberId: string;
  sponsorName: string;
  totalAmount: number;
  remainingAmount: number;
  priority: number;         // 1 = highest
  startDate: string;        // ISO
  endDate?: string;         // ISO
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BedCharge {
  id: string;
  memberId: string;
  periodIndex: number;
  periodStart: string;
  periodEnd: string;
  bedRateAtTime: number;
  houseIdAtTime: string | null;
  createdAt: string;
}

export interface SponsorshipCharge {
  id: string;
  memberId: string;
  sponsorshipId: string;
  periodIndex: number;
  periodStart: string;
  periodEnd: string;
  amountCovered: number;
  createdAt: string;
}

export interface MemberPayment {
  id: string;
  memberId: string;
  amount: number;             // positive
  periodIndex?: number | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  source: 'SELF';
  receivedDate: string;       // ISO
  createdByUserId: string;
  createdAt: string;
}

export interface MemberAdjustment {
  id: string;
  memberId: string;
  amount: number;             // positive = credit, negative = extra charge
  reason: string;
  note: string;
  effectiveDate: string;
  createdByUserId: string;
  createdAt: string;
}

// PHASE C: MONTHLY SUMMARIES
export interface MemberMonthlySummary {
  id: string; // memberId_YYYY-MM
  memberId: string;
  yearMonth: string; // YYYY-MM
  totalCharges: number;
  totalSponsorCoverage: number;
  totalPayments: number;
  totalAdjustments: number;
  netDelta: number;
  openingBalance: number;
  closingBalance: number;
  periodsBilled: number;
  createdAt: string;
  updatedAt: string;
}

export interface SponsorMonthlySummary {
  id: string; // sponsorId_YYYY-MM
  sponsorshipId: string;
  yearMonth: string;
  totalChargesCovered: number;
  createdAt: string;
  updatedAt: string;
}

export interface HouseMonthlySummary {
  id: string; // houseId_YYYY-MM
  houseId: string;
  yearMonth: string;
  totalCharges: number;
  totalSponsorCoverage: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actorId: string;
  targetId: string;
  timestamp: string;
  details?: string;
  sopReference?: string; // e.g., "SOP-FIN-01"
}

export interface SystemError {
  id: string;
  type: 'BILLING' | 'PAYMENT' | 'ADJUSTMENT' | 'EXIT' | 'SECURITY' | 'DATA_INTEGRITY' | 'OTHER';
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  context?: Record<string, unknown>;
  resolved?: boolean;
  createdAt: string;
}
