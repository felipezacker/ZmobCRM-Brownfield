'use client';

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

export function ScoreTable() {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/50 dark:border-white/[0.06]">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/40 dark:bg-white/[0.03]">
            <th className="text-left py-2.5 px-3 font-semibold text-foreground/80 dark:text-muted-foreground text-1xs uppercase tracking-wider">Fator</th>
            <th className="text-left py-2.5 px-3 font-semibold text-foreground/80 dark:text-muted-foreground text-1xs uppercase tracking-wider">Condição</th>
            <th className="text-right py-2.5 px-3 font-semibold text-foreground/80 dark:text-muted-foreground text-1xs uppercase tracking-wider">Pontos</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border/30 dark:border-white/[0.04] hover:bg-muted/20 dark:hover:bg-white/[0.02] transition-colors">
              <td className="py-2 px-3 text-secondary-foreground dark:text-muted-foreground">{row.factor}</td>
              <td className="py-2 px-3 text-foreground/80 dark:text-muted-foreground">{row.condition}</td>
              <td className={`py-2 px-3 text-right font-mono font-bold ${row.positive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                {row.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
