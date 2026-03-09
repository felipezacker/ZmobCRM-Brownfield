import { execSync } from 'child_process';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();

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

export function getRoadmapData(): RoadmapData {
    const getVersion = () => {
        try {
            const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
            return pkg.version;
        } catch { return '0.0.0'; }
    };

    const getLastCommitDate = () => {
        try {
            return execSync('git log -1 --format=%ci', { cwd: ROOT, encoding: 'utf-8' }).trim();
        } catch { return new Date().toISOString(); }
    };

    const getRecentCommits = (n = 8) => {
        try {
            const raw = execSync(`git log -20 --format="%H|%s|%ci"`, { cwd: ROOT, encoding: 'utf-8' });
            return raw.trim().split('\n')
                .map(line => {
                    const [hash, message, date] = line.split('|');
                    return { hash: hash?.slice(0, 7), message, date };
                })
                .filter(c => !c.message?.startsWith('Merge '))
                .slice(0, n);
        } catch { return []; }
    };

    const getDeliveryVelocity = () => {
        try {
            const raw = execSync('git log --since="30 days ago" --no-merges --oneline', { cwd: ROOT, encoding: 'utf-8' });
            return raw.trim().split('\n').filter(Boolean).length;
        } catch { return 0; }
    };

    const getMigrationCount = () => {
        try {
            const dir = join(ROOT, 'supabase', 'migrations');
            return readdirSync(dir).filter(f => f.endsWith('.sql')).length;
        } catch { return 0; }
    };

    const getFeatureModules = () => {
        try {
            const dir = join(ROOT, 'features');
            return readdirSync(dir, { withFileTypes: true })
                .filter(d => d.isDirectory())
                .map(d => d.name);
        } catch { return []; }
    };

    const getStories = (): Story[] => {
        const storiesDir = join(ROOT, 'docs', 'stories', 'active');
        if (!existsSync(storiesDir)) return [];

        const files = readdirSync(storiesDir).filter(f => f.endsWith('.md'));
        return files.map(f => {
            const content = readFileSync(join(storiesDir, f), 'utf-8');
            const titleMatch = content.match(/^#\s+(.+)/m);
            const statusMatch = content.match(/Status:\s*(\w+)/i) || content.match(/\*\*Status:\*\*\s*(\w+)/i);
            const idMatch = f.match(/(QV-[\d.]+|CP-[\d.]+|TDR-[\d.]+)/i);

            const total = (content.match(/- \[[ x]\]/g) || []).length;
            const done = (content.match(/- \[x\]/g) || []).length;

            return {
                id: idMatch ? idMatch[1] : f.replace('.story.md', ''),
                title: titleMatch ? titleMatch[1].replace(/^Story\s+[\d.]+:\s*/i, '') : f,
                status: statusMatch ? statusMatch[1] : 'Unknown',
                progress: total > 0 ? Math.round((done / total) * 100) : 0,
                file: f
            };
        });
    };

    return {
        version: getVersion(),
        generatedAt: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        lastCommit: getLastCommitDate(),
        migrationCount: getMigrationCount(),
        featureModules: getFeatureModules(),
        stories: getStories(),
        recentCommits: getRecentCommits(),
        deliveryVelocity: getDeliveryVelocity(),
    };
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
            { name: 'Central de Prospeccao', desc: 'Power Dialer com filas de ligacao, scripts guiados e recontato automatico' },
            { name: 'Metricas de Prospeccao', desc: 'Dashboard de produtividade com visao individual e por equipe' },
            { name: 'Assistente IA', desc: 'Chat inteligente que conhece seus negocios, contatos e sugere acoes' },
            { name: 'Importacao de Leads', desc: 'Importacao em massa com mapeamento de campos e validacao automatica' },
            { name: 'Edicao Completa de Contatos', desc: 'Todos os campos editaveis inline com ordenacao por qualquer coluna' },
            { name: 'Card de Negocio Compacto', desc: 'Redesign do card no board — de 8 linhas para 3, mais limpo e rapido' },
            { name: 'Atividades Flexiveis', desc: 'Independencia de negocios, correcoes de selecao e melhoria de fluxo' },
        ]
    },
];
