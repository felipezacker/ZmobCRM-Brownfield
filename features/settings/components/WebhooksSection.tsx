import React from 'react';
import { Webhook, ArrowRight, Copy, Check, Link as LinkIcon, Pencil, Power, Trash2, KeyRound, HelpCircle } from 'lucide-react';
import { SettingsSection } from './SettingsSection';
import { Modal } from '@/components/ui/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import { useBoards } from '@/context/boards/BoardsContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useWebhooks, buildWebhookUrl, buildCurlExample } from '@/features/settings/hooks/useWebhooks';

/**
 * Componente React `WebhooksSection`.
 * @returns {Element} Retorna um valor do tipo `Element`.
 */
export const WebhooksSection: React.FC = () => {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const { boards, loading: boardsLoading } = useBoards();

  const {
    endpoint,
    loading,
    selectedBoard,
    selectedStageId,
    setSelectedBoardId,
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
    activeInbound,
    hasInbound,
    inboundBoardName,
    inboundStageLabel,
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
  } = useWebhooks({ profile, addToast, boards, boardsLoading });

  const canUse = profile?.role === 'admin' && !!profile?.organization_id;

  return (
    <SettingsSection title="Webhooks" icon={Webhook}>
      <p className="text-sm text-secondary-foreground dark:text-muted-foreground mb-5 leading-relaxed">
        Ative automações sem técnico: escolha onde os leads entram e (opcionalmente) conecte um endpoint
        para follow-up quando um lead mudar de etapa.
      </p>

      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground dark:text-muted-foreground">
          Dica: se você está integrando com Hotmart/n8n/Make, use o guia rápido.
        </div>
        <Button
          onClick={() => openQuickStart('inbound')}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-white dark:bg-white/5 border border-border text-secondary-foreground hover:bg-background dark:hover:bg-white/10 transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          Como usar
        </Button>
      </div>

      {!canUse ? (
        <div className="p-4 bg-background dark:bg-white/5 border border-border rounded-xl text-sm text-secondary-foreground dark:text-muted-foreground">
          Disponível apenas para administradores.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Entrada */}
          <div className="p-5 bg-white dark:bg-white/5 border border-border rounded-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-foreground">Entrada de Leads (Webhook)</h4>
                <p className="text-sm text-secondary-foreground dark:text-muted-foreground mt-1">
                  Receba leads de Hotmart, formulários, n8n/Make e crie automaticamente um negócio no funil.
                </p>
              </div>
              <span className={`text-2xs font-bold px-2 py-1 rounded uppercase ${hasInbound ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-muted dark:bg-white/10 text-secondary-foreground dark:text-muted-foreground'}`}>
                {hasInbound ? 'Ativo' : 'Desativado'}
              </span>
            </div>

            {activeInbound ? (
              <div className="mt-4 flex flex-col gap-2">
                <div className="text-xs text-muted-foreground dark:text-muted-foreground">
                  Fonte: <span className="font-medium text-secondary-foreground dark:text-muted-foreground">{activeInbound.name}</span>
                  {inboundBoardName && inboundStageLabel ? (
                    <>
                      {' '}· <span className="text-secondary-foreground dark:text-muted-foreground">{inboundBoardName}</span>
                      {' '}→ <span className="text-secondary-foreground dark:text-muted-foreground">{inboundStageLabel}</span>
                    </>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => copy(buildWebhookUrl(activeInbound.id), 'url')}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-background dark:bg-black/20 border border-border hover:bg-muted dark:hover:bg-white/10 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar URL
                    {copiedKey === 'url' && <Check className="h-4 w-4 text-green-600" />}
                  </Button>
                  <Button
                    onClick={() => copy(activeInbound.secret, 'inboundSecret')}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-background dark:bg-black/20 border border-border hover:bg-muted dark:hover:bg-white/10 transition-colors"
                  >
                    <KeyRound className="h-4 w-4" />
                    Copiar secret
                    {copiedKey === 'inboundSecret' && <Check className="h-4 w-4 text-green-600" />}
                  </Button>
                  <Button
                    onClick={() => openQuickStart('inbound')}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-white dark:bg-white/5 border border-border hover:bg-background dark:hover:bg-white/10 transition-colors disabled:opacity-60"
                  >
                    <Pencil className="h-4 w-4" />
                    Ajustar / Testar
                  </Button>
                  <Button
                    onClick={() => handleToggleInboundActive(!activeInbound.active)}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-white dark:bg-white/5 border border-border hover:bg-background dark:hover:bg-white/10 transition-colors disabled:opacity-60"
                  >
                    <Power className="h-4 w-4" />
                    {activeInbound.active ? 'Desativar' : 'Ativar'}
                  </Button>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <Button
                    onClick={() => copy(buildCurlExample(buildWebhookUrl(activeInbound.id), activeInbound.secret), 'inboundCurl')}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-white dark:bg-white/5 border border-border hover:bg-background dark:hover:bg-white/10 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar cURL (importar no n8n)
                    {copiedKey === 'inboundCurl' && <Check className="h-4 w-4 text-green-600" />}
                  </Button>

                  <Button
                    onClick={() => setConfirmDeleteInboundOpen(true)}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-white dark:bg-white/5 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <Button
                  onClick={() => openQuickStart('inbound')}
                  disabled={loading || boardsLoading || boards.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  Ativar entrada de leads
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Saída */}
          <div className="p-5 bg-white dark:bg-white/5 border border-border rounded-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-foreground">Follow-up (Webhook de saída)</h4>
                <p className="text-sm text-secondary-foreground dark:text-muted-foreground mt-1">
                  Quando um lead mudar de etapa, enviamos um aviso para seu WhatsApp/n8n/Make.
                </p>
              </div>
              <span className={`text-2xs font-bold px-2 py-1 rounded uppercase ${endpoint?.active ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-muted dark:bg-white/10 text-secondary-foreground dark:text-muted-foreground'}`}>
                {endpoint?.active ? 'Ativo' : 'Desativado'}
              </span>
            </div>

            {endpoint ? (
              <div className="mt-4 flex flex-col gap-2">
                <div className="text-xs text-muted-foreground dark:text-muted-foreground flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  <span className="font-mono truncate max-w-[520px]">{endpoint.url}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => copy(endpoint.url, 'outboundUrl')}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-background dark:bg-black/20 border border-border hover:bg-muted dark:hover:bg-white/10 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar URL
                    {copiedKey === 'outboundUrl' && <Check className="h-4 w-4 text-green-600" />}
                  </Button>
                  <Button
                    onClick={() => copy(endpoint.secret, 'outboundSecret')}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-background dark:bg-black/20 border border-border hover:bg-muted dark:hover:bg-white/10 transition-colors"
                  >
                    <KeyRound className="h-4 w-4" />
                    Copiar secret
                    {copiedKey === 'outboundSecret' && <Check className="h-4 w-4 text-green-600" />}
                  </Button>
                  <Button
                    onClick={() => { setFollowUpUrl(endpoint.url); setIsFollowUpOpen(true); }}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-white dark:bg-white/5 border border-border hover:bg-background dark:hover:bg-white/10 transition-colors disabled:opacity-60"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    onClick={() => handleToggleOutboundActive(!endpoint.active)}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-white dark:bg-white/5 border border-border hover:bg-background dark:hover:bg-white/10 transition-colors disabled:opacity-60"
                  >
                    <Power className="h-4 w-4" />
                    {endpoint.active ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    onClick={handleRegenerateOutboundSecret}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-white dark:bg-white/5 border border-border hover:bg-background dark:hover:bg-white/10 transition-colors disabled:opacity-60"
                  >
                    <KeyRound className="h-4 w-4" />
                    Regenerar secret
                  </Button>
                  <Button
                    onClick={() => setConfirmDeleteOutboundOpen(true)}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-white dark:bg-white/5 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <Button
                  onClick={() => setIsFollowUpOpen(true)}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white dark:bg-white/5 border border-border text-secondary-foreground hover:bg-background dark:hover:bg-white/10 transition-colors"
                >
                  Conectar follow-up (opcional)
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Start (produto) */}
      <Modal
        isOpen={isQuickStartOpen}
        onClose={() => setIsQuickStartOpen(false)}
        title="Webhooks (guia rápido)"
        size="xl"
        bodyClassName="max-h-[70vh] overflow-auto"
      >
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm text-secondary-foreground dark:text-muted-foreground leading-relaxed">
              Conecte em <b>minutos</b>: gere URL/Secret, configure no seu provedor e faça um teste.
              <div className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
                Você pode usar <code className="font-mono">X-Webhook-Secret</code> <span className="mx-1">ou</span>{' '}
                <code className="font-mono">Authorization: Bearer</code>.
              </div>
            </div>
            <div className="inline-flex rounded-xl bg-muted dark:bg-white/10 p-1 border border-border">
              <Button
                type="button"
                onClick={() => setQuickStartTab('inbound')}
                className={cn('px-3 py-1.5 rounded-lg text-sm font-bold transition-colors',
 quickStartTab === 'inbound'
 ? 'bg-white dark:bg-black/20 text-foreground shadow-sm'
 : 'text-secondary-foreground dark:text-muted-foreground hover:bg-white/60 dark:hover:bg-white/10'
 )}
              >
                Receber leads
              </Button>
              <Button
                type="button"
                onClick={() => setQuickStartTab('outbound')}
                className={cn('px-3 py-1.5 rounded-lg text-sm font-bold transition-colors',
 quickStartTab === 'outbound'
 ? 'bg-white dark:bg-black/20 text-foreground shadow-sm'
 : 'text-secondary-foreground dark:text-muted-foreground hover:bg-white/60 dark:hover:bg-white/10'
 )}
              >
                Follow-up
              </Button>
            </div>
          </div>

          {quickStartTab === 'outbound' ? (
        <div className="space-y-4">
              <div className="text-sm text-secondary-foreground dark:text-muted-foreground leading-relaxed">
                <b>Follow-up</b> envia um aviso quando um lead muda de etapa. Você cola uma URL (n8n/Make/WhatsApp) e
                valida o Secret no seu lado.
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-border">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-secondary-foreground dark:text-muted-foreground">
                    {endpoint?.url ? (
                      <>
                        <div className="text-xs font-bold text-muted-foreground dark:text-muted-foreground">URL atual</div>
                        <div className="mt-1 font-mono text-xs break-all">{endpoint.url}</div>
                      </>
                    ) : (
                      <>Nenhum follow-up conectado ainda.</>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      setIsQuickStartOpen(false);
                      if (endpoint?.url) setFollowUpUrl(endpoint.url);
                      setIsFollowUpOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                  >
                    Configurar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground dark:text-muted-foreground">
                Dica: para testar, mova um deal de etapa — o aviso dispara somente na mudança.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stepper */}
              <div className="flex items-center gap-2">
                {[
                  { n: 1 as const, label: 'Destino' },
                  { n: 2 as const, label: 'Conexão' },
                  { n: 3 as const, label: 'Teste' },
                ].map((s, idx) => (
                  <Button
                    key={s.n}
                    type="button"
                    onClick={() => setInboundStep(s.n)}
                    className={cn('group flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold transition-colors',
 inboundStep === s.n
 ? 'bg-white dark:bg-white/5 border-border text-foreground '
 : 'bg-transparent border-transparent text-muted-foreground dark:text-muted-foreground hover:bg-background dark:hover:bg-white/5'
 )}
                  >
                    <span
                      className={cn('h-6 w-6 rounded-full inline-flex items-center justify-center text-xs border',
 inboundStep === s.n
 ? 'bg-primary-600 text-white border-primary-600'
 : 'bg-transparent border-border text-secondary-foreground dark:text-muted-foreground group-hover:bg-white dark:group-hover:bg-black/20'
 )}
                    >
                      {s.n}
                    </span>
                    <span>{s.label}</span>
                    {idx < 2 ? <span className="text-muted-foreground /10">/</span> : null}
                  </Button>
                ))}
          </div>

              {/* Step 1: Destino */}
              {inboundStep === 1 ? (
                <div className="space-y-4">
                  <div className="text-sm text-secondary-foreground dark:text-muted-foreground">
                    Escolha <b>qual funil</b> e <b>qual etapa</b> o lead vai cair.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
                      <label className="text-xs font-bold text-secondary-foreground dark:text-muted-foreground">Funil</label>
            <select
              value={selectedBoard?.id || ''}
              onChange={(e) => {
                setSelectedBoardId(e.target.value);
                setSelectedStageId('');
              }}
                        className="w-full px-4 py-2.5 bg-background dark:bg-black/20 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-foreground"
                        disabled={boardsLoading || boards.length === 0}
            >
                        {boards.map((b) => (
                <option key={b.id} value={b.id}>
                            {b.name}
                            {b.isDefault ? ' (padrão)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
                      <label className="text-xs font-bold text-secondary-foreground dark:text-muted-foreground">Etapa</label>
            <select
              value={selectedStageId}
              onChange={(e) => setSelectedStageId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-background dark:bg-black/20 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-foreground"
              disabled={!selectedBoard || stages.length === 0}
            >
                        {stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
              ))}
            </select>
                    </div>
          </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="text-xs text-muted-foreground dark:text-muted-foreground">
                      {activeInbound ? (
                        <>
                          Atual: <b>{inboundBoardName}</b> → <b>{inboundStageLabel}</b>
                        </>
                      ) : (
                        <>Você vai gerar uma URL única e um Secret (senha) para esse destino.</>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {activeInbound ? (
            <Button
                          type="button"
                          onClick={saveInboundDestination}
                          disabled={loading || !selectedBoard?.id || !selectedStageId}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-white dark:bg-white/5 border border-border hover:bg-background dark:hover:bg-white/10 transition-colors disabled:opacity-60"
            >
                          <Pencil className="h-4 w-4" />
                          Salvar destino
            </Button>
                      ) : (
            <Button
                          type="button"
                          onClick={() => setInboundStep(2)}
                          disabled={!selectedBoard?.id || !selectedStageId}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
                          Continuar
              <ArrowRight className="h-4 w-4" />
            </Button>
                      )}
          </div>
        </div>
                </div>
              ) : null}

              {/* Step 2: Conexão */}
              {inboundStep === 2 ? (
        <div className="space-y-4">
                  <div className="text-sm text-secondary-foreground dark:text-muted-foreground">
                    Copie a <b>URL</b> e o <b>Secret</b> e cole no seu provedor (Hotmart / n8n / Make).
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-border space-y-3">
                    {activeInbound ? (
                      <>
          <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-bold text-secondary-foreground dark:text-muted-foreground">URL do webhook</div>
              <Button
                              type="button"
                              onClick={() => copy(buildWebhookUrl(activeInbound.id), 'qsUrl')}
                              className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-background dark:bg-black/20 border border-border hover:bg-muted dark:hover:bg-white/10 text-xs font-semibold text-secondary-foreground dark:text-muted-foreground"
              >
                              {copiedKey === 'qsUrl' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                              Copiar
              </Button>
            </div>
                          <div className="px-3 py-2 rounded-xl bg-background dark:bg-black/20 border border-border font-mono text-xs text-foreground dark:text-muted-foreground break-all">
                            {buildWebhookUrl(activeInbound.id)}
                          </div>
          </div>

          <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-bold text-secondary-foreground dark:text-muted-foreground">Secret (senha)</div>
              <Button
                              type="button"
                              onClick={() => copy(activeInbound.secret, 'qsSecret')}
                              className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-background dark:bg-black/20 border border-border hover:bg-muted dark:hover:bg-white/10 text-xs font-semibold text-secondary-foreground dark:text-muted-foreground"
              >
                              {copiedKey === 'qsSecret' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                              Copiar
              </Button>
            </div>
                          <div className="px-3 py-2 rounded-xl bg-background dark:bg-black/20 border border-border font-mono text-xs text-foreground dark:text-muted-foreground break-all">
                            {activeInbound.secret}
                          </div>
            <div className="text-xs text-muted-foreground dark:text-muted-foreground">
                            Envie no header <code className="font-mono">X-Webhook-Secret</code> (ou{' '}
                            <code className="font-mono">Authorization: Bearer</code>).
            </div>
          </div>

                        <details className="rounded-xl bg-background dark:bg-black/20 border border-border p-3">
                          <summary className="cursor-pointer text-sm font-bold text-foreground">
                            Exemplo pronto (cURL)
                          </summary>
                          <div className="mt-3 relative">
              <pre className="whitespace-pre-wrap text-xs p-3 rounded-lg bg-card text-muted-foreground border border-border">
                              {buildCurlExample(buildWebhookUrl(activeInbound.id), activeInbound.secret)}
              </pre>
              <Button
                              type="button"
                              onClick={() => copy(buildCurlExample(buildWebhookUrl(activeInbound.id), activeInbound.secret), 'qsCurl')}
                className="absolute top-2 right-2 px-2 py-1 rounded-md bg-card hover:bg-accent text-xs text-muted-foreground inline-flex items-center gap-1"
              >
                              {copiedKey === 'qsCurl' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                Copiar
              </Button>
            </div>
                        </details>
                      </>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-secondary-foreground dark:text-muted-foreground">
                          Gere sua URL e Secret para começar.
                        </div>
                        <Button
                          type="button"
                          onClick={createInboundSource}
                          disabled={loading || !selectedBoard?.id || !selectedStageId}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                        >
                          Gerar URL e Secret
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
          </div>

                  <div className="p-4 rounded-2xl bg-background dark:bg-black/20 border border-border">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-bold text-secondary-foreground dark:text-muted-foreground">Seu provedor</div>
                      <div className="inline-flex rounded-xl bg-white dark:bg-white/10 p-1 border border-border">
                        {(
                          [
                            { key: 'hotmart' as const, label: 'Hotmart' },
                            { key: 'n8n' as const, label: 'n8n' },
                            { key: 'make' as const, label: 'Make' },
                          ] as const
                        ).map((p) => (
            <Button
                            key={p.key}
                            type="button"
                            onClick={() => setInboundProvider(p.key)}
                            className={cn('px-3 py-1.5 rounded-lg text-sm font-bold transition-colors',
 inboundProvider === p.key
 ? 'bg-white dark:bg-black/20 text-foreground shadow-sm'
 : 'text-secondary-foreground dark:text-muted-foreground hover:bg-white/60 dark:hover:bg-white/10'
 )}
                          >
                            {p.label}
            </Button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-secondary-foreground dark:text-muted-foreground leading-relaxed">
                      {inboundProvider === 'hotmart' ? (
                        <>
                          Cole a <b>URL</b> no webhook do produto e envie o Secret no header{' '}
                          <code className="font-mono">X-Webhook-Secret</code>. No body, envie JSON com pelo menos{' '}
                          <b>email</b> ou <b>phone</b>.
                        </>
                      ) : inboundProvider === 'make' ? (
                        <>
                          Use um módulo <b>HTTP</b> com <b>POST</b> e <b>JSON</b>. Headers: <code className="font-mono">X-Webhook-Secret</code>{' '}
                          (ou <code className="font-mono">Authorization: Bearer</code>). Body: email ou phone.
                        </>
                      ) : (
                        <>
                          Use <b>HTTP Request</b> (POST) com <b>JSON</b>. Headers: <code className="font-mono">X-Webhook-Secret</code>{' '}
                          (ou <code className="font-mono">Authorization: Bearer</code>). Body: email ou phone.
                        </>
                      )}
                    </div>

                    <div className="mt-2 text-xs text-muted-foreground dark:text-muted-foreground">
                      Quer deixar "bonito"? Envie também <code className="font-mono">contact_name</code>,{' '}
                      <code className="font-mono">company_name</code> e <code className="font-mono">deal_title</code>.
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
            <Button
                      type="button"
                      onClick={() => setInboundStep(1)}
                      className="px-3 py-2 rounded-lg text-sm font-semibold text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/10 transition-colors"
                    >
                      Voltar
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setInboundStep(3)}
                      disabled={!activeInbound}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
                      Fazer teste
                      <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
                </div>
              ) : null}

              {/* Step 3: Teste */}
              {inboundStep === 3 ? (
                <div className="space-y-4">
                  <div className="text-sm text-secondary-foreground dark:text-muted-foreground leading-relaxed">
                    Envie um evento de teste para confirmar que está tudo certo. Isso cria/atualiza um lead de teste no
                    funil.
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-border space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-bold text-foreground">Teste agora</div>
                        <Button
                          type="button"
                          onClick={runInboundTest}
                          disabled={!activeInbound || testLoading}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                        >
                          {testLoading ? 'Enviando...' : 'Enviar teste'}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>

                      {testResult ? (
                        <div
                          className={cn('p-3 rounded-xl border text-sm',
 testResult.ok
 ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-800 dark:text-green-200'
 : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-200'
 )}
                        >
                          <div className="font-bold">{testResult.ok ? 'Recebido ✓' : 'Falhou'}</div>
                          <div className="mt-1">{testResult.message}</div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground dark:text-muted-foreground">
                          Dica: se o seu provedor estiver configurado, você também pode mandar um lead real e ver os
                          eventos aqui.
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-border space-y-3">
                      <div className="text-sm font-bold text-foreground">Últimos recebidos</div>
                      {activeInbound ? (
                        inboundEvents.length > 0 ? (
                          <div className="space-y-2">
                            {inboundEvents.map((ev) => (
                              <div
                                key={ev.id}
                                className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-background dark:bg-black/20 border border-border"
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-secondary-foreground dark:text-muted-foreground truncate">
                                    {new Date(ev.received_at).toLocaleString()}
                                  </div>
                                  <div className="text-1xs text-muted-foreground dark:text-muted-foreground truncate">
                                    {ev.external_event_id ? `event_id: ${ev.external_event_id}` : 'event_id: —'}
                                  </div>
                                </div>
                                <div className="text-xs font-bold">
                                  {String(ev.status || '').toLowerCase().includes('processed') ? (
                                    <span className="text-green-700 dark:text-green-300">OK</span>
                                  ) : String(ev.status || '').toLowerCase().includes('received') ? (
                                    <span className="text-secondary-foreground dark:text-muted-foreground">Recebido</span>
                                  ) : (
                                    <span className="text-red-700 dark:text-red-300">Erro</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-secondary-foreground dark:text-muted-foreground">
                            Ainda não recebemos nada. Envie um teste.
                          </div>
                        )
                      ) : (
                        <div className="text-sm text-secondary-foreground dark:text-muted-foreground">
                          Gere a URL/Secret antes de testar.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      onClick={() => setInboundStep(2)}
                      className="px-3 py-2 rounded-lg text-sm font-semibold text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/10 transition-colors"
                    >
                      Voltar
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setIsQuickStartOpen(false)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                    >
                      Concluir
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </Modal>

      {/* Follow-up modal */}
      <Modal
        isOpen={isFollowUpOpen}
        onClose={() => setIsFollowUpOpen(false)}
        title={endpoint?.id ? 'Editar follow-up' : 'Conectar follow-up'}
        size="sm"
      >
        <div className="space-y-4">
          <div className="text-sm text-secondary-foreground dark:text-muted-foreground">
            Cole a URL do seu WhatsApp/n8n/Make. Quando um lead mudar de etapa, enviaremos um aviso.
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-secondary-foreground dark:text-muted-foreground">URL do destino</label>
            <input
              value={followUpUrl}
              onChange={(e) => setFollowUpUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 bg-background dark:bg-black/20 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-foreground"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              onClick={() => setIsFollowUpOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/10 transition-colors"
            >
              Agora não
            </Button>
            <Button
              onClick={handleSaveFollowUp}
              disabled={loading || !followUpUrl.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {endpoint?.id ? 'Salvar' : 'Conectar'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={confirmDeleteInboundOpen}
        onClose={() => setConfirmDeleteInboundOpen(false)}
        onConfirm={handleDeleteInbound}
        title="Excluir webhook de entrada?"
        message={
          <div>
            Isso remove apenas a <b>configuração</b> do webhook (URL/secret param de entrada). Leads já criados no CRM não serão apagados.
          </div>
        }
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />

      <ConfirmModal
        isOpen={confirmDeleteOutboundOpen}
        onClose={() => setConfirmDeleteOutboundOpen(false)}
        onConfirm={handleDeleteOutbound}
        title="Excluir follow-up (webhook de saída)?"
        message={
          <div>
            Isso remove apenas a <b>configuração</b> do follow-up. O CRM não enviará mais notificações quando o lead mudar de etapa.
          </div>
        }
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />

    </SettingsSection>
  );
};
