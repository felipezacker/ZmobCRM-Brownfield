# Backlog — Evolucoes Estrategicas da Central de Prospeccao

> **Data:** 2026-03-12
> **Origem:** Analise estrategica @pm (Morgan) — diagnostico de melhorias alem do escopo CP-4/CP-5
> **Total de itens:** 10 (1 done, 2 mapeados, 7 backlog)

---

## Resumo

| # | Melhoria | Impacto | Esforco | Prioridade | Destino | Status |
|---|----------|---------|---------|------------|---------|--------|
| 1 | WhatsApp + QR Code no CallModal | Alto | Baixo | Must | PR #33 | **Done** |
| 2 | AI Assistant na sessao de prospeccao | Alto | Medio | Must | Backlog | Pendente |
| 3 | Reordenacao inteligente da fila | Alto | Baixo | Must | Backlog | Pendente |
| 4 | Cadencias multi-canal (Sequences) | Alto | Alto | Should | Backlog | Pendente |
| 5 | Gamificacao para corretores | Medio | Medio | Should | Backlog | Pendente |
| 6 | Dashboard real-time para gestores | Medio | Medio | Should | **CP-5.6** | Draft |
| 7 | Importacao de listas externas | Medio | Baixo | Could | **CP-IMP-1** | Ready |
| 8 | Discador automatico (Auto-Dialer VoIP) | Alto | Muito Alto | Won't (now) | — | Descartado (agora) |
| 9 | AI scoring dinamico | Alto | Alto | Could | Backlog | Pendente |
| 10 | Analise de objecoes com AI | Medio | Medio | Could | Backlog | Pendente |

---

## Itens em Backlog (detalhes)

### #2 — AI Assistant na Sessao de Prospeccao (Must)

A central nao tem integracao com o AIHub existente. Oportunidades:
- Sugestao de "proximo melhor contato" baseado em lead score + heatmap
- Sugestao de script em tempo real baseado no perfil do contato
- Resumo automatico do historico do contato antes de cada ligacao

**Nota:** AIHub ja possui 36 tools (contact, deal, activity, pipeline, note, prospecting). Integracao seria consumir esses tools dentro do PowerDialer.

---

### #3 — Reordenacao Inteligente da Fila (Must)

Hoje: ordenacao por posicao ou lead score (manual) + drag-and-drop (CP-4.7 Done).
Evolucao: ordenacao automatica combinando:
- Melhor horario para ligar (dados do ConnectionHeatmap)
- Lead score
- Tempo desde ultimo contato
- Temperatura (HOT > WARM > COLD)

**Nota:** CP-4 backlog item #1 ja mencionava isso como "Ordenacao inteligente por heatmap".

---

### #4 — Cadencias Multi-Canal / Sequences (Should)

Hoje o retry e so por ligacao com intervalo fixo (3/5/7 dias).
Evolucao para cadencias multi-step:
- Dia 1: Liga
- Dia 3: WhatsApp
- Dia 5: Email
- Dia 7: Liga novamente

Permitir templates por etapa da cadencia. Requer nova tabela (`prospecting_sequences`) e logica de scheduling.

**Complexidade:** Alta — novo conceito no sistema, schema changes, scheduling.

---

### #5 — Gamificacao para Corretores (Should)

O CorretorRanking existe mas e passivo. Evolucoes:
- Metas diarias competitivas visiveis entre corretores
- Streak de dias consecutivos atingindo meta
- Notificacoes quando outro corretor ultrapassa no ranking
- Badges/conquistas por marcos (100 ligacoes, 50 conexoes, etc.)

**Nota:** CP-4.3 (Done) ja tem DailyGoal + celebracao. Gamificacao seria extensao natural.

---

### #8 — Discador Automatico / Auto-Dialer VoIP (Won't now)

Integracao com telefonia VoIP (Twilio, Vonage):
- Click-to-call direto do Power Dialer
- Gravacao de chamadas com transcricao automatica
- Log de duracao automatico (sem input manual)
- Deteccao de caixa postal automatica

**Descartado (agora):** Esforco muito alto, requer integracao com provedor VoIP, custos recorrentes, infraestrutura de gravacao. Reavaliar quando volume de ligacoes justificar investimento.

---

### #9 — AI Scoring Dinamico (Could)

Lead score atualizado automaticamente pos-ligacao:
- Modelo que aprende quais contatos convertem mais
- Fatores: outcome da ligacao, duracao, notas, estagio, temperatura
- Priorizacao automatica da fila baseada em probabilidade de conversao

**Nota:** `getLeadScore()` ja existe e e documentado no prompt de AI. Evolucao seria tornar o score dinamico baseado em interacoes.

---

### #10 — Analise de Objecoes com AI (Could)

TopObjections ja extrai dados das notas de ligacao. Evolucoes:
- Categorizacao automatica de objecoes por AI (preco, timing, concorrente, etc.)
- Sugerir respostas para cada objecao no script do Power Dialer
- Dashboard de objecoes mais frequentes por periodo
- Material de treinamento baseado nas objecoes do time

**Nota:** Precisa de volume de notas para ser util. Reavaliar quando houver 500+ notas de ligacao.

---

## Referencias

- Epic CP-4 (Filas & Sessao UX) — **Done**
- Epic CP-5 (Rastreabilidade & Visao Gerencial) — **InProgress** (CP-5.4, CP-5.5, CP-5.6 pendentes)
- Story CP-IMP-1 (Importacao de Listas) — **Ready**
- PR #33 (QR Code + WhatsApp) — **Merged**

---

*Backlog gerenciado por @pm (Morgan) — 2026-03-12*
