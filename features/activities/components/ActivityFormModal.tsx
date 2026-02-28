import React from 'react';
import { X } from 'lucide-react';
import { Activity, Deal } from '@/types';
import { Button } from '@/app/components/ui/Button';
import { DealSearchCombobox } from '@/components/ui/DealSearchCombobox';
import type { RecurrenceType } from '@/features/activities/types';

interface ActivityFormData {
  title: string;
  type: Activity['type'];
  date: string;
  time: string;
  description: string;
  dealId: string;
  recurrenceType: 'none' | RecurrenceType;
  recurrenceEndDate: string;
}

interface ActivityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: ActivityFormData;
  setFormData: (data: ActivityFormData) => void;
  editingActivity: Activity | null;
  deals: Deal[];
}

export const ActivityFormModal: React.FC<ActivityFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  editingActivity,
  deals,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    // passive: true porque não usamos preventDefault() - permite scroll mais fluido
    document.addEventListener('keydown', handleEscape, { passive: true });
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 md:left-[var(--app-sidebar-width,0px)] z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        // Close only when clicking the backdrop (outside the panel).
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 max-h-[calc(100dvh-2rem)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display">
            {editingActivity ? 'Editar Atividade' : 'Nova Atividade'}
          </h2>
          <Button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X size={20} />
          </Button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4 overflow-auto pb-[calc(1.25rem+var(--app-safe-area-bottom,0px))]">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título</label>
            <input
              required
              type="text"
              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ex: Ligar para Cliente"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
            <select
              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
              value={formData.type}
              onChange={e =>
                setFormData({ ...formData, type: e.target.value as Activity['type'] })
              }
            >
              <option value="CALL">Ligação</option>
              <option value="MEETING">Reunião</option>
              <option value="EMAIL">Email</option>
              <option value="TASK">Tarefa</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Negócio Relacionado{formData.type === 'TASK' ? ' (opcional)' : ''}
            </label>
            <DealSearchCombobox
              deals={deals}
              selectedDealId={formData.dealId}
              onSelect={(dealId) => setFormData({ ...formData, dealId })}
              required={!editingActivity && formData.type !== 'TASK'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
              <input
                required
                type="date"
                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hora</label>
              <input
                required
                type="time"
                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                value={formData.time}
                onChange={e => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Repetir</label>
            <select
              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
              value={formData.recurrenceType}
              onChange={e =>
                setFormData({ ...formData, recurrenceType: e.target.value as ActivityFormData['recurrenceType'] })
              }
            >
              <option value="none">Não repetir</option>
              <option value="daily">Diariamente</option>
              <option value="weekly">Semanalmente</option>
              <option value="monthly">Mensalmente</option>
            </select>
          </div>

          {formData.recurrenceType !== 'none' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Repetir até (opcional)</label>
              <input
                type="date"
                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                value={formData.recurrenceEndDate}
                min={formData.date}
                onChange={e => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
              />
              {formData.recurrenceEndDate && formData.recurrenceEndDate < formData.date && (
                <p className="text-xs text-red-500 mt-1">Data limite deve ser igual ou posterior à data da atividade</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Descrição
            </label>
            <textarea
              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 min-h-[80px]"
              placeholder="Detalhes da atividade..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <Button
            type="submit"
            disabled={formData.recurrenceType !== 'none' && !!formData.recurrenceEndDate && formData.recurrenceEndDate < formData.date}
            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 rounded-lg mt-2 shadow-lg shadow-primary-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editingActivity ? 'Salvar Alterações' : 'Criar Atividade'}
          </Button>
        </form>
      </div>
    </div>
  );
};
