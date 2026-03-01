/**
 * @fileoverview Validação e formatação de CPF e CEP.
 *
 * Story 3.1 — Modelo de Dados Contatos
 *
 * @module lib/validations/cpf-cep
 */

// ============================================
// CPF
// ============================================

/**
 * Remove caracteres não numéricos de uma string.
 */
export function stripNonDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Valida um CPF usando o algoritmo dos dígitos verificadores.
 * Aceita entrada com ou sem máscara (000.000.000-00).
 *
 * @param cpf - CPF a ser validado.
 * @returns true se o CPF é válido.
 */
export function validateCPF(cpf: string | undefined | null): boolean {
  if (!cpf) return false;
  const digits = stripNonDigits(cpf);
  if (digits.length !== 11) return false;

  // Rejeita CPFs com todos os dígitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  // Calcula primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i], 10) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[9], 10)) return false;

  // Calcula segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i], 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[10], 10)) return false;

  return true;
}

/**
 * Aplica máscara de CPF: 000.000.000-00
 * Aceita input parcial (auto-completa conforme digita).
 */
export function formatCPF(value: string): string {
  const digits = stripNonDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Remove máscara do CPF, retornando somente dígitos.
 */
export function unformatCPF(value: string): string {
  return stripNonDigits(value);
}

// ============================================
// CEP
// ============================================

/**
 * Valida formato de CEP brasileiro: 00000-000 ou 00000000
 */
export function validateCEP(cep: string | undefined | null): boolean {
  if (!cep) return false;
  const digits = stripNonDigits(cep);
  return digits.length === 8;
}

/**
 * Aplica máscara de CEP: 00000-000
 * Aceita input parcial.
 */
export function formatCEP(value: string): string {
  const digits = stripNonDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/**
 * Remove máscara do CEP, retornando somente dígitos.
 */
export function unformatCEP(value: string): string {
  return stripNonDigits(value);
}

// ============================================
// UF (Estado)
// ============================================

/** Lista de UFs válidas do Brasil. */
export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

export type BrazilianState = typeof BRAZILIAN_STATES[number];

/**
 * Valida se uma UF é válida.
 */
export function validateState(state: string | undefined | null): boolean {
  if (!state) return false;
  return BRAZILIAN_STATES.includes(state.toUpperCase() as BrazilianState);
}
