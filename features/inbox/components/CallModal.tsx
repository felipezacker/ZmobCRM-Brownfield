import React, { useState, useEffect } from 'react';
import { X, Phone, PhoneOff, Check, XCircle, Voicemail, Clock, FileText, Copy, ExternalLink, Pause, Play } from 'lucide-react';
import { normalizePhoneE164 } from '@/lib/phone';
import { Button } from '@/components/ui/button';
import { MODAL_BACKDROP_CLASS } from '@/components/ui/modalStyles';
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
    const [showTimerPrompt, setShowTimerPrompt] = useState(false);
    const [timerPaused, setTimerPaused] = useState(false);
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
        setShowTimerPrompt(false);
        setTimerPaused(false);
        setShowMobileScript(false);
    }, [isOpen, suggestedTitle]);

    // Timer effect: without WebRTC we don't know call lifecycle, so we start counting only
    // after the user explicitly opens the OS dialer.
    useEffect(() => {
        if (!isOpen) return;
        if (!dialerOpenedAt) return;
        if (timerPaused) return;

        const interval = setInterval(() => {
            setElapsedTime(Math.floor((new Date().getTime() - dialerOpenedAt.getTime()) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [isOpen, dialerOpenedAt, timerPaused]);

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
            // Se timer ainda não iniciou, perguntar se quer iniciar
            if (!dialerOpenedAt) {
                setShowTimerPrompt(true);
            }
        } catch {
            // ignore
        }
    };

    const handleConfirmStartTimer = () => {
        setDialerOpenedAt(new Date());
        setShowTimerPrompt(false);
    };

    const handleDismissTimerPrompt = () => {
        setShowTimerPrompt(false);
    };

    const handleTogglePause = () => {
        if (timerPaused) {
            // Retomar: ajustar dialerOpenedAt para que o timer continue de onde parou
            setDialerOpenedAt(new Date(Date.now() - elapsedTime * 1000));
            setTimerPaused(false);
        } else {
            setTimerPaused(true);
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
        { id: 'busy', label: 'Ocupado', icon: PhoneOff, color: 'bg-accent/20 text-muted-foreground border-border/30 hover:bg-accent/30' },
    ] as const;

    return (
        <div className="fixed inset-0 md:left-[var(--app-sidebar-width,0px)] z-[var(--z-modal)] flex items-center justify-center">
            {/* Backdrop */}
            <div className={`absolute inset-0 ${MODAL_BACKDROP_CLASS}`} onClick={handleDiscard} />

            {/* Container: side-by-side on desktop when sideContent provided */}
            <div className={`relative flex ${sideContent ? 'gap-4' : ''} mx-4 max-h-[90vh]`}>

            {/* Modal */}
            <div className="relative bg-white dark:bg-card border border-border dark:border-border/50 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-linear-to-r from-yellow-500/10 to-orange-500/10 p-4 border-b border-border dark:border-border/50 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/20 rounded-xl">
                                <Phone size={20} className="text-yellow-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">{contactName}</h3>
                                <div className="mt-0.5 flex items-center gap-2">
                                    <p className="text-xs text-muted-foreground dark:text-muted-foreground">{phone || ''}</p>
                                    {phone && (
                                        <>
                                            <Button
                                                variant="unstyled"
                                                size="unstyled"
                                                type="button"
                                                onClick={handleCopyPhone}
                                                className="p-1 rounded-md hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
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
                                                className="p-1 rounded-md hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
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
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors lg:hidden flex items-center gap-1.5 ${showMobileScript ? 'bg-purple-500 text-white' : 'bg-muted dark:bg-card text-muted-foreground dark:text-muted-foreground hover:bg-accent dark:hover:bg-accent'}`}
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
                                className="p-1.5 hover:bg-muted dark:hover:bg-white/10 rounded-lg transition-colors text-muted-foreground hover:text-secondary-foreground dark:hover:text-white"
                            >
                                <X size={18} />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Timer */}
                <div className="flex items-center justify-center py-6 bg-background dark:bg-card/50 shrink-0">
                    <div className="flex flex-col items-center gap-2 px-6 py-3 bg-white dark:bg-card rounded-xl border border-border dark:border-border/50">
                        <div className="flex items-center gap-3">
                            <Clock size={18} className="text-yellow-400" />
                            <span className="text-2xl font-mono font-bold text-foreground tracking-wider">
                                {formatTime(dialerOpenedAt ? elapsedTime : 0)}
                            </span>
                            {dialerOpenedAt && (
                                <Button
                                    variant="unstyled"
                                    size="unstyled"
                                    type="button"
                                    onClick={handleTogglePause}
                                    className={`p-1.5 rounded-lg transition-colors ${timerPaused ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-muted dark:bg-white/10 text-muted-foreground hover:text-foreground dark:hover:text-white'}`}
                                    title={timerPaused ? 'Retomar contagem' : 'Pausar contagem'}
                                    aria-label={timerPaused ? 'Retomar contagem' : 'Pausar contagem'}
                                >
                                    {timerPaused ? <Play size={14} /> : <Pause size={14} />}
                                </Button>
                            )}
                        </div>
                        <div className="text-[11px] text-muted-foreground text-center">
                            {!phone ? (
                                'Sem número de telefone para discar.'
                            ) : timerPaused ? (
                                'Contagem pausada — adicione suas notas com calma.'
                            ) : dialerOpenedAt ? (
                                'Tempo desde abrir o discador (a chamada acontece fora do CRM).'
                            ) : (
                                'Abra o discador para iniciar a contagem.'
                            )}
                        </div>
                        {showTimerPrompt && (
                            <div className="mt-2 flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2">
                                <span className="text-xs text-yellow-300 font-medium">Iniciar contagem?</span>
                                <Button
                                    variant="unstyled"
                                    size="unstyled"
                                    type="button"
                                    onClick={handleConfirmStartTimer}
                                    className="px-2 py-0.5 rounded text-xs font-semibold bg-yellow-500 hover:bg-yellow-600 text-black transition-colors"
                                >
                                    Sim
                                </Button>
                                <Button
                                    variant="unstyled"
                                    size="unstyled"
                                    type="button"
                                    onClick={handleDismissTimerPrompt}
                                    className="px-2 py-0.5 rounded text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Não
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4 overflow-y-auto">
                    {/* Outcome Selection */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider mb-2 block">
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
                                            : 'bg-muted dark:bg-card/50 text-muted-foreground dark:text-muted-foreground border-border dark:border-border/50 hover:border-border dark:hover:border-border'
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
                        <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider mb-2 block">
                            Título da atividade
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-background dark:bg-card/50 border border-border dark:border-border/50 rounded-lg text-foreground placeholder-muted-foreground dark:placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 text-sm"
                            placeholder="Ex: Ligação de follow-up"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                            <FileText size={12} />
                            Notas da ligação
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="O que foi discutido? Próximos passos?"
                            className="w-full px-3 py-2 bg-background dark:bg-card/50 border border-border dark:border-border/50 rounded-lg text-foreground placeholder-muted-foreground dark:placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 text-sm resize-y min-h-24 max-h-[30vh] break-words [overflow-wrap:anywhere]"
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
                    <div className="lg:hidden overflow-y-auto border-t border-border dark:border-border/50">
                        {sideContent}
                    </div>
                )}

                {/* Footer */}
                <div className="p-4 border-t border-border dark:border-border/50 grid grid-cols-2 gap-2 shrink-0">
                    <Button
                        variant="unstyled"
                        size="unstyled"
                        onClick={handleDiscard}
                        className="py-2.5 px-3 rounded-lg text-sm font-medium text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-card transition-colors text-center"
                    >
                        Descartar
                    </Button>
                    <Button
                        variant="unstyled"
                        size="unstyled"
                        type="button"
                        onClick={handleCopyPhone}
                        disabled={!phone}
                        className="py-2.5 px-3 rounded-lg text-sm font-semibold bg-accent dark:bg-card hover:bg-accent dark:hover:bg-accent text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                        className="py-2.5 px-3 rounded-lg text-sm font-semibold bg-accent dark:bg-card hover:bg-accent dark:hover:bg-accent text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Check size={14} />
                        Salvar Log
                    </Button>
                </div>
            </div>

            {/* Side content panel (script guide) — desktop only */}
            {sideContent && (
                <div className="hidden lg:flex relative w-80 xl:w-96 bg-white dark:bg-card border border-border dark:border-border/50 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh]">
                    {sideContent}
                </div>
            )}

            </div>
        </div>
    );
};

export default CallModal;
