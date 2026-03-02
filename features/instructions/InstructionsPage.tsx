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

const sections: Section[] = [
  {
    id: 'lead-score',
    title: 'Lead Score',
    icon: Flame,
    color: 'bg-orange-500',
    content: (
      <>
        <p>
          O <strong>Lead Score</strong> é uma pontuação de 0 a 100 que indica o quão
          engajado e qualificado um lead está. Quanto maior o score, mais quente o lead.
        </p>
        <p className="font-medium text-slate-800 dark:text-slate-200">7 fatores que influenciam o score:</p>
        <ol className="list-decimal list-inside space-y-1 ml-1">
          <li>Interações recentes (mensagens, ligações)</li>
          <li>Tempo desde o último contato</li>
          <li>Atividades concluídas vs pendentes</li>
          <li>Estágio no pipeline (quanto mais avançado, maior)</li>
          <li>Dados de perfil preenchidos</li>
          <li>Valor dos negócios associados</li>
          <li>Frequência de engajamento</li>
        </ol>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs font-medium">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 py-2">
            Frio (0-33)
          </div>
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 py-2">
            Morno (34-66)
          </div>
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 py-2">
            Quente (67-100)
          </div>
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
          <li><strong>Fechado</strong> — Negócio concluído</li>
        </ul>
        <p className="mt-2">
          <strong>Dica:</strong> Arraste os cards entre colunas para atualizar o estágio do
          negócio. Os cards mostram valor, contato e produtos associados.
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
        </ul>
        <p className="font-medium text-slate-800 dark:text-slate-200 mt-2">Gestão de contatos:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Clique em um contato para ver todos os detalhes</li>
          <li>Veja histórico completo de interações</li>
          <li>Adicione notas e atividades diretamente</li>
          <li>Acompanhe negócios vinculados ao contato</li>
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
        <p className="font-medium text-slate-800 dark:text-slate-200 mt-2">Impacto no Lead Score:</p>
        <p>
          Concluir atividades no prazo <strong>aumenta</strong> o score do lead. Atividades
          atrasadas ou não realizadas <strong>diminuem</strong> o score. Mantenha suas
          atividades em dia para manter seus leads quentes.
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
          <li>Negócios criados, em andamento e fechados</li>
          <li>Taxa de conversão por estágio</li>
          <li>Tempo médio em cada estágio do pipeline</li>
          <li>Atividades realizadas vs planejadas</li>
          <li>Ranking de corretores</li>
        </ul>
        <p className="font-medium text-slate-800 dark:text-slate-200 mt-2">Filtros e exportação:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Filtre por período (semana, mês, trimestre)</li>
          <li>Filtre por corretor ou equipe</li>
          <li>Exporte dados em formato de planilha</li>
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
            Guia de uso do CRM para corretores
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
