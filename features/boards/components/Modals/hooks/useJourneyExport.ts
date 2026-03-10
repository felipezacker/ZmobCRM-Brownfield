import { useEffect, useMemo, useState } from 'react';
import type { Board } from '@/types';
import {
  buildJourneyFromBoards,
  buildDefaultJourneyName,
  slugify,
  downloadJson,
} from '@/features/boards/components/Modals/ExportTemplateModal';

interface UseJourneyExportParams {
  boards: Board[];
  activeBoard: Board;
  isOpen: boolean;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export function useJourneyExport({ boards, activeBoard, isOpen, addToast }: UseJourneyExportParams) {
  const [schemaVersion, setSchemaVersion] = useState('1.0');
  const [journeyName, setJourneyName] = useState(() => `Jornada - ${activeBoard.name}`);
  const [journeyNameDirty, setJourneyNameDirty] = useState(false);
  const [slugPrefix, setSlugPrefix] = useState('');
  const [selectedBoardIds, setSelectedBoardIds] = useState<string[]>(() => [activeBoard.id]);

  useEffect(() => {
    if (!isOpen) return;
    const orderIndex = new Map<string, number>();
    for (let i = 0; i < boards.length; i += 1) {
      orderIndex.set(boards[i].id, i);
    }
    const allowed = new Set<string>(boards.map(b => b.id));

    setSelectedBoardIds(prev => {
      const unique = Array.from(new Set([...prev, activeBoard.id]));
      return unique
        .filter(id => allowed.has(id))
        .sort((a, b) => (orderIndex.get(a) ?? Number.POSITIVE_INFINITY) - (orderIndex.get(b) ?? Number.POSITIVE_INFINITY));
    });
  }, [isOpen, boards, activeBoard.id]);

  const selectedBoards = useMemo(() => {
    const byId = new Map(boards.map(b => [b.id, b]));
    return selectedBoardIds.map(id => byId.get(id)).filter(Boolean) as Board[];
  }, [boards, selectedBoardIds]);

  useEffect(() => {
    if (journeyNameDirty) return;
    setJourneyName(buildDefaultJourneyName(selectedBoards));
  }, [selectedBoards, journeyNameDirty]);

  const journeyJson = useMemo(() => {
    return buildJourneyFromBoards({
      schemaVersion,
      journeyName: journeyName.trim() || undefined,
      boards: selectedBoards,
      slugPrefix: slugPrefix.trim() || undefined,
    });
  }, [schemaVersion, slugPrefix, journeyName, selectedBoards]);

  const journeyJsonText = useMemo(() => JSON.stringify(journeyJson, null, 2), [journeyJson]);

  const canExportJourney = selectedBoards.length > 0;

  const toggleBoard = (boardId: string) => {
    setSelectedBoardIds(prev => {
      if (prev.includes(boardId)) {
        const next = prev.filter(id => id !== boardId);
        return next.length === 0 ? prev : next;
      }
      const idxInBoards = boards.findIndex(b => b.id === boardId);
      if (idxInBoards === -1) return [...prev, boardId];

      const orderIndex = new Map<string, number>();
      for (let i = 0; i < boards.length; i += 1) {
        orderIndex.set(boards[i].id, i);
      }

      const next = [...prev];
      let insertAt = next.length;
      for (let i = 0; i < next.length; i += 1) {
        const existingId = next[i];
        const existingIdx = orderIndex.get(existingId);
        if (existingIdx === undefined) continue;
        if (existingIdx > idxInBoards) {
          insertAt = i;
          break;
        }
      }
      next.splice(insertAt, 0, boardId);
      return next;
    });
  };

  const moveSelected = (boardId: string, dir: -1 | 1) => {
    setSelectedBoardIds(prev => {
      const idx = prev.indexOf(boardId);
      if (idx === -1) return prev;
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(nextIdx, 0, item);
      return copy;
    });
  };

  const handleDownloadJourney = () => {
    try {
      if (!canExportJourney) {
        addToast('Selecione ao menos 1 board para exportar a jornada.', 'error');
        return;
      }
      const base = slugify((selectedBoards.length <= 1 ? activeBoard.name : (journeyName || 'journey')));
      const filename = `${base || 'journey'}.journey.json`;
      console.info('[ExportTemplateModal] download click', {
        filename,
        schemaVersion,
        selectedBoards: selectedBoards.map(b => ({ id: b.id, name: b.name, stages: b.stages.length })),
      });
      downloadJson(filename, journeyJson);
      addToast('Download iniciado.', 'success');
    } catch (err) {
      console.error('[ExportTemplateModal] download failed:', err);
      addToast('Falha ao iniciar download. Veja o console para detalhes.', 'error');
    }
  };

  const handleCopyJourneyJson = async () => {
    try {
      await navigator.clipboard.writeText(journeyJsonText);
      addToast('journey.json copiado!', 'success');
    } catch (err) {
      console.error('[ExportTemplateModal] copy failed:', err);
      addToast('Não consegui copiar (permissão do navegador).', 'error');
    }
  };

  return {
    schemaVersion,
    setSchemaVersion,
    journeyName,
    setJourneyName,
    setJourneyNameDirty,
    slugPrefix,
    setSlugPrefix,
    selectedBoardIds,
    selectedBoards,
    journeyJson,
    journeyJsonText,
    canExportJourney,
    toggleBoard,
    moveSelected,
    handleDownloadJourney,
    handleCopyJourneyJson,
  };
}
