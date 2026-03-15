'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ShieldOff, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function BlockedPage() {
    const router = useRouter()
    const supabase = createClient()

    const handleLogout = async () => {
        await supabase?.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background dark:bg-dark-bg relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-red-500/20 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] bg-orange-500/20 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-md w-full relative z-10 px-4">
                <div className="bg-white dark:bg-dark-card border border-border rounded-2xl shadow-xl p-8 backdrop-blur-sm text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
                        <ShieldOff className="h-8 w-8 text-red-500" />
                    </div>

                    <h1 className="text-2xl font-bold text-foreground font-display tracking-tight mb-3">
                        Conta desativada
                    </h1>

                    <p className="text-muted-foreground dark:text-muted-foreground mb-8">
                        Sua conta foi desativada. Contate o administrador.
                    </p>

                    <Button
                        onClick={handleLogout}
                        className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/20 transition-all active:scale-[0.98]"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Fazer Logout
                    </Button>
                </div>

                <p className="mt-8 text-center text-xs text-muted-foreground dark:text-muted-foreground">
                    &copy; {new Date().getFullYear()} CRM IA. Todos os direitos reservados.
                </p>
            </div>
        </div>
    )
}
