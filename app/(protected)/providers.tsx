'use client'

import React from 'react'
import { usePathname } from 'next/navigation'

import { QueryProvider } from '@/lib/query'
import { ToastProvider } from '@/context/ToastContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider } from '@/context/AuthContext'
import { SettingsProvider } from '@/context/settings/SettingsContext'
import { BoardsProvider } from '@/context/boards/BoardsContext'
import { ContactsProvider } from '@/context/contacts/ContactsContext'
import { ActivitiesProvider } from '@/context/activities/ActivitiesContext'
import { AIProvider } from '@/context/AIContext'
import Layout from '@/components/Layout'

type ProviderComponent = React.FC<{ children: React.ReactNode }>

function composeProviders(...providers: ProviderComponent[]): ProviderComponent {
    const Composed = providers.reduce<ProviderComponent>(
        (Accumulated, Current) => {
            const Wrapper: ProviderComponent = ({ children }) => (
                <Accumulated>
                    <Current>{children}</Current>
                </Accumulated>
            )
            Wrapper.displayName = `Composed(${Current.displayName || Current.name || 'Provider'})`
            return Wrapper
        },
        ({ children }) => <>{children}</>,
    )
    Composed.displayName = 'ComposedProviders'
    return Composed
}

const ComposedProviders = composeProviders(
    QueryProvider,
    ToastProvider,
    ThemeProvider,
    AuthProvider,
    SettingsProvider,
    BoardsProvider,
    ContactsProvider,
    ActivitiesProvider,
    AIProvider,
)

export function Providers({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const isSetupRoute = pathname === '/setup'
    const shouldUseAppShell = !isSetupRoute

    return (
        <ComposedProviders>
            {shouldUseAppShell ? <Layout>{children}</Layout> : children}
        </ComposedProviders>
    )
}
