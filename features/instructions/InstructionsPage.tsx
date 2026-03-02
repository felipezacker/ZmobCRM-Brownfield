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
  Sparkles,
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

        <p className="font-medium text-slate-800 dark:text-slate-200">Estrutura do cockpit:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li><strong>Barra de pipeline</strong> — Visualize em qual estágio está e tempo em cada etapa</li>
          <li><strong>Dados do negócio</strong> — Valor, contato, produtos, campos customizados</li>
          <li><strong>Timeline</strong> — Histórico completo de interações e movimentações</li>
          <li><strong>Checklist</strong> — Tarefas necessárias para avançar o negócio</li>
          <li><strong>Saúde do deal</strong> — Barra colorida (verde/amarelo/vermelho) com indicador de risco</li>
          <li><strong>Notas</strong> — Anotações livres sobre o negócio</li>
        </ul>

        <p className="font-medium text-slate-800 dark:text-slate-200">Botões de ação rápida:</p>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-2 text-center border border-blue-200 dark:border-blue-800">
            <span className="font-semibold text-blue-700 dark:text-blue-300">Ligar</span>
          </div>
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-2 text-center border border-green-200 dark:border-green-800">
            <span className="font-semibold text-green-700 dark:text-green-300">WhatsApp</span>
          </div>
          <div className="rounded-lg bg-violet-50 dark:bg-violet-900/20 p-2 text-center border border-violet-200 dark:border-violet-800">
            <span className="font-semibold text-violet-700 dark:text-violet-300">Email</span>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-2 text-center border border-amber-200 dark:border-amber-800">
            <span className="font-semibold text-amber-700 dark:text-amber-300">Agendar</span>
          </div>
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-2 text-center border border-green-200 dark:border-green-800">
            <span className="font-semibold text-green-700 dark:text-green-300">Template WA</span>
          </div>
          <div className="rounded-lg bg-violet-50 dark:bg-violet-900/20 p-2 text-center border border-violet-200 dark:border-violet-800">
            <span className="font-semibold text-violet-700 dark:text-violet-300">Template Email</span>
          </div>
        </div>

        <div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 p-3 space-y-1.5">
          <p className="font-medium text-rose-800 dark:text-rose-300">Próxima Melhor Ação (IA):</p>
          <p className="text-rose-700 dark:text-rose-400 text-xs">
            A IA analisa o histórico do deal e sugere a próxima ação ideal. O botão
            &quot;Executar&quot; aparece no topo do cockpit com a recomendação e o motivo.
            Você pode aceitar ou atualizar a sugestão.
          </p>
        </div>
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

        <p className="font-medium text-slate-800 dark:text-slate-200">3 modos de visualização:</p>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-2.5 border border-blue-200 dark:border-blue-800">
            <span className="font-semibold text-blue-700 dark:text-blue-300">Overview</span>
            <p className="text-blue-600 dark:text-blue-400 mt-0.5">Painel com seções: atrasados, reuniões de hoje, tarefas, sugestões da IA</p>
          </div>
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-2.5 border border-blue-200 dark:border-blue-800">
            <span className="font-semibold text-blue-700 dark:text-blue-300">Lista</span>
            <p className="text-blue-600 dark:text-blue-400 mt-0.5">Todas as atividades em lista com ações rápidas por item</p>
          </div>
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-2.5 border border-blue-200 dark:border-blue-800">
            <span className="font-semibold text-blue-700 dark:text-blue-300">Foco</span>
            <p className="text-blue-600 dark:text-blue-400 mt-0.5">Um item por vez em tela cheia. Concluir, adiar ou pular</p>
          </div>
        </div>

        <p className="font-medium text-slate-800 dark:text-slate-200">Ações rápidas por item:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li><strong>Concluir</strong> — Marca atividade como feita</li>
          <li><strong>Adiar</strong> — Reagenda para amanhã</li>
          <li><strong>Descartar</strong> — Remove sugestão da IA</li>
        </ul>

        <p className="font-medium text-slate-800 dark:text-slate-200">Sugestões da IA:</p>
        <p>
          A IA analisa seus contatos e sugere ações prioritárias (ligações, follow-ups).
          Sugestões críticas aparecem destacadas. Você pode aceitar, adiar ou dispensar cada uma.
        </p>

        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-green-700 dark:text-green-400 text-xs">
          <strong>Rotina recomendada:</strong> Comece o dia pelo modo Overview para ter visão geral.
          Use o modo Foco para resolver itens um a um sem distrações.
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

        <p className="font-medium text-slate-800 dark:text-slate-200 mt-2">O que cada card mostra:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Avatar e nome do contato</li>
          <li>Valor do negócio</li>
          <li>Produtos associados (com picker para adicionar)</li>
          <li>Tags do negócio</li>
          <li>Corretor responsável</li>
          <li>Badges de status (GANHO/PERDIDO) quando aplicável</li>
        </ul>

        <p className="font-medium text-slate-800 dark:text-slate-200 mt-2">Interações com os cards:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li><strong>Arrastar</strong> — Mova cards entre colunas para mudar de estágio</li>
          <li><strong>Clicar</strong> — Abra o cockpit completo do negócio</li>
          <li><strong>Produto</strong> — Adicione produtos direto no card (busca inline)</li>
        </ul>

        <p className="font-medium text-slate-800 dark:text-slate-200 mt-2">Menu de ações rápidas (no card):</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li><strong>Ganhar negócio</strong> — Marca como venda fechada</li>
          <li><strong>Perder negócio</strong> — Marca como perdido</li>
          <li><strong>Agendar Call / Email / Meeting</strong> — Cria atividade rápida</li>
          <li><strong>Mover para etapa</strong> — Seleciona novo estágio</li>
          <li><strong>Excluir negócio</strong> — Remove o deal</li>
        </ul>
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
          A tela de <strong>Contatos</strong> centraliza todos os seus leads e clientes
          em uma tabela com colunas ordenáveis e coluna de nome fixa para fácil navegação.
        </p>

        <p className="font-medium text-slate-800 dark:text-slate-200">Tabela de contatos:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li><strong>Colunas ordenáveis</strong> — Clique no cabeçalho para ordenar por qualquer coluna</li>
          <li><strong>Coluna fixa</strong> — Nome do contato fica fixo ao rolar horizontalmente</li>
          <li><strong>Clique na linha</strong> — Abre o modal de detalhe completo do contato</li>
          <li><strong>Seleção múltipla</strong> — Marque checkbox para ações em massa</li>
        </ul>

        <p className="font-medium text-slate-800 dark:text-slate-200 mt-2">Filtros avançados:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Classificação (cliente, prospect, parceiro)</li>
          <li>Temperatura (frio, morno, quente)</li>
          <li>Tipo de contato, corretor responsável, fonte</li>
          <li>Período de cadastro</li>
          <li>Busca por nome, email ou telefone</li>
        </ul>

        <p className="font-medium text-slate-800 dark:text-slate-200 mt-2">Modal de detalhe do contato:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li><strong>Dados pessoais</strong> — Nome, email, telefone, CPF, endereço</li>
          <li><strong>Preferências</strong> — Tipo de imóvel, faixa de preço, urgência, regiões</li>
          <li><strong>Campos customizados</strong> — Editáveis inline</li>
          <li><strong>Tags</strong> — Adicionar e remover tags</li>
          <li><strong>Timeline</strong> — Histórico de atividades e alterações de score</li>
          <li><strong>Negócios</strong> — Lista de deals vinculados com valor e estágio</li>
          <li><strong>Barra de pipeline</strong> — Progresso do contato nos estágios</li>
          <li>Botões de ação: Ligar, WhatsApp, Email</li>
        </ul>

        <p className="font-medium text-slate-800 dark:text-slate-200 mt-2">Importar e exportar:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li><strong>Exportar CSV</strong> — Baixe seus contatos filtrados em planilha</li>
          <li><strong>Importar CSV</strong> — Assistente de 4 etapas: upload, mapeamento de
            colunas, criação de negócios opcional, confirmação</li>
          <li>Suporte a delimitadores automáticos e compatibilidade com Excel</li>
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

        <p className="font-medium text-slate-800 dark:text-slate-200">3 modos de visualização:</p>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-2.5 border border-amber-200 dark:border-amber-800">
            <span className="font-semibold text-amber-700 dark:text-amber-300">Lista</span>
            <p className="text-amber-600 dark:text-amber-400 mt-0.5">Tabela com filtros, busca e ordenação</p>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-2.5 border border-amber-200 dark:border-amber-800">
            <span className="font-semibold text-amber-700 dark:text-amber-300">Semana</span>
            <p className="text-amber-600 dark:text-amber-400 mt-0.5">Calendário semanal dia a dia</p>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-2.5 border border-amber-200 dark:border-amber-800">
            <span className="font-semibold text-amber-700 dark:text-amber-300">Mês</span>
            <p className="text-amber-600 dark:text-amber-400 mt-0.5">Calendário mensal completo</p>
          </div>
        </div>

        <p className="font-medium text-slate-800 dark:text-slate-200">Abas:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li><strong>Atividades</strong> — Pendentes (a fazer, atrasadas, adiadas)</li>
          <li><strong>Histórico</strong> — Atividades já concluídas</li>
        </ul>

        <p className="font-medium text-slate-800 dark:text-slate-200">Tipos: </p>
        <p>Call, Email, Meeting, Task, Note</p>

        <p className="font-medium text-slate-800 dark:text-slate-200">Ações por atividade:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Concluir / desfazer conclusão</li>
          <li>Editar detalhes</li>
          <li>Duplicar atividade</li>
          <li>Adiar para amanhã (snooze)</li>
          <li>Excluir</li>
        </ul>

        <p className="font-medium text-slate-800 dark:text-slate-200">Ações em massa:</p>
        <p>Selecione múltiplas atividades para concluir, adiar ou excluir todas de uma vez.</p>

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
  {
    id: 'ai-assistant',
    title: 'Assistente de IA',
    icon: Sparkles,
    color: 'bg-violet-500',
    content: (
      <>
        <p>
          O <strong>Assistente de IA</strong> está disponível em diversas partes do CRM
          para ajudar você a tomar decisões e ser mais produtivo.
        </p>

        <p className="font-medium text-slate-800 dark:text-slate-200">Onde encontrar a IA:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li><strong>Painel lateral</strong> — Clique no ícone de estrela no header para abrir o chat</li>
          <li><strong>Cockpit do negócio</strong> — IA contextual com dados do deal aberto</li>
          <li><strong>Inbox</strong> — Sugestões automáticas de próximas ações</li>
          <li><strong>Hub de IA</strong> — Chat dedicado para perguntas sobre sua carteira</li>
        </ul>

        <p className="font-medium text-slate-800 dark:text-slate-200">O que você pode perguntar:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>&quot;O que tenho pra fazer hoje?&quot;</li>
          <li>&quot;Mostre meu pipeline&quot;</li>
          <li>&quot;Quais deals estão parados?&quot;</li>
          <li>&quot;Explique o score do contato X&quot;</li>
          <li>&quot;Crie uma reunião com [Nome] amanhã às 14h&quot;</li>
        </ul>

        <p className="font-medium text-slate-800 dark:text-slate-200">No cockpit do negócio:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Próxima melhor ação recomendada com motivo</li>
          <li>Scripts de venda personalizados</li>
          <li>Templates de mensagem (WhatsApp e Email)</li>
          <li>Indicador de saúde do deal</li>
        </ul>

        <div className="rounded-lg bg-violet-50 dark:bg-violet-900/20 p-3 text-violet-700 dark:text-violet-400 text-xs">
          <strong>Configuração:</strong> A IA precisa ser configurada pelo admin em
          Configurações → Centro de IA, com a chave de API do provedor (Google Gemini, OpenAI ou Anthropic).
        </div>
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
