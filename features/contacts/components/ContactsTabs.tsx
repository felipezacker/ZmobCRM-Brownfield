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
        <div className="border-b border-slate-200 dark:border-white/10">
            <div className="flex gap-6">
                <div
                    className="flex items-center gap-2 pb-3 text-sm font-bold border-b-2 border-primary-500 text-primary-600 dark:text-white"
                >
                    <User size={16} /> Pessoas
                    <span className="ml-1 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs">
                        {contactsCount}
                    </span>
                </div>
            </div>
        </div>
    );
};
