import type { ISODate } from '../types'

export const DAY_MS = 86_400_000

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toUTC(d: ISODate): number {
  const [y, m, day] = d.split('-').map(Number)
  return Date.UTC(y, m - 1, day)
}

function fromUTC(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10)
}

export function todayLocal(now: Date = new Date()): ISODate {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function isValidISODate(s: unknown): s is ISODate {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  return fromUTC(toUTC(s)) === s
}

export function addDays(d: ISODate, n: number): ISODate {
  return fromUTC(toUTC(d) + n * DAY_MS)
}

export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(a) - toUTC(b)) / DAY_MS)
}

// 0 = 일요일 … 6 = 토요일
export function dayOfWeek(d: ISODate): number {
  return new Date(toUTC(d)).getUTCDay()
}

// 기록을 일요일에 시작했으므로 한 주는 일요일~토요일이다.
export function startOfWeek(d: ISODate): ISODate {
  return addDays(d, -dayOfWeek(d))
}

export function monthOf(d: ISODate): string {
  return d.slice(0, 7)
}

// 지난달 같은 날. 그 날이 없으면(3/31 → 2월) 지난달 마지막 날로 맞춘다.
export function subtractMonthClamped(d: ISODate): ISODate {
  const [y, m, day] = d.split('-').map(Number)
  const idx = y * 12 + (m - 1) - 1
  const ty = Math.floor(idx / 12)
  const tm = idx % 12
  const lastDay = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate()
  return `${ty}-${pad(tm + 1)}-${pad(Math.min(day, lastDay))}`
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const idx = y * 12 + (m - 1) + n
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`
}
