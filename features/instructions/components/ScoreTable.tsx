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
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border dark:border-border">
            <th className="text-left py-2 px-2 font-semibold text-secondary-foreground dark:text-muted-foreground">Fator</th>
            <th className="text-left py-2 px-2 font-semibold text-secondary-foreground dark:text-muted-foreground">Condição</th>
            <th className="text-right py-2 px-2 font-semibold text-secondary-foreground dark:text-muted-foreground">Pontos</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border dark:border-border">
              <td className="py-1.5 px-2 text-secondary-foreground dark:text-muted-foreground">{row.factor}</td>
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
