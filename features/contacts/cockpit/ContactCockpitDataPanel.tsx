'use client';

import React from 'react';
import {
  Flame,
  Snowflake,
  Thermometer,
  Phone as PhoneIcon,
  MessageCircle,
  MapPin,
  Mail,
  User,
  Tag,
  Home,
  DollarSign,
  Search,
} from 'lucide-react';
import { Panel, Chip } from '@/features/deals/cockpit/cockpit-ui';
import { formatCurrencyBRL } from '@/features/deals/cockpit/cockpit-utils';
import type { Contact, ContactPhone, ContactPreference } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

const CLASSIFICATION_LABELS: Record<string, string> = {
  COMPRADOR: 'Comprador',
  VENDEDOR: 'Vendedor',
  LOCATARIO: 'Locatario',
  LOCADOR: 'Locador',
  INVESTIDOR: 'Investidor',
  PERMUTANTE: 'Permutante',
};

const SOURCE_LABELS: Record<string, string> = {
  WEBSITE: 'Website',
  LINKEDIN: 'LinkedIn',
  REFERRAL: 'Indicacao',
  MANUAL: 'Manual',
};

const URGENCY_LABELS: Record<string, string> = {
  IMMEDIATE: 'Imediata',
  '3_MONTHS': '3 meses',
  '6_MONTHS': '6 meses',
  '1_YEAR': '1 ano',
};

const PURPOSE_LABELS: Record<string, string> = {
  MORADIA: 'Moradia',
  INVESTIMENTO: 'Investimento',
  VERANEIO: 'Veraneio',
};

// ---------------------------------------------------------------------------
// Temperature Badge
// ---------------------------------------------------------------------------

function TemperatureBadge({ temperature }: { temperature?: string }) {
  if (temperature === 'HOT') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-red-500/15 px-3 py-2 ring-1 ring-red-500/20">
        <Flame className="h-5 w-5 text-red-400" />
        <div>
          <div className="text-xs font-bold text-red-300">Quente</div>
          <div className="text-[10px] text-red-400/70">Alta prioridade</div>
        </div>
      </div>
    );
  }
  if (temperature === 'COLD') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-blue-500/15 px-3 py-2 ring-1 ring-blue-500/20">
        <Snowflake className="h-5 w-5 text-blue-400" />
        <div>
          <div className="text-xs font-bold text-blue-300">Frio</div>
          <div className="text-[10px] text-blue-400/70">Baixa prioridade</div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-xl bg-amber-500/15 px-3 py-2 ring-1 ring-amber-500/20">
      <Thermometer className="h-5 w-5 text-amber-400" />
      <div>
        <div className="text-xs font-bold text-amber-300">Morno</div>
        <div className="text-[10px] text-amber-400/70">Prioridade media</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ContactCockpitDataPanelProps {
  contact: Contact;
  phones: ContactPhone[];
  preferences: ContactPreference | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContactCockpitDataPanel({
  contact,
  phones,
  preferences,
}: ContactCockpitDataPanelProps) {
  return (
    <div className="flex min-h-0 flex-col gap-4 overflow-auto pr-1">
      {/* Temperature */}
      <TemperatureBadge temperature={contact.temperature} />

      {/* Main Data */}
      <Panel
        title="Dados"
        icon={<User className="h-4 w-4 text-slate-300" />}
      >
        <div className="space-y-2 text-xs">
          {contact.cpf && (
            <Row label="CPF" value={formatCPF(contact.cpf)} />
          )}
          <Row label="Email" value={contact.email || '\u2014'} />
          <Row label="Telefone" value={contact.phone || '\u2014'} />
          <Row
            label="Classificacao"
            value={CLASSIFICATION_LABELS[contact.classification || ''] || '\u2014'}
          />
          <Row
            label="Tipo"
            value={contact.contactType === 'PJ' ? 'Pessoa Juridica' : 'Pessoa Fisica'}
          />
          <Row
            label="Origem"
            value={SOURCE_LABELS[contact.source || ''] || '\u2014'}
          />
          <Row label="Status" value={contact.status || '\u2014'} />
          {(contact.addressCep || contact.addressCity || contact.addressState) && (
            <Row
              label="Endereco"
              value={[contact.addressCep, contact.addressCity, contact.addressState]
                .filter(Boolean)
                .join(' - ')}
            />
          )}
        </div>
      </Panel>

      {/* Phones */}
      {phones.length > 0 && (
        <Panel
          title="Telefones"
          icon={<PhoneIcon className="h-4 w-4 text-slate-300" />}
        >
          <div className="space-y-2">
            {phones.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {p.isWhatsapp && (
                    <MessageCircle className="h-3.5 w-3.5 shrink-0 text-green-400" />
                  )}
                  <span className="font-mono text-slate-200 truncate">
                    {p.phoneNumber}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-slate-500">{p.phoneType}</span>
                  {p.isPrimary && (
                    <Chip tone="success">Principal</Chip>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Preferences */}
      {preferences && (
        <Panel
          title="Preferencias"
          icon={<Search className="h-4 w-4 text-slate-300" />}
        >
          <div className="space-y-2 text-xs">
            {preferences.propertyTypes.length > 0 && (
              <Row
                label="Tipos"
                value={preferences.propertyTypes.join(', ')}
              />
            )}
            {preferences.purpose && (
              <Row
                label="Finalidade"
                value={PURPOSE_LABELS[preferences.purpose] || preferences.purpose}
              />
            )}
            {(preferences.priceMin != null || preferences.priceMax != null) && (
              <Row
                label="Faixa"
                value={`${preferences.priceMin != null ? formatCurrencyBRL(preferences.priceMin) : '\u2014'} ~ ${preferences.priceMax != null ? formatCurrencyBRL(preferences.priceMax) : '\u2014'}`}
              />
            )}
            {preferences.regions.length > 0 && (
              <Row label="Regioes" value={preferences.regions.join(', ')} />
            )}
            {preferences.bedroomsMin != null && (
              <Row label="Quartos min" value={String(preferences.bedroomsMin)} />
            )}
            {preferences.parkingMin != null && (
              <Row label="Vagas min" value={String(preferences.parkingMin)} />
            )}
            {preferences.areaMin != null && (
              <Row label="Area min" value={`${preferences.areaMin} m\u00B2`} />
            )}
            {preferences.urgency && (
              <Row
                label="Urgencia"
                value={URGENCY_LABELS[preferences.urgency] || preferences.urgency}
              />
            )}
            {preferences.acceptsFinancing != null && (
              <Row
                label="Financiamento"
                value={preferences.acceptsFinancing ? 'Sim' : 'Nao'}
              />
            )}
            {preferences.acceptsFgts != null && (
              <Row label="FGTS" value={preferences.acceptsFgts ? 'Sim' : 'Nao'} />
            )}
            {preferences.notes && (
              <div className="mt-1 text-[11px] text-slate-400 italic">
                {preferences.notes}
              </div>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row helper
// ---------------------------------------------------------------------------

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-200 truncate text-right">{value}</span>
    </div>
  );
}
