import React, { useState, useMemo, useEffect } from 'react';
import { Phone, Calendar, Mail, MessageCircle, Target, Sparkles } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import type { Activity } from '@/types';
import { useAIDealAnalysis, deriveHealthFromProbability } from '../../hooks/useAIDealAnalysis';
import { useDealNotes } from '../../hooks/useDealNotes';
import { useDealFiles } from '../../hooks/useDealFiles';
import { useQuickScripts } from '../../hooks/useQuickScripts';
import { useAI } from '@/context/AIContext';
import { CallModal, CallLogData } from '../CallModal';
import { ScriptEditorModal, ScriptFormData } from '../ScriptEditorModal';
import { ScheduleModal, ScheduleData, ScheduleType } from '../ScheduleModal';
import { MessageComposerModal, type MessageChannel } from '../MessageComposerModal';
import { Button } from '@/components/ui/button';
import { PT_BR_SHORT_DATE_FORMATTER } from './constants';
import { buildSuggestedWhatsAppMessage, buildSuggestedEmailBody } from './message-builders';
import type { FocusContextPanelProps, NBAActionMode } from './types';
import { PipelineHeader } from './PipelineHeader';
import { HealthSection } from './HealthSection';
import { NextBestActionCard } from './NextBestActionCard';
import { DealStatsBar } from './DealStatsBar';
import { ContactInfoCard } from './ContactInfoCard';
import { DealInfoCard } from './DealInfoCard';
import { PipelineStages } from './PipelineStages';
import { ActivityTimeline } from './ActivityTimeline';
import { NotesTab } from './NotesTab';
import { ScriptsTab } from './ScriptsTab';
import { FilesTab } from './FilesTab';

const AIAssistant = React.lazy(() => import('@/components/AIAssistant'));

