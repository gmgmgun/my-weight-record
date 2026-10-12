import { dayOfWeek } from '../lib/date'
import type { PeriodUnit } from '../stats/stats'
import type { ISODate } from '../types'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function round1(v: number): number {
  const r = Math.round(v * 10) / 10
  return r === 0 ? 0 : r
}

export function fmtKg(v?: number): string {
  return v === undefined ? '–' : round1(v).toFixed(1)
}

export function fmtDelta(v?: number): string {
  if (v === undefined) return '–'
  const r = round1(v)
  return r > 0 ? `+${r.toFixed(1)}` : r.toFixed(1)
}

export function trendArrow(v?: number): string {
  if (v === undefined) return ''
  const r = round1(v)
  return r < 0 ? '▼' : r > 0 ? '▲' : ''
}

export function fmtDate(d: ISODate): string {
  const [, m, day] = d.split('-').map(Number)
  return `${m}월 ${day}일 (${WEEKDAYS[dayOfWeek(d)]})`
}

export function fmtShortDate(d: ISODate): string {
  const [, m, day] = d.split('-').map(Number)
  return `${m}/${day} (${WEEKDAYS[dayOfWeek(d)]})`
}

export function fmtPercent(v: number): string {
  return `${Math.round(v)}%`
}

export function fmtPeriod(key: string, unit: PeriodUnit): string {
  const [y, m, d] = key.split('-').map(Number)
  return unit === 'week' ? `${m}/${d} 주` : `${y}년 ${m}월`
}
