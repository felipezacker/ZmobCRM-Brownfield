import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUIStore } from '@/lib/stores';
import { useAuth } from '@/context/AuthContext';
import { isDebugMode, enableDebugMode, disableDebugMode } from '@/lib/debug';
import { SkipLink } from '@/lib/a11y';
import { useResponsiveMode } from '@/hooks/useResponsiveMode';
import { BottomNav, MoreMenuSheet, NavigationRail } from '@/components/navigation';
import { useRealtimeSyncAll } from '@/lib/realtime/useRealtimeSync';
import { UIChat } from './ai/UIChat';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isGlobalAIOpen, setIsGlobalAIOpen, sidebarOpen, setSidebarOpen } = useUIStore();
  const sidebarCollapsed = !sidebarOpen;
  const setSidebarCollapsed = (collapsed: boolean) => setSidebarOpen(!collapsed);
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { mode } = useResponsiveMode();
  const isMobile = mode === 'mobile';
  const isTablet = mode === 'tablet';
  const isDesktop = mode === 'desktop';
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(false);

  // Global realtime subscription — single channel for all CRM tables (RT-0.4)
  useRealtimeSyncAll();

  useEffect(() => {
    setDebugEnabled(isDebugMode());
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const width =
      isDesktop ? (sidebarCollapsed ? '5rem' : '13rem')
        : isTablet ? '5rem'
          : '0px';
    document.documentElement.style.setProperty('--app-sidebar-width', width);
  }, [isDesktop, isTablet, sidebarCollapsed]);

  useEffect(() => {
    return () => {
      if (typeof document === 'undefined') return;
      document.documentElement.style.setProperty('--app-sidebar-width', '0px');
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--app-bottom-nav-height', isMobile ? '56px' : '0px');
  }, [isMobile]);

  // Virtual keyboard + BottomNav offset for chat aside (AC1, AC2, AC3)
  useEffect(() => {
    if (typeof document === 'undefined' || !isMobile) {
      document.documentElement.style.setProperty('--app-chat-bottom-offset', '0px');
      return;
    }

    const NAV_HEIGHT = 56;

    const updateOffset = () => {
      const keyboardOffset = window.visualViewport
        ? window.innerHeight - window.visualViewport.height
        : 0;
      const offset = Math.max(keyboardOffset, NAV_HEIGHT);
      document.documentElement.style.setProperty('--app-chat-bottom-offset', `${offset}px`);
    };

    updateOffset();

    window.visualViewport?.addEventListener('resize', updateOffset);
    return () => {
      window.visualViewport?.removeEventListener('resize', updateOffset);
      document.documentElement.style.setProperty('--app-chat-bottom-offset', '0px');
    };
  }, [isMobile]);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  const [clickedPath, setClickedPath] = useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (clickedPath) {
      const isNowActive = pathname === clickedPath ||
        (clickedPath === '/boards' && pathname === '/pipeline') ||
        (clickedPath === '/pipeline' && pathname === '/boards');

      if (isNowActive) {
        setClickedPath(undefined);
      }
    }
  }, [pathname, clickedPath]);

  const toggleDebugMode = () => {
    if (debugEnabled) {
      disableDebugMode();
      setDebugEnabled(false);
    } else {
      enableDebugMode();
      setDebugEnabled(true);
    }
  };

  if (!loading && !user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SkipLink targetId="main-content" />

      {/* Tablet rail */}
      <div className="hidden md:flex lg:hidden">
        <NavigationRail />
      </div>

      {/* Desktop sidebar spacer — maintains flow space while sidebar is fixed */}
      <div className={`hidden lg:block shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-52'}`} />

      {/* Desktop sidebar — fixed for hover-to-expand overlay */}
      <AppSidebar
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        clickedPath={clickedPath}
        onItemClick={setClickedPath}
      />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex min-w-0 overflow-hidden relative isolate">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0" aria-hidden="true">
            <div className="grain"></div>
          </div>

          <AppHeader
            isGlobalAIOpen={isGlobalAIOpen}
            onToggleAI={() => setIsGlobalAIOpen(!isGlobalAIOpen)}
            debugEnabled={debugEnabled}
            onToggleDebug={toggleDebugMode}
          />

          <main
            id="main-content"
            className="flex-1 overflow-y-auto overflow-x-hidden p-6 pb-[calc(1.5rem+var(--app-bottom-nav-height,0px)+var(--app-safe-area-bottom,0px))] relative scroll-smooth"
            tabIndex={-1}
          >
            {children}
          </main>
        </div>

        {/* Right Sidebar (AI Assistant) */}
        <aside
          aria-label="Assistente de IA"
          aria-hidden={!isGlobalAIOpen}
          className={`border-l border-[var(--color-border)] bg-surface transition-[width,opacity] duration-300 ease-in-out overflow-hidden flex flex-col pb-[var(--app-chat-bottom-offset,0px)] ${isGlobalAIOpen ? 'w-96 opacity-100' : 'w-0 opacity-0'}`}
        >
          <div className="w-96 flex-1 min-h-0">
            {isGlobalAIOpen && <UIChat />}
          </div>
        </aside>
      </div>

      {/* Mobile app shell */}
      <BottomNav onOpenMore={() => setIsMoreOpen(true)} />
      <MoreMenuSheet isOpen={isMoreOpen} onClose={() => setIsMoreOpen(false)} />
    </div>
  );
};

export default Layout;
