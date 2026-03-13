import React, { useState, useEffect } from 'react';
import { X, Phone, Calendar, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MODAL_BACKDROP_CLASS } from '@/components/ui/modalStyles';
import { PIPELINE_CONFIG_COLORS } from '@/lib/design-tokens';

export type ScheduleType = 'CALL' | 'MEETING' | 'TASK';

interface ScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: ScheduleData) => void;
    contactName?: string;
    initialType?: ScheduleType;
    initialTitle?: string;
    initialDescription?: string;
    initialDate?: string; // YYYY-MM-DD
    initialTime?: string; // HH:mm
}

export interface ScheduleData {
    type: ScheduleType;
    title: string;
    description: string;
    date: string;
    time: string;
}

const typeConfig = {
    CALL: { label: 'Ligação', icon: Phone, color: 'blue' },
    MEETING: { label: 'Reunião', icon: Calendar, color: 'purple' },
    TASK: { label: 'Tarefa', icon: Clock, color: 'orange' },
};

/**
 * Componente React `ScheduleModal`.
 *
 * @param {ScheduleModalProps} {
    isOpen,
    onClose,
    onSave,
    contactName = 'Contato',
    initialType = 'CALL',
    initialTitle,
    initialDescription,
    initialDate,
    initialTime,
} - Parâmetro `{
    isOpen,
    onClose,
    onSave,
    contactName = 'Contato',
    initialType = 'CALL',
    initialTitle,
    initialDescription,
    initialDate,
    initialTime,
}`.
 * @returns {Element | null} Retorna um valor do tipo `Element | null`.
 */
export function ScheduleModal({
    isOpen,
    onClose,
    onSave,
    contactName = 'Contato',
    initialType = 'CALL',
    initialTitle,
    initialDescription,
    initialDate,
    initialTime,
}: ScheduleModalProps) {
    const [type, setType] = useState<ScheduleType>(initialType);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('10:00');
    const [isSaving, setIsSaving] = useState(false);
    const [titleTouched, setTitleTouched] = useState(false);

    // Reset form when modal opens
    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) return;

        setTitleTouched(false);
        setType(initialType);

        const defaultTitle = typeConfig[initialType].label + ' com ' + contactName;
        setTitle(typeof initialTitle === 'string' && initialTitle.trim() ? initialTitle : defaultTitle);

        setDescription(typeof initialDescription === 'string' ? initialDescription : '');

        // Default to tomorrow (unless provided)
        if (typeof initialDate === 'string' && initialDate) {
            setDate(initialDate);
        } else {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setDate(tomorrow.toISOString().split('T')[0]);
        }

        setTime(typeof initialTime === 'string' && initialTime ? initialTime : '10:00');
    }, [isOpen, initialType, contactName, initialTitle, initialDescription, initialDate, initialTime]);

    // Update title when type changes
    useEffect(() => {
        if (!isOpen) return;
        if (titleTouched) return;
        // Se abriu com um título sugerido (ex.: IA) e ainda está no tipo inicial, não sobrescrever.
        if (typeof initialTitle === 'string' && initialTitle.trim() && type === initialType) return;

        setTitle(typeConfig[type].label + ' com ' + contactName);
    }, [isOpen, type, contactName, titleTouched, initialTitle, initialType]);

    const handleSave = async () => {
        if (!title.trim() || !date) return;

        setIsSaving(true);
        try {
            await onSave({
                type,
                title: title.trim(),
                description: description.trim(),
                date,
                time,
            });
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const config = typeConfig[type];

    return (
        <div className="fixed inset-0 md:left-[var(--app-sidebar-width,0px)] z-[var(--z-modal)] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 ${MODAL_BACKDROP_CLASS}`}
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-card border border-border rounded-xl w-full max-w-xl mx-4 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Calendar size={20} className="text-primary-400" />
                        Agendar Atividade
                    </h2>
                    <Button
                        onClick={onClose}
                        className="p-1 hover:bg-card rounded-lg transition-colors"
                    >
                        <X size={20} className="text-muted-foreground" />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4 overflow-y-auto">
                    {/* Type selector */}
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-2">Tipo</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(Object.keys(typeConfig) as ScheduleType[]).map((t) => {
                                const cfg = typeConfig[t];
                                const Icon = cfg.icon;
                                const isSelected = type === t;
                                return (
                                    <Button
                                        key={t}
                                        onClick={() => setType(t)}
                                        className={`p-3 rounded-lg border flex flex-col items-center gap-1 transition-all ${isSelected
                                                ? `border-${cfg.color}-500 bg-${cfg.color}-500/10 text-${cfg.color}-400`
                                                : 'border-border bg-card/50 text-muted-foreground hover:border-border'
                                            }`}
                                        style={isSelected ? {
                                            borderColor: PIPELINE_CONFIG_COLORS[cfg.color as keyof typeof PIPELINE_CONFIG_COLORS]?.border,
                                            backgroundColor: PIPELINE_CONFIG_COLORS[cfg.color as keyof typeof PIPELINE_CONFIG_COLORS]?.bg,
                                            color: PIPELINE_CONFIG_COLORS[cfg.color as keyof typeof PIPELINE_CONFIG_COLORS]?.text,
                                        } : {}}
                                    >
                                        <Icon size={18} />
                                        <span className="text-xs font-medium">{cfg.label}</span>
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-2">Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => {
                                setTitleTouched(true);
                                setTitle(e.target.value);
                            }}
                            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary-500"
                            placeholder="Ex: Ligar para João"
                        />
                    </div>

                    {/* Date and Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-2">Data</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-2">Horário</label>
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary-500"
                            />
                        </div>
                    </div>

                    {/* Quick time buttons */}
                    <div className="flex gap-2 flex-wrap">
                        {['Hoje', 'Amanhã', 'Próx. semana'].map((label, idx) => {
                            const d = new Date();
                            if (idx === 1) d.setDate(d.getDate() + 1);
                            if (idx === 2) d.setDate(d.getDate() + 7);
                            const dateStr = d.toISOString().split('T')[0];
                            return (
                                <Button
                                    key={label}
                                    onClick={() => setDate(dateStr)}
                                    className={`px-3 py-1 text-xs rounded-full transition-colors ${date === dateStr
                                            ? 'bg-primary-500 text-white'
                                            : 'bg-card text-muted-foreground hover:bg-accent'
                                        }`}
                                >
                                    {label}
                                </Button>
                            );
                        })}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-2">Descrição (opcional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary-500 resize-y min-h-[120px] max-h-[40vh]"
                            placeholder="Notas adicionais..."
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-4 border-t border-border shrink-0">
                    <Button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-card hover:bg-accent text-muted-foreground text-sm font-medium rounded-lg transition-colors"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!title.trim() || !date || isSaving}
                        className="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <span className="animate-spin">⏳</span>
                        ) : (
                            <CheckCircle size={16} />
                        )}
                        Agendar
                    </Button>
                </div>
            </div>
        </div>
    );
}
