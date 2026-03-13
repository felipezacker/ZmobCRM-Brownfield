import React, { useEffect, useMemo } from 'react';
import { Key, Copy, ExternalLink, CheckCircle2, Plus, Trash2, ShieldCheck, RefreshCw, TerminalSquare, Play } from 'lucide-react';

import ConfirmModal from '@/components/ConfirmModal';
import { useOptionalToast } from '@/context/ToastContext';
import { useBoards } from '@/context/boards/BoardsContext';

import { SettingsSection } from './SettingsSection';
import { Button } from '@/components/ui/button';
import { useApiKeys } from '@/features/settings/hooks/useApiKeys';
import { useActionPlayground } from '@/features/settings/hooks/useActionPlayground';

export const ApiKeysSection: React.FC = () => {
  const { addToast } = useOptionalToast();
  const { boards: boardsFromContext } = useBoards();

  const ak = useApiKeys(addToast);
  const ap = useActionPlayground(addToast, boardsFromContext, ak.activeToken);

  const openApiUrl = useMemo(() => '/api/public/v1/openapi.json', []);
  const swaggerUrl = useMemo(() => '/api/public/v1/docs', []);

  // Auto-select first board
  useEffect(() => {
    if (!ap.selectedBoardId && boardsFromContext?.length) {
      const firstWithKey = boardsFromContext.find((b) => !!b.key) || boardsFromContext[0];
      if (firstWithKey?.id) ap.setSelectedBoardId(firstWithKey.id);
    }
  }, [boardsFromContext, ap]);

  // Reset stage on board change
  useEffect(() => {
    ap.setSelectedToStageId('');
  }, [ap]);

  return (
    <SettingsSection title="API (Integrações)" icon={Key}>
      <p className="text-sm text-secondary-foreground dark:text-muted-foreground mb-4 leading-relaxed">
        Aqui você conecta n8n/Make sem precisar &quot;entender API&quot;. Escolha o que quer automatizar, copie o que precisa e teste.
        <br />
        A documentação técnica (OpenAPI/Swagger) fica disponível, mas só quando você quiser.
      </p>

      <div className="grid grid-cols-1 gap-4">
        {/* API Key CRUD */}
        <div className="rounded-xl border border-border bg-background dark:bg-black/30 p-4">
          <div className="text-sm font-semibold text-foreground dark:text-muted-foreground mb-2 flex items-center gap-2">
            <Key className="h-4 w-4" />
            Chave da integração (independente do assistente)
          </div>
          <div className="text-xs text-secondary-foreground dark:text-muted-foreground mb-3">
            A chave é da sua conta. O assistente só usa ela para montar o &quot;copiar/colar&quot; e testar.
          </div>

          <div className="flex gap-2">
            <input
              value={ak.newKeyName}
              onChange={(e) => ak.setNewKeyName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Nome (ex: n8n, make, parceiro-x)"
            />
            <Button
              type="button"
              onClick={ak.createKey}
              disabled={ak.creating}
              className="shrink-0 px-3 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2"
            >
              {ak.creating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Criar
            </Button>
          </div>

          {ak.createdToken && (
            <div className="mt-3 rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-3">
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-2 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Chave criada (copie agora)
              </div>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={ak.createdToken}
                  className="w-full px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-white/70 dark:bg-black/20 text-foreground font-mono text-xs"
                />
                <Button
                  type="button"
                  onClick={() => ak.copy('API key', ak.createdToken!)}
                  className="shrink-0 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-white/70 dark:bg-black/20 hover:bg-white text-emerald-800 dark:text-emerald-200 text-sm font-semibold inline-flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copiar
                </Button>
              </div>
              <div className="mt-2 text-xs text-emerald-700/80 dark:text-emerald-200/80">
                Prefixo: <span className="font-mono">{ak.createdPrefix}</span>
              </div>
            </div>
          )}

          <div className="mt-3 rounded-lg border border-border bg-white/60 dark:bg-black/20 p-3">
            <div className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-2">
              Para testar aqui (opcional): cole a API key completa
            </div>
            <div className="flex gap-2">
              <input
                value={ak.apiKeyToken}
                onChange={(e) => ak.setApiKeyToken(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground font-mono text-xs"
                placeholder="ncrm_… (fica só em memória, não é salvo)"
              />
              <Button
                type="button"
                onClick={ak.testMe}
                disabled={ak.testLoading}
                className="shrink-0 px-3 py-2 rounded-lg border border-border bg-white dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 disabled:opacity-60 text-foreground text-sm font-semibold"
              >
                {ak.testLoading ? 'Testando…' : 'Testar chave'}
              </Button>
            </div>
            {ak.testResult && (
              <div className={`mt-2 text-xs ${ak.testResult.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                {ak.testResult.message}
              </div>
            )}
          </div>
        </div>

        {/* Action Selection */}
        <div className="rounded-xl border border-border bg-background dark:bg-black/30 p-4">
          <div className="text-sm font-semibold text-foreground dark:text-muted-foreground mb-2">
            Passo 1 — O que você quer automatizar?
          </div>
          <select
            value={ap.action}
            onChange={(e) => ap.setAction(e.target.value as 'create_lead' | 'create_deal' | 'move_stage' | 'create_activity')}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="create_lead">Criar/Atualizar Lead (Contato)</option>
            <option value="create_deal">Criar Negócio (Deal)</option>
            <option value="move_stage">Mover etapa do Deal</option>
            <option value="create_activity">Criar Atividade (nota/tarefa)</option>
          </select>

          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground dark:text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Você escolhe o objetivo. O sistema monta o comando final com seus dados.</span>
          </div>
        </div>

        {/* Dynamic Config */}
        <div className="rounded-xl border border-border bg-background dark:bg-black/30 p-4">
          <div className="text-sm font-semibold text-foreground dark:text-muted-foreground mb-2">
            Passo 2 — Configure (dinâmico)
          </div>
          <div className="text-xs text-secondary-foreground dark:text-muted-foreground mb-3">
            Aqui entra o &quot;mágico&quot;: você escolhe e a gente já preenche o comando final.
          </div>

          {ap.action === 'create_lead' && (
            <div>
              <div className="text-xs text-secondary-foreground dark:text-muted-foreground mb-3">
                <span className="font-semibold text-secondary-foreground dark:text-muted-foreground">*</span> Obrigatório: <span className="font-semibold text-secondary-foreground dark:text-muted-foreground">Email</span> <span className="font-semibold">ou</span>{' '}
                <span className="font-semibold text-secondary-foreground dark:text-muted-foreground">Telefone</span>. <span className="font-semibold text-secondary-foreground dark:text-muted-foreground">Nome</span> é obrigatório apenas ao{' '}
                <span className="font-semibold text-secondary-foreground dark:text-muted-foreground">criar</span> um contato novo.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-1">
                  Nome <span className="text-muted-foreground dark:text-muted-foreground">*</span>
                </div>
                <input
                  value={ap.leadName}
                  onChange={(e) => ap.setLeadName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground"
                  placeholder="Nome do lead"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-1">Source</div>
                <input
                  value={ap.leadSource}
                  onChange={(e) => ap.setLeadSource(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground"
                  placeholder="n8n / make / webhook"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-1">
                  Email <span className="text-muted-foreground dark:text-muted-foreground">*</span>
                </div>
                <input
                  value={ap.leadEmail}
                  onChange={(e) => ap.setLeadEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground"
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-1">
                  Telefone (E.164) <span className="text-muted-foreground dark:text-muted-foreground">*</span>
                </div>
                <input
                  value={ap.leadPhone}
                  onChange={(e) => ap.setLeadPhone(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground font-mono"
                  placeholder="+5511999999999"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-1">Cargo</div>
                <input
                  value={ap.leadRole}
                  onChange={(e) => ap.setLeadRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground"
                  placeholder="Ex: Gerente"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-1">Empresa</div>
                <input
                  value={ap.leadCompanyName}
                  onChange={(e) => ap.setLeadCompanyName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground"
                  placeholder="Nome da Empresa"
                />
              </div>
              <div className="md:col-span-2">
                <div className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-1">Notas</div>
                <textarea
                  value={ap.leadNotes}
                  onChange={(e) => ap.setLeadNotes(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground min-h-[92px]"
                  placeholder="Opcional"
                />
              </div>
              </div>
            </div>
          )}

          {(ap.action === 'create_deal' || ap.action === 'move_stage') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-1">Pipeline (board)</div>
                <select
                  value={ap.selectedBoardId}
                  onChange={(e) => ap.setSelectedBoardId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground"
                >
                  <option value="">Selecione…</option>
                  {boardsFromContext.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}{b.key ? ` — ${b.key}` : ' — (sem key)'}
                    </option>
                  ))}
                </select>
                {ap.selectedBoardId && !ap.selectedBoardKey && (
                  <div className="mt-1 text-xs text-rose-600 dark:text-rose-300">
                    Este board ainda não tem <span className="font-mono">key</span>. Para integrações, gere uma key para o board.
                  </div>
                )}
              </div>

              {ap.action === 'move_stage' && (
                <div>
                  <div className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-1">Identidade do lead</div>
                  <div className="flex items-center gap-2 mb-2">
                    <Button
                      type="button"
                      onClick={() => ap.setIdentityMode('phone')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${
                        ap.identityMode === 'phone'
                          ? 'border-primary-500/50 bg-primary-500/10 text-primary-700 dark:text-primary-300'
                          : 'border-border  bg-white dark:bg-white/5 text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/10'
                      }`}
                    >
                      Telefone
                    </Button>
                    <Button
                      type="button"
                      onClick={() => ap.setIdentityMode('email')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${
                        ap.identityMode === 'email'
                          ? 'border-primary-500/50 bg-primary-500/10 text-primary-700 dark:text-primary-300'
                          : 'border-border  bg-white dark:bg-white/5 text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/10'
                      }`}
                    >
                      Email
                    </Button>
                  </div>

                  {ap.identityMode === 'phone' ? (
                    <input
                      value={ap.identityPhone}
                      onChange={(e) => ap.setIdentityPhone(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground font-mono text-sm"
                      placeholder="+5511999999999"
                    />
                  ) : (
                    <input
                      value={ap.identityEmail}
                      onChange={(e) => ap.setIdentityEmail(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground"
                      placeholder="email@exemplo.com"
                    />
                  )}
                  <div className="mt-1 text-1xs text-muted-foreground dark:text-muted-foreground">
                    No board deve existir só 1 deal aberto para essa identidade.
                  </div>
                </div>
              )}

              {ap.action === 'move_stage' && (
                <div className="md:col-span-2">
                  <div className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-1">Mover para etapa</div>
                  <select
                    value={ap.selectedToStageId}
                    onChange={(e) => ap.setSelectedToStageId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground"
                  >
                    <option value="">Selecione…</option>
                    {ap.stagesForBoard.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {ap.action === 'create_activity' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-1">Tipo</div>
                <select
                  value={ap.activityType}
                  onChange={(e) => ap.setActivityType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground"
                >
                  <option value="NOTE">Nota</option>
                  <option value="TASK">Tarefa</option>
                  <option value="CALL">Ligação</option>
                  <option value="MEETING">Reunião</option>
                  <option value="EMAIL">Email</option>
                  <option value="WHATSAPP">WhatsApp</option>
                </select>
              </div>
              <div>
                <div className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-1">Título</div>
                <input
                  value={ap.activityTitle}
                  onChange={(e) => ap.setActivityTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground"
                />
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Step 3 — Copy & Test */}
      <div className="mt-4 rounded-xl border border-border bg-background dark:bg-black/30 p-4">
        <div className="text-sm font-semibold text-foreground dark:text-muted-foreground mb-2">
          Passo 3 — Copiar e testar
        </div>
        <div className="text-xs text-secondary-foreground dark:text-muted-foreground mb-3">
          Este é o &quot;copiar/colar&quot; que seu usuário precisa. Se funcionar aqui, funciona no n8n.
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <Button
            type="button"
            onClick={() => ak.copy('cURL', ap.curlExample)}
            className="px-3 py-2 rounded-lg border border-border bg-white dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 text-foreground text-sm font-semibold inline-flex items-center gap-2"
          >
            <TerminalSquare className="h-4 w-4" />
            Copiar cURL
          </Button>
          <Button
            type="button"
            onClick={ap.runActionTest}
            disabled={ap.testLoading}
            className="px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {ap.testLoading ? 'Testando…' : 'Testar agora'}
          </Button>
        </div>

        <pre className="text-xs font-mono whitespace-pre-wrap rounded-lg border border-border bg-white/70 dark:bg-black/20 p-3 text-foreground dark:text-muted-foreground">
          {ap.curlExample}
        </pre>

        {ap.testResult && (
          <div className={`mt-3 text-sm ${ap.testResult.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
            {ap.testResult.message}
          </div>
        )}
      </div>

      {/* OpenAPI */}
      <div className="mt-4 rounded-xl border border-border bg-background dark:bg-black/30 p-4">
        <div className="text-sm font-semibold text-foreground dark:text-muted-foreground mb-2">
          Consulta técnica — OpenAPI
        </div>
        <div className="text-xs text-secondary-foreground dark:text-muted-foreground mb-3">
          Se você (ou o time técnico) precisar, aqui está o OpenAPI para importar em Swagger/Postman e gerar integrações.
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => ak.copy('URL do OpenAPI', openApiUrl)}
            className="px-3 py-2 rounded-lg border border-border bg-white dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 text-foreground text-sm font-semibold inline-flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Copiar URL
          </Button>
          <a
            href={swaggerUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-lg border border-border bg-white dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 text-foreground text-sm font-semibold inline-flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir Swagger
          </a>
          <a
            href={openApiUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-lg border border-border bg-white dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 text-foreground text-sm font-semibold inline-flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir OpenAPI (JSON)
          </a>
        </div>
        <div className="mt-3 text-xs text-muted-foreground dark:text-muted-foreground">
          Status: <span className="font-mono">{openApiUrl}</span>
        </div>
      </div>

      {/* Existing Keys */}
      <div className="mt-6">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="text-sm font-semibold text-foreground dark:text-muted-foreground">
            Chaves existentes
          </div>
          <Button
            type="button"
            onClick={ak.loadKeys}
            disabled={ak.loadingKeys}
            className="px-3 py-2 rounded-lg border border-border bg-white dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 text-foreground text-sm font-semibold inline-flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${ak.loadingKeys ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <div className="divide-y divide-border dark:divide-white/10">
            {ak.keys.length === 0 ? (
              <div className="p-4 text-sm text-secondary-foreground dark:text-muted-foreground">
                Nenhuma chave criada ainda.
              </div>
            ) : (
              ak.keys.map((k) => (
                <div key={k.id} className="p-4 bg-white dark:bg-white/5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {k.name}
                      {k.revoked_at ? (
                        <span className="ml-2 text-xs font-semibold text-rose-600 dark:text-rose-400">revogada</span>
                      ) : (
                        <span className="ml-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">ativa</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground dark:text-muted-foreground mt-1 font-mono">
                      {k.key_prefix}…
                    </div>
                    <div className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                      Último uso: {k.last_used_at ? new Date(k.last_used_at).toLocaleString('pt-BR') : '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {k.revoked_at ? (
                      <Button
                        type="button"
                        disabled={ak.deletingId === k.id}
                        onClick={() => ak.openDeleteConfirm(k)}
                        className="px-3 py-2 rounded-lg border border-border bg-white dark:bg-white/5 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-60 text-rose-700 dark:text-rose-300 text-sm font-semibold inline-flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        {ak.deletingId === k.id ? 'Excluindo…' : 'Excluir'}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        disabled={ak.revokingId === k.id}
                        onClick={() => ak.revokeKey(k.id)}
                        className="px-3 py-2 rounded-lg border border-border bg-white dark:bg-white/5 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-60 text-rose-700 dark:text-rose-300 text-sm font-semibold inline-flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        {ak.revokingId === k.id ? 'Revogando…' : 'Revogar'}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={ak.deleteConfirmOpen}
        onClose={() => ak.setDeleteConfirmOpen(false)}
        onConfirm={() => {
          if (!ak.deleteTarget) return;
          void ak.deleteRevokedKey(ak.deleteTarget.id);
        }}
        title="Excluir chave revogada?"
        message={
          <div className="space-y-2">
            <div>Essa chave será removida permanentemente.</div>
            <div className="text-xs text-muted-foreground dark:text-muted-foreground">
              {ak.deleteTarget ? (
                <>
                  <span className="font-semibold">{ak.deleteTarget.name}</span> — <span className="font-mono">{ak.deleteTarget.key_prefix}…</span>
                </>
              ) : null}
            </div>
          </div>
        }
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </SettingsSection>
  );
};
