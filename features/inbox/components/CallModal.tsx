import React, { useState, useEffect } from 'react';
import { X, Phone, PhoneOff, Check, XCircle, Voicemail, Clock, FileText, Copy, ExternalLink } from 'lucide-react';
import { normalizePhoneE164 } from '@/lib/phone';
import { Button } from '@/components/ui/button';
import { NoteTemplates } from '@/features/prospecting/components/NoteTemplates';

interface CallModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: CallLogData) => void;
    contactName: string;
    contactPhone: string;
    suggestedTitle?: string;
    /** Optional side panel content (e.g. script guide) shown alongside the modal on desktop */
    sideContent?: React.ReactNode;
    /** When true, show note templates based on outcome (prospecting flow) */
    isProspecting?: boolean;
}

export interface CallLogData {
    outcome: 'connected' | 'no_answer' | 'voicemail' | 'busy';
    duration: number; // in seconds
    notes: string;
    title: string;
}

/**
 * Componente React `CallModal`.
 *
 * @param {CallModalProps} {
    isOpen,
    onClose,
    onSave,
    contactName,
    contactPhone,
    suggestedTitle = 'Ligação'
} - Parâmetro `{
    isOpen,
    onClose,
    onSave,
    contactName,
    contactPhone,
    suggestedTitle = 'Ligação'
}`.
 * @returns {Element | null} Retorna um valor do tipo `Element | null`.
 */
