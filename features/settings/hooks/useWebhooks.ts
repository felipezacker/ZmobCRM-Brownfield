import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Board } from '@/types';

export type InboundSourceRow = {
  id: string;
  name: string;
  entry_board_id: string;
  entry_stage_id: string;
  secret: string;
  active: boolean;
};

export type OutboundEndpointRow = {
  id: string;
  name: string;
  url: string;
  secret: string;
  active: boolean;
};

export type InboundEventRow = {
  id: string;
  received_at: string;
  status: string;
  external_event_id: string | null;
  error: string | null;
  created_deal_id: string | null;
};

export function generateSecret() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  // base64url
  const b64 = btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
  return b64;
}

export function buildWebhookUrl(sourceId: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return `${base}/functions/v1/webhook-in/${sourceId}`;
}

export function buildCurlExample(url: string, secret: string) {
  return `curl -X POST '${url}' \\
  -H 'Content-Type: application/json' \\
  -H 'X-Webhook-Secret: ${secret}' \\
  -H 'Authorization: Bearer ${secret}' \\
  -d '{
    "deal_title": "Contrato Anual - Acme",
    "deal_value": 12000,
    "company_name": "Empresa Ltd",
    "contact_name": "Nome do Contato",
    "email": "email@exemplo.com",
    "phone": "+5511999999999",
    "source": "webhook"
  }'`;
}

