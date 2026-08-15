import api from './client';
import {
  ApiResponse,
  PaginatedResponse,
  Order,
  CreateOrderRequest,
  OrderStatus,
} from '../types';

interface OrdersFilters {
  status?: OrderStatus;
  customerId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export const ordersApi = {
  getOrders: async (filters?: OrdersFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.status) params.append('status', filters.status);
      if (filters.customerId) params.append('customerId', String(filters.customerId));
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.search) params.append('search', filters.search);
    }

    const response = await api.get<ApiResponse<Order[]> | PaginatedResponse<Order>>(
      `/orders?${params.toString()}`
    );
    return response.data;
  },

  getOrder: async (id: number): Promise<Order> => {
    const response = await api.get<ApiResponse<Order>>(`/orders/${id}`);
    if (response.data.status === 'success' && response.data.data) {
      return response.data.data as unknown as Order;
    }
    throw new Error(response.data.message || 'Order not found');
  },

  createOrder: async (order: CreateOrderRequest): Promise<Order> => {
    const response = await api.post<ApiResponse<{ order: Order }>>('/orders', order);
    if (response.data.status === 'success' && response.data.data) {
      // Backend returns { order: {...} } inside data
      const data = response.data.data as { order: Order } | Order;
      const orderData = 'order' in data ? data.order : data;
      return orderData as unknown as Order;
    }
    throw new Error(response.data.message || 'Failed to create order');
  },

  updateOrderStatus: async (id: number, status: OrderStatus): Promise<Order> => {
    const response = await api.patch<ApiResponse<Order>>(`/orders/${id}/status`, { status });
    if (response.data.status === 'success' && response.data.data) {
      return response.data.data as unknown as Order;
    }
    throw new Error(response.data.message || 'Failed to update order status');
  },

  getMarketOrders: async (filters?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const response = await api.get<ApiResponse<Order[]>>(`/orders/market?${params.toString()}`);
    return response.data;
  },

  getStoreOrders: async (filters?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const response = await api.get<ApiResponse<Order[]>>(`/orders/store?${params.toString()}`);
    return response.data;
  },

  /**
   * Delete order permanently
   * Only allowed if:
   * - eBarimt not registered yet
   * - eBarimt has been returned
   * - Order is already cancelled
   */
  deleteOrder: async (id: number) => {
    const response = await api.delete(`/orders/${id}`);
    return response.data;
  },
};
