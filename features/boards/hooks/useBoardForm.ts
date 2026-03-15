import { useState, useEffect, useMemo, useCallback } from 'react';
import { Board, BoardStage, LifecycleStage, Product } from '@/types';
import { BOARD_TEMPLATES, BoardTemplateType } from '@/lib/templates/board-templates';
import { slugify } from '@/lib/utils/slugify';
import { STAGE_COLORS } from '@/features/settings/constants';

export const CREATE_BOARD_DRAFT_KEY = 'createBoardDraft.v1';

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

export function normalizeStageLabel(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function createDragPreviewFromElement(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.boxSizing = 'border-box';
  clone.style.position = 'fixed';
  clone.style.top = '-1000px';
  clone.style.left = '-1000px';
  clone.style.pointerEvents = 'none';
  clone.style.opacity = '0.95';
  clone.style.transform = 'scale(1.02)';
  clone.style.borderRadius = '16px';
  clone.style.zIndex = '999999';
  document.body.appendChild(clone);
  return () => {
    try {
      document.body.removeChild(clone);
    } catch {
      // noop
    }
  };
}

export function guessWonLostStageIds(
  stages: BoardStage[],
  opts?: { wonLabel?: string; lostLabel?: string },
) {
  const byLabel = new Map<string, string>();
  for (const s of stages) {
    byLabel.set(normalizeStageLabel(s.label), s.id);
  }

  const exactWon = opts?.wonLabel ? byLabel.get(normalizeStageLabel(opts.wonLabel)) : undefined;
  const exactLost = opts?.lostLabel ? byLabel.get(normalizeStageLabel(opts.lostLabel)) : undefined;

  // Fallback heuristic: keep it conservative and readable.
  const heuristicWon =
    exactWon
    ?? stages.find(s => /\b(ganho|won|fechado ganho|conclu[ií]do)\b/i.test(s.label))?.id;
  const heuristicLost =
    exactLost
    ?? stages.find(s => /\b(perdido|lost|churn|cancelad[oa])\b/i.test(s.label))?.id;

  return { wonStageId: heuristicWon ?? '', lostStageId: heuristicLost ?? '' };
}

// ---------------------------------------------------------------------------
// Hook types
// ---------------------------------------------------------------------------

interface UseBoardFormParams {
  isOpen: boolean;
  editingBoard?: Board;
  availableBoards: Board[];
  onClose: () => void;
  onSave: (board: Omit<Board, 'id' | 'createdAt'>) => void;
  lifecycleStages: LifecycleStage[];
  products: Product[];
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBoardForm({
  isOpen,
  editingBoard,
  availableBoards,
  onClose,
  onSave,
  lifecycleStages,
  products,
  addToast,
}: UseBoardFormParams) {
  // ---- Form state ----
  const [name, setName] = useState('');
  const [boardKey, setBoardKey] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [nextBoardId, setNextBoardId] = useState<string>('');
  const [linkedLifecycleStage, setLinkedLifecycleStage] = useState<string>('');
  const [wonStageId, setWonStageId] = useState<string>('');
  const [lostStageId, setLostStageId] = useState<string>('');
  const [wonStayInStage, setWonStayInStage] = useState(false);
  const [lostStayInStage, setLostStayInStage] = useState(false);
  const [defaultProductId, setDefaultProductId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<BoardTemplateType | ''>('');
  const [stages, setStages] = useState<BoardStage[]>([]);
  const [draggingStageId, setDraggingStageId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  // ---- Init / reset when modal opens ----
  useEffect(() => {
    if (isOpen) {
      if (editingBoard) {
        setName(editingBoard.name);
        setBoardKey(editingBoard.key || slugify(editingBoard.name));
        setKeyTouched(false);
        setDescription(editingBoard.description || '');
        setNextBoardId(editingBoard.nextBoardId || '');
        setLinkedLifecycleStage(editingBoard.linkedLifecycleStage || '');
        setWonStageId(editingBoard.wonStageId || '');
        setLostStageId(editingBoard.lostStageId || '');
        setWonStayInStage(editingBoard.wonStayInStage || false);
        setLostStayInStage(editingBoard.lostStayInStage || false);
        setDefaultProductId(editingBoard.defaultProductId || '');
        setSelectedTemplate(editingBoard.template || '');
        setStages(editingBoard.stages);
      } else {
        // Restore draft (so we can close modal immediately on save and re-open on error without losing inputs)
        try {
          const raw = sessionStorage.getItem(CREATE_BOARD_DRAFT_KEY);
          if (raw) {
            const draft = JSON.parse(raw) as Record<string, unknown>;
            if (draft && typeof draft === 'object') {
              setName(String(draft.name ?? ''));
              setBoardKey(String(draft.boardKey ?? ''));
              setKeyTouched(Boolean(draft.keyTouched));
              setDescription(String(draft.description ?? ''));
              setNextBoardId(String(draft.nextBoardId ?? ''));
              setLinkedLifecycleStage(String(draft.linkedLifecycleStage ?? ''));
              setWonStageId(String(draft.wonStageId ?? ''));
              setLostStageId(String(draft.lostStageId ?? ''));
              setWonStayInStage(Boolean(draft.wonStayInStage));
              setLostStayInStage(Boolean(draft.lostStayInStage));
              setDefaultProductId(String(draft.defaultProductId ?? ''));
              setSelectedTemplate((draft.selectedTemplate as BoardTemplateType) ?? '');
              setStages(Array.isArray(draft.stages) ? draft.stages : []);
              return;
            }
          }
        } catch {
          // ignore
        }
        // Reset for new board
        setName('');
        setBoardKey('');
        setKeyTouched(false);
        setDescription('');
        setNextBoardId('');
        setLinkedLifecycleStage('');
        setWonStageId('');
        setLostStageId('');
        setWonStayInStage(false);
        setLostStayInStage(false);
        setDefaultProductId('');
        setSelectedTemplate('');
        setStages([
          { id: crypto.randomUUID(), label: 'Nova', color: 'bg-blue-500' },
          { id: crypto.randomUUID(), label: 'Em Progresso', color: 'bg-yellow-500' },
          { id: crypto.randomUUID(), label: 'Concluido', color: 'bg-green-500' },
        ]);
      }
    }
  }, [isOpen, editingBoard]);

  // ---- Derived data ----
  const validNextBoards = useMemo(
    () => availableBoards.filter(b => b.id !== editingBoard?.id),
    [availableBoards, editingBoard?.id],
  );

  // ---- Stage management ----
  const handleAddStage = useCallback(() => {
    setStages(prev => {
      const colorIndex = prev.length % STAGE_COLORS.length;
      return [...prev, {
        id: crypto.randomUUID(),
        label: `Etapa ${prev.length + 1}`,
        color: STAGE_COLORS[colorIndex],
      }];
    });
  }, []);

  const handleRemoveStage = useCallback((id: string) => {
    setStages(prev => (prev.length > 2 ? prev.filter(s => s.id !== id) : prev));
  }, []);

  const handleUpdateStage = useCallback((id: string, updates: Partial<BoardStage>) => {
    setStages(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  const moveStage = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;
    setStages(prev => {
      const fromIndex = prev.findIndex(s => s.id === fromId);
      const toIndex = prev.findIndex(s => s.id === toId);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  // ---- Template ----
  const handleTemplateSelect = useCallback((template: BoardTemplateType | '') => {
    setSelectedTemplate(template);

    if (template && BOARD_TEMPLATES[template]) {
      const templateData = BOARD_TEMPLATES[template];
      setName(templateData.name);
      setDescription(templateData.description);
      setLinkedLifecycleStage(templateData.linkedLifecycleStage || '');
      const nextStages = templateData.stages.map((s) => ({
        id: crypto.randomUUID(),
        ...s,
      }));
      setStages(nextStages);

      // UX: auto-fill won/lost stages for templates using deterministic labels, with heuristic fallback.
      const guessed = guessWonLostStageIds(nextStages, {
        wonLabel: templateData.defaultWonStageLabel,
        lostLabel: templateData.defaultLostStageLabel,
      });
      setWonStageId(guessed.wonStageId);
      setLostStageId(guessed.lostStageId);
    }
  }, []);

  // ---- Name change handler (auto-slug) ----
  const handleNameChange = useCallback((value: string) => {
    setName(value);
    if (!keyTouched) setBoardKey(slugify(value));
  }, [keyTouched]);

  // ---- Board key change ----
  const handleBoardKeyChange = useCallback((value: string) => {
    setKeyTouched(true);
    setBoardKey(value);
  }, []);

  // ---- Copy key ----
  const handleCopyKey = useCallback(async () => {
    const normalizedKey = boardKey.trim() ? slugify(boardKey) : '';
    if (!normalizedKey) {
      addToast('Defina uma chave primeiro.', 'warning');
      return;
    }
    try {
      await navigator.clipboard.writeText(normalizedKey);
      addToast('Chave copiada.', 'success');
    } catch {
      addToast('Nao foi possivel copiar.', 'error');
    }
  }, [boardKey, addToast]);

  // ---- Save ----
  const handleSave = useCallback(() => {
    if (!name.trim()) return;

    const normalizedKey = boardKey.trim() ? slugify(boardKey) : '';
    if (boardKey.trim() && !normalizedKey) {
      addToast('Chave invalida. Use letras/numeros e hifen.', 'error');
      return;
    }

    const payload = {
      name: name.trim(),
      key: normalizedKey || undefined,
      description: description.trim() || undefined,
      nextBoardId: nextBoardId || undefined,
      linkedLifecycleStage: linkedLifecycleStage || undefined,
      wonStageId: wonStageId || undefined,
      lostStageId: lostStageId || undefined,
      wonStayInStage,
      lostStayInStage,
      defaultProductId: defaultProductId || undefined,
      template: selectedTemplate || 'CUSTOM',
      stages,
      isDefault: false,
    };

    // Persist draft before closing (so we can restore on error)
    try {
      sessionStorage.setItem(
        CREATE_BOARD_DRAFT_KEY,
        JSON.stringify({
          name,
          boardKey,
          keyTouched,
          description,
          nextBoardId,
          linkedLifecycleStage,
          wonStageId,
          lostStageId,
          wonStayInStage,
          lostStayInStage,
          defaultProductId,
          selectedTemplate,
          stages,
        }),
      );
    } catch {
      // ignore
    }

    addToast('Criando board...', 'info');
    onClose(); // close immediately for UX

    try {
      onSave(payload);
    } catch (e) {
      addToast((e as Error).message || 'Erro ao criar board', 'error');
      onClose(); // ensure closed state is consistent
    }
  }, [
    name, boardKey, keyTouched, description, nextBoardId,
    linkedLifecycleStage, wonStageId, lostStageId, wonStayInStage,
    lostStayInStage, defaultProductId, selectedTemplate, stages,
    addToast, onClose, onSave,
  ]);

  // ---- Drag handlers ----
  const handleDragStart = useCallback((stageId: string, e: React.DragEvent) => {
    setDraggingStageId(stageId);
    e.dataTransfer.setData('text/stage-id', stageId);
    e.dataTransfer.effectAllowed = 'move';
    // Use the whole card as the drag "ghost" so it feels like you're dragging the item.
    const card = (e.currentTarget.closest('[data-stage-card="true"]') as HTMLElement | null);
    if (card) {
      const cleanup = createDragPreviewFromElement(card);
      // Ensure cleanup runs even if the browser doesn't fire dragend for some edge cases.
      window.setTimeout(cleanup, 0);
      e.dataTransfer.setDragImage(card, 24, 24);
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingStageId(null);
    setDragOverStageId(null);
  }, []);

  const handleDragOver = useCallback((stageId: string, e: React.DragEvent) => {
    e.preventDefault();
    if (draggingStageId) setDragOverStageId(stageId);
  }, [draggingStageId]);

  const handleDragLeave = useCallback((stageId: string) => {
    setDragOverStageId(prev => (prev === stageId ? null : prev));
  }, []);

  const handleDrop = useCallback((stageId: string, e: React.DragEvent) => {
    e.preventDefault();
    const fromId = e.dataTransfer.getData('text/stage-id');
    if (fromId) moveStage(fromId, stageId);
    setDraggingStageId(null);
    setDragOverStageId(null);
  }, [moveStage]);

  // ---- Won/Lost change handlers ----
  const handleWonStageChange = useCallback((value: string) => {
    if (value === 'archive') {
      setWonStayInStage(true);
      setWonStageId('');
    } else {
      setWonStayInStage(false);
      setWonStageId(value);
    }
  }, []);

  const handleLostStageChange = useCallback((value: string) => {
    if (value === 'archive') {
      setLostStayInStage(true);
      setLostStageId('');
    } else {
      setLostStayInStage(false);
      setLostStageId(value);
    }
  }, []);

  return {
    // Form values
    name,
    boardKey,
    description,
    nextBoardId,
    linkedLifecycleStage,
    wonStageId,
    lostStageId,
    wonStayInStage,
    lostStayInStage,
    defaultProductId,
    selectedTemplate,
    stages,
    draggingStageId,
    dragOverStageId,

    // Setters (for direct binding in JSX)
    setDescription,
    setNextBoardId,
    setLinkedLifecycleStage,
    setDefaultProductId,

    // Derived
    validNextBoards,
    lifecycleStages,
    products,

    // Handlers
    handleNameChange,
    handleBoardKeyChange,
    handleCopyKey,
    handleTemplateSelect,
    handleAddStage,
    handleRemoveStage,
    handleUpdateStage,
    handleSave,
    handleWonStageChange,
    handleLostStageChange,

    // Drag handlers
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    moveStage,
  };
}
