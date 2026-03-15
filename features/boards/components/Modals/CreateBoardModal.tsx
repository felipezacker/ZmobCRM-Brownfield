import React, { useId } from 'react';
import Link from 'next/link';
import { Plus, GripVertical, Trash2, ChevronDown, Settings, Copy } from 'lucide-react';
import { Board } from '@/types';
import { BoardTemplateType } from '@/lib/templates/board-templates';
import { useSettings } from '@/context/settings/SettingsContext';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { MODAL_FOOTER_CLASS } from '@/components/ui/modalStyles';
import { Button } from '@/components/ui/button';
import { useBoardForm } from '@/features/boards/hooks/useBoardForm';
import { STAGE_COLORS } from '@/features/settings/constants';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (board: Omit<Board, 'id' | 'createdAt'>) => void;
  editingBoard?: Board; // Se fornecido, estamos editando
  availableBoards: Board[]; // Para selecionar o proximo board
  /**
   * Optional: allow switching which board is being edited without closing the modal.
   * This removes the "close -> gear -> pick another board" friction.
   */
  onSwitchEditingBoard?: (board: Board) => void;
}

/**
 * Componente React `CreateBoardModal`.
 *
 * @param {CreateBoardModalProps} {
  isOpen,
  onClose,
  onSave,
  editingBoard,
  availableBoards,
  onSwitchEditingBoard,
} - Parâmetro `{
  isOpen,
  onClose,
  onSave,
  editingBoard,
  availableBoards,
  onSwitchEditingBoard,
}`.
 * @returns {Element} Retorna um valor do tipo `Element`.
 */
