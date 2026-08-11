import api from './client';
import { ApiResponse, KPISummary, KPITrendData } from '../types';

interface KPISummaryFilters {
  from?: string;
  to?: string;
  agentId?: number;
  granularity?: 'day' | 'month' | 'year';
}

export const kpiApi = {
  getKPISummary: async (filters?: KPISummaryFilters): Promise<KPISummary> => {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      if (filters.agentId) params.append('agentId', String(filters.agentId));
      if (filters.granularity) params.append('granularity', filters.granularity);
    }

    const response = await api.get<ApiResponse<KPISummary>>(`/agent-kpi/summary?${params.toString()}`);
    if (response.data.status === 'success' && response.data.data) {
      return response.data.data as unknown as KPISummary;
    }
    throw new Error(response.data.message || 'Failed to get KPI summary');
  },

  getDashboardSummary: async (filters?: KPISummaryFilters): Promise<{
    todayOrders: number;
    pendingDeliveries: number;
    monthlyTarget: number;
    monthlyAchievement: number;
  }> => {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      if (filters.agentId) params.append('agentId', String(filters.agentId));
    }

    const response = await api.get<ApiResponse<{
      todayOrders: number;
      pendingDeliveries: number;
      monthlyTarget: number;
      monthlyAchievement: number;
    }>>(`/agent-kpi/dashboard-summary?${params.toString()}`);
    if (response.data.status === 'success' && response.data.data) {
      return response.data.data as unknown as {
        todayOrders: number;
        pendingDeliveries: number;
        monthlyTarget: number;
        monthlyAchievement: number;
      };
    }
    throw new Error(response.data.message || 'Failed to get dashboard summary');
  },

  getTrendData: async (filters?: KPISummaryFilters): Promise<KPITrendData[]> => {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
    }

    const response = await api.get<ApiResponse<KPITrendData[]>>(`/agent-kpi/trend-data?${params.toString()}`);
    if (response.data.status === 'success' && response.data.data) {
      return response.data.data as unknown as KPITrendData[];
    }
    return [];
  },
};
