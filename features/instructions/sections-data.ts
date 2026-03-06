'use client';

import {
  Flame,
  Inbox,
  KanbanSquare,
  Users,
  CheckSquare,
  BarChart3,
  LayoutDashboard,
  Target,
  Bell,
  Sparkles,
  Phone,
  Settings,
  Zap,
  UserCircle,
} from 'lucide-react';
import type { InstructionSection } from './types';

export const sections: InstructionSection[] = [
  // ─── Lead Score ───────────────────────────────────────────────────────────────
  {
    id: 'lead-score',
    title: 'Lead Score',
    icon: Flame,
    color: 'bg-orange-500',
    content: [
      {
        type: 'paragraph',
        text: 'O **Lead Score** é uma pontuação automática de 0 a 100 que indica o nível de engajamento e qualificação de cada lead. O sistema calcula o score com base em 7 fatores reais do seu relacionamento com o contato.',
      },
      {
        type: 'feature-grid',
        title: 'Classificação por temperatura:',
        cols: 3,
        items: [
          { label: 'Frio (0-30)', color: 'red' },
          { label: 'Morno (31-60)', color: 'amber' },
          { label: 'Quente (61-100)', color: 'green' },
        ],
      },
      {
        type: 'special-component',
        title: 'Tabela de pontuação:',
        component: 'ScoreTable',
      },
      {
        type: 'info-box',
        title: 'Score na criação do lead:',
        text: 'Ao cadastrar um novo contato, o score é calculado imediatamente. Um lead novo sem negócios, sem atividades e sem preferências começa com score **baixo (0-10)**. Conforme você preenche preferências e cria o primeiro negócio, o score já sobe.',
        color: 'blue',
      },
      {
        type: 'info-box',
        title: 'Score na manutenção:',
        text: 'O score é recalculado automaticamente quando você: **atualiza o contato**, **cria ou conclui atividades**, **ganha ou perde um negócio**. Leads sem interação há mais de 90 dias perdem pontos. Manter atividades em dia e interações recentes é a melhor forma de manter o score alto.',
        color: 'amber',
      },
      {
        type: 'tip',
        text: 'Dica: O assistente de IA pode explicar o score detalhado de qualquer contato — basta perguntar.',
      },
    ],
  },

  // ─── Dashboard ────────────────────────────────────────────────────────────────
  {
    id: 'dashboard',
    title: 'Visão Geral (Dashboard)',
    icon: LayoutDashboard,
    color: 'bg-cyan-500',
    content: [
      {
        type: 'paragraph',
        text: 'A **Visão Geral** é o painel de controle do CRM. Mostra um resumo completo da sua performance e da saúde da carteira de clientes.',
      },
      {
        type: 'feature-grid',
        title: '4 KPIs principais:',
        cols: 2,
        items: [
          { label: 'Pipeline Total', description: 'Soma de todos os negócios ativos' },
          { label: 'Negócios Ativos', description: 'Quantidade em andamento' },
          { label: 'Taxa de Conversão', description: '% de negócios ganhos' },
          { label: 'Receita Ganha', description: 'Total de vendas fechadas' },
        ],
      },
      {
        type: 'feature-list',
        title: 'Saúde da carteira:',
        items: [
          { title: 'Distribuição', description: '% de clientes ativos, inativos e em churn' },
          { title: 'Negócios parados', description: 'Alertas de deals estagnados com valor em risco' },
          { title: 'LTV Médio', description: 'Valor médio de vida dos seus clientes' },
        ],
      },
      {
        type: 'feature-list',
        title: 'Outros recursos:',
        items: [
          { title: 'Funil do pipeline', description: 'Gráfico visual com a distribuição dos negócios por estágio' },
          { title: 'Feed de atividades', description: 'Últimas atividades realizadas em tempo real' },
          { title: 'Filtro por período', description: 'Mês atual, último mês, 3 ou 6 meses' },
          { title: 'Seletor de board', description: 'Troque entre pipelines para ver métricas de cada um' },
        ],
      },
    ],
  },

  // ─── Cockpit ──────────────────────────────────────────────────────────────────
  {
    id: 'cockpit',
    title: 'Cockpit do Negócio',
    icon: Target,
    color: 'bg-rose-500',
    content: [
      {
        type: 'paragraph',
        text: 'O **Cockpit** é a central de comando de cada negócio individual. Ao clicar em um card no Board, você acessa o cockpit com todas as informações e ferramentas para conduzir aquele deal.',
      },
      {
        type: 'feature-list',
        title: 'Estrutura do cockpit:',
        items: [
          { title: 'Barra de pipeline', description: 'Visualize em qual estágio está e tempo em cada etapa' },
          { title: 'Dados do negócio', description: 'Valor, contato, produtos, campos customizados' },
          { title: 'Timeline', description: 'Histórico completo de interações e movimentações' },
          { title: 'Checklist', description: 'Tarefas necessárias para avançar o negócio' },
          { title: 'Saúde do deal', description: 'Barra colorida (verde/amarelo/vermelho) com indicador de risco' },
          { title: 'Notas', description: 'Anotações livres sobre o negócio' },
        ],
      },
      {
        type: 'action-grid',
        title: 'Botões de ação rápida:',
        cols: 3,
        items: [
          { label: 'Ligar', color: 'blue' },
          { label: 'WhatsApp', color: 'green' },
          { label: 'Email', color: 'violet' },
          { label: 'Agendar', color: 'amber' },
          { label: 'Template WA', color: 'green' },
          { label: 'Template Email', color: 'violet' },
        ],
      },
      {
        type: 'info-box',
        title: 'Próxima Melhor Ação (IA):',
        text: 'A IA analisa o histórico do deal e sugere a próxima ação ideal. O botão "Executar" aparece no topo do cockpit com a recomendação e o motivo. Você pode aceitar ou atualizar a sugestão.',
        color: 'rose',
      },
    ],
  },

  // ─── Inbox ────────────────────────────────────────────────────────────────────
  {
    id: 'inbox',
    title: 'Inbox',
    icon: Inbox,
    color: 'bg-blue-500',
    content: [
      {
        type: 'paragraph',
        text: 'A **Inbox** é seu centro de comando diário. Ela prioriza automaticamente os leads que precisam da sua atenção, mostrando primeiro os mais urgentes.',
      },
      {
        type: 'feature-grid',
        title: '3 modos de visualização:',
        cols: 3,
        items: [
          { label: 'Overview', description: 'Painel com seções: atrasados, reuniões de hoje, tarefas, sugestões da IA', color: 'blue' },
          { label: 'Lista', description: 'Todas as atividades em lista com ações rápidas por item', color: 'blue' },
          { label: 'Foco', description: 'Um item por vez em tela cheia. Concluir, adiar ou pular', color: 'blue' },
        ],
      },
      {
        type: 'feature-list',
        title: 'Ações rápidas por item:',
        items: [
          { title: 'Concluir', description: 'Marca atividade como feita' },
          { title: 'Adiar', description: 'Reagenda para amanhã' },
          { title: 'Descartar', description: 'Remove sugestão da IA' },
        ],
      },
      {
        type: 'paragraph',
        text: 'A IA analisa seus contatos e sugere ações prioritárias (ligações, follow-ups). Sugestões críticas aparecem destacadas. Você pode aceitar, adiar ou dispensar cada uma.',
      },
      {
        type: 'info-box',
        title: 'Rotina recomendada:',
        text: 'Comece o dia pelo modo Overview para ter visão geral. Use o modo Foco para resolver itens um a um sem distrações.',
        color: 'green',
      },
    ],
  },

  // ─── Boards ───────────────────────────────────────────────────────────────────
  {
    id: 'boards',
    title: 'Board / Pipeline',
    icon: KanbanSquare,
    color: 'bg-purple-500',
    content: [
      {
        type: 'paragraph',
        text: 'O **Board** mostra seus negócios em formato Kanban, organizados por estágios do pipeline. Cada card representa um negócio em andamento.',
      },
      {
        type: 'feature-list',
        title: 'Estágios do pipeline:',
        items: [
          { title: 'Novo Lead', description: 'Primeiro contato, qualificação inicial' },
          { title: 'Contato Feito', description: 'Conversa iniciada' },
          { title: 'Visita Agendada', description: 'Visita ao imóvel marcada' },
          { title: 'Proposta', description: 'Proposta enviada ao cliente' },
          { title: 'Negociação', description: 'Em negociação de valores/condições' },
          { title: 'Fechado', description: 'Negócio concluído (ganho ou perdido)' },
        ],
      },
      {
        type: 'feature-list',
        title: 'O que cada card mostra:',
        items: [
          { title: 'Contato', description: 'Avatar e nome do contato' },
          { title: 'Valor', description: 'Valor do negócio' },
          { title: 'Produtos', description: 'Produtos associados (com picker para adicionar)' },
          { title: 'Tags', description: 'Tags do negócio' },
          { title: 'Responsável', description: 'Corretor responsável' },
          { title: 'Badges', description: 'Status GANHO/PERDIDO quando aplicável' },
        ],
      },
      {
        type: 'feature-list',
        title: 'Interações com os cards:',
        items: [
          { title: 'Arrastar', description: 'Mova cards entre colunas para mudar de estágio' },
          { title: 'Clicar', description: 'Abra o cockpit completo do negócio' },
          { title: 'Produto', description: 'Adicione produtos direto no card (busca inline)' },
        ],
      },
      {
        type: 'feature-list',
        title: 'Menu de ações rápidas (no card):',
        items: [
          { title: 'Ganhar negócio', description: 'Marca como venda fechada' },
          { title: 'Perder negócio', description: 'Marca como perdido' },
          { title: 'Agendar Call / Email / Meeting', description: 'Cria atividade rápida' },
          { title: 'Mover para etapa', description: 'Seleciona novo estágio' },
          { title: 'Excluir negócio', description: 'Remove o deal' },
        ],
      },
    ],
  },

  // ─── Contatos ─────────────────────────────────────────────────────────────────
  {
    id: 'contacts',
    title: 'Contatos',
    icon: Users,
    color: 'bg-emerald-500',
    content: [
      {
        type: 'paragraph',
        text: 'A tela de **Contatos** centraliza todos os seus leads e clientes em uma tabela com colunas ordenáveis e coluna de nome fixa para fácil navegação.',
      },
      {
        type: 'feature-list',
        title: 'Tabela de contatos:',
        items: [
          { title: 'Colunas ordenáveis', description: 'Clique no cabeçalho para ordenar por qualquer coluna' },
          { title: 'Coluna fixa', description: 'Nome do contato fica fixo ao rolar horizontalmente' },
          { title: 'Clique na linha', description: 'Abre o modal de detalhe completo do contato' },
          { title: 'Seleção múltipla', description: 'Marque checkbox para ações em massa' },
        ],
      },
      {
        type: 'feature-list',
        title: 'Filtros avançados:',
        items: [
          { title: 'Classificação', description: 'Cliente, prospect, parceiro' },
          { title: 'Temperatura', description: 'Frio, morno, quente' },
          { title: 'Outros filtros', description: 'Tipo de contato, corretor responsável, fonte, período de cadastro' },
          { title: 'Busca', description: 'Pesquise por nome, email ou telefone' },
        ],
      },
      {
        type: 'feature-list',
        title: 'Modal de detalhe do contato:',
        items: [
          { title: 'Dados pessoais', description: 'Nome, email, telefone, CPF, endereço' },
          { title: 'Preferências', description: 'Tipo de imóvel, faixa de preço, urgência, regiões' },
          { title: 'Campos customizados', description: 'Editáveis inline' },
          { title: 'Tags', description: 'Adicionar e remover tags' },
          { title: 'Timeline', description: 'Histórico de atividades e alterações de score' },
          { title: 'Negócios', description: 'Lista de deals vinculados com valor e estágio' },
          { title: 'Barra de pipeline', description: 'Progresso do contato nos estágios' },
        ],
      },
      {
        type: 'feature-list',
        title: 'Importar e exportar:',
        items: [
          { title: 'Exportar CSV', description: 'Baixe seus contatos filtrados em planilha' },
          { title: 'Importar CSV', description: 'Assistente de 4 etapas: upload, mapeamento de colunas, criação de negócios opcional, confirmação' },
        ],
      },
    ],
  },

  // ─── Atividades ───────────────────────────────────────────────────────────────
  {
    id: 'activities',
    title: 'Atividades',
    icon: CheckSquare,
    color: 'bg-amber-500',
    content: [
      {
        type: 'paragraph',
        text: '**Atividades** são tarefas que você agenda para seus leads: ligações, visitas, follow-ups, envio de documentos, etc.',
      },
      {
        type: 'feature-grid',
        title: '3 modos de visualização:',
        cols: 3,
        items: [
          { label: 'Lista', description: 'Tabela com filtros, busca e ordenação', color: 'amber' },
          { label: 'Semana', description: 'Calendário semanal dia a dia', color: 'amber' },
          { label: 'Mês', description: 'Calendário mensal completo', color: 'amber' },
        ],
      },
      {
        type: 'feature-list',
        title: 'Abas:',
        items: [
          { title: 'Atividades', description: 'Pendentes (a fazer, atrasadas, adiadas)' },
          { title: 'Histórico', description: 'Atividades já concluídas' },
        ],
      },
      {
        type: 'paragraph',
        text: 'Tipos disponíveis: Call, Email, Meeting, Task, Note.',
      },
      {
        type: 'feature-list',
        title: 'Ações por atividade:',
        items: [
          { title: 'Concluir / desfazer', description: 'Marca ou desmarca atividade como feita' },
          { title: 'Editar', description: 'Altere detalhes da atividade' },
          { title: 'Duplicar', description: 'Crie cópia da atividade' },
          { title: 'Adiar (snooze)', description: 'Reagenda para amanhã' },
          { title: 'Excluir', description: 'Remove a atividade' },
        ],
      },
      {
        type: 'paragraph',
        text: '**Ações em massa:** Selecione múltiplas atividades para concluir, adiar ou excluir todas de uma vez.',
      },
      {
        type: 'info-box',
        title: 'Impacto no Lead Score:',
        color: 'amber',
        items: [
          'Mais de 2 atividades concluídas: **+8 pontos**',
          'Mais de 5 atividades concluídas: **+15 pontos**',
          'Atividade recente (< 7 dias): **+20 pontos** na interação',
          'Sem atividade há 90+ dias: **-10 pontos** por estagnação',
        ],
      },
      {
        type: 'tip',
        text: 'Dica: Agende sempre a próxima atividade ao concluir uma. Nunca deixe um lead sem follow-up agendado.',
      },
    ],
  },

  // ─── Relatórios ───────────────────────────────────────────────────────────────
  {
    id: 'reports',
    title: 'Relatórios',
    icon: BarChart3,
    color: 'bg-indigo-500',
    content: [
      {
        type: 'paragraph',
        text: 'Os **Relatórios** mostram métricas de performance individual e da equipe. Use para acompanhar seus resultados e identificar oportunidades.',
      },
      {
        type: 'feature-list',
        title: 'Métricas disponíveis:',
        items: [
          { title: 'Forecast', description: 'Previsão de receita com barra de meta' },
          { title: 'Pipeline Total', description: 'Valor total dos negócios em andamento' },
          { title: 'Win Rate', description: 'Taxa de conversão de negócios' },
          { title: 'Ciclo de vendas', description: 'Médio, mais rápido e mais lento' },
          { title: 'Negócios fechados', description: 'Comparativo ganhos vs perdidos' },
          { title: 'Tendência', description: 'Receita dos últimos 6 meses' },
          { title: 'Ranking', description: 'Top corretores da equipe' },
        ],
      },
      {
        type: 'feature-list',
        title: 'Filtros e exportação:',
        items: [
          { title: 'Período', description: 'Filtre por semana, mês ou trimestre' },
          { title: 'Corretor/equipe', description: 'Filtre por pessoa ou grupo' },
          { title: 'Exportar PDF', description: 'Baixe o relatório completo' },
        ],
      },
    ],
  },

  // ─── Notificações ─────────────────────────────────────────────────────────────
  {
    id: 'notifications',
    title: 'Notificações',
    icon: Bell,
    color: 'bg-pink-500',
    content: [
      {
        type: 'paragraph',
        text: 'O sistema de **Notificações** envia alertas automáticos sobre eventos importantes que precisam da sua atenção.',
      },
      {
        type: 'feature-grid',
        title: 'Tipos de alerta:',
        cols: 2,
        items: [
          { label: 'Aniversário', description: 'Contato faz aniversário — ótima oportunidade de contato', color: 'pink' },
          { label: 'Risco de Churn', description: 'Cliente pode estar desengajando', color: 'orange' },
          { label: 'Deal Estagnado', description: 'Negócio parado há muito tempo', color: 'amber' },
          { label: 'Score Baixo', description: 'Lead score caiu — precisa de atenção', color: 'red' },
        ],
      },
      {
        type: 'feature-list',
        title: 'Funcionalidades:',
        items: [
          { title: 'Filtrar', description: 'Por tipo de alerta ou status (lido/não lido)' },
          { title: 'Navegar', description: 'Clicar na notificação abre o contato ou negócio' },
          { title: 'Marcar como lido', description: 'Individualmente ou todas de uma vez' },
          { title: 'Agrupamento', description: 'Por período (hoje, ontem, esta semana)' },
        ],
      },
    ],
  },

  // ─── Assistente de IA ─────────────────────────────────────────────────────────
  {
    id: 'ai-assistant',
    title: 'Assistente de IA',
    icon: Sparkles,
    color: 'bg-violet-500',
    content: [
      {
        type: 'paragraph',
        text: 'O **Assistente de IA** está disponível em diversas partes do CRM para ajudar você a tomar decisões e ser mais produtivo.',
      },
      {
        type: 'feature-list',
        title: 'Onde encontrar a IA:',
        items: [
          { title: 'Painel lateral', description: 'Clique no ícone de estrela no header para abrir o chat' },
          { title: 'Cockpit do negócio', description: 'IA contextual com dados do deal aberto' },
          { title: 'Inbox', description: 'Sugestões automáticas de próximas ações' },
          { title: 'Hub de IA', description: 'Chat dedicado para perguntas sobre sua carteira' },
        ],
      },
      {
        type: 'feature-list',
        title: 'O que você pode perguntar:',
        items: [
          { title: 'Rotina', description: '"O que tenho pra fazer hoje?"' },
          { title: 'Pipeline', description: '"Mostre meu pipeline"' },
          { title: 'Alertas', description: '"Quais deals estão parados?"' },
          { title: 'Score', description: '"Explique o score do contato X"' },
          { title: 'Ações', description: '"Crie uma reunião com [Nome] amanhã às 14h"' },
        ],
      },
      {
        type: 'feature-list',
        title: 'No cockpit do negócio:',
        items: [
          { title: 'Próxima melhor ação', description: 'Recomendação com motivo baseada no histórico' },
          { title: 'Scripts de venda', description: 'Personalizados para cada negócio' },
          { title: 'Templates', description: 'Mensagens prontas para WhatsApp e Email' },
          { title: 'Saúde do deal', description: 'Indicador visual do estado do negócio' },
        ],
      },
      {
        type: 'info-box',
        title: 'Configuração:',
        text: 'A IA precisa ser configurada pelo admin em Configurações > Centro de IA, com a chave de API do provedor (Google Gemini, OpenAI ou Anthropic).',
        color: 'violet',
      },
    ],
  },

  // ─── Prospecção ──────────────────────────────────────────────────────────────
  {
    id: 'prospecting',
    title: 'Prospecção',
    icon: Phone,
    color: 'bg-teal-500',
    roles: ['admin', 'corretor', 'diretor'],
    content: [
      {
        type: 'paragraph',
        text: 'A **Prospecção** é o módulo de discador automático do CRM. Acesse pelo menu lateral > Prospecção para montar filas de ligação e ligar para seus leads de forma organizada e produtiva.',
      },
      {
        type: 'feature-grid',
        title: 'Funcionalidades principais:',
        cols: 2,
        items: [
          { label: 'Fila de Ligação', description: 'Monte filas com filtros: temperatura, classificação, tags, score', color: 'teal' },
          { label: 'Discador', description: 'Ligue um contato por vez com painel de ações e scripts', color: 'teal' },
          { label: 'Métricas', description: 'KPIs de ligações, funil de conversão e ranking da equipe', color: 'teal' },
          { label: 'Insights', description: 'IA analisa padrões e sugere melhorias automaticamente', color: 'teal' },
        ],
      },
      {
        type: 'feature-list',
        title: 'Como usar o discador:',
        items: [
          { title: 'Monte a fila', description: 'Filtre contatos por temperatura, classificação, corretor ou tags e adicione à fila' },
          { title: 'Inicie a sessão', description: 'Clique em "Iniciar Sessão" para ligar um contato por vez' },
          { title: 'Registre o resultado', description: 'Após cada ligação, registre como: Ligação (L), Proposta (P), E-mail (E) ou Skip (S)' },
          { title: 'Use os scripts', description: 'Scripts rápidos de abordagem ficam disponíveis durante a ligação' },
          { title: 'Finalize', description: 'Ao terminar, veja o resumo da sessão com total de ligações e resultados' },
        ],
      },
      {
        type: 'feature-list',
        title: 'Metas diárias:',
        items: [
          { title: 'Meta de ligações', description: 'Defina quantas ligações quer fazer por dia' },
          { title: 'Taxa de conexão', description: 'Acompanhe sua meta de contatos que atendem' },
          { title: 'Heatmap de horário', description: 'Veja quais horários do dia têm melhor taxa de atendimento' },
          { title: 'Acompanhamento por corretor', description: 'Diretores e admins podem definir e acompanhar metas individuais da equipe' },
        ],
      },
      {
        type: 'feature-list',
        title: 'Filas salvas:',
        items: [
          { title: 'Salvar fila', description: 'Salve combinações de filtros como filas favoritas para reutilizar' },
          { title: 'Compartilhar', description: 'Filas salvas podem ser compartilhadas com a equipe' },
          { title: 'Exportar PDF', description: 'Exporte a fila de contatos em formato PDF para uso offline' },
        ],
      },
      {
        type: 'feature-list',
        title: 'Aba de métricas:',
        items: [
          { title: 'KPIs', description: 'Total de ligações, taxa de conversão, tempo médio de sessão' },
          { title: 'Funil', description: 'Visualize a progressão: ligações > propostas > conversões' },
          { title: 'Gráfico diário', description: 'Acompanhe seu volume de ligações dia a dia' },
          { title: 'Insights automáticos', description: 'A IA identifica padrões e sugere ações para melhorar resultados' },
        ],
      },
      {
        type: 'info-box',
        title: 'Para administradores e diretores:',
        color: 'teal',
        items: [
          'Visualize a fila de toda a equipe na aba "Fila da Equipe"',
          'Acompanhe o ranking de corretores por volume e conversão',
          'Diretores podem reatribuir contatos da fila em lote',
          'Defina metas diárias individuais para cada corretor',
        ],
      },
      {
        type: 'info-box',
        title: 'Atualização em tempo real:',
        text: 'A fila, metas e métricas são atualizadas automaticamente em tempo real. Se outro membro da equipe adicionar ou remover contatos da fila, você verá a mudança instantaneamente.',
        color: 'blue',
      },
      {
        type: 'tip',
        text: 'Dica: Salve suas filas mais usadas para acessar rapidamente e exporte em PDF antes de sair para visitas externas.',
      },
    ],
  },

  // ─── Configurações (NOVO) ─────────────────────────────────────────────────────
  {
    id: 'settings',
    title: 'Configurações',
    icon: Settings,
    color: 'bg-slate-500',
    roles: ['admin', 'diretor'],
    content: [
      {
        type: 'paragraph',
        text: 'As **Configurações** permitem personalizar o CRM para sua equipe. Acesse pelo menu lateral > Configurações. A disponibilidade de cada aba depende do seu nível de acesso.',
      },
      {
        type: 'feature-grid',
        title: '6 abas de configuração:',
        cols: 3,
        items: [
          { label: 'Geral', description: 'Página inicial, tags e campos customizados' },
          { label: 'Produtos', description: 'Catálogo de imóveis e serviços' },
          { label: 'Integrações', description: 'Webhooks, API e conexões externas' },
          { label: 'Centro de IA', description: 'Provedor, chave de API e funcionalidades' },
          { label: 'Dados', description: 'Estatísticas e limpeza de dados' },
          { label: 'Equipe', description: 'Usuários, convites e permissões' },
        ],
      },
      {
        type: 'feature-list',
        title: 'Geral:',
        items: [
          { title: 'Página inicial', description: 'Escolha qual tela abre ao fazer login (Dashboard, Inbox, Board)' },
          { title: 'Tags', description: 'Crie e edite tags para organizar contatos e negócios' },
          { title: 'Campos customizados', description: 'Adicione campos extras ao formulário de contato' },
        ],
      },
      {
        type: 'feature-list',
        title: 'Produtos e Serviços (admin):',
        items: [
          { title: 'Catálogo', description: 'Cadastre imóveis, valores e descrições' },
          { title: 'Vincular a negócios', description: 'Produtos aparecem nos cards do Board e no Cockpit' },
        ],
      },
      {
        type: 'feature-list',
        title: 'Centro de IA (admin):',
        items: [
          { title: 'Provedor', description: 'Escolha entre Google Gemini, OpenAI ou Anthropic' },
          { title: 'Chave de API', description: 'Insira a chave do provedor para ativar a IA' },
          { title: 'Funcionalidades', description: 'Ative ou desative features de IA individualmente (sugestões, insights, chat)' },
        ],
      },
      {
        type: 'feature-list',
        title: 'Equipe (admin/diretor):',
        items: [
          { title: 'Gerenciar usuários', description: 'Veja todos os membros da equipe e seus papéis' },
          { title: 'Convidar', description: 'Envie convites por email para novos corretores' },
          { title: 'Papéis', description: 'Defina como Admin (acesso total), Diretor (equipe + relatórios) ou Corretor (próprios leads)' },
        ],
      },
      {
        type: 'info-box',
        title: 'Quem pode acessar o quê:',
        color: 'slate',
        items: [
          '**Admin:** Acesso a todas as 6 abas',
          '**Diretor:** Geral + Equipe (sem Produtos, Integrações, IA ou Dados)',
          '**Corretor:** Apenas Geral (tags e página inicial)',
        ],
      },
      {
        type: 'tip',
        text: 'Dica: Configure primeiro o Centro de IA e o catálogo de Produtos — eles potencializam todo o resto do sistema.',
      },
    ],
  },

  // ─── Central de Decisões ────────────────────────────────────────────────────
  {
    id: 'decisions',
    title: 'Central de Decisões',
    icon: Zap,
    color: 'bg-yellow-500',
    content: [
      {
        type: 'paragraph',
        text: 'A **Central de Decisões** usa inteligência artificial para analisar todo o seu CRM e sugerir ações proativas. Acesse pelo menu lateral > Decisões para ver recomendações personalizadas sobre seus negócios e contatos.',
      },
      {
        type: 'feature-grid',
        title: '4 níveis de prioridade:',
        cols: 2,
        items: [
          { label: 'Crítico', description: 'Ação urgente necessária — deal em risco ou atividade muito atrasada', color: 'red' },
          { label: 'Importante', description: 'Requer atenção em breve — oportunidade pode esfriar', color: 'orange' },
          { label: 'Moderado', description: 'Ação recomendada — melhoria de processo ou follow-up', color: 'yellow' },
          { label: 'Baixo', description: 'Sugestão opcional — otimização de rotina', color: 'slate' },
        ],
      },
      {
        type: 'feature-list',
        title: 'Como funciona:',
        items: [
          { title: 'Analisar', description: 'Clique em "Analisar Agora" para a IA varrer seus negócios, atividades e contatos' },
          { title: 'Revisar', description: 'Veja cada sugestão com o motivo e a ação recomendada' },
          { title: 'Aprovar', description: 'Aceite a sugestão e a ação será executada automaticamente' },
          { title: 'Rejeitar', description: 'Descarte a sugestão se não for relevante' },
          { title: 'Adiar', description: 'Adie para revisar depois' },
        ],
      },
      {
        type: 'feature-list',
        title: 'Exemplos de sugestões:',
        items: [
          { title: 'Deal parado', description: '"O negócio X está parado há 15 dias — agende um follow-up"' },
          { title: 'Atividade atrasada', description: '"Você tem 3 ligações atrasadas — reagende ou conclua"' },
          { title: 'Lead esfriando', description: '"O contato Y não é contatado há 30 dias — retome o relacionamento"' },
          { title: 'Oportunidade', description: '"O lead Z tem score alto e negócio em fase final — priorize o fechamento"' },
        ],
      },
      {
        type: 'info-box',
        title: 'Ações em lote:',
        text: 'Use o botão "Aprovar todas as sugeridas" para aceitar todas as recomendações de uma vez, ou "Limpar tudo" para recomeçar a análise do zero.',
        color: 'yellow',
      },
      {
        type: 'tip',
        text: 'Dica: Rode a análise no início do dia para começar com uma lista priorizada de ações.',
      },
    ],
  },

  // ─── Meu Perfil ─────────────────────────────────────────────────────────────
  {
    id: 'profile',
    title: 'Meu Perfil',
    icon: UserCircle,
    color: 'bg-sky-500',
    content: [
      {
        type: 'paragraph',
        text: 'Na página **Meu Perfil** você gerencia suas informações pessoais e segurança. Acesse clicando no seu avatar no canto superior direito.',
      },
      {
        type: 'feature-list',
        title: 'Dados pessoais:',
        items: [
          { title: 'Nome e sobrenome', description: 'Como você aparece para a equipe' },
          { title: 'Apelido', description: 'Nome curto — como gostaria de ser chamado no sistema' },
          { title: 'Telefone', description: 'Seu número de contato profissional' },
          { title: 'Foto de perfil', description: 'Envie ou remova sua foto (máximo 2MB)' },
        ],
      },
      {
        type: 'feature-list',
        title: 'Segurança:',
        items: [
          { title: 'Alterar senha', description: 'Defina uma nova senha (mínimo 6 caracteres com maiúscula, minúscula e número)' },
          { title: 'Alterar email', description: 'Mude seu email de acesso — um email de confirmação será enviado' },
        ],
      },
      {
        type: 'info-box',
        title: 'Taxa de comissão:',
        text: 'Administradores e diretores podem definir sua taxa de comissão padrão (0-100%). Esse valor é usado como base para cálculos quando o negócio não possui taxa específica.',
        color: 'sky',
      },
    ],
  },
];
