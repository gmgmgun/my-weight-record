import { addDays, addMonths, diffDays, monthOf, startOfWeek } from '../lib/date'
import type { Entry, ISODate, Settings } from '../types'

export function sortByDate(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date))
}

export function latestEntry(entries: Entry[]): Entry | undefined {
  let best: Entry | undefined
  for (const e of entries) if (!best || e.date > best.date) best = e
  return best
}

export function previousEntry(entries: Entry[], date: ISODate): Entry | undefined {
  return latestEntry(entries.filter((e) => e.date < date))
}

export function findNear(entries: Entry[], target: ISODate, tolerance = 3): Entry | undefined {
  let best: Entry | undefined
  let bestDist = Infinity
  for (const e of entries) {
    const dist = Math.abs(diffDays(e.date, target))
    if (dist > tolerance) continue
    if (dist < bestDist || (dist === bestDist && best !== undefined && e.date < best.date)) {
      best = e
      bestDist = dist
    }
  }
  return best
}

export function changeVsDaysAgo(entries: Entry[], days: number): number | undefined {
  const latest = latestEntry(entries)
  if (!latest) return undefined
  const ref = findNear(entries, addDays(latest.date, -days))
  return ref ? latest.weightKg - ref.weightKg : undefined
}

export type AvgPoint = { date: ISODate; avg: number }

export function movingAverage7(entries: Entry[]): AvgPoint[] {
  const sorted = sortByDate(entries)
  return sorted.map((e, i) => {
    let sum = 0
    let count = 0
    for (let j = i; j >= 0 && diffDays(e.date, sorted[j].date) <= 6; j--) {
      sum += sorted[j].weightKg
      count++
    }
    return { date: e.date, avg: sum / count }
  })
}

export type PeriodUnit = 'week' | 'month'

function periodKey(date: ISODate, unit: PeriodUnit): string {
  return unit === 'week' ? startOfWeek(date) : monthOf(date)
}

function shiftPeriod(key: string, unit: PeriodUnit, n: number): string {
  return unit === 'week' ? addDays(key, 7 * n) : addMonths(key, n)
}

export function periodAverages(entries: Entry[], unit: PeriodUnit): Map<string, number> {
  const acc = new Map<string, { sum: number; count: number }>()
  for (const e of entries) {
    const key = periodKey(e.date, unit)
    const cur = acc.get(key) ?? { sum: 0, count: 0 }
    acc.set(key, { sum: cur.sum + e.weightKg, count: cur.count + 1 })
  }
  return new Map([...acc].map(([k, v]) => [k, v.sum / v.count]))
}

export function weekComparison(entries: Entry[]): { thisWeek?: number; lastWeek?: number } {
  const latest = latestEntry(entries)
  if (!latest) return {}
  const avgs = periodAverages(entries, 'week')
  const week = startOfWeek(latest.date)
  return { thisWeek: avgs.get(week), lastWeek: avgs.get(addDays(week, -7)) }
}

export type PeriodRow = { key: string; avg?: number; delta?: number }

export function recentPeriods(entries: Entry[], unit: PeriodUnit, count: number): PeriodRow[] {
  const latest = latestEntry(entries)
  if (!latest) return []
  const avgs = periodAverages(entries, unit)
  const newest = periodKey(latest.date, unit)
  return Array.from({ length: count }, (_, i) => {
    const key = shiftPeriod(newest, unit, -i)
    const avg = avgs.get(key)
    const prev = avgs.get(shiftPeriod(key, unit, -1))
    return { key, avg, delta: avg !== undefined && prev !== undefined ? avg - prev : undefined }
  })
}

export function effectiveStart(entries: Entry[], settings: Settings): { date: ISODate; kg: number } | undefined {
  const first = sortByDate(entries)[0]
  const date = settings.startDate ?? first?.date
  const atStart = settings.startDate !== undefined ? sortByDate(entries).find((x) => x.date >= settings.startDate!) : undefined
  const kg = settings.startKg ?? (atStart ?? first)?.weightKg
  return date !== undefined && kg !== undefined ? { date, kg } : undefined
}

export function progressPercent(startKg: number, currentKg: number, goalKg: number): number {
  if (startKg === goalKg) return 100
  const p = ((startKg - currentKg) / (startKg - goalKg)) * 100
  return Math.min(100, Math.max(0, p))
}

export type RangeKey = '1m' | '3m' | '6m' | '1y' | 'all'

const RANGE_DAYS: Record<Exclude<RangeKey, 'all'>, number> = { '1m': 30, '3m': 91, '6m': 182, '1y': 365 }

export function rangeStart(today: ISODate, range: RangeKey): ISODate | undefined {
  return range === 'all' ? undefined : addDays(today, -RANGE_DAYS[range])
}

export function inRange(entries: Entry[], from: ISODate | undefined): Entry[] {
  return sortByDate(entries).filter((e) => from === undefined || e.date >= from)
}

export type RangeSummary = { change?: number; min: number; max: number; avg: number }

export function summarize(entries: Entry[]): RangeSummary | undefined {
  const sorted = sortByDate(entries)
  if (sorted.length === 0) return undefined
  const ws = sorted.map((e) => e.weightKg)
  return {
    change: ws.length >= 2 ? ws[ws.length - 1] - ws[0] : undefined,
    min: Math.min(...ws),
    max: Math.max(...ws),
    avg: ws.reduce((a, b) => a + b, 0) / ws.length,
  }
}
