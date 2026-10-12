import { describe, expect, it } from 'vitest'
import { fmtDate, fmtDelta, fmtKg, fmtPercent, fmtPeriod, fmtShortDate, trendArrow } from './format'

describe('format', () => {
  it('formats kilograms', () => {
    expect(fmtKg(72.4)).toBe('72.4')
    expect(fmtKg(72)).toBe('72.0')
    expect(fmtKg(undefined)).toBe('–')
  })

  it('formats signed deltas without negative zero', () => {
    expect(fmtDelta(73.0 - 72.4)).toBe('+0.6')
    expect(fmtDelta(72.4 - 73.0)).toBe('-0.6')
    expect(fmtDelta(-0.04)).toBe('0.0')
    expect(fmtDelta(undefined)).toBe('–')
  })

  it('shows trend arrows', () => {
    expect(trendArrow(-0.6)).toBe('▼')
    expect(trendArrow(0.6)).toBe('▲')
    expect(trendArrow(0.01)).toBe('')
    expect(trendArrow(undefined)).toBe('')
  })

  it('formats dates, percents and periods', () => {
    expect(fmtDate('2026-10-12')).toBe('10월 12일 (월)')
    expect(fmtPercent(49.6)).toBe('50%')
    expect(fmtPeriod('2026-10-12', 'week')).toBe('10/12 주')
    expect(fmtPeriod('2026-10', 'month')).toBe('2026년 10월')
    expect(fmtShortDate('2026-10-05')).toBe('10/5 (월)')
  })
})
