/**
 * Hook for filtered prospecting contacts (CP-1.3)
 *
 * Layer pattern: features/{name}/hooks/ -> UI logic + state management
 * Calls: lib/supabase/prospecting-filtered-contacts.ts
 */

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import {
  prospectingFilteredContactsService,
  type FilteredContactsParams,
  type ProspectingFilteredContact,
} from '@/lib/supabase/prospecting-filtered-contacts'
import type { ProspectingFiltersState } from '../components/ProspectingFilters'

export const useProspectingFilteredContacts = () => {
  const { user, loading: authLoading } = useAuth()

  // Applied filters (only updated on "Aplicar Filtros" click)
  const [appliedFilters, setAppliedFilters] = useState<FilteredContactsParams | null>(null)
  const [page, setPage] = useState(0)

  const applyFilters = useCallback((filters: ProspectingFiltersState) => {
    const params: FilteredContactsParams = {
      stages: filters.stages.length > 0 ? filters.stages : undefined,
      temperatures: filters.temperatures.length > 0 ? filters.temperatures : undefined,
      classifications: filters.classifications.length > 0 ? filters.classifications : undefined,
      source: filters.source || undefined,
      ownerId: filters.ownerId || undefined,
      inactiveDays: filters.inactiveDays ?? undefined,
      onlyWithPhone: filters.onlyWithPhone || undefined,
      page: 0,
      pageSize: 50,
    }
    setAppliedFilters(params)
    setPage(0)
  }, [])

  const clearFilters = useCallback(() => {
    setAppliedFilters(null)
    setPage(0)
  }, [])

  const queryParams = appliedFilters
    ? { ...appliedFilters, page }
    : null

  const {
    data,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['prospectingFilteredContacts', queryParams],
    queryFn: async () => {
      if (!queryParams) return { data: [], totalCount: 0 }
      const { data, error } = await prospectingFilteredContactsService.getFilteredContacts(queryParams)
      if (error) throw error
      return data!
    },
    enabled: !authLoading && !!user && !!queryParams,
    staleTime: 30 * 1000,
  })

  const contacts: ProspectingFilteredContact[] = data?.data ?? []
  const totalCount = data?.totalCount ?? 0
  const hasResults = appliedFilters !== null
  const totalPages = Math.ceil(totalCount / 50)

  const goToPage = useCallback((p: number) => {
    setPage(p)
  }, [])

  const getAllFilteredIds = useCallback(async (): Promise<string[]> => {
    if (!appliedFilters) return []
    const { data, error } = await prospectingFilteredContactsService.getAllFilteredIds(appliedFilters)
    if (error || !data) return []
    return data
  }, [appliedFilters])

  return {
    contacts,
    totalCount,
    page,
    totalPages,
    goToPage,
    isLoading,
    isFetching,
    error,
    hasResults,
    applyFilters,
    clearFilters,
    getAllFilteredIds,
  }
}
