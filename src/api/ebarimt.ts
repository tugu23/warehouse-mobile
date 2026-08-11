import { api } from './client';
import {
  EBarimtStatus,
  EBarimtRegisterResult,
  EBarimtReturnResult,
  EBarimtRegisterBody,
  OrganizationInfo,
} from '@/types';

/**
 * Organization lookup result type
 */
type OrganizationLookupResponse = {
  organization?: {
    regno: string;
    tin?: string;
    name: string;
    address?: string;
    vatPayer?: boolean;
    status?: string;
  };
};

type RegNoLookupResult = {
  regno: string;
  tin: string;
  name: string;
  address?: string;
  vatPayer?: boolean;
  status?: string;
};

/**
 * Registration number validation result
 */
export type RegistrationValidationResult = {
  valid: boolean;
  type?: 'seven_digit' | 'ten_to_twelve_digit' | 'citizen';
  error?: string;
};

/**
 * Validate registration number format
 * Supports: 7-digit, 10-12 digit, or 2 letters + 8 digits (citizen format)
 */
export function validateRegistrationNumber(regNo: string): RegistrationValidationResult {
  const trimmed = regNo.trim().toUpperCase();

  // 7-digit format (e.g., 1234567)
  if (/^\d{7}$/.test(trimmed)) {
    return { valid: true, type: 'seven_digit' };
  }

  // 10-12 digit format (e.g., 1234567890)
  if (/^\d{10,12}$/.test(trimmed)) {
    return { valid: true, type: 'ten_to_twelve_digit' };
  }

  // Citizen format: 2 letters + 8 digits (e.g., АБ12345678 or XY12345678)
  if (/^[A-ZА-ЯЁӨҮ]{2}\d{8}$/.test(trimmed)) {
    return { valid: true, type: 'citizen' };
  }

  return {
    valid: false,
    error: 'Регистр 7 орон, 10-12 орон, эсвэл ЭСҮҮЛ+8 тоо байх ёстой',
  };
}

export const ebarimtApi = {
  /**
   * Get eBarimt service status
   */
  getStatus: async (): Promise<EBarimtStatus> => {
    const response = await api.get<EBarimtStatus>('/api/ebarimt/status');
    return response.data;
  },

  /**
   * Get merchant information
   */
  getInformation: async () => {
    const response = await api.get('/api/ebarimt/information');
    return response.data;
  },

  /**
   * Register an order with eBarimt
   */
  register: async (
    orderId: number,
    body?: EBarimtRegisterBody
  ): Promise<EBarimtRegisterResult> => {
    const response = await api.post<EBarimtRegisterResult>(
      `/api/ebarimt/register/${orderId}`,
      body
    );
    return response.data;
  },

  /**
   * Return/cancel an eBarimt receipt
   */
  returnOrder: async (
    orderId: number,
    reason?: string
  ): Promise<EBarimtReturnResult> => {
    const response = await api.post<EBarimtReturnResult>(
      `/api/ebarimt/return/${orderId}`,
      { reason }
    );
    return response.data;
  },

  /**
   * Check TIN validity
   */
  checkTin: async (tin: string) => {
    const response = await api.get(`/api/ebarimt/check-tin/${tin}`);
    return response.data;
  },

  /**
   * Lookup organization info by registration number (using ITDMS eTax API)
   */
  lookupOrganization: async (
    regNo: string
  ): Promise<OrganizationInfo> => {
    const response = await api.get<OrganizationInfo>(
      `/api/etax/organization/${regNo}`
    );
    return response.data;
  },

  /**
   * Generate QR data for eBarimt bill
   */
  generateQrData: (billId: string, date: string, amount: number): string => {
    // Standard eBarimt QR format
    // Format: INV|{billId}|{date}|{amount}
    return `INV|${billId}|${date}|${amount}`;
  },

  /**
   * Get eBarimt info by TIN number
   * Mirrors web's getEbarimtInfoByTin()
   */
  getEbarimtInfoByTin: async (tin: string): Promise<{ name: string; tin: string }> => {
    const normalizedTin = tin.trim();
    if (!normalizedTin) {
      throw new Error('ТТД оруулах');
    }

    const response = await api.get<{ data?: OrganizationLookupResponse }>(
      `/api/etax/organization/${encodeURIComponent(normalizedTin)}`
    );

    const name = response.data.data?.organization?.name?.trim() ?? '';
    if (!name) {
      throw new Error('Иргэн/байгууллагын нэр олдсонгүй');
    }

    return { name, tin: response.data.data?.organization?.tin?.trim() || normalizedTin };
  },

  /**
   * Lookup eBarimt by registration number with full validation
   * Mirrors web's lookupEbarimtByRegNo()
   */
  lookupEbarimtByRegNo: async (regNo: string): Promise<RegNoLookupResult> => {
    const normalizedRegNo = String(regNo ?? '').trim().toUpperCase();

    // Validate registration number format
    const validation = validateRegistrationNumber(normalizedRegNo);
    if (!validation.valid) {
      throw new Error(validation.error || 'Регистрийн дугаар буруу байна');
    }

    const response = await api.get<{ data?: OrganizationLookupResponse }>(
      `/api/etax/organization/${normalizedRegNo}`
    );
    const organization = response.data.data?.organization;

    if (!organization?.tin || !organization?.name) {
      throw new Error('Регистрийн дугаараар мэдээлэл олдсонгүй');
    }

    return {
      regno: organization.regno,
      tin: organization.tin,
      name: organization.name,
      address: organization.address,
      vatPayer: organization.vatPayer,
      status: organization.status,
    };
  },

  /**
   * Get TIN info from registration number
   * Mirrors web's getTinInfo()
   */
  getTinInfo: async (regNo: string | number): Promise<{ tinNumber: string; tinName: string }> => {
    const organization = await ebarimtApi.lookupEbarimtByRegNo(String(regNo));
    return {
      tinNumber: organization.tin,
      tinName: organization.name,
    };
  },

  /**
   * Lookup organization by 7-digit registration number
   * Mirrors web's lookupEbarimtOrganizationBySevenDigitReg()
   */
  lookupEbarimtOrganizationBySevenDigitReg: async (
    regNo: string
  ): Promise<{ name: string; tin: string }> => {
    const validation = validateRegistrationNumber(regNo);
    if (!validation.valid) {
      throw new Error(validation.error || 'Регистрийн дугаар буруу байна');
    }

    const response = await api.get<{ data?: OrganizationLookupResponse }>(
      `/api/etax/organization/${regNo}`
    );
    const organization = response.data.data?.organization;

    if (!organization?.tin || !organization?.name) {
      throw new Error('Регистрийн дугаараар мэдээлэл олдсонгүй');
    }

    return { name: organization.name, tin: organization.tin };
  },
};
