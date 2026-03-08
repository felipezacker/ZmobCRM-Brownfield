import React from 'react';
import { Sparkles } from 'lucide-react';
import type { Deal, Contact } from '@/types';

interface DealInfoCardProps {
    deal: Deal;
    contact?: Contact;
}

export const DealInfoCard: React.FC<DealInfoCardProps> = ({ deal, contact }) => {
    return (
        <div className="p-4 border-b border-dark-border">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-secondary-foreground uppercase tracking-wider font-semibold">Negocio</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${deal.priority === 'high' ? 'bg-red-500/10 text-red-400' :
                    deal.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-accent/10 text-muted-foreground'
                    }`}>
                    {deal.priority === 'high' ? 'Alta' : deal.priority === 'medium' ? 'Media' : 'Baixa'}
                </span>
            </div>

            <h4 className="text-sm font-semibold text-white mb-2">{deal.title}</h4>

            <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                    <span className="text-secondary-foreground">Valor</span>
                    <p className="text-emerald-400 font-semibold">
                        R$ {deal.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div>
                    <span className="text-secondary-foreground">Probabilidade</span>
                    <p className="text-muted-foreground font-semibold">{deal.probability || 50}%</p>
                </div>
                <div>
                    <span className="text-secondary-foreground">Criado em</span>
                    <p className="text-muted-foreground">
                        {new Date(deal.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                </div>
                <div>
                    <span className="text-secondary-foreground">Atualizado</span>
                    <p className="text-muted-foreground">
                        {new Date(deal.updatedAt).toLocaleDateString('pt-BR')}
                    </p>
                </div>
            </div>

            {/* Tags */}
            {contact?.tags && contact.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                    {contact.tags.slice(0, 4).map((tag: string, i: number) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 bg-primary-500/10 text-primary-400 rounded">
                            #{tag}
                        </span>
                    ))}
                    {contact.tags.length > 4 && (
                        <span className="text-[10px] text-muted-foreground">+{contact.tags.length - 4}</span>
                    )}
                </div>
            )}

            {/* AI Summary */}
            {deal.aiSummary && (
                <div className="mt-2 p-2 bg-card/50 rounded-lg border border-border/50">
                    <div className="flex items-center gap-1 mb-1">
                        <Sparkles size={10} className="text-primary-400" />
                        <span className="text-[10px] text-primary-400 font-medium">Resumo IA</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{deal.aiSummary}</p>
                </div>
            )}
        </div>
    );
};
