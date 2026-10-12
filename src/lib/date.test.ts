import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  dayOfWeek,
  diffDays,
  isValidISODate,
  monthOf,
  startOfWeek,
  subtractMonthClamped,
  todayLocal,
} from './date'

describe('todayLocal', () => {
  it('uses the local calendar date', () => {
    expect(todayLocal(new Date(2026, 9, 12, 23, 59))).toBe('2026-10-12')
    expect(todayLocal(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05')
  })
})

describe('isValidISODate', () => {
  it('accepts real dates only', () => {
    expect(isValidISODate('2026-10-12')).toBe(true)
    expect(isValidISODate('2028-02-29')).toBe(true)
    expect(isValidISODate('2026-02-29')).toBe(false)
    expect(isValidISODate('2026-1-1')).toBe(false)
    expect(isValidISODate(20261012)).toBe(false)
  })
})

describe('addDays / diffDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(diffDays('2026-10-12', '2026-10-05')).toBe(7)
    expect(diffDays('2026-10-05', '2026-10-12')).toBe(-7)
  })
})

describe('startOfWeek', () => {
  it('returns the Monday of the week', () => {
    expect(startOfWeek('2026-10-12')).toBe('2026-10-12')
    expect(startOfWeek('2026-10-18')).toBe('2026-10-12')
    expect(startOfWeek('2026-10-11')).toBe('2026-10-05')
  })
})

describe('dayOfWeek', () => {
  it('returns 0 for Sunday through 6 for Saturday', () => {
    expect(dayOfWeek('2026-10-11')).toBe(0)
    expect(dayOfWeek('2026-10-12')).toBe(1)
    expect(dayOfWeek('2026-10-17')).toBe(6)
  })
})

describe('subtractMonthClamped', () => {
  it('keeps the day of month when it exists', () => {
    expect(subtractMonthClamped('2026-10-12')).toBe('2026-09-12')
    expect(subtractMonthClamped('2026-01-15')).toBe('2025-12-15')
  })

  it('falls back to the last day of a shorter month', () => {
    expect(subtractMonthClamped('2026-03-31')).toBe('2026-02-28')
    expect(subtractMonthClamped('2026-03-29')).toBe('2026-02-28')
    expect(subtractMonthClamped('2028-03-31')).toBe('2028-02-29')
    expect(subtractMonthClamped('2026-05-31')).toBe('2026-04-30')
  })
})

describe('months', () => {
  it('extracts and shifts months', () => {
    expect(monthOf('2026-10-12')).toBe('2026-10')
    expect(addMonths('2026-11', 2)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
  })
})
