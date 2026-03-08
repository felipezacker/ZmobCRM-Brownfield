/**
 * Audit Log Dashboard Component
 * T046: Create AuditLogDashboard Component
 * T050: Includes Security Alerts Section
 * 
 * Displays security audit logs for admin users.
 * Shows cross-tenant attempts, suspicious activities, and data exports.
 */
import React, { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  Info,
  AlertCircle,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Activity,
  Bell,
  Check
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

// Performance: reuse Intl formatter to avoid allocating options objects for every log row.
const PT_BR_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const formatDate = (dateStr: string) => {
  const ts = Date.parse(dateStr);
  return PT_BR_DATE_TIME_FORMATTER.format(new Date(ts));
};

const formatRelative = (dateStr: string, nowTs: number) => {
  const ts = Date.parse(dateStr);
  const diffMs = nowTs - ts;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `há ${diffMins} min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays < 7) return `há ${diffDays}d`;
  return PT_BR_DATE_TIME_FORMATTER.format(new Date(ts));
};

interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  severity: 'info' | 'warning' | 'critical';
  created_at: string;
  // Joined data
  user_email?: string;
}

interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: 'warning' | 'critical';
  title: string;
  description: string;
  details: Record<string, unknown> | null;
  user_id: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

const SEVERITY_CONFIG = {
  info: {
    icon: Info,
    bgColor: 'bg-blue-50 dark:bg-blue-500/10',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-500/30',
    label: 'Info',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50 dark:bg-yellow-500/10',
    textColor: 'text-yellow-600 dark:text-yellow-400',
    borderColor: 'border-yellow-200 dark:border-yellow-500/30',
    label: 'Alerta',
  },
  critical: {
    icon: AlertCircle,
    bgColor: 'bg-red-50 dark:bg-red-500/10',
    textColor: 'text-red-600 dark:text-red-400',
    borderColor: 'border-red-200 dark:border-red-500/30',
    label: 'Crítico',
  },
};

const ACTION_LABELS: Record<string, string> = {
  CROSS_TENANT_ATTEMPT: 'Tentativa Cross-Tenant',
  DATA_EXPORT: 'Exportação de Dados',
  DATA_DELETION: 'Exclusão de Dados',
  REVOKE_AI_CONSENT: 'Revogação Consentimento IA',
  REVOKE_ALL_CONSENT: 'Revogação Total de Consentimento',
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  PASSWORD_CHANGE: 'Alteração de Senha',
  USER_CREATED: 'Usuário Criado',
  USER_DELETED: 'Usuário Excluído',
};

/**
 * Componente React `AuditLogDashboard`.
 * @returns {Element} Retorna um valor do tipo `Element`.
 */
export const AuditLogDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const sb = supabase;
  
  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('7d');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    warning: 0,
    info: 0,
  });

  const isAdmin = profile?.role === 'admin';

  const fetchLogs = async () => {
    if (!isAdmin) return;

    if (!sb) {
      setLogs([]);
      setStats({ total: 0, critical: 0, warning: 0, info: 0 });
      setError('Supabase não está configurado neste ambiente.');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Calculate date filter
      const nowTs = Date.now();
      let fromTs = nowTs;
      switch (timeFilter) {
        case '24h':
          fromTs = nowTs - 24 * 60 * 60 * 1000;
          break;
        case '7d':
          fromTs = nowTs - 7 * 24 * 60 * 60 * 1000;
          break;
        case '30d':
          fromTs = nowTs - 30 * 24 * 60 * 60 * 1000;
          break;
        case '90d':
          fromTs = nowTs - 90 * 24 * 60 * 60 * 1000;
          break;
      }

      let query = sb
        .from('audit_logs')
        .select('*')
        .gte('created_at', new Date(fromTs).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setLogs(data as AuditLogEntry[] || []);

      // Calculate stats
      const allLogs = data || [];
      // Performance: single pass (avoid 3x filter).
      let critical = 0;
      let warning = 0;
      let info = 0;
      for (const l of allLogs) {
        if (l.severity === 'critical') critical += 1;
        else if (l.severity === 'warning') warning += 1;
        else info += 1;
      }
      setStats({ total: allLogs.length, critical, warning, info });
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('Erro ao carregar logs de auditoria');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [severityFilter, actionFilter, timeFilter, isAdmin]);

  if (!isAdmin) {
    return (
      <div className="bg-white dark:bg-white/5 border border-border rounded-2xl p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <Shield className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Acesso Restrito
          </h3>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">
            Apenas administradores podem visualizar os logs de auditoria.
          </p>
        </div>
      </div>
    );
  }

  // Performance: compute "now" once per render and pass into relative date formatter.
  const nowTs = Date.now();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-500" />
            Logs de Auditoria
          </h2>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
            Monitore atividades de segurança e tentativas de acesso não autorizado
          </p>
        </div>
        <Button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-white/5 border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted dark:bg-white/10 rounded-lg">
              <Activity className="w-5 h-5 text-secondary-foreground dark:text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">Total</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-white/5 border border-red-200 dark:border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.critical}</p>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">Críticos</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-white/5 border border-yellow-200 dark:border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.warning}</p>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">Alertas</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-white/5 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.info}</p>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">Informativos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-white/5 border border-border rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-secondary-foreground dark:text-muted-foreground">Filtros:</span>
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 bg-background dark:bg-black/20 border border-border rounded-lg text-sm text-secondary-foreground dark:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Todas Severidades</option>
            <option value="critical">Crítico</option>
            <option value="warning">Alerta</option>
            <option value="info">Info</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 bg-background dark:bg-black/20 border border-border rounded-lg text-sm text-secondary-foreground dark:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Todas Ações</option>
            <option value="CROSS_TENANT_ATTEMPT">Cross-Tenant</option>
            <option value="DATA_EXPORT">Exportação</option>
            <option value="DATA_DELETION">Exclusão</option>
            <option value="REVOKE_AI_CONSENT">Revogação IA</option>
          </select>

          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="px-3 py-1.5 bg-background dark:bg-black/20 border border-border rounded-lg text-sm text-secondary-foreground dark:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="24h">Últimas 24h</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Logs List */}
      <div className="bg-white dark:bg-white/5 border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground dark:text-muted-foreground">Carregando logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<Shield className="w-6 h-6 text-muted-foreground dark:text-muted-foreground" />}
            title="Nenhum log encontrado para os filtros selecionados"
            size="md"
          />
        ) : (
          <div className="divide-y divide-border dark:divide-white/10">
            {logs.map((log) => {
              const config = SEVERITY_CONFIG[log.severity];
              const Icon = config.icon;
              const isExpanded = expandedLogId === log.id;

              return (
                <div
                  key={log.id}
                  className={`p-4 hover:bg-background dark:hover:bg-white/5 transition-colors cursor-pointer ${config.bgColor}`}
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
                      <Icon className={`w-5 h-5 ${config.textColor}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
                          {config.label}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground dark:text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatRelative(log.created_at, nowTs)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {log.user_id.slice(0, 8)}...
                        </span>
                        {log.resource_type && (
                          <span className="text-muted-foreground">
                            {log.resource_type}
                            {log.resource_id && ` → ${log.resource_id.slice(0, 8)}...`}
                          </span>
                        )}
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 p-4 bg-background dark:bg-black/20 rounded-lg text-sm space-y-2">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-muted-foreground dark:text-muted-foreground">Data/Hora:</span>
                              <p className="text-secondary-foreground dark:text-muted-foreground">
                                {formatDate(log.created_at)}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground dark:text-muted-foreground">User ID:</span>
                              <p className="text-secondary-foreground dark:text-muted-foreground font-mono text-xs">
                                {log.user_id}
                              </p>
                            </div>
                            {log.ip_address && (
                              <div>
                                <span className="text-muted-foreground dark:text-muted-foreground">IP:</span>
                                <p className="text-secondary-foreground dark:text-muted-foreground">{log.ip_address}</p>
                              </div>
                            )}
                            {log.user_agent && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground dark:text-muted-foreground">User Agent:</span>
                                <p className="text-secondary-foreground dark:text-muted-foreground text-xs truncate">
                                  {log.user_agent}
                                </p>
                              </div>
                            )}
                          </div>

                          {log.details && Object.keys(log.details).length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <span className="text-muted-foreground dark:text-muted-foreground">Detalhes:</span>
                              <pre className="mt-1 p-2 bg-muted dark:bg-black/30 rounded text-xs overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <Button className="p-1 text-muted-foreground hover:text-secondary-foreground dark:hover:text-muted-foreground">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogDashboard;
