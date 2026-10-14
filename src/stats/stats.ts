import { addDays, addMonths, dayOfWeek, diffDays, monthOf, startOfWeek, subtractMonthClamped } from '../lib/date'
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

export type SameDayComparison = { refDate: ISODate; delta?: number }

// 가장 최근 기록을 바로 전날, 정확히 일주일 전(같은 요일) 또는 지난달 같은 날의 기록과 비교한다.
// 그날 기록이 없으면 비슷한 날로 대신하지 않고 delta를 비워 둔다.
export function sameDayComparison(entries: Entry[], period: 'day' | 'week' | 'month'): SameDayComparison | undefined {
  const latest = latestEntry(entries)
  if (!latest) return undefined
  const refDate =
    period === 'day'
      ? addDays(latest.date, -1)
      : period === 'week'
        ? addDays(latest.date, -7)
        : subtractMonthClamped(latest.date)
  const ref = entries.find((e) => e.date === refDate)
  return { refDate, delta: ref ? latest.weightKg - ref.weightKg : undefined }
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

export type PeriodStats = { avg: number; min: number; max: number }

export function periodStats(entries: Entry[], unit: PeriodUnit): Map<string, PeriodStats> {
  const acc = new Map<string, { sum: number; count: number; min: number; max: number }>()
  for (const e of entries) {
    const key = periodKey(e.date, unit)
    const cur = acc.get(key)
    acc.set(
      key,
      cur
        ? {
            sum: cur.sum + e.weightKg,
            count: cur.count + 1,
            min: Math.min(cur.min, e.weightKg),
            max: Math.max(cur.max, e.weightKg),
          }
        : { sum: e.weightKg, count: 1, min: e.weightKg, max: e.weightKg },
    )
  }
  return new Map([...acc].map(([k, v]) => [k, { avg: v.sum / v.count, min: v.min, max: v.max }]))
}

export type PeriodRow = { key: string; avg?: number; min?: number; max?: number; delta?: number }

export function recentPeriods(entries: Entry[], unit: PeriodUnit, count: number): PeriodRow[] {
  const latest = latestEntry(entries)
  if (!latest) return []
  const stats = periodStats(entries, unit)
  const newest = periodKey(latest.date, unit)
  return Array.from({ length: count }, (_, i) => {
    const key = shiftPeriod(newest, unit, -i)
    const cur = stats.get(key)
    const prev = stats.get(shiftPeriod(key, unit, -1))
    return {
      key,
      avg: cur?.avg,
      min: cur?.min,
      max: cur?.max,
      delta: cur && prev ? cur.avg - prev.avg : undefined,
    }
  })
}

export type WeekdayRow = { date: ISODate; weightKg?: number; delta?: number }

// 오늘(또는 그 이전) 가장 가까운 해당 요일부터 거슬러 올라가며 그날 기록한 체중을 그대로 보여 준다.
// 직전 대비는 바로 앞주 같은 요일과 둘 다 기록이 있을 때만 계산한다(빠진 주를 건너뛰지 않는다).
export function recentWeekdays(entries: Entry[], today: ISODate, weekday: number, count: number): WeekdayRow[] {
  const byDate = new Map(entries.map((e) => [e.date, e.weightKg]))
  const newest = addDays(today, -((dayOfWeek(today) - weekday + 7) % 7))
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(newest, -7 * i)
    const weightKg = byDate.get(date)
    const prev = byDate.get(addDays(date, -7))
    return { date, weightKg, delta: weightKg !== undefined && prev !== undefined ? weightKg - prev : undefined }
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
