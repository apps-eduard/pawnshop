export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole | string;
  branchId?: string;
  branchName?: string;
  position?: string;
  contactNumber?: string;
  cityId?: number;
  barangayId?: number;
  address?: string;
  isActive: boolean;
  lastLogin?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Employee {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  branchId?: string;
  branchName?: string;
  position: string;
  contactNumber: string;
  address: Address;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Pawner {
  id: number;
  firstName: string;
  lastName: string;
  contactNumber: string;
  email?: string;
  address?: Address;
  cityId?: number;
  barangayId?: number;
  addressDetails?: string;
  isActive: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Address {
  id?: number;
  cityId: number;
  barangayId: number;
  addressDetails: string;
  city?: City;
  barangay?: Barangay;
}

export interface City {
  id: number;
  name: string;
  province?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Barangay {
  id: number;
  name: string;
  cityId: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum UserRole {
  ADMINISTRATOR = 'administrator',
  MANAGER = 'manager',
  CASHIER = 'cashier',
  AUCTIONEER = 'auctioneer',
  APPRAISER = 'appraiser',
  PAWNER = 'pawner'
}

export enum ItemCategory {
  JEWELRY = 'JEWELRY',
  APPLIANCE = 'APPLIANCE'
}

export enum LoanStatus {
  ACTIVE = 'ACTIVE',
  REDEEMED = 'REDEEMED',
  EXPIRED = 'EXPIRED',
  AUCTIONED = 'AUCTIONED',
  RENEWED = 'RENEWED'
}

export enum TransactionType {
  NEW_LOAN = 'NEW_LOAN',
  REDEEM = 'REDEEM',
  PARTIAL = 'PARTIAL',
  ADDITIONAL = 'ADDITIONAL',
  RENEW = 'RENEW'
}

export interface Appraisal {
  id: number;
  pawnerId: number;
  appraiserId?: number;
  category: string;
  categoryDescription?: string;
  description: string;
  serialNumber?: string;
  weight?: number;
  karat?: number;
  estimatedValue: number;
  interestRate?: number;
  notes?: string;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'cancelled';
  createdAt: Date | string;
  updatedAt: Date | string;
  pawner?: Pawner;
  pawnerName?: string;
  pawnerContact?: string;
  appraiserName?: string;

  // Additional properties from API response
  itemType?: string;
  totalAppraisedValue?: number;
}

export interface CreateAppraisalRequest {
  pawnerId: number;
  category: string;
  categoryDescription?: string;
  description: string;
  serialNumber?: string;
  weight?: number;
  karat?: number;
  estimatedValue: number;
  interestRate?: number;
  notes?: string;
}

export interface Item {
  id: string;
  category: ItemCategory;
  categoryDescription: string;
  itemDescription: string;
  notes?: string;
  appraisalValue: number;
  pawnerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Loan {
  id: string;
  transactionNumber: string;
  itemId: string;
  pawnerId: string;
  branchId: string;
  appraisalValue: number;
  principalLoan: number;
  interestRate: number;
  advanceInterest: number;
  advanceServiceCharge: number;
  netProceed: number;
  transactionDate: Date;
  grantedDate: Date;
  maturedDate: Date;
  expiredDate: Date;
  status: LoanStatus;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoanTransaction {
  id: string;
  loanId: string;
  transactionType: TransactionType;
  amount: number;
  interestAmount?: number;
  penaltyAmount?: number;
  serviceChargeAmount?: number;
  discount?: number;
  receivedAmount?: number;
  changeAmount?: number;
  transactionDate: Date;
  performedById: string;
  createdAt: Date;
}

export interface Voucher {
  id: string;
  code: string;
  voucherType: string;
  paymentMethod: 'CASH' | 'CHEQUE';
  amount: number;
  remarks?: string;
  branchId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  entity: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  performedBy: string;
  branchId?: string;
  previousValues?: any;
  newValues?: any;
  timestamp: Date;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: Address;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardCard {
  title: string;
  count: number;
  amount?: number;
  icon: string;
  color: string;
  route?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    refreshToken: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}


