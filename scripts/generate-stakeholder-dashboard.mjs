#!/usr/bin/env node
/**
 * Gera dashboard HTML premium para stakeholders do ZmobCRM.
 * Uso: node scripts/generate-stakeholder-dashboard.mjs
 * Output: public/stakeholder-dashboard.html
 *
 * Template: Zinc Blue Enhanced (Premium Design tier 7/10)
 * Efeitos: scroll progress, grain, cinematic reveals, eyebrows, conic borders
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// --- Data Collection ---

function getVersion() {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
  return pkg.version;
}

function getLastCommitDate() {
  try {
    return execSync('git log -1 --format=%ci', { cwd: ROOT, encoding: 'utf-8' }).trim();
  } catch { return new Date().toISOString(); }
}

function getRecentCommits(n = 20) {
  try {
    const raw = execSync(`git log -${n} --format="%H|%s|%ci"`, { cwd: ROOT, encoding: 'utf-8' });
    return raw.trim().split('\n')
      .map(line => {
        const [hash, message, date] = line.split('|');
        return { hash: hash?.slice(0, 7), message, date };
      })
      // Filter out merge commits and technical noise
      .filter(c => !c.message?.startsWith('Merge '))
      .slice(0, 8);
  } catch { return []; }
}

function getDeliveryVelocity() {
  try {
    // Commits in last 30 days (excluding merges)
    const raw = execSync('git log --since="30 days ago" --no-merges --oneline', { cwd: ROOT, encoding: 'utf-8' });
    return raw.trim().split('\n').filter(Boolean).length;
  } catch { return 0; }
}

function getMigrationCount() {
  try {
    const dir = join(ROOT, 'supabase', 'migrations');
    return readdirSync(dir).filter(f => f.endsWith('.sql')).length;
  } catch { return 0; }
}

function getFeatureModules() {
  try {
    const dir = join(ROOT, 'features');
    return readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
  } catch { return []; }
}

function getStories() {
  const storiesDir = join(ROOT, 'docs', 'stories', 'active');
  if (!existsSync(storiesDir)) return [];

  const files = readdirSync(storiesDir).filter(f => f.endsWith('.md'));
  return files.map(f => {
    const content = readFileSync(join(storiesDir, f), 'utf-8');
    const titleMatch = content.match(/^#\s+(.+)/m);
    const statusMatch = content.match(/Status:\s*(\w+)/i) || content.match(/\*\*Status:\*\*\s*(\w+)/i);
    const idMatch = f.match(/(CP-[\d.]+|TDR-[\d.]+)/i);

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
}

function getEpics() {
  const epicsDir = join(ROOT, 'docs', 'stories', 'epics');
  if (!existsSync(epicsDir)) return [];

  const files = readdirSync(epicsDir).filter(f => f.endsWith('.md'));
  return files.map(f => {
    const content = readFileSync(join(epicsDir, f), 'utf-8');
    const titleMatch = content.match(/^#\s+(.+)/m);
    return {
      file: f,
      title: titleMatch ? titleMatch[1] : f,
      content: content.slice(0, 500)
    };
  });
}

// --- Collect all data ---
const data = {
  version: getVersion(),
  generatedAt: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
  lastCommit: getLastCommitDate(),
  migrationCount: getMigrationCount(),
  featureModules: getFeatureModules(),
  stories: getStories(),
  epics: getEpics(),
  recentCommits: getRecentCommits(20),
  deliveryVelocity: getDeliveryVelocity(),
};

// --- Configurable business metrics (edit these manually) ---
const businessMetrics = {
  activeUsers: '3 imobiliarias',
  targetMarket: 'Imobiliarias de medio e alto porte no Brasil',
  competitiveEdge: 'IA integrada + Prospeccao ativa — unico CRM imobiliario com Power Dialer e assistente inteligente nativos',
  teamSize: 'Equipe enxuta com desenvolvimento acelerado por IA',
};

// --- Feature descriptions (business language) ---
const featureDescriptions = {
  'activities': { name: 'Atividades', desc: 'Tarefas, ligacoes, reunioes e follow-ups com lembretes automaticos' },
  'ai-hub': { name: 'Assistente IA', desc: 'Inteligencia artificial que analisa negocios, sugere acoes e gera scripts de venda' },
  'boards': { name: 'Board de Vendas', desc: 'Kanban visual para acompanhar cada negocio por etapa do funil' },
  'contacts': { name: 'Contatos', desc: 'Base completa de clientes e leads com historico, score e importacao em massa' },
  'dashboard': { name: 'Dashboard', desc: 'Painel com KPIs de vendas, funil, LTV e saude do portfolio' },
  'deals': { name: 'Negocios', desc: 'Gestao detalhada de cada oportunidade — valor, etapa, probabilidade e comissao' },
  'decisions': { name: 'Decisoes', desc: 'Apoio inteligente para tomada de decisao comercial baseada em dados' },
  'inbox': { name: 'Caixa de Entrada', desc: 'Comunicacao centralizada com leads e clientes em um so lugar' },
  'instructions': { name: 'Instrucoes', desc: 'Scripts e guias de abordagem para o time de vendas' },
  'notifications': { name: 'Notificacoes', desc: 'Alertas em tempo real sobre atividades, negocios e prazos' },
  'profile': { name: 'Perfil', desc: 'Configuracoes pessoais e preferencias do usuario' },
  'prospecting': { name: 'Prospeccao', desc: 'Power Dialer, filas de ligacao, scripts guiados e metricas de produtividade' },
  'reports': { name: 'Relatorios', desc: 'Relatorios de performance individual e da equipe com exportacao PDF' },
  'settings': { name: 'Configuracoes', desc: 'Etapas do funil, campos personalizados, equipes e integracoes' },
};

// --- Roadmap data (enriched from Roadmap.md + brand strategy) ---
const roadmap = [
  {
    phase: 'Proximo Passo',
    color: 'var(--amber)',
    items: [
      { name: 'Prospeccao com IA v3 (CP-3)', desc: 'IA sugere quem ligar e quando baseado em lead score e heatmap' },
      { name: 'Módulo de Imóveis (Beta)', desc: 'Cadastro inicial e property_ref integrado ao Board e IA' },
    ]
  },
  {
    phase: 'Planejado',
    color: 'var(--accent-soft)',
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
    color: 'var(--green)',
    items: [
      { name: 'Real-time Sync Board (QV-1.1)', desc: 'Sincronizacao em tempo real do kanban, contatos e deals (Bug #1, #17, #18, #19)' },
      { name: 'Custom Error Pages (QV-1.2)', desc: 'Paginas de erro 404/500 personalizadas e integradas ao layout global' },
      { name: 'Chat IA Mobile Responsivo (QV-1.3)', desc: 'Ajuste de viewport e input acima do BottomNav (Bug #23, #24)' },
      { name: 'IA Tools: Property Ref & Filtros (QV-1.4)', desc: 'Busca por imovel, tags e custom fields via linguagem natural (Bug #10, #11, #12, #13)' },
      { name: 'Deal Modal Evolution (QV-1.5)', desc: 'Edicao inline, navegacao direta e vinculacao de produtos (Bug #2, #4, #11 UI)' },
      { name: 'WhatsApp End-to-End (QV-1.6)', desc: 'Tipo WHATSAPP integrado em toda a plataforma, IA e filtros (Bug #5, #14)' },
      { name: 'Fila de Prospeccao & Metas (QV-1.7)', desc: 'Limites de fila, prevencao de duplicatas e metas individuais por corretor (Bug #6, #7, #8, #9)' },
      { name: 'UX Polish & Estabilidade (QV-1.8)', desc: 'Correcoes de z-index, ESC stack, toasts e refinamento de modais (Bug #3, #15, #16, #21, #22)' },
      { name: 'CRM Base Completo', desc: 'Board de vendas, contatos, atividades, dashboard, negocios — toda a fundacao' },
      { name: 'Central de Prospeccao', desc: 'Power Dialer com filas de ligacao, scripts guiados e recontato automatico' },
      { name: 'Assistente IA', desc: 'Chat inteligente que conhece seus negocios, contatos e sugere acoes' },
    ]
  },
];

// --- Milestone track ---
const milestones = [
  { label: 'CRM Base', status: 'done', sub: 'Completo' },
  { label: 'Seguranca & RBAC', status: 'done', sub: 'Completo' },
  { label: 'Prospeccao v1', status: 'done', sub: 'Completo' },
  { label: 'Prospeccao v2', status: 'done', sub: 'Completo' },
  { label: 'Qualidade & Estabilidade', status: 'done', sub: 'Completo' },
  { label: 'Prospecção IA', status: 'current', sub: 'Fase CP-3' },
  { label: 'Imoveis', status: 'future', sub: 'Planejado' },
  { label: 'Integracoes', status: 'future', sub: 'Futuro' },
];

// --- Brand vision ---
const brandVision = {
  tagline: 'Pare de digitar. Comece a vender.',
  archetypes: [
    { name: 'O Mago', desc: 'IA que transforma dados em acao — analisa negocios, gera scripts e preve resultados' },
    { name: 'O Heroi', desc: 'Performance implacavel — Power Dialer, metas diarias, metricas que empurram a venda' },
    { name: 'O Sabio', desc: 'Dados precisos sem achismo — Lead Score, Dashboard, historico completo de cada cliente' },
  ],
  positioning: 'Nao somos o CRM amigavel. Somos a arma secreta do corretor de alta performance.',
  aesthetic: 'Minimalista. Dark premium. Precisao de instrumentos cirurgicos.',
};

// --- Status summary ---
const completedDeliveries = roadmap[2].items.length; // Concluido phase
const totalDeliveries = roadmap.reduce((sum, phase) => sum + phase.items.length, 0);
const overallProgress = Math.round((completedDeliveries / totalDeliveries) * 100);

// --- Helpers ---
function cleanCommitMessage(msg) {
  return msg
    .replace(/^feat:\s*/i, 'Nova funcionalidade: ')
    .replace(/^fix:\s*/i, 'Correcao: ')
    .replace(/^style:\s*/i, 'Melhoria visual: ')
    .replace(/^chore\(release\):\s*/i, 'Lancamento: ')
    .replace(/^chore:\s*/i, 'Manutencao: ')
    .replace(/^test:\s*/i, 'Testes: ')
    .replace(/^docs:\s*/i, 'Documentacao: ')
    .replace(/^refactor:\s*/i, 'Melhoria interna: ');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// --- Generate milestone track HTML ---
