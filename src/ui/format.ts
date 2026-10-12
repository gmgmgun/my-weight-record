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
  const [y, m, day] = d.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, day)).getUTCDay()
  return `${m}월 ${day}일 (${WEEKDAYS[dow]})`
}

export function fmtPercent(v: number): string {
  return `${Math.round(v)}%`
}

export function fmtPeriod(key: string, unit: PeriodUnit): string {
  const [y, m, d] = key.split('-').map(Number)
  return unit === 'week' ? `${m}/${d} 주` : `${y}년 ${m}월`
}
