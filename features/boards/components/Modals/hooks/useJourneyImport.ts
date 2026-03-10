import { useState } from 'react';
import type { Board, BoardStage, JourneyDefinition } from '@/types';
import {
  JourneySchema,
  guessWonLostStageIds,
} from '@/features/boards/components/Modals/ExportTemplateModal';

type Panel = 'export' | 'import';

interface UseJourneyImportParams {
  addToast: (message: string, type: 'success' | 'error') => void;
  onClose: () => void;
  onCreateBoardAsync?: (board: Omit<Board, 'id' | 'createdAt'>, order?: number) => Promise<Board>;
  setPanel: (panel: Panel) => void;
}

export function useJourneyImport({ addToast, onClose, onCreateBoardAsync, setPanel }: UseJourneyImportParams) {
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importJourney, setImportJourney] = useState<JourneyDefinition | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const parseImport = (raw: string) => {
    setImportText(raw);
    setImportError(null);
    setImportJourney(null);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      setImportError('JSON inválido (não consegui fazer parse).');
      return;
    }

    const result = JourneySchema.safeParse(parsedJson);
    if (!result.success) {
      setImportError('JSON não bate com o schema esperado de Journey (schemaVersion/boards/columns).');
      return;
    }

    setImportJourney(result.data as JourneyDefinition);
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      parseImport(text);
    } catch (e) {
      console.error('[ExportTemplateModal] import file read failed:', e);
      setImportError('Falha ao ler arquivo.');
    }
  };

  const handleInstallImportedJourney = async () => {
    if (!importJourney) {
      addToast('Selecione um journey.json válido.', 'error');
      return;
    }
    if (!onCreateBoardAsync) {
      addToast('Import indisponível nesta tela.', 'error');
      return;
    }

    setIsImporting(true);
    setImportError(null);
    try {
      for (let i = 0; i < importJourney.boards.length; i += 1) {
        const b = importJourney.boards[i];
        const stages: BoardStage[] = b.columns.map((c) => ({
          id: crypto.randomUUID(),
          label: c.name,
          color: c.color || 'bg-accent',
          linkedLifecycleStage: c.linkedLifecycleStage,
        }));
        const guessed = guessWonLostStageIds(stages);

        const rawPersona = b.strategy?.agentPersona;
        const agentPersona = rawPersona
          ? { name: rawPersona.name ?? '', role: rawPersona.role ?? '', behavior: rawPersona.behavior ?? '' }
          : undefined;
        await onCreateBoardAsync({
          name: b.name,
          description: `Parte da jornada: Sim`,
          linkedLifecycleStage: undefined,
          template: 'CUSTOM',
          stages,
          isDefault: false,
          wonStageId: guessed.wonStageId,
          lostStageId: guessed.lostStageId,
          agentPersona,
          goal: b.strategy?.goal,
          entryTrigger: b.strategy?.entryTrigger,
        });
      }

      addToast('Jornada importada com sucesso!', 'success');
      onClose();
      setImportText('');
      setImportError(null);
      setImportJourney(null);
      setPanel('export');
    } catch (e) {
      console.error('[ExportTemplateModal] install journey failed:', e);
      setImportError('Falha ao instalar a jornada. Veja o console/toasts.');
    } finally {
      setIsImporting(false);
    }
  };

  return {
    importText,
    importError,
    importJourney,
    isImporting,
    parseImport,
    handleImportFile,
    handleInstallImportedJourney,
  };
}