export const FocusContextPanel: React.FC<FocusContextPanelProps> = ({
    deal,
    contact,
    board,
    activities,
    onMoveStage,
    onAddActivity,
    onClose,
    className,
    isExpanded
}) => {
    const [activeTab, setActiveTab] = useState('chat');
    const [note, setNote] = useState('');

    // AI Context Injection
    const { setContext, clearContext } = useAI();

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            onClose();
        };
        window.addEventListener('keydown', onKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
    }, [onClose]);

    const recentHistory = useMemo(() => {
        return activities
            .slice(0, 5)
            .map(a => `[${PT_BR_SHORT_DATE_FORMATTER.format(new Date(a.date))}] ${a.type}: ${a.title} (${a.description})`)
            .join('\n');
    }, [activities]);

    useEffect(() => {
        setContext({
            view: { type: 'cockpit', name: 'Cockpit de Vendas' },
            activeObject: {
                type: 'deal', id: deal.id, name: deal.title, value: deal.value, status: deal.status,
                metadata: { currentProbability: deal.probability, contactName: contact?.name, recentHistory }
            }
        });
        return () => { clearContext(); };
    }, [deal, contact, recentHistory, setContext, clearContext]);

    const stageInfo = useMemo(() => {
        if (!board) return { stage: undefined, idx: 0 };
        for (let i = 0; i < board.stages.length; i += 1) {
            const s = board.stages[i];
            if (s.id === deal.status) return { stage: s, idx: i };
        }
        return { stage: undefined, idx: 0 };
    }, [board, deal.status]);
    const currentStage = stageInfo.stage;
    const currentIdx = stageInfo.idx;

    // Real data hooks
    const { data: aiAnalysis, isLoading: isAILoading, refetch: refetchAI } = useAIDealAnalysis(deal, currentStage?.label);
    const { notes, isLoading: isNotesLoading, createNote, deleteNote } = useDealNotes(deal.id);
    const { files, isLoading: isFilesLoading, uploadFile, deleteFile, downloadFile, formatFileSize } = useDealFiles(deal.id);
    const { scripts, isLoading: isScriptsLoading, applyVariables, getCategoryInfo, createScript, updateScript, deleteScript } = useQuickScripts();

    // Modal state
    const [isCallModalOpen, setIsCallModalOpen] = useState(false);
    const [callSuggestedTitle, setCallSuggestedTitle] = useState('');
    const [isScriptEditorOpen, setIsScriptEditorOpen] = useState(false);
    const [editingScript, setEditingScript] = useState<ScriptFormData | null>(null);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [scheduleType, setScheduleType] = useState<ScheduleType>('CALL');
    const [schedulePrefill, setSchedulePrefill] = useState<{ title?: string; description?: string; date?: string; time?: string } | null>(null);
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [messageChannel, setMessageChannel] = useState<MessageChannel>('WHATSAPP');
    const [messagePrefill, setMessagePrefill] = useState<{ subject?: string; message?: string } | null>(null);

    // Computed values
    const daysInStage = useMemo(() => {
        const stageDate = deal.lastStageChangeDate || deal.createdAt;
        if (!stageDate) return 0;
        return Math.floor((Date.now() - new Date(stageDate).getTime()) / (1000 * 60 * 60 * 24));
    }, [deal.lastStageChangeDate, deal.createdAt]);

    const healthScore = useMemo(() => {
        const probability = aiAnalysis?.probabilityScore ?? deal.probability ?? 50;
        return deriveHealthFromProbability(probability);
    }, [aiAnalysis?.probabilityScore, deal.probability]);

    const nextBestAction = useMemo(() => {
        if (aiAnalysis?.action && !aiAnalysis.error) {
            const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
                CALL: Phone, MEETING: Calendar, EMAIL: Mail, TASK: Target, WHATSAPP: MessageCircle,
            };
            return {
                action: aiAnalysis.action, reason: aiAnalysis.reason,
                urgency: (aiAnalysis.urgency || 'medium') as 'high' | 'medium' | 'low',
                actionType: aiAnalysis.actionType || 'TASK',
                icon: iconMap[aiAnalysis.actionType] || Sparkles, isAI: true
            };
        }
        const lastActivity = activities[0];
        const daysSinceActivity = lastActivity
            ? Math.floor((Date.now() - new Date(lastActivity.date).getTime()) / (1000 * 60 * 60 * 24))
            : 999;
        if (daysSinceActivity > 7) {
            return { action: 'Ligar agora', reason: `${daysSinceActivity} dias sem contato`, urgency: 'high' as const, actionType: 'CALL' as const, icon: Phone, isAI: false };
        }
        return { action: 'Agendar reuniao', reason: 'Manter momentum do deal', urgency: 'low' as const, actionType: 'MEETING' as const, icon: Calendar, isAI: false };
    }, [aiAnalysis, activities]);

    // Cockpit snapshot for AI
    const cockpitSnapshot = useMemo(() => {
        const stageData = currentStage ? { id: currentStage.id, label: currentStage.label, color: currentStage.color } : undefined;
        const boardData = board ? { id: board.id, name: board.name, description: board.description, wonStageId: board.wonStageId, lostStageId: board.lostStageId, stages: (board.stages ?? []).map(s => ({ id: s.id, label: s.label, color: s.color })) } : undefined;
        const contactData = contact ? { id: contact.id, name: contact.name, email: contact.email, phone: contact.phone, avatar: contact.avatar, status: contact.status, stage: contact.stage, source: contact.source, notes: contact.notes, lastInteraction: contact.lastInteraction, birthDate: contact.birthDate, lastPurchaseDate: contact.lastPurchaseDate, totalValue: contact.totalValue } : undefined;
        const dealData = { id: deal.id, title: deal.title, value: deal.value, status: deal.status, isWon: deal.isWon, isLost: deal.isLost, probability: deal.probability, priority: deal.priority, owner: deal.owner, ownerId: deal.ownerId, nextActivity: deal.nextActivity, items: deal.items, lastStageChangeDate: deal.lastStageChangeDate, lossReason: deal.lossReason, createdAt: deal.createdAt, updatedAt: deal.updatedAt };
        const lim = { activities: 25, notes: 50, files: 50, scripts: 50 };
        return {
            meta: { generatedAt: new Date().toISOString(), source: 'cockpit', version: 1 },
            deal: dealData, contact: contactData, board: boardData, stage: stageData,
            cockpitSignals: { daysInStage, healthScore, nextBestAction, aiAnalysis: aiAnalysis ?? null, aiAnalysisLoading: isAILoading },
            lists: {
                activities: { total: activities.length, preview: activities.slice(0, lim.activities).map(a => ({ id: a.id, type: a.type, title: a.title, description: a.description, date: a.date, completed: a.completed, user: a.user?.name })), limit: lim.activities, truncated: activities.length > lim.activities },
                notes: { total: notes.length, preview: notes.slice(0, lim.notes).map(n => ({ id: n.id, content: n.content, created_at: n.created_at, updated_at: n.updated_at, created_by: n.created_by })), loading: isNotesLoading, limit: lim.notes, truncated: notes.length > lim.notes },
                files: { total: files.length, preview: files.slice(0, lim.files).map(f => ({ id: f.id, file_name: f.file_name, file_size: f.file_size, mime_type: f.mime_type, file_path: f.file_path, created_at: f.created_at, created_by: f.created_by })), loading: isFilesLoading, limit: lim.files, truncated: files.length > lim.files },
                scripts: { total: scripts.length, preview: scripts.slice(0, lim.scripts).map(s => ({ id: s.id, title: s.title, category: s.category, template: s.template, icon: s.icon, is_system: s.is_system, updated_at: s.updated_at })), loading: isScriptsLoading, limit: lim.scripts, truncated: scripts.length > lim.scripts },
            },
        };
    }, [deal, contact, board, currentStage, activities, notes, files, scripts, daysInStage, healthScore, nextBestAction, aiAnalysis, isAILoading, isNotesLoading, isFilesLoading, isScriptsLoading]);

    // Handlers
    const openMessageComposer = (channel: MessageChannel, prefill?: { subject?: string; message?: string }) => {
        setMessageChannel(channel);
        setMessagePrefill(prefill ?? null);
        setIsMessageModalOpen(true);
    };
    const handleWhatsApp = (prefill?: { message?: string }) => openMessageComposer('WHATSAPP', { message: prefill?.message });
    const handleEmail = (prefill?: { subject?: string; message?: string }) => openMessageComposer('EMAIL', prefill);
    const handleCall = (suggestedTitle?: string) => { if (!contact?.phone) return; setCallSuggestedTitle(suggestedTitle || 'Ligacao'); setIsCallModalOpen(true); };
    const handleCallLogSave = (data: CallLogData) => {
        const outcomeLabels = { connected: 'Atendeu', no_answer: 'Nao atendeu', voicemail: 'Caixa postal', busy: 'Ocupado' };
        onAddActivity({ dealId: deal.id, dealTitle: deal.title, type: 'CALL', title: data.title, description: `${outcomeLabels[data.outcome]} - Duracao: ${Math.floor(data.duration / 60)}min ${data.duration % 60}s${data.notes ? '\n\n' + data.notes : ''}`, date: new Date().toISOString(), completed: true, user: { name: 'Eu', avatar: '' } });
    };
    const handleQuickAction = (type: ScheduleType, prefill?: { title?: string; description?: string; date?: string; time?: string }) => {
        setScheduleType(type); setSchedulePrefill(prefill ?? null); setIsScheduleModalOpen(true);
    };
    const handleScheduleSave = (data: ScheduleData) => {
        const dateTime = new Date(`${data.date}T${data.time}`);
        onAddActivity({ type: data.type, title: data.title, description: data.description || `${data.type === 'CALL' ? 'Ligacao' : data.type === 'MEETING' ? 'Reuniao' : 'Tarefa'} com ${contact?.name || 'contato'}`, date: dateTime.toISOString(), completed: false });
    };
    const handleNBAAction = (overrideActionType?: string, mode: NBAActionMode = 'execute') => {
        const { action, reason, actionType: suggestedType } = nextBestAction;
        const actionType = overrideActionType || suggestedType;
        if (actionType === 'WHATSAPP') { handleWhatsApp({ message: buildSuggestedWhatsAppMessage(suggestedType, action, reason, contact?.name, deal.title) }); return; }
        if (actionType === 'EMAIL') { handleEmail({ subject: action, message: buildSuggestedEmailBody(suggestedType, action, reason, contact?.name, deal.title) }); return; }
        if (actionType === 'CALL') { handleCall(action); return; }
        if (actionType === 'MEETING' || actionType === 'TASK') {
            const type: ScheduleType = actionType === 'MEETING' ? 'MEETING' : 'TASK';
            if (mode === 'configure') { handleQuickAction(type, { title: action, description: `${reason} - Sugerido por IA` }); return; }
            const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(10, 0, 0, 0);
            onAddActivity({ type, title: action, description: `${reason} - Sugerido por IA`, date: tomorrow.toISOString(), completed: false });
        }
    };
    const handleNoteSubmit = async () => { if (!note.trim()) return; await createNote.mutateAsync(note); setNote(''); };

    const wrapBuildWhatsApp = (actionType: string, action: string) => buildSuggestedWhatsAppMessage(actionType, action, undefined, contact?.name, deal.title);
    const wrapBuildEmail = (actionType: string, action: string) => buildSuggestedEmailBody(actionType, action, undefined, contact?.name, deal.title);

    if (!isExpanded) return null;

    return (
        <>
            <div className={`${isExpanded ? 'fixed inset-0' : ''} flex flex-col bg-background ${className || ''}`}>
                <PipelineHeader deal={deal} board={board} currentIdx={currentIdx} onMoveStage={onMoveStage} />

                <div className="flex-1 flex min-h-0 overflow-hidden">
                    {/* LEFT: Contact Sidebar */}
                    <aside className="w-[400px] shrink-0 border-r border-white/5 flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
                        <HealthSection healthScore={healthScore} isAILoading={isAILoading} hasAIAnalysis={!!(aiAnalysis && !aiAnalysis.error)} onRefresh={() => refetchAI()} />
                        <NextBestActionCard nextBestAction={nextBestAction} onRefresh={() => refetchAI()} onAction={handleNBAAction} />
                        <DealStatsBar daysInStage={daysInStage} deal={deal} activitiesCount={activities.length} />
                        {contact && <ContactInfoCard contact={contact} />}
                        <DealInfoCard deal={deal} contact={contact} />
                        <PipelineStages board={board} currentIdx={currentIdx} daysInStage={daysInStage} onMoveStage={onMoveStage} />
                    </aside>

                    {/* RIGHT: Split View */}
                    <main className="flex-1 flex min-w-0 bg-card/10">
                        <ActivityTimeline activities={activities} board={board} contact={contact} deal={deal} note={note} onNoteChange={setNote} onAddActivity={onAddActivity} onQuickAction={handleQuickAction} onWhatsApp={handleWhatsApp} onEmail={handleEmail} buildWhatsAppMessage={wrapBuildWhatsApp} buildEmailBody={wrapBuildEmail} />

                        {/* Workspace */}
                        <div className="w-[400px] flex flex-col min-h-0 bg-card/20 border-l border-white/5 relative">
                            <div className="shrink-0 flex items-center px-4 h-14 border-b border-white/5 gap-4">
                                {['chat', 'notas', 'scripts', 'files'].map((tab) => (
                                    <Button key={tab} onClick={() => setActiveTab(tab)} className={`relative h-full flex items-center justify-center text-xs font-semibold uppercase tracking-wider transition-all ${activeTab === tab ? 'text-primary-400 shadow-[0_4px_20px_-10px_rgba(var(--primary-500),0.3)]' : 'text-muted-foreground hover:text-muted-foreground'}`}>
                                        {tab === 'notas' ? 'Notas' : tab === 'chat' ? 'Chat IA' : tab === 'scripts' ? 'Scripts' : 'Arquivos'}
                                        {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 shadow-[0_0_15px_rgba(var(--primary-500),0.8)]" />}
                                    </Button>
                                ))}
                            </div>

                            {activeTab === 'notas' && <NotesTab notes={notes} isLoading={isNotesLoading} isSaving={createNote.isPending} note={note} onNoteChange={setNote} onSubmit={handleNoteSubmit} onDelete={(id) => deleteNote.mutate(id)} />}
                            {activeTab === 'scripts' && <ScriptsTab scripts={scripts} isLoading={isScriptsLoading} contactName={contact?.name} dealTitle={deal.title} currentStageLabel={currentStage?.label} applyVariables={applyVariables} getCategoryInfo={getCategoryInfo} onOpenEditor={(script) => { setEditingScript(script as ScriptFormData | null); setIsScriptEditorOpen(true); }} onDelete={(id) => deleteScript.mutate(id)} onNoteChange={setNote} />}
                            {activeTab === 'files' && <FilesTab files={files} isLoading={isFilesLoading} isUploading={uploadFile.isPending} formatFileSize={formatFileSize} onUpload={(file) => uploadFile.mutateAsync(file)} onDownload={downloadFile} onDelete={(fileId, filePath) => deleteFile.mutate({ fileId, filePath })} />}
                            {activeTab === 'chat' && (
                                <div className="flex-1 min-h-0 bg-background overflow-hidden">
                                    <React.Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 size={24} className="animate-spin text-primary-500" /></div>}>
                                        <AIAssistant isOpen={true} onClose={() => setActiveTab('notas')} variant="sidebar" activeBoard={board} dealId={deal.id} contactId={contact?.id} cockpitSnapshot={cockpitSnapshot} contextMode="props-only" />
                                    </React.Suspense>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>

            <CallModal isOpen={isCallModalOpen} onClose={() => setIsCallModalOpen(false)} onSave={handleCallLogSave} contactName={contact?.name || 'Contato'} contactPhone={contact?.phone || ''} suggestedTitle={callSuggestedTitle} />
            <ScriptEditorModal isOpen={isScriptEditorOpen} onClose={() => { setIsScriptEditorOpen(false); setEditingScript(null); }} onSave={async (scriptData) => { if (editingScript?.id) { await updateScript.mutateAsync({ scriptId: editingScript.id, input: { title: scriptData.title, category: scriptData.category, template: scriptData.template, icon: scriptData.icon } }); } else { await createScript.mutateAsync({ title: scriptData.title, category: scriptData.category, template: scriptData.template, icon: scriptData.icon }); } }} initialData={editingScript} previewVariables={{ nome: contact?.name?.split(' ')[0] || 'Cliente', empresa: 'Empresa' }} />
            <ScheduleModal isOpen={isScheduleModalOpen} onClose={() => { setIsScheduleModalOpen(false); setSchedulePrefill(null); }} onSave={handleScheduleSave} contactName={contact?.name || 'Contato'} initialType={scheduleType} initialTitle={schedulePrefill?.title} initialDescription={schedulePrefill?.description} initialDate={schedulePrefill?.date} initialTime={schedulePrefill?.time} />
            <MessageComposerModal isOpen={isMessageModalOpen} onClose={() => { setIsMessageModalOpen(false); setMessagePrefill(null); }} channel={messageChannel} contactName={contact?.name || 'Contato'} contactEmail={contact?.email} contactPhone={contact?.phone} initialSubject={messagePrefill?.subject} initialMessage={messagePrefill?.message} aiContext={{ cockpitSnapshot, nextBestAction: { action: nextBestAction.action, reason: nextBestAction.reason, actionType: nextBestAction.actionType, urgency: nextBestAction.urgency } }} />
        </>
    );
};
