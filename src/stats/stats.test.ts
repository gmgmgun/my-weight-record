import { describe, expect, it } from 'vitest'
import type { Entry } from '../types'
import {
  changeVsDaysAgo,
  effectiveStart,
  findNear,
  inRange,
  latestEntry,
  movingAverage7,
  previousEntry,
  progressPercent,
  rangeStart,
  recentPeriods,
  sortByDate,
  summarize,
  weekComparison,
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

describe('findNear', () => {
  it('picks the closest entry within tolerance, earlier on ties', () => {
    const list = [e('2026-10-02', 70), e('2026-10-08', 71)]
    expect(findNear(list, '2026-10-05')?.date).toBe('2026-10-02')
    expect(findNear(list, '2026-10-07')?.date).toBe('2026-10-08')
    expect(findNear(list, '2026-09-20')).toBeUndefined()
  })
})

describe('changeVsDaysAgo', () => {
  it('compares latest with the entry near N days before', () => {
    const list = [e('2026-09-10', 74.2), e('2026-10-05', 73.0), e('2026-10-12', 72.4)]
    expect(changeVsDaysAgo(list, 7)).toBeCloseTo(-0.6)
    expect(changeVsDaysAgo(list, 30)).toBeCloseTo(-1.8)
  })

  it('returns undefined when nothing is within ±3 days', () => {
    expect(changeVsDaysAgo([e('2026-10-01', 73), e('2026-10-12', 72)], 7)).toBeUndefined()
    expect(changeVsDaysAgo([e('2026-10-12', 72)], 7)).toBeUndefined()
    expect(changeVsDaysAgo([], 7)).toBeUndefined()
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

describe('weekComparison', () => {
  it('compares the calendar week of the latest entry with the previous week', () => {
    const list = [e('2026-10-05', 73), e('2026-10-11', 72), e('2026-10-12', 71), e('2026-10-14', 70)]
    expect(weekComparison(list)).toEqual({ thisWeek: 70.5, lastWeek: 72.5 })
  })

  it('leaves missing weeks undefined', () => {
    expect(weekComparison([e('2026-10-12', 71)])).toEqual({ thisWeek: 71, lastWeek: undefined })
    expect(weekComparison([])).toEqual({})
  })
})

describe('recentPeriods', () => {
  it('lists weeks newest first with delta vs previous week', () => {
    const list = [e('2026-10-05', 73), e('2026-10-12', 72)]
    expect(recentPeriods(list, 'week', 2)).toEqual([
      { key: '2026-10-12', avg: 72, delta: -1 },
      { key: '2026-10-05', avg: 73, delta: undefined },
    ])
  })

  it('includes empty months as gaps', () => {
    const list = [e('2026-08-15', 75), e('2026-10-01', 73), e('2026-10-20', 71)]
    expect(recentPeriods(list, 'month', 3)).toEqual([
      { key: '2026-10', avg: 72, delta: undefined },
      { key: '2026-09', avg: undefined, delta: undefined },
      { key: '2026-08', avg: 75, delta: undefined },
    ])
  })

  it('crosses year boundaries', () => {
    const list = [e('2026-12-20', 74), e('2027-01-05', 73)]
    expect(recentPeriods(list, 'month', 1)).toEqual([{ key: '2027-01', avg: 73, delta: -1 }])
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