type Toast = (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;

interface UseWebhooksParams {
  profile: { role: string; organization_id: string | null } | null;
  addToast: Toast;
  boards: Board[];
  boardsLoading: boolean;
}

export function useWebhooks({ profile, addToast, boards, boardsLoading }: UseWebhooksParams) {
  const [sources, setSources] = useState<InboundSourceRow[]>([]);
  const [endpoint, setEndpoint] = useState<OutboundEndpointRow | null>(null);
  const [loading, setLoading] = useState(false);

  const defaultBoard = useMemo(() => boards.find(b => b.isDefault) || boards[0] || null, [boards]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const selectedBoard = useMemo(
    () => boards.find(b => b.id === selectedBoardId) || defaultBoard,
    [boards, selectedBoardId, defaultBoard]
  );
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const stages = useMemo(() => selectedBoard?.stages || [], [selectedBoard?.stages]);

  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [followUpUrl, setFollowUpUrl] = useState('');

  const [isQuickStartOpen, setIsQuickStartOpen] = useState(false);
  const [quickStartTab, setQuickStartTab] = useState<'inbound' | 'outbound'>('inbound');
  const [inboundStep, setInboundStep] = useState<1 | 2 | 3>(1);
  const [inboundProvider, setInboundProvider] = useState<'hotmart' | 'n8n' | 'make'>('n8n');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [inboundEvents, setInboundEvents] = useState<InboundEventRow[]>([]);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; raw?: unknown } | null>(null);

  const [confirmDeleteInboundOpen, setConfirmDeleteInboundOpen] = useState(false);
  const [confirmDeleteOutboundOpen, setConfirmDeleteOutboundOpen] = useState(false);

  const canUse = profile?.role === 'admin' && !!profile?.organization_id;

  const activeInbound = useMemo(() => sources.find((s) => s.active) || sources[0] || null, [sources]);
  const hasInbound = !!activeInbound && !!activeInbound.active;

  const inboundBoardName = useMemo(() => {
    if (!activeInbound) return null;
    const b = boards.find((x) => x.id === activeInbound.entry_board_id);
    return b?.name || null;
  }, [activeInbound, boards]);

  const inboundStageLabel = useMemo(() => {
    if (!activeInbound) return null;
    const b = boards.find((x) => x.id === activeInbound.entry_board_id);
    const s = b?.stages?.find((x) => x.id === activeInbound.entry_stage_id);
    return s?.label || null;
  }, [activeInbound, boards]);

  const loadWebhooks = useCallback(async () => {
    if (!canUse) return;
    if (!supabase) return;
    setLoading(true);
    try {
      const { data: srcData } = await supabase
        .from('integration_inbound_sources')
        .select('id,name,entry_board_id,entry_stage_id,secret,active')
        .order('created_at', { ascending: false });
      setSources((srcData as InboundSourceRow[] | null) ?? []);

      const { data: epData } = await supabase
        .from('integration_outbound_endpoints')
        .select('id,name,url,secret,active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setEndpoint((epData as OutboundEndpointRow | null) ?? null);
    } finally {
      setLoading(false);
    }
  }, [canUse]);

  useEffect(() => {
    if (!canUse) return;
    if (!supabase) return;

    loadWebhooks();
  }, [canUse, loadWebhooks]);

  useEffect(() => {
    if (!selectedBoardId && defaultBoard?.id) setSelectedBoardId(defaultBoard.id);
  }, [defaultBoard?.id, selectedBoardId]);

  useEffect(() => {
    if (!selectedStageId && stages.length > 0) {
      const preferred =
        stages.find(s => (s.label || '').toLowerCase().includes('novo')) || stages[0];
      setSelectedStageId(preferred.id);
    }
  }, [stages, selectedStageId]);

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1200);
  }

  async function loadInboundEvents(sourceId: string) {
    if (!canUse) return;
    if (!supabase) return;
    if (!profile?.organization_id) return;
    const { data } = await supabase
      .from('webhook_events_in')
      .select('id,received_at,status,external_event_id,error,created_deal_id')
      .eq('organization_id', profile.organization_id)
      .eq('source_id', sourceId)
      .order('received_at', { ascending: false })
      .limit(3);
    setInboundEvents((data as InboundEventRow[] | null) ?? []);
  }

  async function createInboundSource() {
    if (!canUse) return;
    if (!selectedBoard?.id || !selectedStageId) return;

    const secret = generateSecret();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('integration_inbound_sources')
        .insert({
          organization_id: profile!.organization_id,
          name: 'Entrada de Leads',
          entry_board_id: selectedBoard.id,
          entry_stage_id: selectedStageId,
          secret,
          active: true,
        })
        .select('id')
        .single();

      if (error) throw error;

      const sourceId = (data as { id: string } | null)?.id ?? '';
      setSources((prev) => [
        { id: sourceId, name: 'Entrada de Leads', entry_board_id: selectedBoard.id, entry_stage_id: selectedStageId, secret, active: true },
        ...prev,
      ]);
      setInboundStep(2);
      await loadInboundEvents(sourceId);
      addToast('Pronto: URL e Secret gerados.', 'success');
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Erro ao ativar entrada de leads', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function saveInboundDestination() {
    if (!canUse) return;
    if (!activeInbound?.id) return;
    if (!selectedBoard?.id || !selectedStageId) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('integration_inbound_sources')
        .update({
          entry_board_id: selectedBoard.id,
          entry_stage_id: selectedStageId,
        })
        .eq('id', activeInbound.id);
      if (error) throw error;
      addToast('Destino atualizado.', 'success');
      await loadWebhooks();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Erro ao atualizar destino', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function runInboundTest() {
    if (!activeInbound) return;
    const url = buildWebhookUrl(activeInbound.id);
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          'X-Webhook-Secret': activeInbound.secret,
          Authorization: `Bearer ${activeInbound.secret}`,
          },
          body: JSON.stringify({
          external_event_id: `ui-test-${Date.now()}`,
          contact_name: 'Lead Teste',
            email: `teste+${Date.now()}@exemplo.com`,
          phone: '+5511999999999',
          source: 'webhook-ui',
          deal_title: 'Teste de Webhook',
          deal_value: 0,
          company_name: 'Empresa Teste',
          }),
        });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTestResult({ ok: false, message: json?.error || 'Falha no teste', raw: json });
        addToast(json?.error || 'Falha no teste do webhook', 'error');
      } else {
        setTestResult({ ok: true, message: json?.message || 'Recebido!', raw: json });
        addToast('Teste recebido com sucesso.', 'success');
      }
      await loadInboundEvents(activeInbound.id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro no teste';
      setTestResult({ ok: false, message: msg });
      addToast(msg || 'Erro no teste do webhook', 'error');
    } finally {
      setTestLoading(false);
    }
  }

  async function handleSaveFollowUp() {
    if (!canUse) return;
    if (!followUpUrl.trim()) return;

    setLoading(true);
    try {
      if (endpoint?.id) {
        const { data, error } = await supabase
          .from('integration_outbound_endpoints')
          .update({
            url: followUpUrl.trim(),
          })
          .eq('id', endpoint.id)
          .select('id,name,url,secret,active')
          .single();
        if (error) throw error;
        setEndpoint(data as OutboundEndpointRow | null);
        addToast('Follow-up atualizado!', 'success');
      } else {
        const secret = generateSecret();
        const { data, error } = await supabase
          .from('integration_outbound_endpoints')
          .insert({
            organization_id: profile!.organization_id,
            name: 'Follow-up (Webhook)',
            url: followUpUrl.trim(),
            secret,
            events: ['deal.stage_changed'],
            active: true,
          })
          .select('id,name,url,secret,active')
          .single();

        if (error) throw error;
        setEndpoint(data as OutboundEndpointRow | null);
        addToast('Follow-up conectado!', 'success');
      }
      setIsFollowUpOpen(false);
      setFollowUpUrl('');
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Erro ao salvar follow-up', 'error');
    } finally {
      setLoading(false);
    }
  }

  function openQuickStart(tab: 'inbound' | 'outbound') {
    setQuickStartTab(tab);
    setInboundStep(1);
    setTestResult(null);
    setCopiedKey(null);
    setInboundProvider('n8n');
    if (tab === 'inbound' && activeInbound) {
    setSelectedBoardId(activeInbound.entry_board_id);
    setSelectedStageId(activeInbound.entry_stage_id);
      loadInboundEvents(activeInbound.id);
    }
    setIsQuickStartOpen(true);
  }

  async function handleToggleInboundActive(nextActive: boolean) {
    if (!canUse) return;
    if (!activeInbound) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('integration_inbound_sources')
        .update({ active: nextActive })
        .eq('id', activeInbound.id);
      if (error) throw error;
      addToast(nextActive ? 'Entrada de leads ativada!' : 'Entrada de leads desativada.', 'success');
      await loadWebhooks();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Erro ao atualizar status do webhook', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteInbound() {
    if (!canUse) return;
    if (!activeInbound) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('integration_inbound_sources')
        .delete()
        .eq('id', activeInbound.id);
      if (error) throw error;
      addToast('Configuração de entrada removida.', 'success');
      await loadWebhooks();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Erro ao excluir webhook', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleOutboundActive(nextActive: boolean) {
    if (!canUse) return;
    if (!endpoint?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('integration_outbound_endpoints')
        .update({ active: nextActive })
        .eq('id', endpoint.id);
      if (error) throw error;
      addToast(nextActive ? 'Follow-up ativado!' : 'Follow-up desativado.', 'success');
      await loadWebhooks();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Erro ao atualizar follow-up', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerateOutboundSecret() {
    if (!canUse) return;
    if (!endpoint?.id) return;
    const nextSecret = generateSecret();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('integration_outbound_endpoints')
        .update({ secret: nextSecret })
        .eq('id', endpoint.id)
        .select('id,name,url,secret,active')
        .single();
      if (error) throw error;
      setEndpoint(data as OutboundEndpointRow | null);
      addToast('Secret do follow-up regenerado. Atualize no seu n8n/Make/WhatsApp.', 'success');
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Erro ao regenerar secret', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteOutbound() {
    if (!canUse) return;
    if (!endpoint?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('integration_outbound_endpoints')
        .delete()
        .eq('id', endpoint.id);
      if (error) throw error;
      setEndpoint(null);
      addToast('Follow-up removido.', 'success');
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Erro ao excluir follow-up', 'error');
    } finally {
      setLoading(false);
    }
  }

  return {
    sources,
    endpoint,
    loading,
    selectedBoardId,
    setSelectedBoardId,
    selectedBoard,
    selectedStageId,
    setSelectedStageId,
    stages,
    isFollowUpOpen,
    setIsFollowUpOpen,
    followUpUrl,
    setFollowUpUrl,
    isQuickStartOpen,
    setIsQuickStartOpen,
    quickStartTab,
    setQuickStartTab,
    inboundStep,
    setInboundStep,
    inboundProvider,
    setInboundProvider,
    copiedKey,
    inboundEvents,
    testLoading,
    testResult,
    confirmDeleteInboundOpen,
    setConfirmDeleteInboundOpen,
    confirmDeleteOutboundOpen,
    setConfirmDeleteOutboundOpen,
    canUse,
    activeInbound,
    hasInbound,
    inboundBoardName,
    inboundStageLabel,
    boardsLoading,
    boards,
    copy,
    createInboundSource,
    saveInboundDestination,
    runInboundTest,
    handleSaveFollowUp,
    openQuickStart,
    handleToggleInboundActive,
    handleDeleteInbound,
    handleToggleOutboundActive,
    handleRegenerateOutboundSecret,
    handleDeleteOutbound,
  };
}
