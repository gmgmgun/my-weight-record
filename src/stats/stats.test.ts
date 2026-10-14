import { describe, expect, it } from 'vitest'
import type { Entry } from '../types'
import {
  effectiveStart,
  inRange,
  latestEntry,
  movingAverage7,
  previousEntry,
  progressPercent,
  rangeStart,
  recentPeriods,
  recentWeekdays,
  sameDayComparison,
  sortByDate,
  summarize,
} from './stats'

const e = (date: string, weightKg: number): Entry => ({ date, weightKg, updatedAt: 0 })

describe('ordering helpers', () => {
  const list = [e('2026-10-03', 72), e('2026-10-01', 70), e('2026-10-02', 71)]

  it('sorts ascending without mutating', () => {
    expect(sortByDate(list).map((x) => x.date)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03'])
    expect(list[0].date).toBe('2026-10-03')
  })

  it('finds latest and previous entries', () => {
    expect(latestEntry(list)?.date).toBe('2026-10-03')
    expect(latestEntry([])).toBeUndefined()
    expect(previousEntry(list, '2026-10-03')?.date).toBe('2026-10-02')
    expect(previousEntry(list, '2026-10-01')).toBeUndefined()
  })
})

describe('sameDayComparison', () => {
  it('compares the latest entry with the day before', () => {
    const r = sameDayComparison([e('2026-10-10', 99), e('2026-10-11', 72.9), e('2026-10-12', 72.4)], 'day')
    expect(r?.refDate).toBe('2026-10-11')
    expect(r?.delta).toBeCloseTo(-0.5)
    expect(sameDayComparison([e('2026-10-10', 73), e('2026-10-12', 72)], 'day')).toEqual({
      refDate: '2026-10-11',
      delta: undefined,
    })
  })

  it('compares the latest entry with exactly 7 days before', () => {
    const r = sameDayComparison([e('2026-10-05', 73.0), e('2026-10-06', 99), e('2026-10-12', 72.4)], 'week')
    expect(r?.refDate).toBe('2026-10-05')
    expect(r?.delta).toBeCloseTo(-0.6)
  })

  it('compares with the same day of last month', () => {
    const r = sameDayComparison([e('2026-09-12', 74.2), e('2026-09-11', 99), e('2026-10-12', 72.4)], 'month')
    expect(r?.refDate).toBe('2026-09-12')
    expect(r?.delta).toBeCloseTo(-1.8)
  })

  it('uses the last day of last month when that day does not exist', () => {
    expect(sameDayComparison([e('2026-02-28', 72), e('2026-03-31', 70)], 'month')).toEqual({
      refDate: '2026-02-28',
      delta: -2,
    })
    expect(sameDayComparison([e('2026-05-31', 70)], 'month')?.refDate).toBe('2026-04-30')
  })

  it('leaves the change empty when that exact day has no record', () => {
    expect(sameDayComparison([e('2026-10-04', 73), e('2026-10-12', 72)], 'week')).toEqual({
      refDate: '2026-10-05',
      delta: undefined,
    })
    expect(sameDayComparison([], 'week')).toBeUndefined()
  })
})

describe('movingAverage7', () => {
  it('averages entries in [D-6, D], skipping missing days', () => {
    const list = [e('2026-10-08', 74), e('2026-10-01', 70), e('2026-10-03', 72)]
    expect(movingAverage7(list)).toEqual([
      { date: '2026-10-01', avg: 70 },
      { date: '2026-10-03', avg: 71 },
      { date: '2026-10-08', avg: 73 },
    ])
  })
})

describe('recentWeekdays', () => {
  const MONDAY = 1
  const list = [e('2026-10-12', 73.5), e('2026-10-05', 74.2), e('2026-09-21', 74.9), e('2026-10-13', 70)]

  it('lists the most recent Mondays with their own weight and the change from the Monday before', () => {
    const rows = recentWeekdays(list, '2026-10-14', MONDAY, 4)
    expect(rows.map((r) => r.date)).toEqual(['2026-10-12', '2026-10-05', '2026-09-28', '2026-09-21'])
    expect(rows[0].weightKg).toBe(73.5)
    expect(rows[0].delta).toBeCloseTo(-0.7)
    expect(rows[1]).toEqual({ date: '2026-10-05', weightKg: 74.2, delta: undefined })
    expect(rows[2]).toEqual({ date: '2026-09-28', weightKg: undefined, delta: undefined })
    expect(rows[3]).toEqual({ date: '2026-09-21', weightKg: 74.9, delta: undefined })
  })

  it('starts from today when today is that weekday, otherwise the one before', () => {
    expect(recentWeekdays(list, '2026-10-12', MONDAY, 1)[0].date).toBe('2026-10-12')
    expect(recentWeekdays(list, '2026-10-11', MONDAY, 1)[0].date).toBe('2026-10-05')
  })
})

describe('recentPeriods', () => {
  it('lists weeks newest first with delta vs previous week', () => {
    const list = [e('2026-10-05', 73), e('2026-10-12', 72)]
    expect(recentPeriods(list, 'week', 2)).toEqual([
      { key: '2026-10-12', avg: 72, min: 72, max: 72, delta: -1 },
      { key: '2026-10-05', avg: 73, min: 73, max: 73, delta: undefined },
    ])
  })

  it('includes empty months as gaps', () => {
    const list = [e('2026-08-15', 75), e('2026-10-01', 73), e('2026-10-20', 71)]
    expect(recentPeriods(list, 'month', 3)).toEqual([
      { key: '2026-10', avg: 72, min: 71, max: 73, delta: undefined },
      { key: '2026-09', avg: undefined, min: undefined, max: undefined, delta: undefined },
      { key: '2026-08', avg: 75, min: 75, max: 75, delta: undefined },
    ])
  })

  it('crosses year boundaries', () => {
    const list = [e('2026-12-20', 74), e('2027-01-05', 73)]
    expect(recentPeriods(list, 'month', 1)).toEqual([{ key: '2027-01', avg: 73, min: 73, max: 73, delta: -1 }])
  })

  it('returns nothing without entries', () => {
    expect(recentPeriods([], 'week', 8)).toEqual([])
  })
})

describe('effectiveStart', () => {
  const list = [e('2026-10-12', 72), e('2026-09-01', 76)]

  it('defaults to the first entry', () => {
    expect(effectiveStart(list, {})).toEqual({ date: '2026-09-01', kg: 76 })
  })

  it('lets settings override each field', () => {
    expect(effectiveStart(list, { startKg: 80 })).toEqual({ date: '2026-09-01', kg: 80 })
    expect(effectiveStart(list, { startDate: '2026-08-01', startKg: 81 })).toEqual({ date: '2026-08-01', kg: 81 })
  })

  it('uses the first entry on/after startDate for kg', () => {
    const l = [e('2026-09-01', 76), e('2026-09-10', 75), e('2026-10-12', 72)]
    expect(effectiveStart(l, { startDate: '2026-09-05' })).toEqual({ date: '2026-09-05', kg: 75 })
    expect(effectiveStart(l, { startDate: '2026-11-01' })).toEqual({ date: '2026-11-01', kg: 76 })
    expect(effectiveStart(l, { startDate: '2026-09-05', startKg: 80 })).toEqual({ date: '2026-09-05', kg: 80 })
  })

  it('is undefined with no data', () => {
    expect(effectiveStart([], {})).toBeUndefined()
  })
})

describe('progressPercent', () => {
  it('works for loss and gain goals and clamps to 0..100', () => {
    expect(progressPercent(80, 75, 70)).toBe(50)
    expect(progressPercent(50, 55, 60)).toBe(50)
    expect(progressPercent(80, 68, 70)).toBe(100)
    expect(progressPercent(80, 82, 70)).toBe(0)
    expect(progressPercent(70, 72, 70)).toBe(100)
  })
})

describe('ranges and summary', () => {
  it('computes range start dates', () => {
    expect(rangeStart('2026-10-12', '1m')).toBe('2026-09-12')
    expect(rangeStart('2026-10-12', 'all')).toBeUndefined()
  })

  it('filters by start date', () => {
    const list = [e('2026-10-12', 72), e('2026-09-01', 76)]
    expect(inRange(list, '2026-10-01').map((x) => x.date)).toEqual(['2026-10-12'])
    expect(inRange(list, undefined).map((x) => x.date)).toEqual(['2026-09-01', '2026-10-12'])
  })

  it('summarizes change, min, max, avg', () => {
    expect(summarize([])).toBeUndefined()
    expect(summarize([e('2026-10-01', 72)])).toEqual({ change: undefined, min: 72, max: 72, avg: 72 })
    expect(summarize([e('2026-10-03', 70), e('2026-10-01', 74), e('2026-10-02', 75)])).toEqual({
      change: -4,
      min: 70,
      max: 75,
      avg: 73,
    })
  })
})
