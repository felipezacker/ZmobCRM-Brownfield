import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ZmobCRM — Status do Projeto & Roadmap',
  description: 'Acompanhe o progresso do ZmobCRM: funcionalidades ativas, roadmap de evolucao e proximos passos.',
}

export default function RoadmapPage() {
  return (
    <iframe
      src="/stakeholder-dashboard.html"
      title="ZmobCRM — Status do Projeto"
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
