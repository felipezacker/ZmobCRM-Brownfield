'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Building2, Save, Loader2 } from 'lucide-react'
import { SettingsSection } from '@/features/settings/components/SettingsSection'
import { InputField } from '@/components/ui/FormField'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'

interface CompanyData {
  name: string
  cnpj: string
  creci: string
  phone: string
}

export function CompanySettings() {
  const { profile, organizationId } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [data, setData] = useState<CompanyData>({ name: '', cnpj: '', creci: '', phone: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCompany = useCallback(async () => {
    if (!organizationId) return
    const supabase = createClient()
    if (!supabase) return
    setLoading(true)
    const { data: org } = await supabase
      .from('organizations')
      .select('name, cnpj, creci, phone')
      .eq('id', organizationId)
      .single()
    if (org) {
      setData({
        name: org.name || '',
        cnpj: org.cnpj || '',
        creci: org.creci || '',
        phone: org.phone || '',
      })
    }
    setLoading(false)
  }, [organizationId])

  useEffect(() => {
    loadCompany()
  }, [loadCompany])

  const handleSave = async () => {
    if (!organizationId || !isAdmin) return
    const supabase = createClient()
    if (!supabase) return
    setSaving(true)
    setError(null)
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        name: data.name.trim(),
        cnpj: data.cnpj.trim() || null,
        creci: data.creci.trim() || null,
        phone: data.phone.trim() || null,
      })
      .eq('id', organizationId)
    setSaving(false)
    if (updateError) {
      setError('Erro ao salvar. Tente novamente.')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const handleChange = (field: keyof CompanyData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setData((prev) => ({ ...prev, [field]: e.target.value }))
    setSaved(false)
    setError(null)
  }

  return (
    <div className="pb-10">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Empresa</h2>
        <p className="text-muted-foreground text-sm mt-1">Dados da sua organizacao.</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
      <SettingsSection title="Dados da Empresa" icon={Building2}>
        <div className="space-y-4 mt-4">
          <InputField
            label="Nome da Empresa"
            value={data.name}
            onChange={handleChange('name')}
            placeholder="Nome da empresa"
            disabled={!isAdmin}
          />
          <InputField
            label="CNPJ"
            value={data.cnpj}
            onChange={handleChange('cnpj')}
            placeholder="00.000.000/0000-00"
            disabled={!isAdmin}
          />
          <InputField
            label="CRECI"
            value={data.creci}
            onChange={handleChange('creci')}
            placeholder="CRECI da imobiliaria"
            disabled={!isAdmin}
          />
          <InputField
            label="Telefone"
            value={data.phone}
            onChange={handleChange('phone')}
            placeholder="(00) 00000-0000"
            disabled={!isAdmin}
          />
          {isAdmin && (
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar
              </Button>
              {saved && (
                <span className="text-sm text-green-600 dark:text-green-400">Salvo com sucesso!</span>
              )}
              {error && (
                <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
              )}
            </div>
          )}
        </div>
      </SettingsSection>
      )}
    </div>
  )
}

export default CompanySettings