function generateMilestoneTrack() {
  return milestones.map((m, i) => {
    const dot = `<div class="milestone">
          <div class="milestone-dot ${m.status}"></div>
          <div class="milestone-label${m.status === 'current' ? ' current' : ''}">${m.label}<br><small${m.status === 'done' ? ' style="color:var(--green)"' : ''}>${m.sub}</small></div>
        </div>`;
    const connector = i < milestones.length - 1
      ? `<div class="milestone-connector${m.status === 'done' ? ' done' : ''}"></div>`
      : '';
    return dot + connector;
  }).join('\n        ');
}

// --- Generate feature grid HTML ---
function generateFeatureGrid() {
  const delays = ['reveal-d1', 'reveal-d2', 'reveal-d3', 'reveal-d4'];
  return data.featureModules.map((mod, i) => {
    const info = featureDescriptions[mod] || { name: mod, desc: '' };
    const delay = delays[i % delays.length];
    return `<div class="feature-card reveal ${delay}">
        <div class="name">${info.name} <span class="badge badge-live">Ativo</span></div>
        <div class="desc">${info.desc}</div>
      </div>`;
  }).join('\n      ');
}

// --- Generate roadmap HTML ---
function generateRoadmap() {
  return roadmap.map(phase => {
    const isDone = phase.phase === 'Concluido';
    const dotStyle = isDone
      ? `border-color: ${phase.color}; background: ${phase.color}; box-shadow: 0 0 8px var(--green-glow)`
      : `border-color: ${phase.color}`;
    const items = phase.items.map(item => `
          <div class="roadmap-item${isDone ? ' done' : ''}">
            <div class="check${isDone ? ' done' : ''}"></div>
            <div>
              <div class="item-name">${item.name}</div>
              <div class="item-desc">${item.desc}</div>
            </div>
          </div>`).join('');

    return `
      <div class="roadmap-phase reveal">
        <div class="phase-header">
          <div class="phase-dot" style="${dotStyle}"></div>
          <div class="phase-name" style="color: ${phase.color}">${phase.phase}</div>
          <span class="phase-count">${phase.items.length} itens</span>
        </div>
        <div class="phase-items">${items}
        </div>
      </div>`;
  }).join('');
}

