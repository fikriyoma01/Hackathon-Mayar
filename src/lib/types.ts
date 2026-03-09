export type UserRole = "admin" | "merchant" | "operator";

export type PortionStatus =
  | "available"
  | "sponsored"
  | "distributing"
  | "rerouted"
  | "completed";

export type TransactionStatus = "pending" | "paid" | "failed" | "expired";

export type VoucherStatus = "active" | "redeemed" | "rerouted" | "expired";

export type DistributionStatus =
  | "queued"
  | "on-route"
  | "verified"
  | "completed"
  | "rerouted";

export type DistributionPriority = "critical" | "high" | "normal";
export type ApprovalActionType = "portion-status" | "distribution-reroute";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export type PaymentChannel = "QRIS Mayar" | "Virtual Account" | "Payment Link";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatarUrl?: string;
  merchantId?: string;
  nodeId?: string;
}

export interface Merchant {
  id: string;
  name: string;
  ownerName: string;
  area: string;
  active: boolean;
  phone: string;
  etaMinutes: number;
  rating: number;
  specialty: string;
  logoUrl?: string;
  imageUrl?: string;
}

export interface DistributionNode {
  id: string;
  name: string;
  type: "masjid" | "komunitas";
  area: string;
  contactName: string;
  contactPhone: string;
  active: boolean;
  imageUrl?: string;
}

export interface Portion {
  id: string;
  merchantId: string;
  title: string;
  description: string;
  totalPortions: number;
  availablePortions: number;
  sponsoredPortions: number;
  distributedPortions: number;
  price: number;
  sponsorPrice: number;
  pickupStartAt: string;
  pickupEndAt: string;
  expiresAt: string;
  status: PortionStatus;
  assignedNodeId: string;
  tags: string[];
  lastUpdatedAt: string;
  imageUrl?: string;
}

export interface Transaction {
  id: string;
  portionId: string;
  donorName: string;
  donorEmail: string;
  donorPhone: string;
  sponsoredPortions: number;
  amount: number;
  status: TransactionStatus;
  paymentChannel: PaymentChannel;
  mayarInvoiceId: string;
  mayarTransactionId?: string;
  mayarPaymentUrl: string;
  checkoutPath: string;
  mayarQrString: string;
  createdAt: string;
  expiresAt: string;
  paidAt?: string;
  voucherId?: string;
  notes?: string;
  mayarWebhookPayload?: string;
}

export interface Voucher {
  id: string;
  code: string;
  portionId: string;
  transactionId: string;
  merchantId: string;
  assignedNodeId: string;
  recipientAlias: string;
  portionCount: number;
  status: VoucherStatus;
  expiresAt: string;
  qrPayload: string;
  createdAt: string;
  redeemedAt?: string;
  proofActivityId?: string;
  imageUrl?: string;
}

export interface DistributionActivity {
  id: string;
  voucherId?: string;
  portionId: string;
  nodeId: string;
  actorName: string;
  actorRole: string;
  locationLabel: string;
  status: DistributionStatus;
  note: string;
  taskDueAt: string;
  createdAt: string;
  updatedAt: string;
  proofImageUrl?: string;
  routeImageUrl?: string;
  priorityLevel?: DistributionPriority;
}

export interface ActivityLog {
  id: string;
  title: string;
  description: string;
  entityType:
    | "portion"
    | "transaction"
    | "voucher"
    | "distribution"
    | "payment"
    | "system";
  entityId: string;
  actor: string;
  timestamp: string;
  tone: "info" | "success" | "warning";
}

export interface ApprovalRequest {
  id: string;
  actionType: ApprovalActionType;
  entityType: "portion" | "distribution";
  entityId: string;
  entityLabel: string;
  requestedByName: string;
  requestedByRole: UserRole;
  requestNote?: string;
  payload: Record<string, string>;
  status: ApprovalStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedByName?: string;
  reviewNote?: string;
}

export interface StoreMeta {
  version: number;
  lastUpdatedAt: string;
}

export interface AppStore {
  meta: StoreMeta;
  users: AppUser[];
  merchants: Merchant[];
  nodes: DistributionNode[];
  portions: Portion[];
  transactions: Transaction[];
  vouchers: Voucher[];
  distributions: DistributionActivity[];
  activityLogs: ActivityLog[];
  approvalRequests: ApprovalRequest[];
}

export interface CreatePortionInput {
  merchantId?: string;
  title: string;
  description: string;
  totalPortions: number;
  sponsorPrice: number;
  pickupStartAt: string;
  pickupEndAt: string;
  assignedNodeId?: string;
  tags?: string[];
}

export interface CreateSponsorTransactionInput {
  portionId: string;
  donorName: string;
  donorEmail: string;
  donorPhone: string;
  sponsoredPortions: number;
}

export interface CreateMerchantInput {
  name: string;
  ownerName: string;
  area: string;
  phone: string;
  etaMinutes: number;
  specialty: string;
  imageUrl?: string;
  logoUrl?: string;
}

export interface CreateNodeInput {
  name: string;
  type: "masjid" | "komunitas";
  area: string;
  contactName: string;
  contactPhone: string;
  imageUrl?: string;
}

export interface UpdatePortionInput {
  title: string;
  description: string;
  pickupStartAt: string;
  pickupEndAt: string;
  assignedNodeId: string;
  tags?: string[];
  imageUrl?: string;
}

export interface UpdateMerchantInput {
  name: string;
  ownerName: string;
  area: string;
  phone: string;
  etaMinutes: number;
  specialty: string;
  imageUrl?: string;
}

export interface UpdateNodeInput {
  name: string;
  type: "masjid" | "komunitas";
  area: string;
  contactName: string;
  contactPhone: string;
  imageUrl?: string;
}

export interface UpdatePortionStatusInput {
  portionId: string;
  status: PortionStatus;
  actorName: string;
}

export interface UpdateDistributionStatusInput {
  activityId: string;
  status: DistributionStatus;
  actorName: string;
}

export interface VerifyVoucherInput {
  code: string;
  actorName: string;
}

export interface AttachProofInput {
  activityId: string;
  actorName: string;
  note: string;
  proofImageUrl: string;
}

export interface RerouteDistributionInput {
  activityId: string;
  nodeId: string;
  actorName: string;
  note?: string;
}
