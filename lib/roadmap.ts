// Shared interfaces and static data
export interface RoadmapItem {
    name: string;
    desc: string;
}

export interface RoadmapPhase {
    phase: string;
    color: string;
    items: RoadmapItem[];
}

export interface Story {
    id: string;
    title: string;
    status: string;
    progress: number;
    file: string;
}

export interface RoadmapData {
    version: string;
    generatedAt: string;
    lastCommit: string;
    migrationCount: number;
    featureModules: string[];
    stories: Story[];
    deliveryVelocity: number;
    recentCommits: { hash: string; message: string; date: string }[];
}

export const staticRoadmap: RoadmapPhase[] = [
    {
        phase: 'Proximo Passo',
        color: '#f59e0b', // var(--amber)
        items: [
            { name: 'IA Tools Avançadas (QV-1.4)', desc: 'Busca por property_ref, tags e custom fields via IA (Em Desenvolvimento)' },
            { name: 'Lead Score Configuravel', desc: 'Sistema de pesos ajustaveis por organizacao — Cada fator com peso proprio (Story TD-5)' },
            { name: 'Deal Modal Fixes (QV-1.5)', desc: 'Edicao inline, navegacao direta e criacao de produtos no modal' },
            { name: 'Prospecting Fila & Metas (QV-1.7)', desc: 'Validacao de limites, duplicatas e metas individuais por corretor' },
            { name: 'Settings & Modais Polish (QV-1.8)', desc: 'Correcoes de z-index (toasts), ESC stack e edicao de tags' },
        ]
    },
    {
        phase: 'Planejado',
        color: '#60a5fa', // var(--accent-soft)
        items: [
            { name: 'Prospeccao com IA v3 (CP-3)', desc: 'IA sugere quem ligar e quando baseado em lead score e heatmap' },
            { name: 'Modulo de Imoveis', desc: 'Cadastro completo com matching automatico entre imovel e perfil do cliente' },
            { name: 'Permissoes Avancadas', desc: 'Niveis customizaveis de acesso, cadeia de diretores e departamentos' },
            { name: 'Dashboard Customizavel', desc: 'Cada nivel com suas proprias metricas (corretor, diretor, master)' },
            { name: 'IA de Perfil de Interesse', desc: 'Campo unico com input natural para a IA criar o perfil de busca' },
            { name: 'Integracoes com Portais', desc: 'Conexao direta com Orulo, ChavesNaMao e portais imobiliarios' },
            { name: 'Calculadora de Comissao', desc: 'Calculo automatico de comissao por deal, produto e corretor' },
        ]
    },
    {
        phase: 'Concluido',
        color: '#10b981', // var(--green)
        items: [
            { name: 'Real-time Sync Board (QV-1.1)', desc: 'Sincronizacao em tempo real do kanban, contatos e deals (Bug #1, #17, #18, #19)' },
            { name: 'Custom Error Pages (QV-1.2)', desc: 'Paginas de erro 404/500 personalizadas e integradas ao layout global' },
            { name: 'Chat IA Mobile Responsivo (QV-1.3)', desc: 'Ajuste de viewport e input acima do BottomNav (Bug #23, #24)' },
            { name: 'Blindagem Tecnica & Qualidade II', desc: 'Testes E2E, regressao visual, design tokens e seguranca RLS validados (TD-4.1)' },
            { name: 'CRM Base Completo', desc: 'Board de vendas, contatos, atividades, dashboard, negocios — toda a fundacao' },
            { name: 'Central de Prospeccao', desc: 'Power Dialer with filas de ligacao, scripts guiados e recontato automatico' },
            { name: 'Metricas de Prospeccao', desc: 'Dashboard de produtividade com visao individual e por equipe' },
            { name: 'Assistente IA', desc: 'Chat inteligente que conhece seus negocios, contatos e sugere acoes' },
            { name: 'Importacao de Leads', desc: 'Importacao em massa com mapeamento de campos e validacao automatica' },
            { name: 'Edicao Completa de Contatos', desc: 'Todos os campos editaveis inline com ordenacao por qualquer coluna' },
            { name: 'Card de Negocio Compacto', desc: 'Redesign do card no board — de 8 linhas para 3, mais limpo e rapido' },
            { name: 'Atividades Flexiveis', desc: 'Independencia de negocios, correcoes de selecao e melhoria de fluxo' },
        ]
    },
];
