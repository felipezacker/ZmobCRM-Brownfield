'use client'

import { usePathname } from 'next/navigation'

import { QueryProvider } from '@/lib/query'
import { ToastProvider } from '@/context/ToastContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider } from '@/context/AuthContext'
import { SettingsProvider } from '@/context/settings/SettingsContext'
import { BoardsProvider } from '@/context/boards/BoardsContext'
import { ContactsProvider } from '@/context/contacts/ContactsContext'
import { ActivitiesProvider } from '@/context/activities/ActivitiesContext'
import { DealsProvider } from '@/context/deals/DealsContext'
import { AIProvider } from '@/context/AIContext'
import Layout from '@/components/Layout'

export function Providers({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const isSetupRoute = pathname === '/setup'
    const shouldUseAppShell = !isSetupRoute

    return (
        <QueryProvider>
            <ToastProvider>
                <ThemeProvider>
                    <AuthProvider>
                        <SettingsProvider>
                            <BoardsProvider>
                                <ContactsProvider>
                                    <ActivitiesProvider>
                                        <DealsProvider>
                                            <AIProvider>
                                                {shouldUseAppShell ? <Layout>{children}</Layout> : children}
                                            </AIProvider>
                                        </DealsProvider>
                                    </ActivitiesProvider>
                                </ContactsProvider>
                            </BoardsProvider>
                        </SettingsProvider>
                    </AuthProvider>
                </ThemeProvider>
            </ToastProvider>
        </QueryProvider>
    )
}