export const CallModal: React.FC<CallModalProps> = ({
    isOpen,
    onClose,
    onSave,
    contactName,
    contactPhone,
    suggestedTitle = 'Ligação',
    sideContent,
    isProspecting,
}) => {
    const [openedAt, setOpenedAt] = useState<Date | null>(null);
    const [dialerOpenedAt, setDialerOpenedAt] = useState<Date | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [outcome, setOutcome] = useState<CallLogData['outcome'] | null>(null);
    const [notes, setNotes] = useState('');
    const [title, setTitle] = useState(suggestedTitle);
    const [copied, setCopied] = useState(false);
    const [showMobileScript, setShowMobileScript] = useState(false);

    const phone = normalizePhoneE164(contactPhone);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Reset state when opening the modal (so it behaves like a fresh log each time).
    useEffect(() => {
        if (!isOpen) return;

        setOpenedAt(new Date());
        setDialerOpenedAt(null);
        setElapsedTime(0);
        setOutcome(null);
        setNotes('');
        setTitle(suggestedTitle);
        setCopied(false);
        setShowMobileScript(false);
    }, [isOpen, suggestedTitle]);

    // Timer effect: without WebRTC we don't know call lifecycle, so we start counting only
    // after the user explicitly opens the OS dialer.
    useEffect(() => {
        if (!isOpen) return;
        if (!dialerOpenedAt) return;

        const interval = setInterval(() => {
            setElapsedTime(Math.floor((new Date().getTime() - dialerOpenedAt.getTime()) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [isOpen, dialerOpenedAt]);

    // Format time as MM:SS
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSave = () => {
        if (!outcome) return;

        onSave({
            outcome,
            duration: elapsedTime,
            notes,
            title
        });
        onClose();
    };

    const handleDiscard = () => {
        onClose();
    };

    const handleCopyPhone = async () => {
        if (!phone) return;
        try {
            await navigator.clipboard.writeText(phone);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch {
            // ignore
        }
    };

    const handleOpenPhoneApp = () => {
        if (!phone) return;
        if (!dialerOpenedAt) {
            setDialerOpenedAt(new Date());
        }
        // Explicit user action: open the OS dialer/app.
        window.open(`tel:${phone}`, '_self');
    };

    if (!isOpen) return null;

    const outcomeOptions = [
        { id: 'connected', label: 'Atendeu', icon: Check, color: 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30' },
        { id: 'no_answer', label: 'Não atendeu', icon: XCircle, color: 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30' },
        { id: 'voicemail', label: 'Caixa postal', icon: Voicemail, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30' },
        { id: 'busy', label: 'Ocupado', icon: PhoneOff, color: 'bg-slate-500/20 text-slate-400 border-slate-500/30 hover:bg-slate-500/30' },
    ] as const;

    return (
        <div className="fixed inset-0 md:left-[var(--app-sidebar-width,0px)] z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleDiscard} />

            {/* Container: side-by-side on desktop when sideContent provided */}
            <div className={`relative flex ${sideContent ? 'gap-4' : ''} mx-4 max-h-[90vh]`}>

            {/* Modal */}
            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-linear-to-r from-yellow-500/10 to-orange-500/10 p-4 border-b border-slate-200 dark:border-slate-700/50 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/20 rounded-xl">
                                <Phone size={20} className="text-yellow-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white">{contactName}</h3>
                                <div className="mt-0.5 flex items-center gap-2">
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{phone || ''}</p>
                                    {phone && (
                                        <>
                                            <Button
                                                variant="unstyled"
                                                size="unstyled"
                                                type="button"
                                                onClick={handleCopyPhone}
                                                className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                                title={copied ? 'Copiado' : 'Copiar número'}
                                                aria-label={copied ? 'Copiado' : 'Copiar número'}
                                            >
                                                <Copy size={12} />
                                            </Button>
                                            <Button
                                                variant="unstyled"
                                                size="unstyled"
                                                type="button"
                                                onClick={handleOpenPhoneApp}
                                                className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                                title="Abrir no discador"
                                                aria-label="Abrir no discador"
                                            >
                                                <ExternalLink size={12} />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Mobile script toggle */}
                            {sideContent && (
                                <Button
                                    variant="unstyled"
                                    size="unstyled"
                                    type="button"
                                    aria-label="Ver script"
                                    onClick={() => setShowMobileScript(prev => !prev)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors lg:hidden flex items-center gap-1.5 ${showMobileScript ? 'bg-purple-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                >
                                    <FileText size={14} />
                                    Script
                                </Button>
                            )}
                            <Button
                                variant="unstyled"
                                size="unstyled"
                                type="button"
                                aria-label="Fechar modal"
                                onClick={handleDiscard}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X size={18} />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Timer */}
                <div className="flex items-center justify-center py-6 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                    <div className="flex flex-col items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <Clock size={18} className="text-yellow-400" />
                            <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white tracking-wider">
                                {formatTime(dialerOpenedAt ? elapsedTime : 0)}
                            </span>
                        </div>
                        <div className="text-[11px] text-slate-400 text-center">
                            {!phone ? (
                                'Sem número de telefone para discar.'
                            ) : dialerOpenedAt ? (
                                'Tempo desde abrir o discador (a chamada acontece fora do CRM).'
                            ) : (
                                'Abra o discador para iniciar a contagem.'
                            )}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4 overflow-y-auto">
                    {/* Outcome Selection */}
                    <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                            Resultado da ligação
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {outcomeOptions.map(({ id, label, icon: Icon, color }) => (
                                <Button
                                    variant="unstyled"
                                    size="unstyled"
                                    key={id}
                                    onClick={() => setOutcome(id)}
                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all text-sm font-medium ${outcome === id
                                            ? color + ' ring-2 ring-current'
                                            : 'bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700/50 hover:border-slate-400 dark:hover:border-slate-600'
                                        }`}
                                >
                                    <Icon size={16} />
                                    {label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                            Título da atividade
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 text-sm"
                            placeholder="Ex: Ligação de follow-up"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <FileText size={12} />
                            Notas da ligação
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="O que foi discutido? Próximos passos?"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 text-sm resize-y min-h-24 max-h-[30vh] break-words [overflow-wrap:anywhere]"
                            rows={3}
                        />
                        {isProspecting && outcome && (
                            <div className="mt-2">
                                <NoteTemplates
                                    outcome={outcome}
                                    onSelect={(text) => {
                                        setNotes((prev) => prev ? `${prev}\n${text}` : text)
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile script overlay (inside modal) */}
                {sideContent && showMobileScript && (
                    <div className="lg:hidden overflow-y-auto border-t border-slate-200 dark:border-slate-700/50">
                        {sideContent}
                    </div>
                )}

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700/50 grid grid-cols-2 gap-2 shrink-0">
                    <Button
                        variant="unstyled"
                        size="unstyled"
                        onClick={handleDiscard}
                        className="py-2.5 px-3 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-center"
                    >
                        Descartar
                    </Button>
                    <Button
                        variant="unstyled"
                        size="unstyled"
                        type="button"
                        onClick={handleCopyPhone}
                        disabled={!phone}
                        className="py-2.5 px-3 rounded-lg text-sm font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        title={copied ? 'Copiado' : 'Copiar número'}
                    >
                        <Copy size={14} />
                        {copied ? 'Copiado' : 'Copiar número'}
                    </Button>
                    <Button
                        variant="unstyled"
                        size="unstyled"
                        type="button"
                        onClick={handleOpenPhoneApp}
                        disabled={!phone}
                        className="py-2.5 px-3 rounded-lg text-sm font-semibold bg-yellow-500 hover:bg-yellow-600 text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        title="Abrir no discador"
                    >
                        <ExternalLink size={14} />
                        Abrir no discador
                    </Button>
                    <Button
                        variant="unstyled"
                        size="unstyled"
                        onClick={handleSave}
                        disabled={!outcome}
                        className="py-2.5 px-3 rounded-lg text-sm font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Check size={14} />
                        Salvar Log
                    </Button>
                </div>
            </div>

            {/* Side content panel (script guide) — desktop only */}
            {sideContent && (
                <div className="hidden lg:flex relative w-80 xl:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh]">
                    {sideContent}
                </div>
            )}

            </div>
        </div>
    );
};

export default CallModal;
