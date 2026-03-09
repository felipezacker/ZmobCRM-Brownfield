import React from 'react';
import { User } from 'lucide-react';

export interface ContactsTabsProps {
    viewMode: 'people' | 'companies';
    setViewMode: (mode: 'people' | 'companies') => void;
    contactsCount: number;
}

export const ContactsTabs: React.FC<ContactsTabsProps> = ({
    contactsCount,
}) => {
    return (
        <div className="border-b border-border">
            <div className="flex gap-6">
                <div
                    className="flex items-center gap-2 pb-3 text-sm font-bold border-b-2 border-primary-500 text-primary-600"
                >
                    <User size={16} /> Pessoas
                    <span className="ml-1 bg-muted dark:bg-white/10 text-secondary-foreground dark:text-muted-foreground px-2 py-0.5 rounded-full text-xs">
                        {contactsCount}
                    </span>
                </div>
            </div>
        </div>
    );
};
