import React from 'react';
import { Phone, Mail, Copy } from 'lucide-react';
import type { Contact } from '@/types';
import { Button } from '@/components/ui/button';

interface ContactInfoCardProps {
    contact: Contact;
}

export const ContactInfoCard: React.FC<ContactInfoCardProps> = ({ contact }) => {
    return (
        <div className="p-4 border-b border-dark-border">
            <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-lg shrink-0">
                    {contact.name?.charAt(0).toUpperCase() || '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-foreground truncate">{contact.name}</h4>
                    </div>

                    {/* Contact details grid */}
                    <div className="mt-2 grid grid-cols-1 gap-1.5">
                        {contact.phone && (
                            <Button
                                onClick={() => navigator.clipboard.writeText(contact.phone || '')}
                                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-green-400 transition-colors group"
                            >
                                <Phone size={12} className="text-secondary-foreground group-hover:text-green-400 shrink-0" />
                                <span className="truncate">{contact.phone}</span>
                                <Copy size={10} className="opacity-0 group-hover:opacity-100 ml-auto shrink-0" />
                            </Button>
                        )}

                        {contact.email && (
                            <Button
                                onClick={() => navigator.clipboard.writeText(contact.email || '')}
                                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-cyan-400 transition-colors group"
                            >
                                <Mail size={12} className="text-secondary-foreground group-hover:text-cyan-400 shrink-0" />
                                <span className="truncate">{contact.email}</span>
                                <Copy size={10} className="opacity-0 group-hover:opacity-100 ml-auto shrink-0" />
                            </Button>
                        )}
                    </div>

                    {/* Extra info */}
                    <div className="mt-2 flex flex-wrap gap-2">
                        {contact.source && (
                            <span className="text-2xs px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
                                {contact.source}
                            </span>
                        )}
                        {contact.status && (
                            <span className={`text-2xs px-1.5 py-0.5 rounded border ${contact.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                contact.status === 'INACTIVE' ? 'bg-accent/10 text-muted-foreground border-border/20' :
                                    'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}>
                                {contact.status === 'ACTIVE' ? 'Ativo' : contact.status === 'INACTIVE' ? 'Inativo' : 'Churned'}
                            </span>
                        )}
                        {contact.totalValue && contact.totalValue > 0 && (
                            <span className="text-2xs px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
                                LTV: R$ {contact.totalValue.toLocaleString('pt-BR')}
                            </span>
                        )}
                    </div>

                    {/* Notes preview */}
                    {contact.notes && (
                        <p className="mt-2 text-1xs text-muted-foreground line-clamp-2 italic">
                            &quot;{contact.notes}&quot;
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
