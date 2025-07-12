// hooks/useLeadsPagination.ts
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Lead = Database['public']['Tables']['leads']['Row'] & {
  is_student?: boolean;
};

interface FilterState {
  source: string;
  status: string;
  campaign: string;
  company: string;
  startDate: string;
  endDate: string;
  tag: string;
  dateRange: string;
}

interface PaginationParams {
  page: number;
  pageSize: number;
  filters: FilterState;
  searchTerm: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedLeadsResult {
  data: Lead[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export const useLeadsPagination = (
  userId: string | undefined,
  userRole: string | undefined,
  params: PaginationParams
) => {
  const { page, pageSize, filters, searchTerm, sortBy = 'created_at', sortOrder = 'desc' } = params;

  // Função para buscar leads paginados
  const fetchPaginatedLeads = async (): Promise<PaginatedLeadsResult> => {
    if (!userId) {
      return {
        data: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: page,
        hasNextPage: false,
        hasPreviousPage: false,
      };
    }

    // Construir query base para contagem
    let countQuery = supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    // Construir query base para dados
    let dataQuery = supabase
      .from('leads')
      .select(`
        *,
        students(id)
      `);

    // Aplicar filtros de usuário
    if (userRole !== 'admin') {
      countQuery = countQuery.eq('user_id', userId);
      dataQuery = dataQuery.eq('user_id', userId);
    }

    // Aplicar filtros
    const applyFilters = (query: any) => {
      if (filters.source) query = query.eq('source', filters.source);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.campaign) query = query.eq('campaign', filters.campaign);
      if (filters.company) query = query.eq('company', filters.company);
      if (filters.tag) query = query.contains('tags', [filters.tag]);
      if (filters.startDate) query = query.gte('created_at', filters.startDate);
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('created_at', endDate.toISOString().split('T')[0]);
      }
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }
      return query;
    };

    // Aplicar filtros em ambas as queries
    countQuery = applyFilters(countQuery);
    dataQuery = applyFilters(dataQuery);

    // Aplicar ordenação e paginação na query de dados
    dataQuery = dataQuery
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    // Executar ambas as queries
    const [countResult, dataResult] = await Promise.all([
      countQuery,
      dataQuery
    ]);

    if (countResult.error) throw countResult.error;
    if (dataResult.error) throw dataResult.error;

    const totalCount = countResult.count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Adicionar campo is_student baseado na existência de registro na tabela students
    const leadsWithStudentInfo = (dataResult.data || []).map(lead => ({
      ...lead,
      is_student: !!(lead as any).students?.length
    }));

    return {
      data: leadsWithStudentInfo,
      totalCount,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages - 1,
      hasPreviousPage: page > 0,
    };
  };

  // useQuery para leads paginados
  const query = useQuery({
    queryKey: ['leads-paginated', userId, page, pageSize, filters, searchTerm, sortBy, sortOrder],
    queryFn: fetchPaginatedLeads,
    enabled: !!userId,
    staleTime: 30000, // 30 segundos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });

  return {
    ...query,
    leads: query.data?.data || [],
    totalCount: query.data?.totalCount || 0,
    totalPages: query.data?.totalPages || 0,
    currentPage: query.data?.currentPage || 0,
    hasNextPage: query.data?.hasNextPage || false,
    hasPreviousPage: query.data?.hasPreviousPage || false,
  };
};

// Hook para estatísticas rápidas (sem paginação)
export const useLeadsStats = (
  userId: string | undefined,
  userRole: string | undefined,
  filters: FilterState,
  searchTerm: string
) => {
  const fetchLeadsStats = async () => {
    if (!userId) return { totalCount: 0, statusCounts: {} };

    // Query para contagem total
    let countQuery = supabase
      .from('leads')
      .select('status', { count: 'exact' });

    // Aplicar filtros de usuário
    if (userRole !== 'admin') {
      countQuery = countQuery.eq('user_id', userId);
    }

    // Aplicar filtros
    if (filters.source) countQuery = countQuery.eq('source', filters.source);
    if (filters.campaign) countQuery = countQuery.eq('campaign', filters.campaign);
    if (filters.company) countQuery = countQuery.eq('company', filters.company);
    if (filters.tag) countQuery = countQuery.contains('tags', [filters.tag]);
    if (filters.startDate) countQuery = countQuery.gte('created_at', filters.startDate);
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setDate(endDate.getDate() + 1);
      countQuery = countQuery.lt('created_at', endDate.toISOString().split('T')[0]);
    }
    if (searchTerm) {
      countQuery = countQuery.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
    }

    const { data, error, count } = await countQuery;
    if (error) throw error;

    // Contar por status
    const statusCounts = (data || []).reduce((acc: Record<string, number>, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});

    return {
      totalCount: count || 0,
      statusCounts,
    };
  };

  return useQuery({
    queryKey: ['leads-stats', userId, filters, searchTerm],
    queryFn: fetchLeadsStats,
    enabled: !!userId,
    staleTime: 60000, // 1 minuto
  });
};