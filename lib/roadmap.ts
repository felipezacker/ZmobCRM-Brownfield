import { ROADMAP_PHASE_COLORS } from '@/lib/design-tokens';

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

export interface Milestone {
    label: string;
    status: 'done' | 'current' | 'future';
    sub: string;
}

export interface BusinessMetrics {
    activeUsers: string;
    targetMarket: string;
    competitiveEdge: string;
    teamSize: string;
}

export interface BrandVision {
    tagline: string;
    archetypes: { name: string; desc: string }[];
    positioning: string;
    aesthetic: string;
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
    businessMetrics: BusinessMetrics;
    brandVision: BrandVision;
    milestones: Milestone[];
}

export const staticBusinessMetrics: BusinessMetrics = {
    activeUsers: '3 imobiliarias',
    targetMarket: 'Imobiliarias de medio e alto porte no Brasil',
    competitiveEdge: 'IA integrada + Prospeccao ativa — unico CRM imobiliario com Power Dialer e assistente inteligente nativos',
    teamSize: 'Equipe enxuta com desenvolvimento acelerado por IA',
};

export const staticBrandVision: BrandVision = {
    tagline: 'Pare de digitar. Comece a vender.',
    archetypes: [
        { name: 'O Mago', desc: 'IA que transforma dados em acao — analisa negocios, gera scripts e preve resultados' },
        { name: 'O Heroi', desc: 'Performance implacavel — Power Dialer, metas diarias, metricas que empurram a venda' },
        { name: 'O Sabio', desc: 'Dados precisos sem achismo — Lead Score, Dashboard, historico completo de cada cliente' },
    ],
    positioning: 'Nao somos o CRM amigavel. Somos a arma secreta do corretor de alta performance.',
    aesthetic: 'Minimalista. Dark premium. Precisao de instrumentos cirurgicos.',
};

export const staticMilestones: Milestone[] = [
    { label: 'CRM Base', status: 'done', sub: 'Completo' },
    { label: 'Seguranca & RBAC', status: 'done', sub: 'Completo' },
    { label: 'Prospeccao v1', status: 'done', sub: 'Completo' },
    { label: 'Prospeccao v2', status: 'done', sub: 'Completo' },
    { label: 'Qualidade & Estabilidade', status: 'done', sub: 'Completo' },
    { label: 'Prospecção IA', status: 'current', sub: 'Fase CP-3' },
    { label: 'Imoveis', status: 'future', sub: 'Planejado' },
    { label: 'Integracoes', status: 'future', sub: 'Futuro' },
];

export const staticRoadmap: RoadmapPhase[] = [
    {
        phase: 'Proximo Passo',
        color: ROADMAP_PHASE_COLORS.next,
        items: [
            { name: 'Prospeccao com IA v3 (CP-3)', desc: 'IA sugere quem ligar e quando baseado em lead score e heatmap' },
            { name: 'Módulo de Imóveis (Beta)', desc: 'Cadastro inicial e property_ref integrado ao Board e IA' },
        ]
    },
    {
        phase: 'Planejado',
        color: ROADMAP_PHASE_COLORS.planned,
        items: [
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
        color: ROADMAP_PHASE_COLORS.completed,
        items: [
            { name: 'Real-time Sync Board (QV-1.1)', desc: 'Sincronização em tempo real do kanban, contatos e deals (Bug #1, #17, #18, #19)' },
            { name: 'Custom Error Pages (QV-1.2)', desc: 'Páginas de erro 404/500 personalizadas e integradas ao layout global' },
            { name: 'Chat IA Mobile Responsivo (QV-1.3)', desc: 'Ajuste de viewport e input acima do BottomNav (Bug #23, #24)' },
            { name: 'IA Tools: Property Ref & Filtros (QV-1.4)', desc: 'Busca por imovel, tags e custom fields via linguagem natural (Bug #10, #11, #12, #13)' },
            { name: 'Deal Modal Evolution (QV-1.5)', desc: 'Edicao inline, navegacao direta e vinculacao de produtos (Bug #2, #4, #11 UI)' },
            { name: 'WhatsApp End-to-End (QV-1.6)', desc: 'Tipo WHATSAPP integrado em toda a plataforma, IA e filtros (Bug #5, #14)' },
            { name: 'Fila de Prospecção & Metas (QV-1.7)', desc: 'Limites de fila, prevenção de duplicatas e metas individuais por corretor (Bug #6, #7, #8, #9)' },
            { name: 'UX Polish & Estabilidade (QV-1.8)', desc: 'Correções de z-index, ESC stack, toasts e refinamento de modais (Bug #3, #15, #16, #21, #22)' },
            { name: 'Blindagem Técnica & Qualidade II', desc: 'Testes E2E, regressão visual e segurança RLS validados (TD-4.1)' },
            { name: 'CRM Base Completo', desc: 'Board de vendas, contatos, atividades, dashboard, negocios — toda a fundação' },
            { name: 'Central de Prospecção', desc: 'Power Dialer com filas de ligacao, scripts guiados e recontato automatico' },
            { name: 'Métricas de Prospecção', desc: 'Dashboard de produtividade com visao individual e por equipe' },
            { name: 'Assistente IA', desc: 'Chat inteligente que conhece seus negocios, contatos e sugere acoes' },
            { name: 'Importação de Leads', desc: 'Importação em massa com mapeamento de campos e validacao automatica' },
            { name: 'Edição Completa de Contato', desc: 'Todos os campos editáveis inline com ordenação por qualquer coluna' },
            { name: 'Card de Negocio Compacto', desc: 'Redesign do card no board — mais limpo e rápido' },
            { name: 'Atividades Flexíveis', desc: 'Independência de negócios, correcoes de selecao e melhoria de fluxo' },
        ]
    },
];
