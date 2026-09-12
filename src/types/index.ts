export type UserRole = 'super_admin';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  mobile?: string;
  status: 'active' | 'suspended';
  photoURL?: string;
  createdAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  source?: string;
  notes?: string;
  createdAt: string;
}

export type EventStatus =
  | 'Draft'
  | 'Requirement Pending'
  | 'Costing'
  | 'Quoted'
  | 'Negotiating'
  | 'Confirmed'
  | 'Booking Confirmed'
  | 'In Execution'
  | 'Completed'
  | 'Cancelled';

export interface EventItem {
  id: string;
  customerId: string;
  customerName: string;
  title: string;
  eventType: string; // Wedding, Engagement, Birthday, Anniversary, Reception, Naming Ceremony, Religious/Social, Corporate
  eventDateStart: string;
  eventDateEnd: string;
  venueAddress: string;
  guestCount: number;
  budgetMin: number;
  budgetMax: number;
  status: EventStatus;
  salesOwnerId?: string;
  salesOwnerName?: string;
  coordinatorId?: string;
  coordinatorName?: string;
  requiredServices?: string[]; // Selected in Event Wizard
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventRequirement {
  id: string;
  eventId: string;
  category: string; // Venue, Catering, Decoration, Photography, Sound & DJ, Makeup, Pandit, Logistics
  requirementType: string;
  quantity: number;
  unit: string; // plate, day, hour, package, item
  specification: string;
  priority: 'Essential' | 'Standard' | 'Optional';
  targetCost: number;
  customerPreference?: string;
  status: 'Pending' | 'Sourced' | 'Assigned' | 'Confirmed';
}

export interface Vendor {
  id: string;
  businessName: string;
  contactName: string;
  mobile: string;
  email: string;
  address: string;
  serviceArea: string; // Warud, Morshi, Amravati, Nagpur, Rural
  rating: number; // 1.0 - 5.0
  status: 'Active' | 'Preferred' | 'Watchlist' | 'Suspended';
  qualityScore: number; // 0 - 100
  reliabilityScore: number; // 0 - 100
  categories: string[];
  baseCost: number;
  pricingModel: 'Per plate' | 'Per day' | 'Fixed package' | 'Per hour';
  notes?: string;
  advanceRequirementPercent: number;
}

export type AssignmentStatus =
  | 'Proposed'
  | 'Availability Pending'
  | 'Offered'
  | 'Confirmed'
  | 'Rejected'
  | 'Completed';

export interface EventVendorAssignment {
  id: string;
  eventId: string;
  vendorId: string;
  vendorName: string;
  category: string;
  requirementId: string;
  quantity: number;
  agreedCost: number;
  customerPrice: number;
  selectionScore: number;
  status: AssignmentStatus;
  notes?: string;
  confirmedAt?: string;
}

export interface CostSheetLine {
  id: string;
  requirementId?: string;
  category: string;
  description: string;
  quantity: number;
  unitCost: number;
  baseCost: number;
  travelLogistics: number;
  labourSetup: number;
  addons: number;
  internalCost: number;
  markupPercent: number;
  customerPrice: number;
}

export interface CostSheet {
  id: string;
  eventId: string;
  version: number;
  subtotalCost: number;
  overhead: number;
  contingency: number;
  marginAmount: number;
  marginPercent: number;
  discount: number;
  taxes: number; // GST 18%
  finalPrice: number;
  status: 'Draft' | 'Approved' | 'Superseded';
  createdBy: string;
  lines: CostSheetLine[];
  updatedAt: string;
}

export type QuoteStatus =
  | 'Draft'
  | 'Sent'
  | 'Viewed'
  | 'Accepted'
  | 'Rejected'
  | 'Expired'
  | 'Superseded';

export interface QuoteLine {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  isOptional?: boolean;
}

export interface Quote {
  id: string;
  eventId: string;
  quoteNumber: string;
  version: number;
  validUntil: string;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  status: QuoteStatus;
  terms: string;
  lines: QuoteLine[];
  createdAt: string;
}

export type InvoiceStatus = 'Pending' | 'Partial' | 'Paid';
export type InvoiceType = 'Advance' | 'Milestone' | 'Final';

export interface InvoiceLine {
  id: string;
  description: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  eventId: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  title?: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  paidAmount: number;
  status: InvoiceStatus;
  gstRate?: number;
  notes?: string;
  lines?: InvoiceLine[];
}

export type PaymentType = 'Advance' | 'Milestone' | 'Final' | 'Security Deposit';

export interface Payment {
  id: string;
  eventId: string;
  invoiceId?: string;
  invoiceNumber?: string;
  payerType: 'Customer' | 'Vendor Payout';
  paymentType?: PaymentType;
  vendorId?: string;
  vendorName?: string;
  amount: number;
  method: 'UPI' | 'Bank Transfer' | 'Cash' | 'Card';
  transactionRef: string;
  receiptNumber: string;
  paidAt: string;
  status: 'Success' | 'Pending' | 'Failed';
  notes?: string;
}

export interface Task {
  id: string;
  eventId: string;
  title: string;
  ownerName: string;
  status: 'To Do' | 'In Progress' | 'Waiting' | 'Done';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  dueAt: string;
  category?: string;
}

export interface AuditLog {
  id: string;
  actorName: string;
  entityType: string;
  entityId: string;
  action: string;
  details: string;
  createdAt: string;
  timestamp?: string;
}
