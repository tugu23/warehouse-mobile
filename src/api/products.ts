import api from './client';
import { ApiResponse, Product, Category } from '../types';

interface ProductsFilters {
  search?: string;
  categoryId?: number;
  supplierId?: number;
  page?: number;
  limit?: number;
}

export const productsApi = {
  getProducts: async (filters?: ProductsFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.search) params.append('search', filters.search);
      if (filters.categoryId) params.append('categoryId', String(filters.categoryId));
      if (filters.supplierId) params.append('supplierId', String(filters.supplierId));
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
    }

    const response = await api.get(`/products?${params.toString()}`);
    // Backend returns { status, data: { products: [...] } }
    if (response.data?.data?.products) {
      return response.data.data.products;
    }
    return response.data?.data || [];
  },

  getProduct: async (id: number): Promise<Product> => {
    const response = await api.get<ApiResponse<Product>>(`/products/${id}`);
    if (response.data.status === 'success' && response.data.data) {
      return response.data.data as unknown as Product;
    }
    throw new Error(response.data.message || 'Product not found');
  },

  getProductByBarcode: async (barcode: string): Promise<Product> => {
    const response = await api.get<ApiResponse<{ product: Product }>>(`/products/barcode/${barcode}`);
    if (response.data.status === 'success' && response.data.data) {
      return (response.data.data as unknown as { product: Product }).product;
    }
    throw new Error(response.data.message || 'Product not found');
  },

  getCategories: async (): Promise<Category[]> => {
    const response = await api.get<ApiResponse<Category[]>>('/categories');
    if (response.data.status === 'success' && response.data.data) {
      return response.data.data as unknown as Category[];
    }
    return [];
  },

  deleteProduct: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<{ message: string }>>(`/products/${id}`);
    if (response.data.status !== 'success') {
      throw new Error(response.data.message || 'Failed to delete product');
    }
  },
};
