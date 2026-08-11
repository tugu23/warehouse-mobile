// API Response Types
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface PaginatedResponse<T> {
  status: 'success';
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth Types
export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  phoneNumber?: string;
  storeId?: number;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// Promotion Types
export interface Promotion {
  id: number;
  name: string;
  type: 'BUY_X_GET_Y' | 'PERCENT_DISCOUNT';
  isActive: boolean;
  startDate: string;
  endDate: string;
  buyQty?: number;
  freeQty?: number;
  discountPercent?: number;
}

// Product Types
export interface ProductPrice {
  customerTypeId: number;
  price: number;
  customerType?: CustomerType;
}

export interface Product {
  id: number;
  nameMongolian: string;
  nameEnglish?: string;
  productCode?: string;
  barcode?: string;
  categoryId?: number;
  category?: Category;
  stockQuantity: number;
  defaultPrice: number;
  unitsPerBox?: number;
  pricePerBox?: number;
  vatType: 'VAT' | 'VAT_FREE' | 'VAT_ZERO' | 'NO_VAT';
  isActive: boolean;
  prices?: ProductPrice[];
  promotions?: Promotion[];
}

// Category Types
export interface Category {
  id: number;
  nameMongolian: string;
  nameEnglish?: string;
  description?: string;
}

// Customer Types
export type CustomerTypeName = 'Retail' | 'Wholesale';

export interface CustomerType {
  id: number;
  typeName?: string;
  name?: string;
}

export interface Customer {
  id: number;
  name: string;
  realName?: string;
  phoneNumber?: string;
  address?: string;
  district?: string;
  customerType?: CustomerType;
  customerTypeId?: number;
  isVatPayer: boolean;
  ebarimtConsumerNo?: string;
  organizationName?: string;
  registrationNumber?: string;
  assignedAgent?: Employee;
  assignedAgentId?: number;
  orderCount?: number;
  locationLatitude?: number;
  locationLongitude?: number;
}

// Order Types
export type OrderStatus = 'Pending' | 'Fulfilled' | 'Delivered' | 'Cancelled';
export type OrderType = 'Market' | 'Store';
export type PaymentMethod = 'Cash' | 'Credit' | 'BankTransfer' | 'Sales' | 'Padan';
export type PaymentStatus = 'Paid' | 'Pending' | 'Partial' | 'Overdue';

export interface OrderItem {
  id: number;
  productId: number;
  product?: Product;
  quantity: number;
  unitPrice: number;
  subtotal?: number;
}

export interface Order {
  id: number;
  orderNumber?: string;
  customerId: number;
  customer?: Customer;
  agentId: number;
  createdBy?: Employee;
  orderDate: string;
  deliveryDate?: string;
  status: OrderStatus;
  orderType: OrderType;
  subtotalAmount?: number;
  vatAmount?: number;
  totalAmount: number;
  paidAmount?: number;
  remainingAmount?: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  creditTermDays?: number;
  orderItems?: OrderItem[];
  ebarimtRegistered?: boolean;
  ebarimtId?: string;
  ebarimtBillId?: string;
  ebarimtDate?: string;
}

export interface CreateOrderRequest {
  customerId: number;
  items: Array<{
    productId: number;
    quantity: number;
    priceMode?: 'auto' | 'customerType' | 'custom';
    customUnitPrice?: number;
  }>;
  paymentMethod: PaymentMethod;
  creditTermDays?: number;
  orderType: OrderType;
  deliveryDate?: string;
}

// Employee Types
export interface Employee {
  id: number;
  name: string;
  email: string;
  phoneNumber?: string;
  roleId: number;
  role?: Role;
  storeId?: number;
  store?: Store;
  isActive: boolean;
}

export interface Role {
  id: number;
  name: string;
}

export interface Store {
  id: number;
  name: string;
  address?: string;
  storeType?: 'Market' | 'Store';
}

// KPI Types
export interface KPISummary {
  period: {
    from: string;
    to: string;
  };
  summary: {
    totalOrders: number;
    totalBoxes: number;
    totalAmount: number;
    targetAmount?: number;
    achievementPercentage?: number;
  };
  vsPreviousPeriod: {
    ordersChange: number;
    amountChange: number;
  };
  topProducts: Array<{
    productName: string;
    quantity: number;
    amount: number;
  }>;
  topCustomers: Array<{
    customerName: string;
    orderCount: number;
    amount: number;
  }>;
}

export interface KPITrendData {
  day: string;
  amount: number;
}

// Cart Types (for order creation)
export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
}

// Promotion Types
export interface Promotion {
  id: number;
  type: 'BUY_X_GET_Y' | 'PERCENT_DISCOUNT';
  label: string;
  buyQty?: number;
  freeQty?: number;
  tiers?: Array<{
    minQty: number;
    discountPercent: number;
  }>;
}

// Receipt/eBarimt Types
export type EBarimtType = 'B2C' | 'B2B';

export interface EBarimtStatus {
  online: boolean;
  message: string;
  lotteryCount?: number;
  lastSentDate?: string;
}

export interface EBarimtRegisterResult {
  success: boolean;
  ebarimtBillId?: string;
  lottery?: string;
  qrBase64?: string;
  pdfUrl?: string;
  message?: string;
}

export interface EBarimtReturnResult {
  success: boolean;
  returnId?: string;
  message?: string;
}

export interface EBarimtRegisterBody {
  type: EBarimtType;
  customerNo?: string; // B2C: citizen reg number, B2B: org reg number
  save?: boolean; // Save customer info
}

export interface OrganizationInfo {
  name: string;
  tin: string;
  address: string;
  phone?: string;
}

export interface ReceiptData {
  orderNumber: string;
  customer: Customer;
  items: CartItem[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  date: string;
  lottery?: string;
  qrData?: string;
}

// Printer Types
export interface Printer {
  id: string;
  name: string;
  address: string;
  isConnected: boolean;
  isDefault: boolean;
}

export interface PrintJob {
  id: string;
  type: 'register' | 'return' | 'print';
  payload: any;
  retries: number;
  createdAt: string;
  status: 'pending' | 'printing' | 'completed' | 'failed';
}

// Queued API Job (for offline support)
export interface QueuedApiJob {
  id: string;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  payload: any;
  retries: number;
  createdAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}
