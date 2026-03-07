// Performance: reuse formatter instances across sub-components.
export const PT_BR_DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR');
export const BRL_CURRENCY = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