// --- Generate timeline HTML ---
function generateTimeline() {
  return data.recentCommits.map(c => `
        <div class="timeline-item">
          <div class="timeline-date">${formatDate(c.date)}</div>
          <div class="timeline-msg">${cleanCommitMessage(c.message)}</div>
        </div>`).join('');
}

// --- Generate brand vision HTML ---
function generateBrandVision() {
  const archetypes = brandVision.archetypes.map((a, i) => {
    const delays = ['reveal-d1', 'reveal-d2', 'reveal-d3'];
    return `
      <div class="archetype-card reveal ${delays[i]}">
        <div class="archetype-name">${a.name}</div>
        <div class="archetype-desc">${a.desc}</div>
      </div>`;
  }).join('');

  return `
    <div class="brand-hero reveal">
      <div class="brand-tagline">${brandVision.tagline}</div>
      <div class="brand-positioning">${brandVision.positioning}</div>
    </div>
    <div class="archetype-grid">${archetypes}
    </div>
    <div class="brand-aesthetic reveal">
      ${brandVision.aesthetic}
    </div>`;
}

// --- Generate full HTML ---
const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ZmobCRM — Status do Projeto</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@500&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet">
<style>
  /* === PREMIUM THEME: Zinc Blue (System Match) === */
  :root {
    /* Backgrounds */
    --bg-primary: #09090b;
    --bg-secondary: #18181b;
    --bg-tertiary: #27272a;
    --bg-elevated: #303033;

    /* Accent */
    --accent: #3b82f6;
    --accent-secondary: #2563eb;
    --accent-soft: #60a5fa;
    --accent-hover: #93bbfd;

    /* Semantic */
    --green: #10b981;
    --green-glow: rgba(16, 185, 129, 0.12);
    --amber: #f59e0b;
    --amber-glow: rgba(245, 158, 11, 0.12);

    /* Text */
    --text: #f4f4f5;
    --text-secondary: #a1a1aa;
    --text-muted: #71717a;
    --text-dim: #52525b;

    /* Borders */
    --border: #27272a;
    --border-subtle: #1e1e21;

    /* Typography */
    --font-heading: 'Space Grotesk', 'Inter', system-ui, -apple-system, sans-serif;
    --font-body: 'Inter', system-ui, -apple-system, sans-serif;
    --font-mono: 'JetBrains Mono', monospace;

    /* Effects */
    --accent-glow: rgba(59, 130, 246, 0.4);
    --glow-color: rgba(59, 130, 246, 0.2);
    --glow-spread: 0 0 40px;
    --glass-bg: rgba(59, 130, 246, 0.04);
    --glass-border: rgba(59, 130, 246, 0.08);
    --glass-blur: 16px;
    --gradient-hero: radial-gradient(ellipse at 50% 0%, rgba(59, 130, 246, 0.08) 0%, transparent 70%);
    --gradient-section: linear-gradient(180deg, #09090b 0%, #18181b 100%);

    /* Spacing */
    --section-padding: 80px;
    --hero-padding: 100px;
    --card-padding: 28px;
    --gap: 20px;
    --radius: 16px;
    --radius-sm: 8px;

    /* Transitions */
    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* === RESET === */
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html { scroll-behavior: smooth; }

  body {
    font-family: var(--font-body);
    font-weight: 400;
    font-size: 16px;
    line-height: 1.7;
    color: var(--text-secondary);
    background: var(--bg-primary);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
    min-height: 100vh;
  }

  /* === SCROLL PROGRESS BAR (Enhanced) === */
  .scroll-progress {
    position: fixed;
    top: 0; left: 0;
    z-index: 9998;
    height: 2px;
    width: 0%;
    background: linear-gradient(90deg, var(--accent-secondary), var(--accent-soft));
    transition: width 0.1s linear;
  }

  /* === GRAIN (Enhanced) === */
  .grain {
    position: fixed; inset: 0;
    z-index: 9990;
    pointer-events: none;
    opacity: 0.022;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 200px;
    animation: grain-shift 0.5s steps(4) infinite;
  }
  @keyframes grain-shift {
    0% { background-position: 0 0; }
    25% { background-position: -80px 40px; }
    50% { background-position: 40px -60px; }
    75% { background-position: -40px 80px; }
  }

  /* === SCROLL REVEALS (Enhanced) === */
  .reveal {
    opacity: 0;
    transform: translateY(24px) scale(0.98);
    filter: blur(4px);
    transition: opacity 0.7s ease, transform 0.7s ease, filter 0.7s ease;
  }
  .reveal.visible {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
  .reveal-d1 { transition-delay: 0.1s; }
  .reveal-d2 { transition-delay: 0.2s; }
  .reveal-d3 { transition-delay: 0.3s; }
  .reveal-d4 { transition-delay: 0.4s; }

  /* === CONTAINER === */
  .container { max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem; }

  /* === HEADER === */
  .header {
    text-align: center;
    padding: var(--hero-padding) 0 3rem;
    margin-bottom: 3rem;
    position: relative;
  }
  .header::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--gradient-hero);
    pointer-events: none;
  }
  .header::after {
    content: '';
    position: absolute;
    bottom: 0; left: 10%; right: 10%;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--accent-secondary), transparent);
    opacity: 0.3;
  }
  .header h1 {
    font-family: var(--font-heading);
    font-size: 3rem;
    font-weight: 800;
    letter-spacing: -0.045em;
    background: linear-gradient(135deg, var(--accent-soft), var(--accent), var(--accent-secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.75rem;
    position: relative;
  }
  .header p {
    color: var(--text-muted);
    font-size: 1.1rem;
    letter-spacing: -0.01em;
    position: relative;
  }
  .header .meta {
    display: flex;
    justify-content: center;
    gap: 2.5rem;
    margin-top: 2rem;
    flex-wrap: wrap;
    position: relative;
  }
  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-dim);
    font-size: 0.85rem;
  }
  .meta-item .value {
    color: var(--text);
    font-weight: 600;
    font-family: var(--font-mono);
    font-size: 0.8rem;
  }

  /* === SECTION === */
  .section {
    margin-bottom: 4rem;
    padding-top: 1rem;
  }
  .section-title {
    font-family: var(--font-heading);
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.03em;
    margin-bottom: 1.75rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .section-title .dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 12px var(--glow-color);
  }
  .eyebrow {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
  }
  .eyebrow-number {
    color: var(--accent-soft);
    margin-right: 0.75rem;
  }

  /* === STATS GRID === */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--gap);
    margin-bottom: 2rem;
  }
  .stat-card {
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    border-radius: var(--radius);
    padding: var(--card-padding);
    transition: var(--transition);
    position: relative;
    overflow: hidden;
  }
  .stat-card::before {
    content: '';
    position: absolute; inset: 0;
    padding: 1px;
    border-radius: var(--radius);
    background: conic-gradient(from 180deg at 50% 50%,
      transparent 0%, rgba(59, 130, 246, 0.15) 25%,
      transparent 50%, rgba(59, 130, 246, 0.08) 75%,
      transparent 100%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.5s ease;
  }
  .stat-card:hover::before { opacity: 1; }
  .stat-card:hover {
    border-color: rgba(59, 130, 246, 0.15);
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
  .stat-card .label {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 0.75rem;
  }
  .stat-card .number {
    font-size: 2.25rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .stat-card .sub {
    font-size: 0.8rem;
    color: var(--text-dim);
    margin-top: 0.5rem;
  }

  /* === PROGRESS BAR === */
  .progress-container { margin-bottom: 2rem; }
  .progress-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }
  .progress-header .label { font-weight: 600; color: var(--text); font-size: 0.9rem; }
  .progress-header .pct {
    font-family: var(--font-mono);
    color: var(--accent-soft);
    font-weight: 700;
    font-size: 0.9rem;
  }
  .progress-bar {
    height: 8px;
    background: var(--bg-tertiary);
    border-radius: 4px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    border-radius: 4px;
    background: linear-gradient(90deg, var(--accent-secondary), var(--accent), var(--accent-soft));
    transition: width 1.5s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 16px var(--glow-color);
  }

  /* === FEATURE GRID === */
  .feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: var(--gap);
  }
  .feature-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.25rem 1.5rem;
    transition: var(--transition);
    position: relative;
  }
  .feature-card:hover {
    border-color: rgba(16, 185, 129, 0.2);
    background: var(--bg-tertiary);
    transform: translateY(-1px);
  }
  .feature-card .name {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--text);
    margin-bottom: 0.35rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .feature-card .desc { color: var(--text-muted); font-size: 0.82rem; line-height: 1.5; }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-family: var(--font-mono);
    font-size: 0.6rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .badge-live { background: var(--green-glow); color: var(--green); }
  .badge-dev { background: var(--amber-glow); color: var(--amber); }
  .badge-planned { background: rgba(59, 130, 246, 0.12); color: var(--accent-soft); }

  /* === WHERE WE ARE === */
  .where-we-are {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 2rem 2.5rem;
    margin-bottom: 2rem;
    position: relative;
    overflow: hidden;
  }
  .where-we-are::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.2), transparent);
  }
  .where-we-are h3 {
    font-family: var(--font-heading);
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
    color: var(--text);
    letter-spacing: -0.02em;
  }
  .milestone-track {
    display: flex;
    align-items: center;
    gap: 0;
    overflow-x: auto;
    padding: 1rem 0 0.5rem;
  }
  .milestone {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 130px;
    position: relative;
  }
  .milestone-dot {
    width: 28px; height: 28px;
    border-radius: 50%;
    border: 3px solid var(--border);
    background: var(--bg-primary);
    z-index: 1;
    margin-bottom: 0.75rem;
    transition: var(--transition);
  }
  .milestone-dot.done {
    background: var(--green);
    border-color: var(--green);
    box-shadow: 0 0 16px rgba(16, 185, 129, 0.25);
  }
  .milestone-dot.current {
    background: var(--accent);
    border-color: var(--accent);
    box-shadow: 0 0 20px var(--glow-color);
    animation: pulse-blue 2s infinite;
  }
  .milestone-dot.future {
    background: var(--bg-primary);
    border-color: var(--text-dim);
  }
  .milestone-label {
    font-size: 0.7rem;
    text-align: center;
    color: var(--text-muted);
    max-width: 110px;
    line-height: 1.4;
  }
  .milestone-label.current {
    color: var(--accent-soft);
    font-weight: 600;
  }
  .milestone-connector {
    height: 3px;
    flex: 1;
    min-width: 20px;
    background: var(--border);
    margin-top: -30px;
    border-radius: 2px;
  }
  .milestone-connector.done {
    background: linear-gradient(90deg, var(--green), rgba(16, 185, 129, 0.5));
  }

  @keyframes pulse-blue {
    0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
    50% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
  }

  /* === ROADMAP === */
  .roadmap { position: relative; }
  .roadmap-phase { margin-bottom: 2.5rem; }
  .phase-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  .phase-dot {
    width: 14px; height: 14px;
    border-radius: 50%;
    border: 3px solid;
    flex-shrink: 0;
  }
  .phase-name { font-weight: 700; font-size: 1.05rem; }
  .phase-count {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    color: var(--text-dim);
    background: var(--bg-tertiary);
    padding: 2px 8px;
    border-radius: 999px;
  }
  .phase-items {
    padding-left: 2rem;
    border-left: 2px solid var(--border);
    margin-left: 6px;
  }
  .roadmap-item {
    padding: 0.85rem 1.25rem;
    margin-bottom: 0.5rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    transition: var(--transition);
  }
  .roadmap-item:hover {
    border-color: rgba(59, 130, 246, 0.12);
    background: var(--bg-tertiary);
  }
  .roadmap-item.done { opacity: 0.65; }
  .check {
    width: 20px; height: 20px;
    border-radius: 50%;
    border: 2px solid var(--border);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 2px;
    transition: var(--transition);
  }
  .check.done {
    background: var(--green);
    border-color: var(--green);
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.2);
  }
  .check.done::after { content: '\\2713'; color: white; font-size: 11px; font-weight: 700; }
  .roadmap-item .item-name {
    font-weight: 600;
    font-size: 0.88rem;
    color: var(--text);
    letter-spacing: -0.01em;
  }
  .roadmap-item .item-desc { color: var(--text-muted); font-size: 0.78rem; margin-top: 2px; }

  /* === TIMELINE === */
  .timeline-container {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.5rem;
  }
  .timeline-item {
    display: flex;
    gap: 1.25rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--border-subtle);
    transition: var(--transition);
  }
  .timeline-item:last-child { border-bottom: none; }
  .timeline-item:hover { padding-left: 0.5rem; }
  .timeline-date {
    font-family: var(--font-mono);
    color: var(--text-dim);
    font-size: 0.75rem;
    min-width: 80px;
    flex-shrink: 0;
    letter-spacing: 0.02em;
  }
  .timeline-msg { font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; }

  /* === BRAND VISION === */
  .brand-hero {
    text-align: center;
    padding: 2.5rem 2rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: var(--gap);
    position: relative;
    overflow: hidden;
  }
  .brand-hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 0%, rgba(59, 130, 246, 0.06) 0%, transparent 60%);
    pointer-events: none;
  }
  .brand-tagline {
    font-family: var(--font-heading);
    font-size: 1.8rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--text);
    margin-bottom: 0.75rem;
    position: relative;
  }
  .brand-positioning {
    font-size: 0.95rem;
    color: var(--text-muted);
    max-width: 600px;
    margin: 0 auto;
    position: relative;
  }
  .archetype-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--gap);
    margin-bottom: var(--gap);
  }
  .archetype-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--card-padding);
    transition: var(--transition);
    position: relative;
    overflow: hidden;
  }
  .archetype-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--accent), transparent);
    opacity: 0.5;
  }
  .archetype-card:hover {
    transform: translateY(-2px);
    border-color: rgba(59, 130, 246, 0.15);
  }
  .archetype-name {
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: 1.05rem;
    color: var(--accent-soft);
    margin-bottom: 0.5rem;
    letter-spacing: -0.02em;
  }
  .archetype-desc {
    font-size: 0.85rem;
    color: var(--text-muted);
    line-height: 1.6;
  }
  .brand-aesthetic {
    text-align: center;
    font-size: 0.82rem;
    color: var(--text-dim);
    padding: 1rem 2rem;
    letter-spacing: 0.04em;
    font-weight: 500;
  }

  /* === EXPECTATIONS GRID === */
  .expectations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--gap);
  }
  .expect-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--card-padding);
    transition: var(--transition);
    position: relative;
    overflow: hidden;
  }
  .expect-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
  .expect-card .label {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 0.75rem;
  }
  .expect-card .items {
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 2;
  }
  .expect-card .items span {
    display: block;
    padding-left: 1rem;
    position: relative;
  }
  .expect-card .items span::before {
    content: '';
    position: absolute;
    left: 0; top: 50%;
    width: 4px; height: 4px;
    border-radius: 50%;
    transform: translateY(-50%);
  }
  .expect-card.short .items span::before { background: var(--amber); box-shadow: 0 0 6px var(--amber-glow); }
  .expect-card.mid .items span::before { background: var(--accent); box-shadow: 0 0 6px var(--glow-color); }
  .expect-card.long .items span::before { background: #8b5cf6; box-shadow: 0 0 6px rgba(139, 92, 246, 0.2); }
  .expect-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
  }
  .expect-card.short::before { background: linear-gradient(90deg, var(--amber), transparent); }
  .expect-card.mid::before { background: linear-gradient(90deg, var(--accent), transparent); }
  .expect-card.long::before { background: linear-gradient(90deg, #8b5cf6, transparent); }

  /* === MARKET GRID === */
  .market-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: var(--gap);
  }
  .market-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.5rem;
    transition: var(--transition);
  }
  .market-card:hover {
    border-color: rgba(16, 185, 129, 0.15);
    transform: translateY(-1px);
  }
  .market-label {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 0.5rem;
  }
  .market-value {
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  /* === FOOTER === */
  .footer {
    text-align: center;
    padding: 3rem 0 2rem;
    position: relative;
    color: var(--text-dim);
    font-size: 0.78rem;
  }
  .footer::before {
    content: '';
    position: absolute;
    top: 0; left: 10%; right: 10%;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border), transparent);
  }
  .footer code {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    padding: 3px 8px;
    border-radius: 4px;
    color: var(--text-muted);
  }

  /* === SECTION DIVIDERS === */
  .section + .section::before {
    content: '';
    display: block;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border), transparent);
    margin-bottom: 2rem;
    opacity: 0.5;
  }

  /* === RESPONSIVE === */
  @media (max-width: 640px) {
    .header h1 { font-size: 2rem; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .feature-grid { grid-template-columns: 1fr; }
    .expectations-grid { grid-template-columns: 1fr; }
    .archetype-grid { grid-template-columns: 1fr; }
    .container { padding: 1rem; }
    .where-we-are { padding: 1.5rem; }
    .header { padding: 60px 0 2rem; }
    .brand-tagline { font-size: 1.4rem; }
  }
</style>
</head>
<body>

<!-- Maximum Tier: Cursor + Mesh -->
<div class="cursor-ring"></div>
<div class="cursor-dot"></div>
<div class="mesh-bg"></div>

<!-- Scroll Progress (Enhanced) -->
<div class="scroll-progress"></div>

<!-- Grain Texture (Enhanced) -->
<div class="grain"></div>

<div class="container">

  <!-- Header -->
  <div class="header reveal">
    <h1 id="main-header">ZmobCRM</h1>
    <p>CRM Inteligente para o Mercado Imobiliario</p>
    <div class="meta">
      <div class="meta-item">Versao <span class="value">v${data.version}</span></div>
      <div class="meta-item">Atualizado em <span class="value">${data.generatedAt}</span></div>
      <div class="meta-item">Modulos <span class="value">${data.featureModules.length}</span></div>
    </div>
  </div>

  <!-- DNA do Produto -->
  <div class="section">
    <div class="eyebrow reveal"><span class="eyebrow-number">01</span>DNA do Produto</div>
    <div class="section-title reveal"><span class="dot" style="background: var(--accent); box-shadow: 0 0 12px var(--glow-color)"></span> Visao & Posicionamento</div>
    ${generateBrandVision()}
  </div>

  <!-- Prospeccao Inteligente v2 -->
  <div class="section">
    <div class="eyebrow reveal"><span class="eyebrow-number">02</span>Módulo Prospeccão</div>
    <div class="section-title reveal"><span class="dot" style="background: var(--green); box-shadow: 0 0 12px var(--green-glow)"></span> Prospeccão Inteligente v2</div>
    
    <div class="feature-grid">
      <div class="feature-card reveal reveal-d1">
        <div class="icon">⚡</div>
        <div class="title">Power Dialer</div>
        <div class="desc">Fila de ligacao ultraveloz com transicao automatica entre leads e gestao de tempo.</div>
      </div>
      <div class="feature-card reveal reveal-d2">
        <div class="icon">📝</div>
        <div class="title">Scripts de Venda</div>
        <div class="desc">Roteiros guiados por categoria para garantir a melhor abordagem em cada etapa.</div>
      </div>
      <div class="feature-card reveal reveal-d3">
        <div class="icon">📈</div>
        <div class="title">Metricas de Conversao</div>
        <div class="desc">Dashboard de produtividade em tempo real com taxa de conexao e ranking de corretor.</div>
      </div>
      <div class="feature-card reveal reveal-d4">
        <div class="icon">🔄</div>
        <div class="title">Recontato Automatico</div>
        <div class="desc">Algoritmo de retry inteligente que agenda novos contatos para chamadas nao atendidas.</div>
      </div>
    </div>
  </div>

  <!-- Onde Estamos -->
  <div class="section">
    <div class="eyebrow reveal"><span class="eyebrow-number">03</span>Status Atual</div>
    <div class="section-title reveal"><span class="dot" style="background: var(--accent); box-shadow: 0 0 12px var(--glow-color)"></span> Onde Estamos Agora</div>

    <div class="where-we-are reveal">
      <h3>Jornada do Produto</h3>
      <div class="milestone-track">
        ${generateMilestoneTrack()}
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card reveal reveal-d1">
        <div class="label">Funcionalidades Ativas</div>
        <div class="number" style="color: var(--green)">${data.featureModules.length}</div>
        <div class="sub">modulos em producao</div>
      </div>
      <div class="stat-card reveal reveal-d2">
        <div class="label">Entregas Realizadas</div>
        <div class="number" style="color: var(--accent-soft)">${completedDeliveries}</div>
        <div class="sub">de ${totalDeliveries} itens no roadmap</div>
      </div>
      <div class="stat-card reveal reveal-d3">
        <div class="label">Evolucoes no Banco</div>
        <div class="number" style="color: var(--amber)">${data.migrationCount}</div>
        <div class="sub">melhorias na base de dados</div>
      </div>
      <div class="stat-card reveal reveal-d4">
        <div class="label">Velocidade (30 dias)</div>
        <div class="number" style="color: var(--accent-soft)">${data.deliveryVelocity}</div>
        <div class="sub">entregas no ultimo mes</div>
      </div>
    </div>

    <div class="progress-container reveal">
      <div class="progress-header">
        <span class="label">Progresso do Roadmap</span>
        <span class="pct">${overallProgress}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${overallProgress}%"></div>
      </div>
    </div>
  </div>

  <!-- O que ja funciona -->
  <div class="section">
    <div class="eyebrow reveal"><span class="eyebrow-number">04</span>Funcionalidades</div>
    <div class="section-title reveal"><span class="dot" style="background: var(--green); box-shadow: 0 0 10px var(--green-glow)"></span> O Que Ja Funciona</div>
    <div class="feature-grid">
      ${generateFeatureGrid()}
    </div>
  </div>

  <!-- Roadmap -->
  <div class="section">
    <div class="eyebrow reveal"><span class="eyebrow-number">05</span>Evolucao</div>
    <div class="section-title reveal"><span class="dot" style="background: var(--accent); box-shadow: 0 0 10px var(--glow-color)"></span> Roadmap — O Que Vem Pela Frente</div>
    <div class="roadmap">
      ${generateRoadmap()}
    </div>
  </div>

  <!-- Atividade Recente -->
  <div class="section">
    <div class="eyebrow reveal"><span class="eyebrow-number">06</span>Historico</div>
    <div class="section-title reveal"><span class="dot"></span> Atividade Recente</div>
    <div class="timeline-container reveal">
      <div class="timeline">
        ${generateTimeline()}
      </div>
    </div>
  </div>

  <!-- O que esperar -->
  <div class="section">
    <div class="eyebrow reveal"><span class="eyebrow-number">07</span>Visao</div>
    <div class="section-title reveal"><span class="dot" style="background: var(--accent); box-shadow: 0 0 10px var(--glow-color)"></span> O Que Esperar</div>
    <div class="expectations-grid">
      <div class="expect-card short reveal reveal-d1">
        <div class="label">Curto Prazo (1-2 semanas)</div>
        <div class="items">
          <span>IA recomenda quem ligar (Lead Score + Heatmap)</span>
          <span>Assistente IA conhece suas metas e métricas</span>
          <span>Sugestão e criação de Scripts de Venda via IA</span>
          <span>Módulo de Imóveis (Beta): property_ref e buscas</span>
        </div>
      </div>
      <div class="expect-card mid reveal reveal-d2">
        <div class="label">Medio Prazo (1-2 meses)</div>
        <div class="items">
          <span>Modulo de Imoveis com matching automatico</span>
          <span>Permissoes avancadas por cargo e departamento</span>
          <span>Listas de contatos para segmentacao</span>
          <span>IA de perfil de interesse do cliente</span>
          <span>Dashboard customizavel por nivel de acesso</span>
        </div>
      </div>
      <div class="expect-card long reveal reveal-d3">
        <div class="label">Longo Prazo (3-6 meses)</div>
        <div class="items">
          <span>Integracoes com portais imobiliarios</span>
          <span>App mobile (PWA)</span>
          <span>Wizard de onboarding para novos usuarios</span>
          <span>Migracao assistida de outros CRMs</span>
          <span>Calculadora de comissao automatica</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer reveal">
    ZmobCRM v${data.version} &mdash; Gerado automaticamente em ${data.generatedAt}<br>
    <span style="color: var(--text-dim)">Para atualizar, execute: <code>npm run stakeholder-dashboard</code></span>
  </div>

</div>

<!-- Maximum Tier: Interactive Logic -->
<script>
  // 1. Cursor & Mesh Follow
  const ring = document.querySelector('.cursor-ring');
  const dot = document.querySelector('.cursor-dot');
  let mx = 0, my = 0, rx = 0, ry = 0;
  
  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    document.documentElement.style.setProperty('--mx', mx + 'px');
    document.documentElement.style.setProperty('--my', my + 'px');
  });

  function loop() {
    rx += (mx - rx) * 0.15;
    ry += (my - ry) * 0.15;
    if (ring) ring.style.transform = \`translate(\${rx - 20}px, \${ry - 20}px)\`;
    if (dot) dot.style.transform = \`translate(\${mx - 2}px, \${my - 2}px)\`;
    requestAnimationFrame(loop);
  }
  loop();

  document.querySelectorAll('a, button, .stat-card, .feature-card').forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('hover'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
  });

  // 2. Text Split Animation
  const header = document.getElementById('main-header');
  if (header) {
    const text = header.textContent;
    header.innerHTML = '';
    text.split('').forEach((char, i) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.className = 'char';
      span.style.transitionDelay = \`\${i * 0.05}s\`;
      header.appendChild(span);
    });
    setTimeout(() => {
      document.querySelectorAll('.char').forEach(c => c.classList.add('visible'));
    }, 500);
  }

  // 3. Counter Animation
  const counterObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const targetText = el.textContent.replace(/\\D/g, '');
        const target = parseInt(targetText);
        if (isNaN(target)) return;
        let current = 0;
        const duration = 2000;
        const start = performance.now();
        
        function update(now) {
          const progress = Math.min((now - start) / duration, 1);
          el.textContent = Math.floor(progress * target);
          if (progress < 1) requestAnimationFrame(update);
          else el.textContent = target;
        }
        requestAnimationFrame(update);
        counterObs.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.number').forEach(n => counterObs.observe(n));

  // 4. Conic Border Angle Animation
  let angle = 0;
  function updateAngle() {
    angle = (angle + 2) % 360;
    document.documentElement.style.setProperty('--angle', angle + 'deg');
    requestAnimationFrame(updateAngle);
  }
  updateAngle();

  // 5. Magnetic Eyebrows
  document.querySelectorAll('.eyebrow').forEach(el => {
    el.classList.add('btn-magnetic');
    el.addEventListener('mousemove', e => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width/2;
      const y = e.clientY - rect.top - rect.height/2;
      el.style.transform = \`translate(\${x * 0.2}px, \${y * 0.2}px)\`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'translate(0,0)';
    });
  });

  // Enhanced Tier: Scroll Progress & Reveals
  window.addEventListener('scroll', () => {
    const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
    const bar = document.querySelector('.scroll-progress');
    if (bar) bar.style.width = pct + '%';
  });

  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));
</script>

</body>
</html>`;

// --- Write output ---
const outputPath = join(ROOT, 'public', 'stakeholder-dashboard.html');
writeFileSync(outputPath, html, 'utf-8');
console.log(`Dashboard gerado: ${outputPath}`);
console.log(`Abra no browser: file://${outputPath}`);
