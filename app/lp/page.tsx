import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ZmobCRM — O CRM Imobiliario com Inteligencia Artificial',
  description: 'O primeiro CRM imobiliario que pensa junto com voce. IA multi-provider integrada ao seu pipeline de vendas.',
}

export default function LandingPage() {
  return (
    <iframe
      src="/lp-zinc-neutral.html"
      title="ZmobCRM Landing Page — Zinc Neutral"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        border: 'none',
        zIndex: 9999,
      }}
    />
  )
}
