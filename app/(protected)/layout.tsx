import { Providers } from './providers'

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <Providers>{children}</Providers>
}

