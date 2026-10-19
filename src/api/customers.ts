import api from './client';
import { ApiResponse, Customer, CustomerType } from '../types';

interface CustomersFilters {
  search?: string;
  customerTypeId?: number;
  page?: number;
  limit?: number;
  forOrder?: boolean;
}

interface CustomerListResponse {
  status: string;
  data: {
    customers: Customer[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

interface CustomerTypeListResponse {
  status: string;
  data: {
    customerTypes: CustomerType[];
  };
}

export const customersApi = {
  getCustomers: async (filters?: CustomersFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.search) params.append('search', filters.search);
      if (filters.customerTypeId) params.append('customerTypeId', String(filters.customerTypeId));
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.forOrder) params.append('forOrder', 'true');
    }

    const response = await api.get<CustomerListResponse>(
      `/customers?${params.toString()}`
    );
    return response.data.data.customers;
  },

  getCustomer: async (id: number): Promise<Customer> => {
    const response = await api.get<ApiResponse<{ customer: Customer }>>(`/customers/${id}`);
    if (response.data.status === 'success' && response.data.data?.customer) {
      return response.data.data.customer;
    }
    throw new Error(response.data.message || 'Customer not found');
  },

  createCustomer: async (customer: Partial<Customer>): Promise<Customer> => {
    const response = await api.post<ApiResponse<{ customer: Customer }>>('/customers', customer);
    if (response.data.status === 'success' && response.data.data?.customer) {
      return response.data.data.customer;
    }
    throw new Error(response.data.message || 'Failed to create customer');
  },

  updateCustomer: async (id: number, customer: Partial<Customer>): Promise<Customer> => {
    const response = await api.put<ApiResponse<{ customer: Customer }>>(`/customers/${id}`, customer);
    if (response.data.status === 'success' && response.data.data?.customer) {
      return response.data.data.customer;
    }
    throw new Error(response.data.message || 'Failed to update customer');
  },

  deleteCustomer: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<{ message: string }>>(`/customers/${id}`);
    if (response.data.status !== 'success') {
      throw new Error(response.data.message || 'Failed to delete customer');
    }
  },

  // Get all customer types from API
  getCustomerTypes: async (): Promise<CustomerType[]> => {
    const response = await api.get<CustomerTypeListResponse>('/customer-types');
    if (response.data.status === 'success' && response.data.data?.customerTypes) {
      return response.data.data.customerTypes;
    }
    return [];
  },
};
