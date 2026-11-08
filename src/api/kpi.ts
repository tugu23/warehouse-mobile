import api from './client';
import { ApiResponse, KPISummary, KPITrendData } from '../types';

interface KPISummaryFilters {
  from?: string;
  to?: string;
  agentId?: number;
  granularity?: 'day' | 'month' | 'year';
}

/** Shape returned by GET /agent-kpi/trend-data */
interface TrendDataResponse {
  trend: {
    period: string;
    amount: number;
    boxes: number;
    orders: number;
    target: number;
    achievementPct: number;
  }[];
}

export const kpiApi = {
  /**
   * Loads the KPI dashboard for the given period.
   *
   * `/agent-kpi/dashboard-summary` is used rather than `/agent-kpi/summary`
   * because it resolves the agent from the signed-in user when no agentId is
   * given, so it works for Admin, Manager and sales agents alike.
   */
  getKPISummary: async (filters?: KPISummaryFilters): Promise<KPISummary> => {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      if (filters.agentId) params.append('agentId', String(filters.agentId));
    }

    const response = await api.get<ApiResponse<KPISummary>>(
      `/agent-kpi/dashboard-summary?${params.toString()}`
    );
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

  /**
   * Loads the daily trend series. The backend returns `{ trend: [...] }` with
   * ISO period keys, so the rows are mapped into the chart's `day`/`amount`
   * shape here rather than in the screen.
   */
  getTrendData: async (filters?: KPISummaryFilters): Promise<KPITrendData[]> => {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      if (filters.agentId) params.append('agentId', String(filters.agentId));
      params.append('granularity', 'day');
    }

    const response = await api.get<ApiResponse<TrendDataResponse>>(
      `/agent-kpi/trend-data?${params.toString()}`
    );
    if (response.data.status === 'success' && response.data.data?.trend) {
      return response.data.data.trend.map((row) => ({
        day: formatTrendDay(row.period),
        amount: Number(row.amount) || 0,
      }));
    }
    return [];
  },
};

const WEEKDAY_LABELS = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];

/** Turns "2026-11-08" into "Бя" so the chart can show a short day label. */
function formatTrendDay(period: string): string {
  const parsed = new Date(`${period}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return period;
  return WEEKDAY_LABELS[parsed.getDay()];
}
