'use client';

import React, { useState } from 'react';
import {
  Flame,
  Inbox,
  KanbanSquare,
  Users,
  CheckSquare,
  BarChart3,
  ChevronDown,
  BookOpen,
  LayoutDashboard,
  Target,
  Bell,
} from 'lucide-react';
import { Button } from '@/app/components/ui/Button';

interface Section {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  content: React.ReactNode;
}

function AccordionItem({
  section,
  isOpen,
  onToggle,
}: {
  section: Section;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const Icon = section.icon;
  return (
    <div className="border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden">
      <Button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
        aria-expanded={isOpen}
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${section.color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="flex-1 font-semibold text-slate-900 dark:text-white">
          {section.title}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </Button>
      {isOpen && (
        <div className="px-5 pb-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3 border-t border-slate-100 dark:border-slate-700/50 pt-4">
          {section.content}
        </div>
      )}
    </div>
  );
}

function ScoreTable() {
  const rows = [
    { factor: 'Interação recente', condition: 'Último contato < 7 dias', points: '+20', positive: true },
    { factor: 'Interação recente', condition: 'Último contato < 30 dias', points: '+10', positive: true },
    { factor: 'Valor (LTV)', condition: 'Valor total dos negócios > R$0', points: '+15', positive: true },
    { factor: 'Tempo no estágio', condition: 'Atualizado < 30 dias', points: '+10', positive: true },
    { factor: 'Tempo no estágio', condition: 'Parado > 90 dias', points: '-10', positive: false },
    { factor: 'Atividades concluídas', condition: 'Mais de 5 concluídas', points: '+15', positive: true },
    { factor: 'Atividades concluídas', condition: 'Mais de 2 concluídas', points: '+8', positive: true },
    { factor: 'Preferências preenchidas', condition: 'Perfil com preferências', points: '+10', positive: true },
    { factor: 'Negócios ativos', condition: 'Pelo menos 1 negócio ativo', points: '+20', positive: true },
    { factor: 'Negócios ativos', condition: 'Mais de 1 negócio ativo', points: '+5', positive: true },
    { factor: 'Temperatura', condition: 'Marcado como Quente', points: '+10', positive: true },
    { factor: 'Temperatura', condition: 'Marcado como Frio', points: '-10', positive: false },
  ];

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="text-left py-2 px-2 font-semibold text-slate-700 dark:text-slate-300">Fator</th>
            <th className="text-left py-2 px-2 font-semibold text-slate-700 dark:text-slate-300">Condição</th>
            <th className="text-right py-2 px-2 font-semibold text-slate-700 dark:text-slate-300">Pontos</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
              <td className="py-1.5 px-2 text-slate-600 dark:text-slate-400">{row.factor}</td>
              <td className="py-1.5 px-2">{row.condition}</td>
              <td className={`py-1.5 px-2 text-right font-mono font-semibold ${row.positive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                {row.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const sections: Section[] = [
  {
    id: 'lead-score',
    title: 'Lead Score',
    icon: Flame,
    color: 'bg-orange-500',
    content: (
      <>
        <p>
          O <strong>Lead Score</strong> é uma pontuação automática de 0 a 100 que indica o
          nível de engajamento e qualificação de cada lead. O sistema calcula o score
          com base em 7 fatores reais do seu relacionamento com o contato.
        </p>

        <p className="font-medium text-slate-800 dark:text-slate-200">Classificação por temperatura:</p>
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-medium">
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 py-2">
            Frio (0-30)
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 py-2">
            Morno (31-60)
          </div>
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 py-2">
            Quente (61-100)
          </div>
        </div>

        <p className="font-medium text-slate-800 dark:text-slate-200">Tabela de pontuação:</p>
        <ScoreTable />

        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 space-y-2">
          <p className="font-medium text-blue-800 dark:text-blue-300">Score na criação do lead:</p>
          <p className="text-blue-700 dark:text-blue-400">
            Ao cadastrar um novo contato, o score é calculado imediatamente. Um lead novo
            sem negócios, sem atividades e sem preferências começa com score <strong>baixo (0-10)</strong>.
            Conforme você preenche preferências e cria o primeiro negócio, o score já sobe.
          </p>
        </div>

        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 space-y-2">
          <p className="font-medium text-amber-800 dark:text-amber-300">Score na manutenção:</p>
          <p className="text-amber-700 dark:text-amber-400">
            O score é recalculado automaticamente quando você: <strong>atualiza o contato</strong>,
            {' '}<strong>cria ou conclui atividades</strong>, <strong>ganha ou perde um negócio</strong>.
            Leads sem interação há mais de 90 dias perdem pontos. Manter atividades em dia e
            interações recentes é a melhor forma de manter o score alto.
          </p>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-500 italic">
          Dica: O assistente de IA pode explicar o score detalhado de qualquer contato — basta perguntar.
        </p>
      </>
    ),
  },
  {
    id: 'dashboard',
    title: 'Visão Geral (Dashboard)',
    icon: LayoutDashboard,
    color: 'bg-cyan-500',
    content: (
      <>
        <p>
          A <strong>Visão Geral</strong> é o painel de controle do CRM. Mostra um resumo
          completo da sua performance e da saúde da carteira de clientes.
        </p>

        <p className="font-medium text-slate-800 dark:text-slate-200">4 KPIs principais:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-2.5 border border-slate-200 dark:border-slate-700">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Pipeline Total</span>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5">Soma de todos os negócios ativos</p>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-2.5 border border-slate-200 dark:border-slate-700">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Negócios Ativos</span>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5">Quantidade em andamento</p>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-2.5 border border-slate-200 dark:border-slate-700">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Taxa de Conversão</span>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5">% de negócios ganhos</p>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-2.5 border border-slate-200 dark:border-slate-700">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Receita Ganha</span>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5">Total de vendas fechadas</p>
          </div>
        </div>

        <p className="font-medium text-slate-800 dark:text-slate-200">Saúde da carteira:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li><strong>Distribuição</strong> — % de clientes ativos, inativos e em churn</li>
          <li><strong>Negócios parados</strong> — Alertas de deals estagnados com valor em risco</li>
          <li><strong>LTV Médio</strong> — Valor médio de vida dos seus clientes</li>
        </ul>

        <p className="font-medium text-slate-800 dark:text-slate-200">Outros recursos:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Gráfico de funil do pipeline</li>
          <li>Feed das últimas atividades</li>
          <li>Filtro por período (mês atual, último mês, 3 ou 6 meses)</li>
          <li>Seletor de board para trocar entre pipelines</li>
        </ul>
      </>
    ),
  },
  {
    id: 'cockpit',
    title: 'Cockpit do Negócio',
    icon: Target,
    color: 'bg-rose-500',
    content: (
      <>
        <p>
          O <strong>Cockpit</strong> é a central de comando de cada negócio individual.
          Ao clicar em um card no Board, você acessa o cockpit com todas as informações
          e ferramentas para conduzir aquele deal.
        </p>

        <p className="font-medium text-slate-800 dark:text-slate-200">O que você encontra no cockpit:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li><strong>Barra de pipeline</strong> — Visualize em qual estágio está e quanto tempo em cada etapa</li>
          <li><strong>Dados do negócio</strong> — Valor, contato, produtos associados, campos customizados</li>
          <li><strong>Timeline</strong> — Histórico completo de interações e movimentações</li>
          <li><strong>Checklist</strong> — Tarefas necessárias para avançar o negócio</li>
          <li><strong>Saúde do deal</strong> — Indicador de risco e próxima ação recomendada</li>
          <li><strong>Notas</strong> — Anotações livres sobre o negócio</li>
          <li><strong>Assistente de IA</strong> — Sugestões, scripts de venda e templates de mensagem</li>
        </ul>

        <p className="font-medium text-slate-800 dark:text-slate-200">Ações disponíveis:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Mover para outro estágio do pipeline</li>
          <li>Agendar atividades (ligação, visita, follow-up)</li>
          <li>Marcar como ganho ou perdido</li>
          <li>Adicionar ou remover produtos</li>
          <li>Usar templates de mensagem prontos</li>
        </ul>

        <p className="text-xs text-slate-500 dark:text-slate-500 italic">
          Dica: O assistente de IA no cockpit pode sugerir a próxima melhor ação com
          base no histórico do negócio e no perfil do cliente.
        </p>
      </>
    ),
  },
  {
    id: 'inbox',
    title: 'Inbox',
    icon: Inbox,
    color: 'bg-blue-500',
    content: (
      <>
        <p>
          A <strong>Inbox</strong> é seu centro de comando diário. Ela prioriza automaticamente
          os leads que precisam da sua atenção, mostrando primeiro os mais urgentes.
        </p>
        <p className="font-medium text-slate-800 dark:text-slate-200">Como funciona a priorização:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Leads com atividades vencidas aparecem no topo</li>
          <li>Leads quentes (score alto) têm prioridade</li>
          <li>Leads sem contato recente sobem na fila</li>
          <li>Novos leads são destacados para primeiro contato</li>
        </ul>
        <p className="font-medium text-slate-800 dark:text-slate-200 mt-2">Ações rápidas disponíveis:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Registrar ligação ou mensagem</li>
          <li>Agendar atividade de follow-up</li>
          <li>Mover lead para outro estágio</li>
          <li>Adicionar nota rápida</li>
        </ul>
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-green-700 dark:text-green-400 text-xs">
          <strong>Rotina recomendada:</strong> Comece o dia pela Inbox. Resolva os itens
          de cima para baixo — o sistema já ordenou por urgência para você.
        </div>
      </>
    ),
  },
  {
    id: 'boards',
    title: 'Board / Pipeline',
    icon: KanbanSquare,
    color: 'bg-purple-500',
    content: (
      <>
        <p>
          O <strong>Board</strong> mostra seus negócios em formato Kanban, organizados por
          estágios do pipeline. Cada card representa um negócio em andamento.
        </p>
        <p className="font-medium text-slate-800 dark:text-slate-200">Estágios do pipeline:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li><strong>Novo Lead</strong> — Primeiro contato, qualificação inicial</li>
          <li><strong>Contato Feito</strong> — Conversa iniciada</li>
          <li><strong>Visita Agendada</strong> — Visita ao imóvel marcada</li>
          <li><strong>Proposta</strong> — Proposta enviada ao cliente</li>
          <li><strong>Negociação</strong> — Em negociação de valores/condições</li>
          <li><strong>Fechado</strong> — Negócio concluído (ganho ou perdido)</li>
        </ul>
        <p className="font-medium text-slate-800 dark:text-slate-200 mt-2">Interações com os cards:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li><strong>Arrastar</strong> — Mova cards entre colunas para atualizar o estágio</li>
          <li><strong>Clicar</strong> — Abra o cockpit completo do negócio</li>
          <li><strong>Produtos</strong> — Adicione produtos diretamente no card</li>
        </ul>
        <p className="text-xs text-slate-500 dark:text-slate-500 italic">
          Cada card exibe: nome do contato, valor do negócio, produtos e lead score.
        </p>
      </>
    ),
  },
  {
    id: 'contacts',
    title: 'Contatos',
    icon: Users,
    color: 'bg-emerald-500',
    content: (
      <>
        <p>
          A tela de <strong>Contatos</strong> centraliza todos os seus leads e clientes.
          Use os filtros para encontrar rapidamente quem você procura.
        </p>
        <p className="font-medium text-slate-800 dark:text-slate-200">Filtros disponíveis:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Por estágio (novo, em contato, visitou, etc.)</li>
          <li>Por temperatura (frio, morno, quente)</li>
          <li>Por corretor responsável</li>
          <li>Por data de criação</li>
          <li>Ordenação por lead score</li>
        </ul>
        <p className="font-medium text-slate-800 dark:text-slate-200 mt-2">Gestão de contatos:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Clique em um contato para ver todos os detalhes</li>
          <li>Veja histórico completo de interações</li>
          <li>Adicione notas e atividades diretamente</li>
          <li>Acompanhe negócios vinculados ao contato</li>
          <li>Detecção automática de duplicatas</li>
        </ul>
        <p className="font-medium text-slate-800 dark:text-slate-200 mt-2">Informações do contato:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Dados pessoais (nome, telefone, email)</li>
          <li>Preferências (tipo de imóvel, faixa de preço, região)</li>
          <li>Lead score com badge de temperatura</li>
          <li>Campos customizados definidos pelo admin</li>
        </ul>
      </>
    ),
  },
  {
    id: 'activities',
    title: 'Atividades',
    icon: CheckSquare,
    color: 'bg-amber-500',
    content: (
      <>
        <p>
          <strong>Atividades</strong> são tarefas que você agenda para seus leads:
          ligações, visitas, follow-ups, envio de documentos, etc.
        </p>
        <p className="font-medium text-slate-800 dark:text-slate-200">Tipos de atividade:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Ligação telefônica</li>
          <li>Envio de mensagem (WhatsApp, email)</li>
          <li>Visita ao imóvel</li>
          <li>Reunião presencial ou online</li>
          <li>Envio de proposta/documentos</li>
          <li>Follow-up geral</li>
        </ul>

        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 space-y-1.5">
          <p className="font-medium text-amber-800 dark:text-amber-300">Impacto no Lead Score:</p>
          <ul className="list-disc list-inside text-amber-700 dark:text-amber-400 space-y-0.5">
            <li>Mais de 2 atividades concluídas: <strong>+8 pontos</strong></li>
            <li>Mais de 5 atividades concluídas: <strong>+15 pontos</strong></li>
            <li>Atividade recente (&lt; 7 dias): <strong>+20 pontos</strong> na interação</li>
            <li>Sem atividade há 90+ dias: <strong>-10 pontos</strong> por estagnação</li>
          </ul>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-500 italic">
          Dica: Agende sempre a próxima atividade ao concluir uma. Nunca deixe um lead sem follow-up agendado.
        </p>
      </>
    ),
  },
  {
    id: 'reports',
    title: 'Relatórios',
    icon: BarChart3,
    color: 'bg-indigo-500',
    content: (
      <>
        <p>
          Os <strong>Relatórios</strong> mostram métricas de performance individual e da
          equipe. Use para acompanhar seus resultados e identificar oportunidades.
        </p>
        <p className="font-medium text-slate-800 dark:text-slate-200">Métricas disponíveis:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Forecast com barra de meta</li>
          <li>Valor total do pipeline</li>
          <li>Taxa de conversão (win rate)</li>
          <li>Ciclo de vendas (médio, mais rápido, mais lento)</li>
          <li>Negócios fechados (ganhos vs perdidos)</li>
          <li>Tendência de receita dos últimos 6 meses</li>
          <li>Ranking dos top corretores</li>
        </ul>
        <p className="font-medium text-slate-800 dark:text-slate-200 mt-2">Filtros e exportação:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Filtre por período (semana, mês, trimestre)</li>
          <li>Filtre por corretor ou equipe</li>
          <li>Exporte relatório completo em PDF</li>
        </ul>
      </>
    ),
  },
  {
    id: 'notifications',
    title: 'Notificações',
    icon: Bell,
    color: 'bg-pink-500',
    content: (
      <>
        <p>
          O sistema de <strong>Notificações</strong> envia alertas automáticos sobre
          eventos importantes que precisam da sua atenção.
        </p>
        <p className="font-medium text-slate-800 dark:text-slate-200">Tipos de alerta:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-pink-50 dark:bg-pink-900/20 p-2.5 border border-pink-200 dark:border-pink-800">
            <span className="font-semibold text-pink-700 dark:text-pink-300">Aniversário</span>
            <p className="text-pink-600 dark:text-pink-400 mt-0.5">Contato faz aniversário — ótima oportunidade de contato</p>
          </div>
          <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 p-2.5 border border-orange-200 dark:border-orange-800">
            <span className="font-semibold text-orange-700 dark:text-orange-300">Risco de Churn</span>
            <p className="text-orange-600 dark:text-orange-400 mt-0.5">Cliente pode estar desengajando</p>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-2.5 border border-amber-200 dark:border-amber-800">
            <span className="font-semibold text-amber-700 dark:text-amber-300">Deal Estagnado</span>
            <p className="text-amber-600 dark:text-amber-400 mt-0.5">Negócio parado há muito tempo</p>
          </div>
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-2.5 border border-red-200 dark:border-red-800">
            <span className="font-semibold text-red-700 dark:text-red-300">Score Baixo</span>
            <p className="text-red-600 dark:text-red-400 mt-0.5">Lead score caiu — precisa de atenção</p>
          </div>
        </div>
        <p className="font-medium text-slate-800 dark:text-slate-200 mt-2">Funcionalidades:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Filtrar por tipo de alerta ou status (lido/não lido)</li>
          <li>Clicar na notificação abre o contato ou negócio</li>
          <li>Marcar como lido individualmente ou todas de uma vez</li>
          <li>Agrupamento por período (hoje, ontem, esta semana)</li>
        </ul>
      </>
    ),
  },
];

export function InstructionsPage() {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
            Instruções
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Guia completo de uso do CRM para corretores
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {sections.map((section) => (
          <AccordionItem
            key={section.id}
            section={section}
            isOpen={openSections.has(section.id)}
            onToggle={() => toggle(section.id)}
          />
        ))}
      </div>
    </div>
  );
}