export const CreateBoardModal: React.FC<CreateBoardModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingBoard,
  availableBoards,
  onSwitchEditingBoard,
}) => {
  const headingId = useId();
  const { lifecycleStages, products } = useSettings();
  const { addToast } = useToast();

  const form = useBoardForm({
    isOpen,
    editingBoard,
    availableBoards,
    onClose,
    onSave,
    lifecycleStages,
    products,
    addToast,
  });

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={editingBoard ? 'Editar Board' : 'Criar Novo Board'}
        size="lg"
        labelledById={headingId}
        className="max-w-xl"
        // We control padding/scroll inside, so keep the Modal body wrapper flat.
        bodyClassName="p-0"
        focusTrapEnabled
      >
        <div className="flex flex-col">
          {/*
            Scroll container:
            Use an explicit max-height so the form never "explodes" beyond the visible area.
            Keeps the footer always reachable/visible.
          */}
          <div className="overflow-y-auto p-4 sm:p-6 space-y-6 max-h-[calc(100dvh-14rem)] sm:max-h-[calc(100dvh-18rem)]">
              {/* Switch board (edit mode only) */}
              {editingBoard && onSwitchEditingBoard && availableBoards.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-secondary-foreground dark:text-muted-foreground mb-2">
                    Editando board
                  </label>
                  <div className="relative">
                    <select
                      value={editingBoard.id}
                      onChange={(e) => {
                        const next = availableBoards.find(b => b.id === e.target.value);
                        if (next) onSwitchEditingBoard(next);
                      }}
                      className="w-full appearance-none px-4 py-2.5 pr-10 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      aria-label="Selecionar board para editar"
                    >
                      {availableBoards.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={18}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground dark:text-muted-foreground">
                    Dica: troque aqui para editar outro board sem fechar este modal.
                  </p>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-secondary-foreground dark:text-muted-foreground mb-2">
                  Nome do Board *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => form.handleNameChange(e.target.value)}
                  placeholder="Ex: Pipeline de Vendas, Onboarding, etc"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Board key (slug) */}
              <div>
                <label className="block text-sm font-medium text-secondary-foreground dark:text-muted-foreground mb-2">
                  Chave (slug) — para integrações
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.boardKey}
                    onChange={(e) => form.handleBoardKeyChange(e.target.value)}
                    placeholder="ex: vendas-b2b"
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                  />
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    type="button"
                    onClick={form.handleCopyKey}
                    className="shrink-0 px-3 py-2.5 rounded-lg border border-border bg-white dark:bg-white/5 hover:bg-background dark:hover:bg-white/10 text-secondary-foreground dark:text-muted-foreground"
                    aria-label="Copiar chave do board"
                    title="Copiar chave"
                  >
                    <Copy size={16} />
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground dark:text-muted-foreground">
                  Dica: é mais fácil usar isso no n8n/Make do que um UUID.
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-secondary-foreground dark:text-muted-foreground mb-2">
                  Descrição
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => form.setDescription(e.target.value)}
                  placeholder="Breve descrição do propósito deste board"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Template Selection (only for new boards) */}
              {!editingBoard && (
                <div>
                  <label className="block text-sm font-medium text-secondary-foreground dark:text-muted-foreground mb-2">
                    📋 Usar Template
                  </label>
                  <select
                    value={form.selectedTemplate}
                    onChange={(e) => form.handleTemplateSelect(e.target.value as BoardTemplateType | '')}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Board em branco</option>
                    <option value="PRE_SALES">🎯 Pré-venda (Lead → MQL)</option>
                    <option value="SALES">💰 Pipeline de Vendas</option>
                    <option value="ONBOARDING">🚀 Onboarding de Clientes</option>
                    <option value="CS">❤️ CS & Upsell</option>
                  </select>
                  {form.selectedTemplate && (
                    <p className="mt-2 text-xs text-muted-foreground dark:text-muted-foreground">
                      ✨ Template aplicado! Você pode editar os campos abaixo.
                    </p>
                  )}
                </div>
              )}

              {/* Linked Lifecycle Stage */}
              <div>
                <label className="block text-sm font-medium text-secondary-foreground dark:text-muted-foreground mb-2">
                  🎯 Gerencia Contatos no Estágio
                </label>
                <select
                  value={form.linkedLifecycleStage}
                  onChange={(e) => form.setLinkedLifecycleStage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Nenhum (board genérico)</option>
                  {form.lifecycleStages.map(stage => (
                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-muted-foreground dark:text-muted-foreground">
                  Novos negócios de contatos neste estágio aparecerão automaticamente aqui.
                </p>
              </div>

              {/* Default Product */}
              <div>
                <label className="block text-sm font-medium text-secondary-foreground dark:text-muted-foreground mb-2">
                  🧾 Produto padrão (opcional)
                </label>
                <select
                  value={form.defaultProductId}
                  onChange={(e) => form.setDefaultProductId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Nenhum</option>
                  {form.products
                    .filter(p => p.active !== false)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} — R$ {Number(p.price ?? 0).toLocaleString('pt-BR')}
                      </option>
                    ))}
                </select>
                <p className="mt-2 text-xs text-muted-foreground dark:text-muted-foreground">
                  Sugere (ou pré-seleciona) um produto ao adicionar itens em deals desse board.
                </p>
              </div>

              {/* Next Board Automation */}
              <div>
                <label className="block text-sm font-medium text-secondary-foreground dark:text-muted-foreground mb-2">
                  Ao Ganhar, enviar para...
                </label>
                <select
                  value={form.nextBoardId}
                  onChange={(e) => form.setNextBoardId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Nenhum (Finalizar aqui)</option>
                  {form.validNextBoards.map(board => (
                    <option key={board.id} value={board.id}>
                      {board.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
                  Cria automaticamente um card no próximo board quando o negócio é ganho.
                </p>
              </div>

              {/* Explicit Won/Lost Stages */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-foreground dark:text-muted-foreground mb-2">
                    🏆 Estágio Ganho (Won)
                  </label>
                  <select
                    value={form.wonStayInStage ? 'archive' : form.wonStageId}
                    onChange={(e) => form.handleWonStageChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Automático (pelo ciclo)</option>
                    <option value="archive">Arquivar (Manter na etapa)</option>
                    {form.stages.map(stage => (
                      <option key={stage.id} value={stage.id}>{stage.label}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
                    O botão "Ganho" moverá o card para cá.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-foreground dark:text-muted-foreground mb-2">
                    ❌ Estágio Perdido (Lost)
                  </label>
                  <select
                    value={form.lostStayInStage ? 'archive' : form.lostStageId}
                    onChange={(e) => form.handleLostStageChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Automático</option>
                    <option value="archive">Arquivar (Manter na etapa)</option>
                    {form.stages.map(stage => (
                      <option key={stage.id} value={stage.id}>{stage.label}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
                    O botão "Perdido" moverá o card para cá.
                  </p>
                </div>
              </div>

              {/* Stages */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-secondary-foreground dark:text-muted-foreground">
                    Etapas do Kanban
                  </label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="unstyled"
                      size="unstyled"
                      onClick={form.handleAddStage}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                    >
                      <Plus size={14} />
                      Adicionar etapa
                    </Button>
                    <Link
                      href="/settings/lifecycle"
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <Settings size={14} />
                      Gerenciar Estágios
                    </Link>
                  </div>
                </div>

                <div className="space-y-3">
                  {form.stages.map((stage) => (
                    <div
                      key={stage.id}
                      data-stage-card="true"
                      className={`p-4 bg-background dark:bg-white/5 rounded-xl border transition-colors ${
                        form.dragOverStageId === stage.id
                          ? 'border-primary-500/60 ring-2 ring-primary-500/20'
                          : form.draggingStageId === stage.id
                            ? 'border-primary-500/40 ring-2 ring-primary-500/10 opacity-70 shadow-lg'
                            : 'border-border  hover:border-border dark:hover:border-white/20'
                      }`}
                      onDragOver={(e) => form.handleDragOver(stage.id, e)}
                      onDragLeave={() => form.handleDragLeave(stage.id)}
                      onDrop={(e) => form.handleDrop(stage.id, e)}
                    >
                      {/* Stage Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <Button
                          variant="unstyled"
                          size="unstyled"
                          type="button"
                          draggable
                          onDragStart={(e) => form.handleDragStart(stage.id, e)}
                          onDragEnd={form.handleDragEnd}
                          className="text-muted-foreground hover:text-secondary-foreground dark:hover:text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0"
                          aria-label={`Reordenar etapa: ${stage.label}`}
                          title="Arraste para reordenar"
                        >
                          <GripVertical size={18} aria-hidden="true" />
                        </Button>

                        {/* Color Picker */}
                        <div className="relative flex-shrink-0">
                          <div className={`w-5 h-5 rounded-full ${stage.color} cursor-pointer ring-2 ring-ring dark:ring-ring hover:ring-ring dark:hover:ring-ring transition-all`} />
                          <select
                            value={stage.color}
                            onChange={(e) => form.handleUpdateStage(stage.id, { color: e.target.value })}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          >
                            {STAGE_COLORS.map(color => (
                              <option key={color} value={color}>{color.replace('bg-', '').replace('-500', '')}</option>
                            ))}
                          </select>
                        </div>

                        {/* Label */}
                        <input
                          type="text"
                          value={stage.label}
                          onChange={(e) => form.handleUpdateStage(stage.id, { label: e.target.value })}
                          className="flex-1 px-3 py-2 text-base font-medium rounded-lg border border-border bg-white dark:bg-white/5 text-foreground focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Nome da etapa"
                        />

                        {/* Delete */}
                        <Button
                          variant="unstyled"
                          size="unstyled"
                          onClick={() => form.handleRemoveStage(stage.id)}
                          disabled={form.stages.length <= 2}
                          className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 transition-colors"
                          title="Remover etapa"
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>

                      {/* Lifecycle Automation */}
                      <div className="pl-9">
                        <label className="block text-xs font-medium text-secondary-foreground dark:text-muted-foreground mb-2">
                          Promove contato para:
                        </label>
                        <div className="relative">
                          <select
                            value={stage.linkedLifecycleStage || ''}
                            onChange={(e) => form.handleUpdateStage(stage.id, { linkedLifecycleStage: e.target.value || undefined })}
                            className={`w-full pl-3 pr-10 py-2 text-sm rounded-lg border border-border  bg-white dark:bg-white/5 text-secondary-foreground dark:text-muted-foreground focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all appearance-none cursor-pointer
                            ${stage.linkedLifecycleStage ? 'font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700' : ''}
                          `}
                          >
                            <option value="">Sem automação</option>
                            {form.lifecycleStages.map(ls => (
                              <option key={ls.id} value={ls.id}>{ls.name}</option>
                            ))}
                          </select>
                          <ChevronDown
                            size={16}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
          </div>

          {/* Footer */}
          <div className={`${MODAL_FOOTER_CLASS} flex justify-end gap-3`}>
              <Button
                variant="ghost"
                size="unstyled"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-secondary-foreground dark:text-muted-foreground rounded-lg transition-colors focus-visible-ring"
              >
                Cancelar
              </Button>
              <Button
                variant="unstyled"
                size="unstyled"
                onClick={form.handleSave}
                disabled={!form.name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors focus-visible-ring"
              >
                {editingBoard ? 'Salvar Alterações' : 'Criar Board'}
              </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
