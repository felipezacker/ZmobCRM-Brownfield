'use client'

import React, { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { ArrowLeft, RefreshCw, Users, Megaphone, Filter as FilterIcon, Trophy, PieChart } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  fetchNewContactsByPeriod,
  fetchContactsBySource,
  fetchConversionFunnel,
  fetchDistribution,
  fetchBrokerPerformance,
} from '@/app/actions/contact-metrics'
import { MetricCard } from './charts/MetricCard'
import { BarChart } from './charts/BarChart'
import { FunnelChart } from './charts/FunnelChart'
import { DonutChart } from './charts/DonutChart'
import { BrokerRankingTable } from './charts/BrokerRankingTable'

function getDefaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setMonth(start.getMonth() - 6)
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  }
}

export function MetricsDashboard() {
  const { organizationId } = useAuth()
  const [dateRange, setDateRange] = useState(getDefaultDateRange)

  const orgId = organizationId || ''

  const periodQuery = useQuery({
    queryKey: ['metrics_period', orgId, dateRange.startDate, dateRange.endDate],
    queryFn: () => fetchNewContactsByPeriod(orgId, dateRange.startDate, dateRange.endDate),
    enabled: !!orgId,
  })

  const sourceQuery = useQuery({
    queryKey: ['metrics_source', orgId, dateRange.startDate, dateRange.endDate],
    queryFn: () => fetchContactsBySource(orgId, dateRange.startDate, dateRange.endDate),
    enabled: !!orgId,
  })

  const funnelQuery = useQuery({
    queryKey: ['metrics_funnel', orgId],
    queryFn: () => fetchConversionFunnel(orgId),
    enabled: !!orgId,
  })

  const distributionQuery = useQuery({
    queryKey: ['metrics_distribution', orgId],
    queryFn: () => fetchDistribution(orgId),
    enabled: !!orgId,
  })

  const brokerQuery = useQuery({
    queryKey: ['metrics_broker', orgId],
    queryFn: () => fetchBrokerPerformance(orgId),
    enabled: !!orgId,
  })

  const isLoading = periodQuery.isLoading || sourceQuery.isLoading || funnelQuery.isLoading || distributionQuery.isLoading || brokerQuery.isLoading
  const hasError = periodQuery.isError || sourceQuery.isError || funnelQuery.isError || distributionQuery.isError || brokerQuery.isError

  const handleRefresh = useCallback(() => {
    periodQuery.refetch()
    sourceQuery.refetch()
    funnelQuery.refetch()
    distributionQuery.refetch()
    brokerQuery.refetch()
  }, [periodQuery, sourceQuery, funnelQuery, distributionQuery, brokerQuery])

  const totalNewContacts = (periodQuery.data?.data || []).reduce((sum, p) => sum + p.count, 0)
  const totalFunnel = (funnelQuery.data?.data || []).reduce((sum, s) => sum + s.count, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/contacts"
            className="p-2 text-muted-foreground hover:text-secondary-foreground dark:hover:text-white transition-colors"
            aria-label="Voltar para contatos"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">
              Metricas de Contatos
            </h1>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground">
              Visao geral da performance e distribuicao de leads
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={e => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            aria-label="Data de inicio"
            className="px-3 py-1.5 text-sm border border-border dark:border-border rounded-lg bg-white dark:bg-white/5 outline-none focus:ring-2 focus:ring-primary-500"
          />
          <span className="text-muted-foreground" aria-hidden="true">-</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={e => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            aria-label="Data de fim"
            className="px-3 py-1.5 text-sm border border-border dark:border-border rounded-lg bg-white dark:bg-white/5 outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 text-muted-foreground hover:text-secondary-foreground dark:text-muted-foreground dark:hover:text-white bg-white dark:bg-white/5 border border-border dark:border-border rounded-lg hover:bg-background dark:hover:bg-white/10 transition-colors disabled:opacity-50"
            aria-label="Atualizar metricas"
          >
            <RefreshCw size={18} className={isLoading ?'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {hasError && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
          Erro ao carregar algumas metricas. Verifique sua conexao e tente novamente.
        </div>
      )}

      {/* Grid de metricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contatos por periodo */}
        <MetricCard
          title="Novos Contatos (periodo)"
          value={totalNewContacts}
          icon={Users}
        >
          {periodQuery.isLoading ? (
            <LoadingSkeleton />
          ) : (
            <BarChart
              items={(periodQuery.data?.data || []).map(p => ({
                label: formatMonth(p.period),
                value: p.count,
              }))}
            />
          )}
        </MetricCard>

        {/* Contatos por source */}
        <MetricCard
          title="Contatos por Origem"
          value={(sourceQuery.data?.data || []).length + ' origens'}
          icon={Megaphone}
        >
          {sourceQuery.isLoading ? (
            <LoadingSkeleton />
          ) : (
            <BarChart
              items={(sourceQuery.data?.data || []).map(s => ({
                label: s.source,
                value: s.count,
              }))}
            />
          )}
        </MetricCard>

        {/* Funil de conversao */}
        <MetricCard
          title="Funil de Conversao"
          value={totalFunnel + ' contatos'}
          icon={FilterIcon}
        >
          {funnelQuery.isLoading ? (
            <LoadingSkeleton />
          ) : (
            <FunnelChart stages={funnelQuery.data?.data || []} />
          )}
        </MetricCard>

        {/* Distribuicao por classificacao */}
        <MetricCard
          title="Distribuicao"
          value="Classificacao & Temperatura"
          icon={PieChart}
        >
          {distributionQuery.isLoading ? (
            <LoadingSkeleton />
          ) : (
            <div className="space-y-6">
              <DonutChart
                title="Por Classificacao"
                items={distributionQuery.data?.data?.byClassification || []}
              />
              <DonutChart
                title="Por Temperatura"
                items={distributionQuery.data?.data?.byTemperature || []}
              />
            </div>
          )}
        </MetricCard>

        {/* Performance por corretor — full width */}
        <div className="md:col-span-2">
          <MetricCard
            title="Ranking de Corretores"
            value={(brokerQuery.data?.data || []).length + ' corretores'}
            icon={Trophy}
          >
            {brokerQuery.isLoading ? (
              <LoadingSkeleton />
            ) : (
              <BrokerRankingTable brokers={brokerQuery.data?.data || []} />
            )}
          </MetricCard>
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-6 bg-muted dark:bg-card rounded-full" style={{ width: `${80 - i * 15}%` }} />
      ))}
    </div>
  )
}

function formatMonth(period: string): string {
  const [year, month] = period.split('-')
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const idx = parseInt(month, 10) - 1
  return `${months[idx] || month}/${year?.slice(2)}`
}
