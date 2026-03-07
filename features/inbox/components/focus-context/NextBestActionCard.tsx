import React from 'react';
import {
    Zap,
    Sparkles,
    RefreshCw,
    MessageCircle,
    Phone,
    Mail,
    Calendar,
    Target,
    ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { NextBestAction, NBAActionMode } from './types';

interface NextBestActionCardProps {
    nextBestAction: NextBestAction;
    onRefresh: () => void;
    onAction: (overrideType?: string, mode?: NBAActionMode) => void;
}

export const NextBestActionCard: React.FC<NextBestActionCardProps> = ({
    nextBestAction,
    onRefresh,
    onAction,
}) => {
    const actionButtons = [
        { type: 'WHATSAPP', icon: MessageCircle, label: 'WhatsApp', color: 'text-green-400 hover:bg-green-500/20' },
        { type: 'CALL', icon: Phone, label: 'Ligar', color: 'text-yellow-400 hover:bg-yellow-500/20' },
        { type: 'EMAIL', icon: Mail, label: 'Email', color: 'text-blue-400 hover:bg-blue-500/20' },
        { type: 'MEETING', icon: Calendar, label: 'Reuniao', color: 'text-purple-400 hover:bg-purple-500/20' },
        { type: 'TASK', icon: Target, label: 'Tarefa', color: 'text-slate-400 hover:bg-slate-500/20' },
    ];

    return (
        <div className={`p-4 border-b border-dark-border ${nextBestAction.urgency === 'high' ? 'bg-red-950/20' : nextBestAction.urgency === 'medium' ? 'bg-yellow-950/20' : 'bg-slate-900/30'}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Zap size={14} className={`${nextBestAction.urgency === 'high' ? 'text-red-400' : nextBestAction.urgency === 'medium' ? 'text-yellow-400' : 'text-primary-400'}`} />
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Proxima Acao</span>
                    {nextBestAction.isAI && (
                        <span className="text-[10px] bg-primary-500/20 text-primary-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Sparkles size={9} /> AI
                        </span>
                    )}
                </div>
                <Button
                    onClick={onRefresh}
                    className="p-1.5 hover:bg-white/5 rounded text-slate-500 hover:text-slate-300 transition-colors"
                    title="Reanalisar"
                >
                    <RefreshCw size={12} />
                </Button>
            </div>

            {/* Icon + Text Block */}
            <div className="flex gap-3 mb-4">
                <div className={`p-3 rounded-xl shrink-0 ${nextBestAction.urgency === 'high' ? 'bg-red-500/15' : nextBestAction.urgency === 'medium' ? 'bg-yellow-500/15' : 'bg-primary-500/15'}`}>
                    <nextBestAction.icon size={24} className={`${nextBestAction.urgency === 'high' ? 'text-red-400' : nextBestAction.urgency === 'medium' ? 'text-yellow-400' : 'text-primary-400'}`} />
                </div>
                <div className="flex-1">
                    <p className="text-base font-semibold text-slate-100 leading-snug mb-1">
                        {nextBestAction.action}
                    </p>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        {nextBestAction.reason}
                    </p>
                </div>
            </div>

            {/* Action Icons Bar */}
            <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[10px] text-slate-600 uppercase tracking-wider">Executar como:</span>
                <div className="flex items-center gap-1">
                    {actionButtons.map(({ type, icon: Icon, label, color }) => (
                        <Button
                            key={type}
                            onClick={() =>
                                onAction(
                                    type,
                                    type === 'MEETING' || type === 'TASK' || type === 'WHATSAPP' || type === 'EMAIL'
                                        ? 'configure'
                                        : 'execute'
                                )
                            }
                            className={`p-2 rounded-lg transition-all ${color} ${nextBestAction.actionType === type ? 'bg-white/10 ring-1 ring-current' : ''}`}
                            title={label}
                        >
                            <Icon size={16} />
                        </Button>
                    ))}
                </div>
            </div>

            {/* Main Action Button */}
            <Button
                onClick={() => onAction(undefined, 'execute')}
                className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${nextBestAction.urgency === 'high'
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
                    : nextBestAction.urgency === 'medium'
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-black shadow-lg shadow-yellow-500/20'
                        : 'bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/20'
                    }`}
            >
                <nextBestAction.icon size={16} />
                Executar Agora
                <ArrowRight size={16} />
            </Button>
        </div>
    );
};
