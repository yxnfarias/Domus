import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '')
  if (cleaned.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cleaned)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i]) * (10 - i)
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleaned[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(cleaned[i]) * (11 - i)
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  return remainder === parseInt(cleaned[10])
}

export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(value)
}

/** Short alias for formatCurrency — use in dashboard components */
export const fmtBRL = formatCurrency

/** Compact BRL: 1.2M, 450K, etc. */
export function fmtCompact(v: number): string {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `R$${Math.round(v / 1_000)}K`
  return `R$${v}`
}

/** Relative time string in pt-BR (agora, 5m, 2h, 3d) */
export function relTime(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60)    return 'agora'
  if (s < 3600)  return `${Math.round(s / 60)}m`
  if (s < 86400) return `${Math.round(s / 3600)}h`
  return `${Math.round(s / 86400)}d`
}

export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d,]/g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('pt-BR')
}

/**
 * Today's calendar date as YYYY-MM-DD in the LOCAL timezone.
 * Unlike `new Date().toISOString().slice(0, 10)` (which is UTC-based and can be
 * off by a day for negative UTC offsets like Brazil's), this matches what the
 * user sees on their clock.
 */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Calendar date as YYYY-MM-DD in a given IANA timezone — for server-side code,
 * where `new Date()` reflects the server's clock/timezone (often UTC), not the
 * Brazilian user's. Used to keep "today" consistent between server and browser.
 */
export function dateStrInTimeZone(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

/**
 * Formats a DATE-only string (YYYY-MM-DD) without shifting it across timezones.
 * `new Date('2026-06-06')` parses as UTC midnight, which `toLocaleDateString`
 * then renders as the previous day in negative-UTC-offset timezones — this avoids that.
 */
export function formatDateOnly(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR')
}

export type FollowUpStatus = 'overdue' | 'today' | 'upcoming'

/** Compares a DATE-only follow-up string against the local calendar date — pure string comparison, no timezone artifacts. */
export function followUpStatus(dateStr: string): FollowUpStatus {
  const todayStr = localDateStr()
  if (dateStr < todayStr) return 'overdue'
  if (dateStr === todayStr) return 'today'
  return 'upcoming'
}

export function calcAge(birthDate: string): number {
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export function whatsappLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '')
  const international = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`
}
