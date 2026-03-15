'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { hasMinRole, type Role } from '@/lib/auth/roles'
import {
  Settings,
  Package,
  Plug,
  Sparkles,
  Database,
  Users,
  UserCircle,
  GitBranch,
  Menu,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SidebarItem {
  label: string
  href: string
  icon: LucideIcon
  minRole?: Role
}

const sidebarItems: SidebarItem[] = [
  { label: 'Meu Perfil', href: '/settings/profile', icon: UserCircle },
  { label: 'Geral', href: '/settings', icon: Settings },
  { label: 'Produtos/Serviços', href: '/settings/products', icon: Package, minRole: 'admin' },
  { label: 'Ciclos de Vida', href: '/settings/lifecycle', icon: GitBranch, minRole: 'admin' },
  { label: 'Integrações', href: '/settings/integracoes', icon: Plug, minRole: 'admin' },
  { label: 'Central de I.A', href: '/settings/ai', icon: Sparkles },
  { label: 'Dados', href: '/settings/data', icon: Database },
  { label: 'Equipe', href: '/settings/equipe', icon: Users, minRole: 'diretor' },
]

export function SettingsSidebar() {
  const pathname = usePathname()
  const { profile } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  const userRole = profile?.role as Role | undefined

  const visibleItems = sidebarItems.filter((item) => {
    if (!item.minRole) return true
    if (!userRole) return false
    return hasMinRole(userRole, item.minRole)
  })

  const isActive = (href: string) => {
    if (href === '/settings') {
      return pathname === '/settings' || pathname === '/settings/'
    }
    return pathname?.startsWith(href) ?? false
  }

  return (
    <>
      {/* Mobile toggle */}
      <Button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="block md:hidden mb-4 p-2 rounded-lg border border-border bg-white dark:bg-white/5 text-foreground"
        aria-label={isOpen ? 'Fechar menu de configurações' : 'Abrir menu de configurações'}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar nav */}
      <nav
        aria-label="Configurações"
        className={`${isOpen ? 'block' : 'hidden'} md:block w-full md:w-56 shrink-0`}
      >
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const active = isActive(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary-500/10 text-primary-700 dark:text-primary-300'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-white/5'
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
