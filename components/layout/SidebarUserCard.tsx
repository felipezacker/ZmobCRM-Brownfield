import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { LogOut, BookOpen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

interface SidebarUserCardProps {
  collapsed: boolean;
}

export const SidebarUserCard: React.FC<SidebarUserCardProps> = ({ collapsed }) => {
  const { profile, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const userInitials = profile?.email?.substring(0, 2).toUpperCase() || 'U';

  return (
    <div className={`p-4 border-t border-[var(--color-border-subtle)] ${collapsed ? 'flex justify-center' : ''}`}>
      <div className="relative">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-3 rounded-xl bg-background/50 dark:bg-white/5 border border-border hover:bg-muted dark:hover:bg-white/10 transition-all group focus-visible-ring ${collapsed ? 'p-0 w-10 h-10 justify-center' : 'w-full p-3'}`}
        >
          {profile?.avatar_url ? (
            <Image src={profile.avatar_url} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-lg" unoptimized />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-sm ring-2 ring-white shadow-lg shrink-0" aria-hidden="true">
              {profile?.first_name && profile?.last_name
                ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
                : profile?.nickname?.substring(0, 2).toUpperCase() || userInitials}
            </div>
          )}
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-foreground truncate">
                  {profile?.nickname || profile?.first_name || profile?.email?.split('@')[0] || 'Usuario'}
                </p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground truncate">
                  {profile?.email || ''}
                </p>
              </div>
              <svg className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </>
          )}
        </Button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />
            <div className={`absolute bottom-full mb-2 z-50 bg-white dark:bg-card rounded-xl shadow-xl border border-border overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-150 ${collapsed ? 'left-0 w-48' : 'left-0 right-0'}`}>
              <div className="p-1">
                <Link href="/instructions" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm text-secondary-foreground dark:text-muted-foreground hover:bg-background dark:hover:bg-accent/50 rounded-lg transition-colors focus-visible-ring">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  Instrucoes
                </Link>
                <Button
                  onClick={() => { setIsOpen(false); signOut(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors focus-visible-ring"
                >
                  <LogOut className="w-4 h-4" />
                  Sair da conta
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
